-- =============================================================================
-- Koinonia — visitantes
--
-- Cadastro de quem visitou a igreja: nome, celular/WhatsApp, data da visita e
-- motivo (opcional). Dado pessoal de quem não tem conta: só quem passa em
-- koinonia_pode_visitantes() vê e cadastra (hoje ADMIN e PASTOR). Para abrir
-- a uma equipe de recepção depois, basta mudar essa função.
-- =============================================================================

create or replace function public.koinonia_pode_visitantes()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.koinonia_is_admin_or_pastor();
$$;

create table public.koinonia_visitantes (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null check (char_length(btrim(nome)) between 2 and 150),
  celular     text not null check (celular ~ '^\d{10,11}$'),
  data_visita date not null default (now() at time zone 'America/Sao_Paulo')::date,
  motivo      text check (char_length(motivo) <= 500),
  created_by  uuid references public.koinonia_profiles (id) on delete set null default auth.uid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index koinonia_visitantes_data_idx on public.koinonia_visitantes (data_visita desc);

create trigger koinonia_visitantes_set_updated_at before update on public.koinonia_visitantes
  for each row execute function public.koinonia_set_updated_at();

revoke all on public.koinonia_visitantes from anon;
grant select, insert, update, delete on public.koinonia_visitantes to authenticated;
alter table public.koinonia_visitantes enable row level security;

create policy "koinonia_visitantes_gerenciar" on public.koinonia_visitantes
  for all to authenticated
  using ((select public.koinonia_pode_visitantes()))
  with check ((select public.koinonia_pode_visitantes()));
