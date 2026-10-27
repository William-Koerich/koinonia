-- =============================================================================
-- Koinonia — escala: confirmação, indisponibilidade, trocas e ensaio
--
-- Confirmação      cada pessoa escalada confirma ou recusa (com motivo) pelo
--                  app; ADMIN/PASTOR veem quem ainda não respondeu.
-- Indisponibilidade o membro marca os dias em que não pode servir; ao montar
--                  a escala a pessoa aparece como indisponível.
-- Trocas           quem está escalado pede para outro voluntário da mesma
--                  função assumir; o substituto aceita e ADMIN/PASTOR aprovam.
-- Ensaio           horário, local e repertório junto da escala.
--
-- O membro não altera as tabelas diretamente: responder e trocar passam por
-- funções security definer que validam quem pode o quê e já põem as
-- notificações na fila (o envio sai logo depois, pela Server Action).
-- =============================================================================

create type public.koinonia_escala_resposta as enum ('pendente', 'confirmado', 'recusado');
create type public.koinonia_escala_troca_status as enum (
  'aguardando_substituto', 'aguardando_lider', 'aprovada', 'recusada', 'cancelada'
);

-- -----------------------------------------------------------------------------
-- Confirmação
-- -----------------------------------------------------------------------------
alter table public.koinonia_escala_atribuicoes
  add column resposta      public.koinonia_escala_resposta not null default 'pendente',
  add column respondido_em timestamptz,
  add column motivo_recusa text check (char_length(motivo_recusa) <= 300);

-- escalas que já passaram contam como confirmadas; as próximas ficam pendentes
update public.koinonia_escala_atribuicoes a
   set resposta = 'confirmado', respondido_em = a.created_at
  from public.koinonia_escalas s
 where s.id = a.escala_id and s.data < (now() at time zone 'America/Sao_Paulo')::date;

/** Trocar a pessoa de uma vaga zera a resposta (salvo numa troca aprovada, em que o substituto já aceitou) */
create or replace function public.koinonia_escala_atribuicoes_resetar_resposta()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.profile_id <> old.profile_id and coalesce(current_setting('koinonia.escala_troca', true), '') <> 'on' then
    new.resposta := 'pendente';
    new.respondido_em := null;
    new.motivo_recusa := null;
  end if;
  return new;
end;
$$;

create trigger koinonia_escala_atribuicoes_resetar_resposta
  before update of profile_id on public.koinonia_escala_atribuicoes
  for each row execute function public.koinonia_escala_atribuicoes_resetar_resposta();

-- -----------------------------------------------------------------------------
-- Ensaio
-- -----------------------------------------------------------------------------
alter table public.koinonia_escalas
  add column ensaio_em     timestamptz,
  add column ensaio_local  text check (char_length(ensaio_local) <= 150),
  add column repertorio    text check (char_length(repertorio) <= 4000);

-- -----------------------------------------------------------------------------
-- Indisponibilidade
-- -----------------------------------------------------------------------------
create table public.koinonia_escala_indisponibilidades (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null default auth.uid() references public.koinonia_profiles (id) on delete cascade,
  data_inicio date not null,
  data_fim    date not null,
  motivo      text check (char_length(motivo) <= 200),
  created_at  timestamptz not null default now(),
  constraint koinonia_escala_indisponibilidades_periodo check (data_fim between data_inicio and data_inicio + 120)
);

create index koinonia_escala_indisponibilidades_profile_idx on public.koinonia_escala_indisponibilidades (profile_id);
create index koinonia_escala_indisponibilidades_periodo_idx on public.koinonia_escala_indisponibilidades (data_fim, data_inicio);

revoke all on public.koinonia_escala_indisponibilidades from anon;
grant select, insert, delete on public.koinonia_escala_indisponibilidades to authenticated;
alter table public.koinonia_escala_indisponibilidades enable row level security;

-- cada um vê as suas; ADMIN/PASTOR veem todas (para montar a escala)
create policy "koinonia_escala_indisponibilidades_select" on public.koinonia_escala_indisponibilidades
  for select to authenticated
  using (
    (select public.koinonia_is_membro_ativo())
    and (profile_id = (select auth.uid()) or (select public.koinonia_is_admin_or_pastor()))
  );

create policy "koinonia_escala_indisponibilidades_insert" on public.koinonia_escala_indisponibilidades
  for insert to authenticated
  with check (
    (select public.koinonia_is_membro_ativo())
    and profile_id = (select auth.uid())
    and data_inicio >= (select public.koinonia_hoje_sp())
  );

create policy "koinonia_escala_indisponibilidades_delete" on public.koinonia_escala_indisponibilidades
  for delete to authenticated
  using ((select public.koinonia_is_membro_ativo()) and profile_id = (select auth.uid()));

/** A pessoa marcou que não pode servir nesta data */
create or replace function public.koinonia_escala_indisponivel(p_profile_id uuid, p_data date)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.koinonia_escala_indisponibilidades
     where profile_id = p_profile_id and p_data between data_inicio and data_fim
  );
$$;

revoke execute on function public.koinonia_escala_indisponivel(uuid, date) from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- Trocas
-- -----------------------------------------------------------------------------
create table public.koinonia_escala_trocas (
  id             uuid primary key default gen_random_uuid(),
  atribuicao_id  uuid not null references public.koinonia_escala_atribuicoes (id) on delete cascade,
  solicitante_id uuid not null references public.koinonia_profiles (id) on delete cascade,
  substituto_id  uuid not null references public.koinonia_profiles (id) on delete cascade,
  motivo         text check (char_length(motivo) <= 300),
  status         public.koinonia_escala_troca_status not null default 'aguardando_substituto',
  respondida_em  timestamptz, -- resposta do substituto
  decidida_em    timestamptz, -- aprovação/recusa da liderança
  decidida_por   uuid references public.koinonia_profiles (id) on delete set null,
  created_at     timestamptz not null default now(),
  constraint koinonia_escala_trocas_pessoas check (solicitante_id <> substituto_id)
);

-- um pedido em andamento por vaga
create unique index koinonia_escala_trocas_em_andamento_idx on public.koinonia_escala_trocas (atribuicao_id)
  where status in ('aguardando_substituto', 'aguardando_lider');
create index koinonia_escala_trocas_solicitante_idx on public.koinonia_escala_trocas (solicitante_id);
create index koinonia_escala_trocas_substituto_idx on public.koinonia_escala_trocas (substituto_id);
create index koinonia_escala_trocas_decidida_por_idx on public.koinonia_escala_trocas (decidida_por);

revoke all on public.koinonia_escala_trocas from anon;
grant select on public.koinonia_escala_trocas to authenticated;
alter table public.koinonia_escala_trocas enable row level security;

create policy "koinonia_escala_trocas_select" on public.koinonia_escala_trocas
  for select to authenticated
  using (
    (select public.koinonia_is_membro_ativo())
    and (
      solicitante_id = (select auth.uid())
      or substituto_id = (select auth.uid())
      or (select public.koinonia_is_admin_or_pastor())
    )
  );

-- -----------------------------------------------------------------------------
-- Notificações das respostas e trocas (fila; uso interno das funções abaixo)
-- -----------------------------------------------------------------------------
create or replace function public.koinonia_escala_notificar(p_profile_id uuid, p_titulo text, p_mensagem text, p_url text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.koinonia_notificacoes (titulo, mensagem, url, origem, publico, publico_id)
  values (left(p_titulo, 100), left(p_mensagem, 300), p_url, 'escala', 'perfil', p_profile_id);
$$;

/** Avisa ADMIN e PASTORES (quem monta e aprova a escala) */
create or replace function public.koinonia_escala_notificar_lideranca(p_titulo text, p_mensagem text, p_url text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.koinonia_notificacoes (titulo, mensagem, url, origem, publico, publico_id)
  select left(p_titulo, 100), left(p_mensagem, 300), p_url, 'escala', 'perfil', p.id
    from public.koinonia_profiles p
   where p.ativo and p.role in ('ADMIN', 'PASTOR') and p.id <> coalesce((select auth.uid()), gen_random_uuid());
$$;

revoke execute on function
  public.koinonia_escala_notificar(uuid, text, text, text),
  public.koinonia_escala_notificar_lideranca(text, text, text)
from public, anon, authenticated;

/** "Culto de Domingo (02/11) · DataShow" */
create or replace function public.koinonia_escala_rotulo(p_atribuicao_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select format('%s (%s) · %s', s.descricao, to_char(s.data, 'DD/MM'), f.funcao)
    from public.koinonia_escala_atribuicoes a
    join public.koinonia_escalas s on s.id = a.escala_id
    join public.koinonia_escala_funcoes f on f.id = a.funcao_id
   where a.id = p_atribuicao_id;
$$;

revoke execute on function public.koinonia_escala_rotulo(uuid) from public, anon, authenticated;

create or replace function public.koinonia_primeiro_nome(p_profile_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select split_part(nome_completo, ' ', 1) from public.koinonia_profiles where id = p_profile_id;
$$;

revoke execute on function public.koinonia_primeiro_nome(uuid) from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- Confirmar / recusar
-- -----------------------------------------------------------------------------
create or replace function public.koinonia_escala_responder(p_atribuicao_id uuid, p_confirmar boolean, p_motivo text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.koinonia_escala_atribuicoes;
  v_data date;
begin
  if not public.koinonia_is_membro_ativo() then
    raise exception 'Você não tem permissão para esta ação.' using errcode = '42501';
  end if;

  select at.* into a from public.koinonia_escala_atribuicoes at
   where at.id = p_atribuicao_id and at.profile_id = (select auth.uid())
   for update;
  if not found then
    raise exception 'Você não está nesta escala.' using errcode = '42501';
  end if;

  select data into v_data from public.koinonia_escalas where id = a.escala_id;
  if v_data < public.koinonia_hoje_sp() then
    raise exception 'Esta escala já passou.' using errcode = 'P0001';
  end if;

  update public.koinonia_escala_atribuicoes
     set resposta = case when p_confirmar then 'confirmado' else 'recusado' end::public.koinonia_escala_resposta,
         respondido_em = now(),
         motivo_recusa = case when p_confirmar then null else nullif(left(btrim(p_motivo), 300), '') end
   where id = a.id;

  -- recusou: pedido de troca em andamento perde o sentido; a liderança precisa repor a vaga
  if not p_confirmar and a.resposta <> 'recusado' then
    update public.koinonia_escala_trocas
       set status = 'cancelada'
     where atribuicao_id = a.id and status in ('aguardando_substituto', 'aguardando_lider');

    perform public.koinonia_escala_notificar_lideranca(
      format('%s não poderá servir', public.koinonia_primeiro_nome(a.profile_id)),
      public.koinonia_escala_rotulo(a.id) || coalesce(' · ' || nullif(btrim(p_motivo), ''), ''),
      '/app/escala/' || a.escala_id
    );
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- Trocas
-- -----------------------------------------------------------------------------

/**
 * Quem pode assumir a vaga: membros ativos que já serviram nesta função,
 * menos quem já está nesta escala. Indica quem marcou indisponibilidade.
 */
create or replace function public.koinonia_escala_troca_candidatos(p_atribuicao_id uuid)
returns table (id uuid, nome_completo text, indisponivel boolean)
language sql
stable
security definer
set search_path = ''
as $$
  with vaga as (
    select a.escala_id, a.funcao_id, s.data
      from public.koinonia_escala_atribuicoes a
      join public.koinonia_escalas s on s.id = a.escala_id
     where a.id = p_atribuicao_id
       and (a.profile_id = (select auth.uid()) or public.koinonia_is_admin_or_pastor())
       and public.koinonia_is_membro_ativo()
  )
  select p.id, p.nome_completo, public.koinonia_escala_indisponivel(p.id, v.data)
    from vaga v
    join public.koinonia_profiles p on p.ativo
   where exists (
           select 1 from public.koinonia_escala_atribuicoes o
            where o.funcao_id = v.funcao_id and o.profile_id = p.id)
     and not exists (
           select 1 from public.koinonia_escala_atribuicoes o
            where o.escala_id = v.escala_id and o.profile_id = p.id)
   order by p.nome_completo;
$$;

create or replace function public.koinonia_escala_troca_solicitar(p_atribuicao_id uuid, p_substituto_id uuid, p_motivo text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  a      public.koinonia_escala_atribuicoes;
  v_data date;
  v_id   uuid;
begin
  if not public.koinonia_is_membro_ativo() then
    raise exception 'Você não tem permissão para esta ação.' using errcode = '42501';
  end if;

  select at.* into a from public.koinonia_escala_atribuicoes at
   where at.id = p_atribuicao_id and at.profile_id = (select auth.uid())
   for update;
  if not found then
    raise exception 'Você não está nesta escala.' using errcode = '42501';
  end if;

  select data into v_data from public.koinonia_escalas where id = a.escala_id;
  if v_data < public.koinonia_hoje_sp() then
    raise exception 'Esta escala já passou.' using errcode = 'P0001';
  end if;

  if not exists (select 1 from public.koinonia_escala_troca_candidatos(p_atribuicao_id) c where c.id = p_substituto_id) then
    raise exception 'Escolha alguém que já serviu nesta função e não está nesta escala.' using errcode = 'P0001';
  end if;
  if public.koinonia_escala_indisponivel(p_substituto_id, v_data) then
    raise exception 'Essa pessoa marcou que não pode servir neste dia.' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.koinonia_escala_trocas
              where atribuicao_id = a.id and status in ('aguardando_substituto', 'aguardando_lider')) then
    raise exception 'Já existe um pedido de troca em andamento para esta escala.' using errcode = 'P0001';
  end if;

  insert into public.koinonia_escala_trocas (atribuicao_id, solicitante_id, substituto_id, motivo)
  values (a.id, a.profile_id, p_substituto_id, nullif(left(btrim(p_motivo), 300), ''))
  returning id into v_id;

  perform public.koinonia_escala_notificar(
    p_substituto_id,
    format('%s pediu uma troca na escala', public.koinonia_primeiro_nome(a.profile_id)),
    public.koinonia_escala_rotulo(a.id) || ' · Toque para responder',
    '/app/escala'
  );
  return v_id;
end;
$$;

/** O substituto aceita (vai para a liderança aprovar) ou recusa */
create or replace function public.koinonia_escala_troca_responder(p_troca_id uuid, p_aceitar boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  t public.koinonia_escala_trocas;
begin
  select tr.* into t from public.koinonia_escala_trocas tr
   where tr.id = p_troca_id and tr.substituto_id = (select auth.uid()) and public.koinonia_is_membro_ativo()
   for update;
  if not found then
    raise exception 'Pedido de troca não encontrado.' using errcode = '42501';
  end if;
  if t.status <> 'aguardando_substituto' then
    raise exception 'Este pedido já foi respondido.' using errcode = 'P0001';
  end if;
  if p_aceitar and public.koinonia_escala_indisponivel(
       t.substituto_id,
       (select s.data from public.koinonia_escala_atribuicoes a join public.koinonia_escalas s on s.id = a.escala_id where a.id = t.atribuicao_id)
     ) then
    raise exception 'Você marcou que não pode servir neste dia. Remova a indisponibilidade antes de aceitar.' using errcode = 'P0001';
  end if;

  update public.koinonia_escala_trocas
     set status = case when p_aceitar then 'aguardando_lider' else 'recusada' end::public.koinonia_escala_troca_status,
         respondida_em = now()
   where id = t.id;

  if p_aceitar then
    perform public.koinonia_escala_notificar_lideranca(
      'Troca na escala para aprovar',
      format('%s → %s · %s', public.koinonia_primeiro_nome(t.solicitante_id), public.koinonia_primeiro_nome(t.substituto_id),
             public.koinonia_escala_rotulo(t.atribuicao_id)),
      '/app/escala'
    );
  else
    perform public.koinonia_escala_notificar(
      t.solicitante_id,
      format('%s não pode assumir sua escala', public.koinonia_primeiro_nome(t.substituto_id)),
      public.koinonia_escala_rotulo(t.atribuicao_id) || ' · Peça para outra pessoa',
      '/app/escala'
    );
  end if;
end;
$$;

/** ADMIN/PASTOR aprovam (a vaga passa para o substituto, já confirmado) ou recusam */
create or replace function public.koinonia_escala_troca_decidir(p_troca_id uuid, p_aprovar boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  t public.koinonia_escala_trocas;
  v_escala uuid;
begin
  if not public.koinonia_is_admin_or_pastor() then
    raise exception 'Só a liderança aprova trocas na escala.' using errcode = '42501';
  end if;

  select tr.* into t from public.koinonia_escala_trocas tr where tr.id = p_troca_id for update;
  if not found then
    raise exception 'Pedido de troca não encontrado.' using errcode = 'P0001';
  end if;
  if p_aprovar and t.status <> 'aguardando_lider' then
    raise exception 'A troca só pode ser aprovada depois que o substituto aceitar.' using errcode = 'P0001';
  end if;
  if not p_aprovar and t.status not in ('aguardando_substituto', 'aguardando_lider') then
    raise exception 'Este pedido já foi encerrado.' using errcode = 'P0001';
  end if;

  if p_aprovar then
    -- o trigger de validação confere de novo vagas, pessoa ativa e duplicidade;
    -- o sinalizador impede o outro trigger de zerar a resposta do substituto
    perform set_config('koinonia.escala_troca', 'on', true);
    update public.koinonia_escala_atribuicoes
       set profile_id = t.substituto_id,
           resposta = 'confirmado',
           respondido_em = now(),
           motivo_recusa = null
     where id = t.atribuicao_id and profile_id = t.solicitante_id
    returning escala_id into v_escala;
    perform set_config('koinonia.escala_troca', '', true);
    if v_escala is null then
      raise exception 'A escala mudou desde o pedido. Confira a escala e peça a troca de novo.' using errcode = 'P0001';
    end if;
  end if;

  update public.koinonia_escala_trocas
     set status = case when p_aprovar then 'aprovada' else 'recusada' end::public.koinonia_escala_troca_status,
         decidida_em = now(),
         decidida_por = (select auth.uid())
   where id = t.id;

  perform public.koinonia_escala_notificar(
    t.solicitante_id,
    case when p_aprovar then 'Troca aprovada' else 'Troca não aprovada' end,
    case when p_aprovar
      then format('%s vai servir no seu lugar · %s', public.koinonia_primeiro_nome(t.substituto_id), public.koinonia_escala_rotulo(t.atribuicao_id))
      else public.koinonia_escala_rotulo(t.atribuicao_id) || ' · Você continua na escala'
    end,
    '/app/escala'
  );
  if t.status = 'aguardando_lider' then
    perform public.koinonia_escala_notificar(
      t.substituto_id,
      case when p_aprovar then 'Você entrou na escala' else 'Troca não aprovada' end,
      public.koinonia_escala_rotulo(t.atribuicao_id),
      '/app/escala'
    );
  end if;
end;
$$;

/** Quem pediu desiste enquanto o pedido está em andamento */
create or replace function public.koinonia_escala_troca_cancelar(p_troca_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.koinonia_escala_trocas
     set status = 'cancelada'
   where id = p_troca_id
     and solicitante_id = (select auth.uid())
     and status in ('aguardando_substituto', 'aguardando_lider');
  if not found then
    raise exception 'Pedido de troca não encontrado ou já encerrado.' using errcode = 'P0001';
  end if;
end;
$$;

revoke execute on function
  public.koinonia_escala_responder(uuid, boolean, text),
  public.koinonia_escala_troca_candidatos(uuid),
  public.koinonia_escala_troca_solicitar(uuid, uuid, text),
  public.koinonia_escala_troca_responder(uuid, boolean),
  public.koinonia_escala_troca_decidir(uuid, boolean),
  public.koinonia_escala_troca_cancelar(uuid)
from public, anon;
grant execute on function
  public.koinonia_escala_responder(uuid, boolean, text),
  public.koinonia_escala_troca_candidatos(uuid),
  public.koinonia_escala_troca_solicitar(uuid, uuid, text),
  public.koinonia_escala_troca_responder(uuid, boolean),
  public.koinonia_escala_troca_decidir(uuid, boolean),
  public.koinonia_escala_troca_cancelar(uuid)
to authenticated;

-- -----------------------------------------------------------------------------
-- Lembrete diário da escala: quem recusou não recebe; quem não respondeu é
-- lembrado de confirmar. (Mesma função de 20261022001800, só muda a escala.)
-- -----------------------------------------------------------------------------
create or replace function public.koinonia_notificacoes_gerar_automaticas()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  c       public.koinonia_notificacao_config;
  v_hoje  date := (now() at time zone 'America/Sao_Paulo')::date;
  v_qtd   integer;
  v_total integer := 0;
begin
  select * into c from public.koinonia_notificacao_config;
  if not found then return 0; end if;

  -- eventos: N dias antes (0 = no dia), no horário configurado
  insert into public.koinonia_notificacoes (titulo, mensagem, url, origem, publico, agendada_para, chave)
  select
    left(case d when 0 then 'Hoje: ' when 1 then 'Amanhã: ' else format('Faltam %s dias: ', d) end || e.titulo, 100),
    left(format('%s às %s · %s, %s', to_char(e.inicio at time zone 'America/Sao_Paulo', 'DD/MM'),
                to_char(e.inicio at time zone 'America/Sao_Paulo', 'HH24:MI'), e.logradouro, e.bairro), 300),
    '/app/eventos/' || e.id,
    'evento',
    e.publico::text::public.koinonia_notificacao_publico,
    disparo,
    format('evento:%s:d%s', e.id, d)
  from public.koinonia_eventos e
  cross join unnest(c.evento_dias_antes) as d
  cross join lateral (
    select (((e.inicio at time zone 'America/Sao_Paulo')::date - d) + c.evento_horario) at time zone 'America/Sao_Paulo' as disparo
  ) x
  where e.inicio > now()
    and x.disparo <= now()
    and x.disparo > now() - interval '3 hours'
    and x.disparo < e.inicio
  on conflict (chave) do nothing;
  get diagnostics v_qtd = row_count;
  v_total := v_total + v_qtd;

  -- eventos: na hora (ou X minutos antes)
  if c.evento_na_hora then
    insert into public.koinonia_notificacoes (titulo, mensagem, url, origem, publico, agendada_para, chave)
    select
      left(case when c.evento_minutos_antes = 0 then 'Começando agora: ' else format('Em %s min: ', c.evento_minutos_antes) end || e.titulo, 100),
      left(format('%s, %s', e.logradouro, e.bairro), 300),
      '/app/eventos/' || e.id,
      'evento',
      e.publico::text::public.koinonia_notificacao_publico,
      e.inicio - make_interval(mins => c.evento_minutos_antes),
      format('evento:%s:hora', e.id)
    from public.koinonia_eventos e
    where e.inicio - make_interval(mins => c.evento_minutos_antes) <= now()
      and e.inicio - make_interval(mins => c.evento_minutos_antes) > now() - interval '3 hours'
    on conflict (chave) do nothing;
    get diagnostics v_qtd = row_count;
    v_total := v_total + v_qtd;
  end if;

  -- escala: um lembrete por dia para cada pessoa escalada nos próximos N dias
  if c.escala_ativo
     and now() >= (v_hoje + c.escala_horario) at time zone 'America/Sao_Paulo'
     and now() < ((v_hoje + c.escala_horario) at time zone 'America/Sao_Paulo') + interval '12 hours' then
    insert into public.koinonia_notificacoes (titulo, mensagem, url, origem, publico, publico_id, agendada_para, chave)
    select
      case s.data - v_hoje
        when 0 then 'Hoje você está na escala'
        when 1 then 'Amanhã você está na escala'
        else format('Você está na escala em %s dias', s.data - v_hoje)
      end,
      left(format('%s (%s) · %s', s.descricao, to_char(s.data, 'DD/MM'), f.funcao)
           || case when a.resposta = 'pendente' then ' · Confirme sua presença' else '' end, 300),
      '/app/escala/' || s.id,
      'escala',
      'perfil',
      a.profile_id,
      now(),
      format('escala:%s:%s', a.id, v_hoje)
    from public.koinonia_escala_atribuicoes a
    join public.koinonia_escalas s on s.id = a.escala_id
    join public.koinonia_escala_funcoes f on f.id = a.funcao_id
    where s.data between v_hoje and v_hoje + c.escala_dias_antes
      and a.resposta <> 'recusado'
    on conflict (chave) do nothing;
    get diagnostics v_qtd = row_count;
    v_total := v_total + v_qtd;
  end if;

  return v_total;
end;
$$;

revoke execute on function public.koinonia_notificacoes_gerar_automaticas() from public, anon, authenticated;
grant execute on function public.koinonia_notificacoes_gerar_automaticas() to service_role;
