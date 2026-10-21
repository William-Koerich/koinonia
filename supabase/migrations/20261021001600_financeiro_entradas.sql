-- =============================================================================
-- Koinonia — financeiro: entradas (dízimos, ofertas, primícias, doações)
--
-- Cada lançamento tem data, categoria, valor e forma de recebimento. Quem
-- contribuiu é opcional: um membro (profile_id) ou um nome livre (quem não
-- tem conta, ex.: doação de fora). Ofertas do culto normalmente ficam sem nome.
--
-- Acesso: só quem passa em koinonia_pode_financeiro() (hoje ADMIN e PASTOR).
-- Para criar um papel de tesouraria depois, basta mudar essa função.
-- =============================================================================

create type public.koinonia_entrada_categoria as enum ('dizimo', 'oferta', 'primicias', 'doacao', 'outra');
create type public.koinonia_forma_pagamento as enum ('pix', 'dinheiro', 'cartao', 'transferencia', 'outra');

create or replace function public.koinonia_pode_financeiro()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.koinonia_is_admin_or_pastor();
$$;

create table public.koinonia_financeiro_entradas (
  id                uuid primary key default gen_random_uuid(),
  data              date not null,
  categoria         public.koinonia_entrada_categoria not null,
  valor             numeric(12, 2) not null check (valor > 0),
  forma_pagamento   public.koinonia_forma_pagamento not null,
  profile_id        uuid references public.koinonia_profiles (id) on delete set null,
  contribuinte_nome text check (char_length(contribuinte_nome) <= 150),
  descricao         text check (char_length(descricao) <= 500),
  created_by        uuid references public.koinonia_profiles (id) on delete set null default auth.uid(),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  -- membro OU nome livre (ou nenhum), nunca os dois
  constraint koinonia_financeiro_entradas_contribuinte check (profile_id is null or contribuinte_nome is null)
);

create index koinonia_financeiro_entradas_data_idx on public.koinonia_financeiro_entradas (data);
create index koinonia_financeiro_entradas_profile_idx on public.koinonia_financeiro_entradas (profile_id);

create trigger koinonia_financeiro_entradas_set_updated_at before update on public.koinonia_financeiro_entradas
  for each row execute function public.koinonia_set_updated_at();

-- -----------------------------------------------------------------------------
-- RLS: nada para anon; autenticados só com permissão de financeiro
-- -----------------------------------------------------------------------------
revoke all on public.koinonia_financeiro_entradas from anon;
grant select, insert, update, delete on public.koinonia_financeiro_entradas to authenticated;
alter table public.koinonia_financeiro_entradas enable row level security;

create policy "koinonia_financeiro_entradas_gerenciar" on public.koinonia_financeiro_entradas
  for all to authenticated
  using ((select public.koinonia_pode_financeiro()))
  with check ((select public.koinonia_pode_financeiro()));
