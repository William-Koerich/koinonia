-- =============================================================================
-- Koinonia — cardápio e reservas da cantina
--
-- A equipe escalada na data (participantes do GC e membros do ministério da
-- escala de cantina), PASTOR e ADMIN montam o cardápio. Qualquer membro ativo
-- reserva itens: quantidade e se vai levar para casa ou comer na igreja.
-- Reservas valem até o dia da cantina; o estoque (se informado) é respeitado.
-- =============================================================================

create type public.koinonia_cantina_modo as enum ('levar', 'comer_aqui');

create table public.koinonia_cantina_itens (
  id                    uuid primary key default gen_random_uuid(),
  cantina_id            uuid not null references public.koinonia_cantina_escalas (id) on delete cascade,
  nome                  text not null check (char_length(btrim(nome)) between 2 and 100),
  descricao             text check (char_length(descricao) <= 300),
  preco                 numeric(10, 2) check (preco is null or preco >= 0),
  -- null = sem limite
  quantidade_disponivel integer check (quantidade_disponivel is null or quantidade_disponivel >= 0),
  ordem                 smallint not null default 0,
  created_at            timestamptz not null default now()
);

create index koinonia_cantina_itens_cantina_idx on public.koinonia_cantina_itens (cantina_id, ordem);

create table public.koinonia_cantina_reservas (
  id          uuid primary key default gen_random_uuid(),
  item_id     uuid not null references public.koinonia_cantina_itens (id) on delete cascade,
  profile_id  uuid not null references public.koinonia_profiles (id) on delete cascade,
  quantidade  integer not null check (quantidade between 1 and 50),
  modo        public.koinonia_cantina_modo not null,
  observacao  text check (char_length(observacao) <= 300),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  -- uma reserva por pessoa e item (mudar a quantidade = editar a reserva)
  constraint koinonia_cantina_reservas_unica unique (item_id, profile_id)
);

create index koinonia_cantina_reservas_profile_idx on public.koinonia_cantina_reservas (profile_id);

-- -----------------------------------------------------------------------------
-- Helpers
-- -----------------------------------------------------------------------------

-- o usuário logado faz parte da equipe desta data de cantina (ou é ADMIN/PASTOR)?
create or replace function public.koinonia_is_equipe_cantina(p_cantina_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.koinonia_is_admin_or_pastor()
    or (
      public.koinonia_is_membro_ativo()
      and exists (
        select 1
        from public.koinonia_cantina_escalas c
        where c.id = p_cantina_id
          and (
            (c.gc_id is not null and c.gc_id = (select gc_id from public.koinonia_profiles where id = (select auth.uid())))
            or (c.ministerio_id is not null and exists (
              select 1 from public.koinonia_ministerio_membros mm
              where mm.ministerio_id = c.ministerio_id and mm.profile_id = (select auth.uid())
            ))
          )
      )
    );
$$;

create or replace function public.koinonia_cantina_do_item(p_item_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select cantina_id from public.koinonia_cantina_itens where id = p_item_id;
$$;

revoke execute on function public.koinonia_is_equipe_cantina(uuid), public.koinonia_cantina_do_item(uuid) from public, anon;
grant execute on function public.koinonia_is_equipe_cantina(uuid), public.koinonia_cantina_do_item(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- Regras da reserva: só até o dia da cantina e dentro do estoque
-- -----------------------------------------------------------------------------
create or replace function public.koinonia_cantina_reservas_validar()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_data       date;
  v_disponivel integer;
  v_item       text;
  v_reservado  integer;
begin
  if tg_op = 'UPDATE' and (new.item_id is distinct from old.item_id or new.profile_id is distinct from old.profile_id) then
    raise exception 'Não é possível mover a reserva para outro item ou pessoa.' using errcode = 'P0001';
  end if;

  -- trava o item para duas reservas simultâneas não estourarem o estoque
  select i.quantidade_disponivel, i.nome, c.data
    into v_disponivel, v_item, v_data
  from public.koinonia_cantina_itens i
  join public.koinonia_cantina_escalas c on c.id = i.cantina_id
  where i.id = new.item_id
  for update of i;

  if v_data < (now() at time zone 'America/Sao_Paulo')::date then
    raise exception 'As reservas para esta cantina já foram encerradas.' using errcode = 'P0001';
  end if;

  if v_disponivel is not null then
    select coalesce(sum(quantidade), 0) into v_reservado
    from public.koinonia_cantina_reservas
    where item_id = new.item_id and id <> new.id;
    if v_reservado + new.quantidade > v_disponivel then
      raise exception 'Restam só % unidade(s) de "%".', greatest(v_disponivel - v_reservado, 0), v_item using errcode = 'P0001';
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create trigger koinonia_cantina_reservas_validar
  before insert or update on public.koinonia_cantina_reservas
  for each row execute function public.koinonia_cantina_reservas_validar();

-- -----------------------------------------------------------------------------
-- RLS
--   itens:    membros ativos veem; equipe da data gerencia
--   reservas: veem a própria e a equipe da data; o membro reserva/edita/cancela
--             a própria; a equipe também pode remover qualquer reserva
-- -----------------------------------------------------------------------------
revoke all on public.koinonia_cantina_itens, public.koinonia_cantina_reservas from anon;
grant select, insert, update, delete on public.koinonia_cantina_itens, public.koinonia_cantina_reservas to authenticated;
alter table public.koinonia_cantina_itens enable row level security;
alter table public.koinonia_cantina_reservas enable row level security;

create policy "koinonia_cantina_itens_select" on public.koinonia_cantina_itens
  for select to authenticated using ((select public.koinonia_is_membro_ativo()));

create policy "koinonia_cantina_itens_gerenciar" on public.koinonia_cantina_itens
  for all to authenticated
  using (public.koinonia_is_equipe_cantina(cantina_id))
  with check (public.koinonia_is_equipe_cantina(cantina_id));

create policy "koinonia_cantina_reservas_select" on public.koinonia_cantina_reservas
  for select to authenticated
  using (
    profile_id = (select auth.uid())
    or public.koinonia_is_equipe_cantina(public.koinonia_cantina_do_item(item_id))
  );

create policy "koinonia_cantina_reservas_insert" on public.koinonia_cantina_reservas
  for insert to authenticated
  with check (profile_id = (select auth.uid()) and (select public.koinonia_is_membro_ativo()));

create policy "koinonia_cantina_reservas_update" on public.koinonia_cantina_reservas
  for update to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

create policy "koinonia_cantina_reservas_delete" on public.koinonia_cantina_reservas
  for delete to authenticated
  using (
    profile_id = (select auth.uid())
    or public.koinonia_is_equipe_cantina(public.koinonia_cantina_do_item(item_id))
  );
