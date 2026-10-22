-- =============================================================================
-- Koinonia — notificações push (PWA / Web Push)
--
-- koinonia_push_inscricoes   aparelhos que aceitaram receber notificações
-- koinonia_notificacao_config regras automáticas (uma linha): escala, avisos, eventos
-- koinonia_notificacoes       fila + histórico de tudo o que foi/será enviado
--
-- Fluxo: a cada 5 min o pg_cron chama /api/notificacoes/disparar (Vercel), que
--   1) koinonia_notificacoes_gerar_automaticas(): põe na fila os lembretes de
--      escala e de eventos que venceram agora (a "chave" impede repetição);
--   2) koinonia_notificacoes_reservar(): pega o que está agendado até agora;
--   3) koinonia_notificacao_destinos(id): aparelhos de quem deve receber;
--   4) envia (web-push) e registra o resultado.
-- Avisos novos, eventos novos e notificações "enviar agora" entram na fila
-- pelas Server Actions e são enviados na hora (sem esperar o cron).
-- =============================================================================

create type public.koinonia_notificacao_origem as enum ('manual', 'aviso', 'evento', 'escala');
create type public.koinonia_notificacao_publico as enum ('todos', 'homens', 'mulheres', 'ministerio', 'gc', 'perfil');
create type public.koinonia_notificacao_status as enum ('agendada', 'enviando', 'enviada', 'cancelada');

-- -----------------------------------------------------------------------------
-- Aparelhos inscritos
-- -----------------------------------------------------------------------------
create table public.koinonia_push_inscricoes (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.koinonia_profiles (id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  user_agent  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index koinonia_push_inscricoes_profile_idx on public.koinonia_push_inscricoes (profile_id);

revoke all on public.koinonia_push_inscricoes from anon, authenticated;
grant select on public.koinonia_push_inscricoes to authenticated;
alter table public.koinonia_push_inscricoes enable row level security;

-- cada um vê os próprios aparelhos; ADMIN/PASTOR veem todos (para contar)
create policy "koinonia_push_inscricoes_select" on public.koinonia_push_inscricoes
  for select to authenticated
  using (profile_id = (select auth.uid()) or (select public.koinonia_is_admin_or_pastor()));

/**
 * Inscreve este aparelho para o usuário logado. Se o aparelho já estava ligado
 * a outra conta (troca de login), passa a ser deste usuário.
 */
create or replace function public.koinonia_push_inscrever(p_endpoint text, p_p256dh text, p_auth text, p_user_agent text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null or not public.koinonia_is_membro_ativo() then
    raise exception 'Faça login para ativar as notificações.' using errcode = '42501';
  end if;

  insert into public.koinonia_push_inscricoes (profile_id, endpoint, p256dh, auth, user_agent)
  values ((select auth.uid()), p_endpoint, p_p256dh, p_auth, left(p_user_agent, 300))
  on conflict (endpoint) do update
    set profile_id = excluded.profile_id,
        p256dh = excluded.p256dh,
        auth = excluded.auth,
        user_agent = excluded.user_agent,
        updated_at = now();
end;
$$;

create or replace function public.koinonia_push_cancelar(p_endpoint text)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.koinonia_push_inscricoes where endpoint = p_endpoint and profile_id = (select auth.uid());
$$;

revoke execute on function public.koinonia_push_inscrever(text, text, text, text), public.koinonia_push_cancelar(text) from public, anon;
grant execute on function public.koinonia_push_inscrever(text, text, text, text), public.koinonia_push_cancelar(text) to authenticated;

-- -----------------------------------------------------------------------------
-- Regras automáticas (linha única)
-- -----------------------------------------------------------------------------
create table public.koinonia_notificacao_config (
  id                   boolean primary key default true check (id),
  -- escala: um lembrete por dia, a partir de N dias antes até o dia
  escala_ativo         boolean not null default true,
  escala_dias_antes    smallint not null default 6 check (escala_dias_antes between 0 and 30),
  escala_horario       time not null default '09:00',
  -- avisos: notifica quando um aviso é publicado
  aviso_ativo          boolean not null default true,
  -- eventos
  evento_ao_cadastrar  boolean not null default true,
  evento_dias_antes    smallint[] not null default '{15,7,0}', -- 0 = no dia
  evento_horario       time not null default '09:00',          -- horário dos lembretes acima
  evento_na_hora       boolean not null default true,
  evento_minutos_antes smallint not null default 0 check (evento_minutos_antes between 0 and 1440),
  updated_at           timestamptz not null default now(),
  constraint koinonia_notificacao_config_dias check (
    evento_dias_antes <@ array[0,1,2,3,4,5,6,7,10,14,15,21,30,45,60]::smallint[]
  )
);

insert into public.koinonia_notificacao_config default values;

create trigger koinonia_notificacao_config_set_updated_at before update on public.koinonia_notificacao_config
  for each row execute function public.koinonia_set_updated_at();

revoke all on public.koinonia_notificacao_config from anon;
grant select, update on public.koinonia_notificacao_config to authenticated;
alter table public.koinonia_notificacao_config enable row level security;

create policy "koinonia_notificacao_config_gerenciar" on public.koinonia_notificacao_config
  for all to authenticated
  using ((select public.koinonia_is_admin_or_pastor()))
  with check ((select public.koinonia_is_admin_or_pastor()));

-- -----------------------------------------------------------------------------
-- Fila / histórico
-- -----------------------------------------------------------------------------
create table public.koinonia_notificacoes (
  id             uuid primary key default gen_random_uuid(),
  titulo         text not null check (char_length(titulo) between 1 and 100),
  mensagem       text check (char_length(mensagem) <= 300),
  url            text not null default '/app' check (url ~ '^/[^/]'),
  origem         public.koinonia_notificacao_origem not null default 'manual',
  publico        public.koinonia_notificacao_publico not null default 'todos',
  publico_id     uuid, -- ministério, GC ou perfil, conforme "publico"
  agendada_para  timestamptz not null default now(),
  status         public.koinonia_notificacao_status not null default 'agendada',
  chave          text unique, -- evita repetir lembretes automáticos (ex.: evento:<id>:d7)
  enviadas       integer not null default 0,
  falhas         integer not null default 0,
  enviada_em     timestamptz,
  created_by     uuid references public.koinonia_profiles (id) on delete set null default auth.uid(),
  created_at     timestamptz not null default now(),
  constraint koinonia_notificacoes_publico_id check (
    (publico in ('ministerio', 'gc', 'perfil')) = (publico_id is not null)
  )
);

create index koinonia_notificacoes_fila_idx on public.koinonia_notificacoes (status, agendada_para);

revoke all on public.koinonia_notificacoes from anon;
grant select, insert, update, delete on public.koinonia_notificacoes to authenticated;
alter table public.koinonia_notificacoes enable row level security;

create policy "koinonia_notificacoes_gerenciar" on public.koinonia_notificacoes
  for all to authenticated
  using ((select public.koinonia_is_admin_or_pastor()))
  with check ((select public.koinonia_is_admin_or_pastor()));

-- -----------------------------------------------------------------------------
-- Lembretes automáticos que venceram agora → fila. Janela de 3h (escala: 12h)
-- para tolerar atraso do cron; a "chave" garante que cada um sai uma vez só.
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
      left(format('%s (%s) · %s', s.descricao, to_char(s.data, 'DD/MM'), f.funcao), 300),
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
    on conflict (chave) do nothing;
    get diagnostics v_qtd = row_count;
    v_total := v_total + v_qtd;
  end if;

  return v_total;
end;
$$;

/** Marca como "enviando" e devolve o que está agendado até agora (sem pegar duas vezes) */
create or replace function public.koinonia_notificacoes_reservar(p_limite integer default 50)
returns setof public.koinonia_notificacoes
language sql
security definer
set search_path = ''
as $$
  update public.koinonia_notificacoes n
     set status = 'enviando'
   where n.id in (
     select id from public.koinonia_notificacoes
      where status = 'agendada' and agendada_para <= now()
      order by agendada_para
      limit p_limite
      for update skip locked
   )
  returning n.*;
$$;

/** Aparelhos de quem deve receber a notificação (só membros ativos) */
create or replace function public.koinonia_notificacao_destinos(p_notificacao_id uuid)
returns table (inscricao_id uuid, endpoint text, p256dh text, auth text)
language sql
stable
security definer
set search_path = ''
as $$
  select i.id, i.endpoint, i.p256dh, i.auth
    from public.koinonia_notificacoes n
    join public.koinonia_profiles p on p.ativo
    join public.koinonia_push_inscricoes i on i.profile_id = p.id
   where n.id = p_notificacao_id
     and case n.publico
           when 'todos' then true
           when 'homens' then p.genero = 'masculino'
           when 'mulheres' then p.genero = 'feminino'
           when 'perfil' then p.id = n.publico_id
           when 'gc' then p.gc_id = n.publico_id
           when 'ministerio' then exists (
             select 1 from public.koinonia_ministerio_membros mm
              where mm.ministerio_id = n.publico_id and mm.profile_id = p.id)
         end;
$$;

-- só o servidor (chave secreta) roda o disparo
revoke execute on function
  public.koinonia_notificacoes_gerar_automaticas(),
  public.koinonia_notificacoes_reservar(integer),
  public.koinonia_notificacao_destinos(uuid)
from public, anon, authenticated;
grant execute on function
  public.koinonia_notificacoes_gerar_automaticas(),
  public.koinonia_notificacoes_reservar(integer),
  public.koinonia_notificacao_destinos(uuid)
to service_role;
