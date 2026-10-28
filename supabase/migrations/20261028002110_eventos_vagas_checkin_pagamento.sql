-- =============================================================================
-- Koinonia — eventos: vagas e fila de espera, check-in por QR Code e
-- confirmação de pagamento pela tesouraria (lançando a entrada no financeiro)
--
-- Vagas         koinonia_eventos.vagas (null = sem limite). Inscrições
--               pendentes e confirmadas ocupam vaga. Lotou: a inscrição entra
--               na fila ('espera'). Vaga liberada (cancelamento, recusa, mais
--               vagas) promove o primeiro da fila automaticamente e o avisa.
-- Check-in      cada inscrição tem um código (QR Code no app do membro). O
--               responsável pelo evento, PASTOR ou ADMIN lê o código na entrada
--               e a presença fica registrada.
-- Pagamento     em evento pago, só quem tem acesso ao financeiro confirma a
--               inscrição. A confirmação lança a entrada (categoria "evento")
--               e desfazer a confirmação apaga esse lançamento.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Colunas
-- -----------------------------------------------------------------------------
alter table public.koinonia_eventos
  add column vagas integer check (vagas is null or vagas > 0);

-- o site mostra o limite de vagas (a lotação continua só para logados)
grant select (vagas) on public.koinonia_eventos to anon;

alter table public.koinonia_evento_inscricoes
  add column codigo      uuid not null default gen_random_uuid(),
  add column checkin_em  timestamptz,
  add column checkin_por uuid references public.koinonia_profiles (id) on delete set null,
  add constraint koinonia_evento_inscricoes_codigo_unico unique (codigo);

create index koinonia_evento_inscricoes_checkin_por_idx on public.koinonia_evento_inscricoes (checkin_por);
-- fila: os mais antigos primeiro
create index koinonia_evento_inscricoes_espera_idx on public.koinonia_evento_inscricoes (evento_id, created_at)
  where status = 'espera';

alter table public.koinonia_financeiro_entradas
  add column inscricao_id uuid references public.koinonia_evento_inscricoes (id) on delete set null,
  add constraint koinonia_financeiro_entradas_inscricao_unica unique (inscricao_id);

-- -----------------------------------------------------------------------------
-- Helpers
-- -----------------------------------------------------------------------------

/** Inscrições que ocupam vaga (pendentes aguardando pagamento e confirmadas) */
create or replace function public.koinonia_evento_ocupadas(p_evento_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer from public.koinonia_evento_inscricoes
   where evento_id = p_evento_id and status in ('pendente', 'confirmada');
$$;

/** Nome de quem se inscreveu: membro ou convidado */
create or replace function public.koinonia_inscricao_nome(p_inscricao_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(p.nome_completo, i.convidado_nome, 'Inscrito')
    from public.koinonia_evento_inscricoes i
    left join public.koinonia_profiles p on p.id = i.profile_id
   where i.id = p_inscricao_id;
$$;

create or replace function public.koinonia_notificar_perfil(p_profile_id uuid, p_titulo text, p_mensagem text, p_url text, p_origem public.koinonia_notificacao_origem)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.koinonia_notificacoes (titulo, mensagem, url, origem, publico, publico_id)
  values (left(p_titulo, 100), left(p_mensagem, 300), p_url, p_origem, 'perfil', p_profile_id);
$$;

/**
 * Avisa quem cuida do financeiro. Espelha koinonia_pode_financeiro() (hoje
 * ADMIN e PASTOR): se aquela função mudar, ajuste o filtro de papéis aqui.
 */
create or replace function public.koinonia_notificar_financeiro(p_titulo text, p_mensagem text, p_url text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.koinonia_notificacoes (titulo, mensagem, url, origem, publico, publico_id)
  select left(p_titulo, 100), left(p_mensagem, 300), p_url, 'evento', 'perfil', p.id
    from public.koinonia_profiles p
   where p.ativo and p.role in ('ADMIN', 'PASTOR');
$$;

revoke execute on function
  public.koinonia_evento_ocupadas(uuid),
  public.koinonia_inscricao_nome(uuid),
  public.koinonia_notificar_perfil(uuid, text, text, text, public.koinonia_notificacao_origem),
  public.koinonia_notificar_financeiro(text, text, text)
from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- Inscrição: regras ao inserir (público, encerramento, vagas, pagamento)
-- -----------------------------------------------------------------------------
create or replace function public.koinonia_evento_inscricoes_validar()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_evento record;
  v_genero public.koinonia_genero;
  v_uid    uuid := (select auth.uid());
begin
  -- trava o evento: inscrições simultâneas não passam do limite de vagas
  select valor, publico, fim, vagas into v_evento from public.koinonia_eventos where id = new.evento_id for update;
  if not found then
    raise exception 'Evento não encontrado.' using errcode = 'P0001';
  end if;
  if v_evento.fim < now() then
    raise exception 'As inscrições para este evento estão encerradas.' using errcode = 'P0001';
  end if;

  -- público do evento (convidado não tem gênero cadastrado: o responsável decide)
  if new.profile_id is not null then
    select genero into v_genero from public.koinonia_profiles where id = new.profile_id;
    if v_evento.publico = 'homens' and v_genero is distinct from 'masculino' then
      raise exception 'Este evento é exclusivo para homens.' using errcode = 'P0001';
    end if;
    if v_evento.publico = 'mulheres' and v_genero is distinct from 'feminino' then
      raise exception 'Este evento é exclusivo para mulheres.' using errcode = 'P0001';
    end if;
  end if;

  if v_uid is not null then
    new.pagamento_informado_em := null;
    new.checkin_em := null;
    new.checkin_por := null;
    if new.profile_id = v_uid then
      -- o próprio membro se inscrevendo
      new.status := case when v_evento.valor is null then 'confirmada' else 'pendente' end;
      new.adicionado_por := null;
    else
      -- responsável/PASTOR/ADMIN inscrevendo outra pessoa (a RLS garante quem)
      if new.status = 'recusada' then new.status := 'pendente'; end if;
      if v_evento.valor is null and new.status <> 'espera' then new.status := 'confirmada'; end if;
      -- pagamento já recebido só pode ser registrado por quem cuida do financeiro
      if v_evento.valor is not null and new.status = 'confirmada' and not public.koinonia_pode_financeiro() then
        new.status := 'pendente';
      end if;
      new.adicionado_por := v_uid;
    end if;

    -- lotado: vai para a fila de espera
    if v_evento.vagas is not null and new.status in ('pendente', 'confirmada')
       and public.koinonia_evento_ocupadas(new.evento_id) >= v_evento.vagas then
      new.status := 'espera';
    end if;

    new.decidido_por := case when new.status = 'confirmada' and new.profile_id is distinct from v_uid then v_uid end;
    new.decidido_em := case when new.status = 'confirmada' then now() end;
  end if;
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Inscrição: regras ao alterar (decisão, pagamento, check-in)
-- -----------------------------------------------------------------------------
create or replace function public.koinonia_evento_inscricoes_decisao()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid   uuid := (select auth.uid());
  v_valor numeric;
begin
  if new.evento_id is distinct from old.evento_id or new.profile_id is distinct from old.profile_id then
    raise exception 'Não é possível mover a inscrição para outro evento ou pessoa.' using errcode = 'P0001';
  end if;
  if new.codigo is distinct from old.codigo then
    raise exception 'O código da inscrição não pode ser alterado.' using errcode = 'P0001';
  end if;

  if new.status is distinct from old.status then
    select valor into v_valor from public.koinonia_eventos where id = new.evento_id;
    -- confirmar ou desfazer um pagamento mexe no financeiro: só a tesouraria
    if v_valor is not null and 'confirmada' in (new.status, old.status) and v_uid is not null
       and not public.koinonia_pode_financeiro() then
      raise exception 'Em evento pago, quem confirma o pagamento é a tesouraria.' using errcode = '42501';
    end if;
    new.decidido_em := now();
    -- promoção automática da fila não tem "quem decidiu"
    new.decidido_por := case when coalesce(current_setting('koinonia.promovendo_fila', true), '') = 'on' then null else v_uid end;
  end if;

  if new.checkin_em is not null and old.checkin_em is null then
    if new.status <> 'confirmada' then
      raise exception 'Só inscrições confirmadas fazem check-in.' using errcode = 'P0001';
    end if;
    new.checkin_por := v_uid;
  elsif new.checkin_em is null then
    new.checkin_por := null;
  end if;
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Fila de espera: promove enquanto houver vaga
-- -----------------------------------------------------------------------------
create or replace function public.koinonia_evento_promover_espera(p_evento_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_evento    record;
  v_inscricao record;
  v_total     integer := 0;
begin
  select id, titulo, valor, vagas, fim into v_evento from public.koinonia_eventos where id = p_evento_id for update;
  if not found or v_evento.fim < now() then return 0; end if;

  perform set_config('koinonia.promovendo_fila', 'on', true);
  loop
    exit when v_evento.vagas is not null and public.koinonia_evento_ocupadas(p_evento_id) >= v_evento.vagas;

    select id, profile_id into v_inscricao
      from public.koinonia_evento_inscricoes
     where evento_id = p_evento_id and status = 'espera'
     order by created_at
     limit 1
     for update skip locked;
    exit when not found;

    update public.koinonia_evento_inscricoes
       set status = case when v_evento.valor is null then 'confirmada' else 'pendente' end::public.koinonia_inscricao_status
     where id = v_inscricao.id;
    v_total := v_total + 1;

    if v_inscricao.profile_id is not null then
      perform public.koinonia_notificar_perfil(
        v_inscricao.profile_id,
        'Abriu uma vaga para você!',
        v_evento.titulo || case when v_evento.valor is null
          then ' · Sua inscrição está confirmada.'
          else ' · Faça o pagamento para garantir a vaga.' end,
        '/app/eventos/' || p_evento_id,
        'evento'
      );
    end if;
  end loop;
  perform set_config('koinonia.promovendo_fila', '', true);
  return v_total;
end;
$$;

revoke execute on function public.koinonia_evento_promover_espera(uuid) from public, anon, authenticated;

/** Vaga liberada (inscrição saiu, foi recusada ou foi para a fila) → promove a fila */
create or replace function public.koinonia_evento_inscricoes_liberou_vaga()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    if old.status in ('pendente', 'confirmada') then
      perform public.koinonia_evento_promover_espera(old.evento_id);
    end if;
    return old;
  end if;
  if old.status in ('pendente', 'confirmada') and new.status not in ('pendente', 'confirmada') then
    perform public.koinonia_evento_promover_espera(new.evento_id);
  end if;
  return new;
end;
$$;

create trigger koinonia_evento_inscricoes_liberou_vaga
  after delete or update of status on public.koinonia_evento_inscricoes
  for each row execute function public.koinonia_evento_inscricoes_liberou_vaga();

/** Mais vagas no evento (ou sem limite) → promove a fila */
create or replace function public.koinonia_eventos_vagas_alteradas()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.vagas is null or new.vagas > coalesce(old.vagas, 0) then
    perform public.koinonia_evento_promover_espera(new.id);
  end if;
  return new;
end;
$$;

create trigger koinonia_eventos_vagas_alteradas
  after update of vagas on public.koinonia_eventos
  for each row when (new.vagas is distinct from old.vagas)
  execute function public.koinonia_eventos_vagas_alteradas();

-- -----------------------------------------------------------------------------
-- Pagamento confirmado → entrada no financeiro (e desfazer apaga a entrada)
-- -----------------------------------------------------------------------------
create or replace function public.koinonia_evento_inscricoes_lancar_entrada()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_evento record;
  v_forma  text := nullif(current_setting('koinonia.forma_pagamento', true), '');
begin
  select titulo, valor into v_evento from public.koinonia_eventos where id = new.evento_id;
  if v_evento.valor is null then return new; end if;

  if new.status = 'confirmada' and (tg_op = 'INSERT' or old.status <> 'confirmada') then
    insert into public.koinonia_financeiro_entradas
      (data, categoria, valor, forma_pagamento, profile_id, contribuinte_nome, descricao, inscricao_id)
    values (
      (now() at time zone 'America/Sao_Paulo')::date,
      'evento',
      v_evento.valor,
      coalesce(v_forma, 'pix')::public.koinonia_forma_pagamento,
      new.profile_id,
      new.convidado_nome,
      left('Inscrição: ' || v_evento.titulo, 500),
      new.id
    )
    on conflict (inscricao_id) do nothing;

    if new.profile_id is not null and new.profile_id is distinct from (select auth.uid()) then
      perform public.koinonia_notificar_perfil(
        new.profile_id,
        'Pagamento confirmado',
        v_evento.titulo || ' · Sua inscrição está confirmada.',
        '/app/eventos/' || new.evento_id,
        'evento'
      );
    end if;
  elsif tg_op = 'UPDATE' and old.status = 'confirmada' and new.status <> 'confirmada' then
    delete from public.koinonia_financeiro_entradas where inscricao_id = new.id;
  end if;
  return new;
end;
$$;

create trigger koinonia_evento_inscricoes_lancar_entrada
  after insert or update of status on public.koinonia_evento_inscricoes
  for each row execute function public.koinonia_evento_inscricoes_lancar_entrada();

/** Tesouraria confirma o pagamento informando como recebeu */
create or replace function public.koinonia_evento_confirmar_pagamento(p_inscricao_id uuid, p_forma public.koinonia_forma_pagamento)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.koinonia_pode_financeiro() then
    raise exception 'Só quem cuida do financeiro confirma pagamentos.' using errcode = '42501';
  end if;
  perform set_config('koinonia.forma_pagamento', p_forma::text, true);
  update public.koinonia_evento_inscricoes
     set status = 'confirmada'
   where id = p_inscricao_id and status in ('pendente', 'recusada');
  if not found then
    raise exception 'Inscrição não encontrada ou já confirmada.' using errcode = 'P0001';
  end if;
  perform set_config('koinonia.forma_pagamento', '', true);
end;
$$;

-- o membro avisa que pagou (só na própria inscrição pendente) e a tesouraria é avisada
create or replace function public.koinonia_informar_pagamento(p_evento_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  update public.koinonia_evento_inscricoes
     set pagamento_informado_em = now()
   where evento_id = p_evento_id
     and profile_id = (select auth.uid())
     and status = 'pendente'
  returning id into v_id;
  if v_id is null then
    raise exception 'Você não tem inscrição pendente neste evento.' using errcode = 'P0001';
  end if;

  perform public.koinonia_notificar_financeiro(
    'Pagamento de inscrição para conferir',
    format('%s · %s', public.koinonia_inscricao_nome(v_id), (select titulo from public.koinonia_eventos where id = p_evento_id)),
    '/app/financeiro/pagamentos-eventos'
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- Lotação (para todos os membros) e check-in
-- -----------------------------------------------------------------------------

/** Vagas, ocupadas, tamanho da fila e a posição do usuário na fila (se estiver) */
create or replace function public.koinonia_evento_lotacao(p_evento_id uuid)
returns table (vagas integer, ocupadas integer, na_espera integer, minha_posicao integer)
language sql
stable
security definer
set search_path = ''
as $$
  select
    e.vagas,
    public.koinonia_evento_ocupadas(e.id),
    (select count(*)::integer from public.koinonia_evento_inscricoes where evento_id = e.id and status = 'espera'),
    (select pos::integer from (
       select profile_id, row_number() over (order by created_at) as pos
         from public.koinonia_evento_inscricoes
        where evento_id = e.id and status = 'espera'
     ) f where f.profile_id = (select auth.uid()))
  from public.koinonia_eventos e
  where e.id = p_evento_id and public.koinonia_is_membro_ativo();
$$;

/**
 * Check-in pelo código do QR Code. Responsável pelo evento, PASTOR ou ADMIN.
 * Devolve quem é e se a presença já tinha sido registrada; inscrição não
 * confirmada volta sem check-in para quem está na porta decidir.
 */
create or replace function public.koinonia_evento_checkin(p_evento_id uuid, p_codigo uuid)
returns table (inscricao_id uuid, nome text, status public.koinonia_inscricao_status, checkin_em timestamptz, ja_registrado boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  i public.koinonia_evento_inscricoes;
begin
  if not (public.koinonia_is_admin_or_pastor() or public.koinonia_is_responsavel_evento(p_evento_id)) then
    raise exception 'Só o responsável pelo evento, pastores e administradores fazem check-in.' using errcode = '42501';
  end if;

  select ins.* into i from public.koinonia_evento_inscricoes ins where ins.codigo = p_codigo for update;
  if not found then
    raise exception 'QR Code não reconhecido.' using errcode = 'P0001';
  end if;
  if i.evento_id <> p_evento_id then
    raise exception 'Este QR Code é de outro evento.' using errcode = 'P0001';
  end if;

  if i.status = 'confirmada' and i.checkin_em is null then
    update public.koinonia_evento_inscricoes ins set checkin_em = now() where ins.id = i.id
    returning ins.checkin_em into i.checkin_em;
    return query select i.id, public.koinonia_inscricao_nome(i.id), i.status, i.checkin_em, false;
  else
    return query select i.id, public.koinonia_inscricao_nome(i.id), i.status, i.checkin_em, i.checkin_em is not null;
  end if;
end;
$$;

revoke execute on function
  public.koinonia_evento_confirmar_pagamento(uuid, public.koinonia_forma_pagamento),
  public.koinonia_evento_lotacao(uuid),
  public.koinonia_evento_checkin(uuid, uuid)
from public, anon;
grant execute on function
  public.koinonia_evento_confirmar_pagamento(uuid, public.koinonia_forma_pagamento),
  public.koinonia_evento_lotacao(uuid),
  public.koinonia_evento_checkin(uuid, uuid)
to authenticated;

-- -----------------------------------------------------------------------------
-- RLS: a tesouraria vê e decide inscrições de qualquer evento; o membro pode
-- sair da fila de espera
-- -----------------------------------------------------------------------------
alter policy "koinonia_evento_inscricoes_select" on public.koinonia_evento_inscricoes
  using (
    profile_id = (select auth.uid())
    or (select public.koinonia_is_admin_or_pastor())
    or (select public.koinonia_pode_financeiro())
    or public.koinonia_is_responsavel_evento(evento_id)
  );

alter policy "koinonia_evento_inscricoes_update" on public.koinonia_evento_inscricoes
  using (
    (select public.koinonia_is_admin_or_pastor())
    or (select public.koinonia_pode_financeiro())
    or public.koinonia_is_responsavel_evento(evento_id)
  )
  with check (
    (select public.koinonia_is_admin_or_pastor())
    or (select public.koinonia_pode_financeiro())
    or public.koinonia_is_responsavel_evento(evento_id)
  );

alter policy "koinonia_evento_inscricoes_delete" on public.koinonia_evento_inscricoes
  using (
    (profile_id = (select auth.uid()) and status in ('pendente', 'recusada', 'espera'))
    or (select public.koinonia_is_admin_or_pastor())
    or public.koinonia_is_responsavel_evento(evento_id)
  );
