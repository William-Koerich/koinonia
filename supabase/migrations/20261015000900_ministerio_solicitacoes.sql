-- =============================================================================
-- Koinonia — pedidos para participar de ministérios
--
-- O membro pede para entrar; o líder do ministério, PASTOR ou ADMIN aprova
-- (inserindo o vínculo em koinonia_ministerio_membros) ou recusa (apagando o
-- pedido). Ao entrar no ministério por qualquer caminho, o pedido some.
-- =============================================================================

create table public.koinonia_ministerio_solicitacoes (
  id            uuid primary key default gen_random_uuid(),
  ministerio_id uuid not null references public.koinonia_ministerios (id) on delete cascade,
  profile_id    uuid not null references public.koinonia_profiles (id) on delete cascade,
  created_at    timestamptz not null default now(),
  constraint koinonia_ministerio_solicitacoes_unica unique (ministerio_id, profile_id)
);

create index koinonia_ministerio_solicitacoes_profile_id_idx on public.koinonia_ministerio_solicitacoes (profile_id);

-- o usuário logado já participa deste ministério?
create or replace function public.koinonia_participa_de(p_ministerio_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.koinonia_ministerio_membros
    where ministerio_id = p_ministerio_id and profile_id = (select auth.uid())
  );
$$;

revoke execute on function public.koinonia_participa_de(uuid) from public, anon;
grant execute on function public.koinonia_participa_de(uuid) to authenticated;

-- entrou no ministério (aprovado ou adicionado direto) → pedido resolvido
create or replace function public.koinonia_ministerio_membros_resolver_solicitacao()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.koinonia_ministerio_solicitacoes
  where ministerio_id = new.ministerio_id and profile_id = new.profile_id;
  return null;
end;
$$;

create trigger koinonia_ministerio_membros_resolver_solicitacao
  after insert on public.koinonia_ministerio_membros
  for each row execute function public.koinonia_ministerio_membros_resolver_solicitacao();

-- -----------------------------------------------------------------------------
-- RLS
--   ver:      os próprios pedidos | ADMIN/PASTOR | líder do ministério
--   pedir:    só para si, sendo membro ativo e ainda não participando
--   cancelar/recusar: o próprio | ADMIN/PASTOR | líder do ministério
-- -----------------------------------------------------------------------------
revoke all on public.koinonia_ministerio_solicitacoes from anon;
grant select, insert, delete on public.koinonia_ministerio_solicitacoes to authenticated;
alter table public.koinonia_ministerio_solicitacoes enable row level security;

create policy "koinonia_ministerio_solicitacoes_select" on public.koinonia_ministerio_solicitacoes
  for select to authenticated
  using (
    profile_id = (select auth.uid())
    or (select public.koinonia_is_admin_or_pastor())
    or public.koinonia_is_lider_of(ministerio_id)
  );

create policy "koinonia_ministerio_solicitacoes_insert" on public.koinonia_ministerio_solicitacoes
  for insert to authenticated
  with check (
    profile_id = (select auth.uid())
    and (select public.koinonia_is_membro_ativo())
    and not public.koinonia_participa_de(ministerio_id)
  );

create policy "koinonia_ministerio_solicitacoes_delete" on public.koinonia_ministerio_solicitacoes
  for delete to authenticated
  using (
    profile_id = (select auth.uid())
    or (select public.koinonia_is_admin_or_pastor())
    or public.koinonia_is_lider_of(ministerio_id)
  );
