-- =============================================================================
-- Koinonia — acompanhamento de visitantes
--
-- Cada visitante ganha uma situação (novo → em contato → frequentando →
-- membro, ou sem interesse) e um responsável pelo acompanhamento, que pode ser
-- qualquer membro ativo. Os contatos feitos (quando, como e o resultado) ficam
-- registrados. O responsável vê os visitantes que acompanha e registra os
-- contatos deles; ADMIN/PASTOR veem tudo e definem os responsáveis.
--
-- "Tornar membro" cria o usuário com os dados do visitante e liga os dois
-- (profile_id), marcando a situação como membro.
--
-- Resumo diário: no horário configurado, ADMIN e PASTOR recebem
-- "3 visitantes no culto de hoje" (só nos dias com visitante cadastrado).
-- =============================================================================

create type public.koinonia_visitante_situacao as enum ('novo', 'em_contato', 'frequentando', 'membro', 'sem_interesse');
create type public.koinonia_visitante_contato_meio as enum ('whatsapp', 'ligacao', 'visita', 'pessoalmente', 'outro');

alter table public.koinonia_visitantes
  add column situacao       public.koinonia_visitante_situacao not null default 'novo',
  add column responsavel_id uuid references public.koinonia_profiles (id) on delete set null,
  -- perfil criado a partir deste visitante ("tornar membro")
  add column profile_id     uuid unique references public.koinonia_profiles (id) on delete set null;

create index koinonia_visitantes_responsavel_idx on public.koinonia_visitantes (responsavel_id);

create table public.koinonia_visitante_contatos (
  id           uuid primary key default gen_random_uuid(),
  visitante_id uuid not null references public.koinonia_visitantes (id) on delete cascade,
  feito_em     date not null default (now() at time zone 'America/Sao_Paulo')::date,
  meio         public.koinonia_visitante_contato_meio not null,
  resultado    text not null check (char_length(btrim(resultado)) between 2 and 1000),
  created_by   uuid references public.koinonia_profiles (id) on delete set null default auth.uid(),
  created_at   timestamptz not null default now()
);

create index koinonia_visitante_contatos_visitante_idx on public.koinonia_visitante_contatos (visitante_id, feito_em desc);

-- -----------------------------------------------------------------------------
-- Helpers
-- -----------------------------------------------------------------------------
create or replace function public.koinonia_acompanha_visitante(p_visitante_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.koinonia_is_membro_ativo() and exists (
    select 1 from public.koinonia_visitantes where id = p_visitante_id and responsavel_id = (select auth.uid())
  );
$$;

revoke execute on function public.koinonia_acompanha_visitante(uuid) from public, anon;
grant execute on function public.koinonia_acompanha_visitante(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- Só ADMIN/PASTOR definem responsável, situação e vínculo com o perfil
-- (a equipe da porta continua corrigindo nome, celular e motivo do dia).
-- O responsável novo recebe uma notificação.
-- -----------------------------------------------------------------------------
create or replace function public.koinonia_visitantes_acompanhamento()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if current_setting('koinonia.visitante_contato', true) is distinct from 'on'
     and not public.koinonia_pode_visitantes()
     and (
       (tg_op = 'INSERT' and (new.responsavel_id is not null or new.profile_id is not null or new.situacao <> 'novo'))
       or (tg_op = 'UPDATE' and (
         new.responsavel_id is distinct from old.responsavel_id
         or new.profile_id is distinct from old.profile_id
         or new.situacao is distinct from old.situacao
       ))
     ) then
    raise exception 'Só pastores e administradores definem o acompanhamento do visitante.' using errcode = '42501';
  end if;

  if new.responsavel_id is not null
     and (tg_op = 'INSERT' or new.responsavel_id is distinct from old.responsavel_id) then
    if not exists (select 1 from public.koinonia_profiles where id = new.responsavel_id and ativo) then
      raise exception 'O responsável precisa ser um membro ativo.' using errcode = 'P0001';
    end if;
    if new.responsavel_id is distinct from (select auth.uid()) then
      perform public.koinonia_notificar_perfil(
        new.responsavel_id,
        'Acompanhar visitante',
        'Você vai acompanhar ' || new.nome || ', que visitou a igreja em ' || to_char(new.data_visita, 'DD/MM') || '.',
        '/app/visitantes/' || new.id,
        'visitante'
      );
    end if;
  end if;
  return new;
end;
$$;

create trigger koinonia_visitantes_acompanhamento
  before insert or update on public.koinonia_visitantes
  for each row execute function public.koinonia_visitantes_acompanhamento();

-- -----------------------------------------------------------------------------
-- Registrar contato (ADMIN/PASTOR ou o responsável), já mudando a situação
-- -----------------------------------------------------------------------------
create or replace function public.koinonia_visitante_registrar_contato(
  p_visitante_id uuid,
  p_feito_em     date,
  p_meio         public.koinonia_visitante_contato_meio,
  p_resultado    text,
  p_situacao     public.koinonia_visitante_situacao
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id    uuid;
  v_atual public.koinonia_visitante_situacao;
begin
  if not (public.koinonia_pode_visitantes() or public.koinonia_acompanha_visitante(p_visitante_id)) then
    raise exception 'Só quem acompanha este visitante registra contatos.' using errcode = '42501';
  end if;
  if p_feito_em > (now() at time zone 'America/Sao_Paulo')::date then
    raise exception 'A data do contato não pode estar no futuro.' using errcode = 'P0001';
  end if;

  select situacao into v_atual from public.koinonia_visitantes where id = p_visitante_id for update;
  -- "membro" só pelo cadastro do usuário; quem já virou membro continua membro
  if p_situacao = 'membro' and v_atual <> 'membro' then
    raise exception 'Use "Tornar membro" para cadastrar o visitante como membro.' using errcode = 'P0001';
  end if;

  insert into public.koinonia_visitante_contatos (visitante_id, feito_em, meio, resultado)
  values (p_visitante_id, p_feito_em, p_meio, btrim(p_resultado))
  returning id into v_id;

  if v_atual <> 'membro' and p_situacao is distinct from v_atual then
    perform set_config('koinonia.visitante_contato', 'on', true);
    update public.koinonia_visitantes set situacao = p_situacao where id = p_visitante_id;
    perform set_config('koinonia.visitante_contato', '', true);
  end if;
  return v_id;
end;
$$;

revoke execute on function public.koinonia_visitante_registrar_contato(uuid, date, public.koinonia_visitante_contato_meio, text, public.koinonia_visitante_situacao) from public, anon;
grant execute on function public.koinonia_visitante_registrar_contato(uuid, date, public.koinonia_visitante_contato_meio, text, public.koinonia_visitante_situacao) to authenticated;

-- -----------------------------------------------------------------------------
-- Resumo diário para a liderança
-- -----------------------------------------------------------------------------
alter table public.koinonia_notificacao_config
  add column visitantes_resumo_ativo   boolean not null default true,
  add column visitantes_resumo_horario time not null default '21:00';

/**
 * Chamada pelo disparo (cron a cada 5 min). Espelha koinonia_pode_visitantes()
 * (ADMIN e PASTOR): se aquela função mudar, ajuste o filtro de papéis aqui.
 */
create or replace function public.koinonia_visitantes_gerar_resumo()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  c        public.koinonia_notificacao_config;
  v_hoje   date := (now() at time zone 'America/Sao_Paulo')::date;
  v_disparo timestamptz;
  v_qtd    integer;
  v_nomes  text;
begin
  select * into c from public.koinonia_notificacao_config;
  if not found or not c.visitantes_resumo_ativo then return 0; end if;

  v_disparo := (v_hoje + c.visitantes_resumo_horario) at time zone 'America/Sao_Paulo';
  if v_disparo > now() or v_disparo <= now() - interval '3 hours' then return 0; end if;

  select count(*), string_agg(split_part(btrim(nome), ' ', 1), ', ' order by created_at)
    into v_qtd, v_nomes
  from public.koinonia_visitantes
  where data_visita = v_hoje;
  if v_qtd = 0 then return 0; end if;

  insert into public.koinonia_notificacoes (titulo, mensagem, url, origem, publico, publico_id, agendada_para, chave)
  select
    case v_qtd when 1 then '1 visitante no culto de hoje' else v_qtd || ' visitantes no culto de hoje' end,
    left(v_nomes || '. Defina quem vai acompanhar cada um.', 300),
    '/app/visitantes?situacao=novo',
    'visitante',
    'perfil',
    p.id,
    v_disparo,
    format('visitantes:%s:%s', v_hoje, p.id)
  from public.koinonia_profiles p
  where p.ativo and p.role in ('ADMIN', 'PASTOR')
  on conflict (chave) do nothing;
  get diagnostics v_qtd = row_count;
  return v_qtd;
end;
$$;

revoke execute on function public.koinonia_visitantes_gerar_resumo() from public, anon, authenticated;
grant execute on function public.koinonia_visitantes_gerar_resumo() to service_role;

-- -----------------------------------------------------------------------------
-- RLS
--   visitantes: o responsável vê os que acompanha
--   contatos:   ADMIN/PASTOR e o responsável veem; criados pela função acima;
--               quem registrou (ou ADMIN/PASTOR) apaga
-- -----------------------------------------------------------------------------
create policy "koinonia_visitantes_responsavel_select" on public.koinonia_visitantes
  for select to authenticated
  using (responsavel_id = (select auth.uid()) and (select public.koinonia_is_membro_ativo()));

revoke all on public.koinonia_visitante_contatos from anon;
grant select, delete on public.koinonia_visitante_contatos to authenticated;
revoke insert, update on public.koinonia_visitante_contatos from authenticated;
alter table public.koinonia_visitante_contatos enable row level security;

create policy "koinonia_visitante_contatos_select" on public.koinonia_visitante_contatos
  for select to authenticated
  using ((select public.koinonia_pode_visitantes()) or public.koinonia_acompanha_visitante(visitante_id));

create policy "koinonia_visitante_contatos_delete" on public.koinonia_visitante_contatos
  for delete to authenticated
  using ((select public.koinonia_pode_visitantes()) or (created_by = (select auth.uid()) and public.koinonia_acompanha_visitante(visitante_id)));
