-- =============================================================================
-- Koinonia — vendas da cantina ligadas ao financeiro
--
-- A equipe da data registra cada venda: no balcão (item, quantidade, forma) ou
-- quitando uma reserva. O banco mantém UMA entrada por cantina e forma de
-- pagamento (categoria "cantina") com a soma das vendas, para a tesouraria não
-- lançar de novo. Dinheiro cai no caixa; PIX e cartão, na conta principal.
--
-- Vendas não se editam: desfazer = excluir e registrar de novo. A equipe mexe
-- nas vendas até 7 dias depois da data; a tesouraria, a qualquer momento.
-- A entrada automática só muda pelas vendas (conta e descrição podem ser
-- ajustadas no financeiro).
-- =============================================================================

create table public.koinonia_cantina_vendas (
  id             uuid primary key default gen_random_uuid(),
  cantina_id     uuid not null references public.koinonia_cantina_escalas (id) on delete restrict,
  item_id        uuid not null references public.koinonia_cantina_itens (id) on delete restrict,
  -- preenchida quando a venda quita uma reserva (uma venda por reserva)
  reserva_id     uuid unique references public.koinonia_cantina_reservas (id) on delete restrict,
  quantidade     integer not null check (quantidade between 1 and 200),
  valor          numeric(10, 2) not null check (valor > 0),
  forma          public.koinonia_forma_pagamento not null check (forma in ('pix', 'dinheiro', 'cartao')),
  registrado_por uuid references public.koinonia_profiles (id) on delete set null default auth.uid(),
  created_at     timestamptz not null default now()
);

create index koinonia_cantina_vendas_cantina_idx on public.koinonia_cantina_vendas (cantina_id);
create index koinonia_cantina_vendas_item_idx on public.koinonia_cantina_vendas (item_id);

alter table public.koinonia_financeiro_entradas
  add column cantina_id uuid references public.koinonia_cantina_escalas (id) on delete restrict,
  add constraint koinonia_financeiro_entradas_cantina_forma unique (cantina_id, forma_pagamento);

-- -----------------------------------------------------------------------------
-- Quem registra vendas: equipe da data (até 7 dias depois) ou a tesouraria
-- -----------------------------------------------------------------------------
create or replace function public.koinonia_cantina_pode_vender(p_cantina_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.koinonia_pode_financeiro()
    or (
      public.koinonia_is_equipe_cantina(p_cantina_id)
      and exists (
        select 1 from public.koinonia_cantina_escalas
        where id = p_cantina_id and data >= (now() at time zone 'America/Sao_Paulo')::date - 7
      )
    );
$$;

revoke execute on function public.koinonia_cantina_pode_vender(uuid) from public, anon;
grant execute on function public.koinonia_cantina_pode_vender(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- Regras da venda: item da cantina, dados da reserva, valor e estoque
-- -----------------------------------------------------------------------------
create or replace function public.koinonia_cantina_vendas_validar()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item       record;
  v_reserva    record;
  v_ocupado    integer;
begin
  if tg_op = 'UPDATE' then
    raise exception 'Vendas não podem ser alteradas: desfaça e registre de novo.' using errcode = 'P0001';
  end if;

  if new.reserva_id is not null then
    select item_id, quantidade into v_reserva from public.koinonia_cantina_reservas where id = new.reserva_id;
    if not found then
      raise exception 'Reserva não encontrada.' using errcode = 'P0001';
    end if;
    new.item_id := v_reserva.item_id;
    new.quantidade := v_reserva.quantidade;
  end if;

  -- trava o item para vendas e reservas simultâneas não estourarem o estoque
  select i.cantina_id, i.nome, i.preco, i.quantidade_disponivel into v_item
  from public.koinonia_cantina_itens i
  where i.id = new.item_id
  for update;
  if not found then
    raise exception 'Item não encontrado.' using errcode = 'P0001';
  end if;
  new.cantina_id := v_item.cantina_id;

  new.valor := coalesce(new.valor, v_item.preco * new.quantidade);
  if new.valor is null or new.valor <= 0 then
    raise exception '"%" não tem preço: informe o valor recebido.', v_item.nome using errcode = 'P0001';
  end if;

  -- venda no balcão consome estoque; a reserva já tinha consumido
  if new.reserva_id is null and v_item.quantidade_disponivel is not null then
    select coalesce((select sum(quantidade) from public.koinonia_cantina_reservas where item_id = new.item_id), 0)
         + coalesce((select sum(quantidade) from public.koinonia_cantina_vendas where item_id = new.item_id and reserva_id is null), 0)
      into v_ocupado;
    if v_ocupado + new.quantidade > v_item.quantidade_disponivel then
      raise exception 'Restam só % unidade(s) de "%".', greatest(v_item.quantidade_disponivel - v_ocupado, 0), v_item.nome
        using errcode = 'P0001';
    end if;
  end if;

  new.registrado_por := (select auth.uid());
  new.created_at := now();
  return new;
end;
$$;

create trigger koinonia_cantina_vendas_validar
  before insert or update on public.koinonia_cantina_vendas
  for each row execute function public.koinonia_cantina_vendas_validar();

-- -----------------------------------------------------------------------------
-- Entrada automática: soma das vendas da cantina naquela forma de pagamento
-- -----------------------------------------------------------------------------
create or replace function public.koinonia_cantina_lancar(p_cantina_id uuid, p_forma public.koinonia_forma_pagamento)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_total    numeric(12, 2);
  v_data     date;
  v_carteira uuid;
begin
  select coalesce(sum(valor), 0) into v_total
  from public.koinonia_cantina_vendas
  where cantina_id = p_cantina_id and forma = p_forma;

  perform set_config('koinonia.cantina_lancando', 'on', true);

  if v_total = 0 then
    delete from public.koinonia_financeiro_entradas where cantina_id = p_cantina_id and forma_pagamento = p_forma;
  else
    select data into v_data from public.koinonia_cantina_escalas where id = p_cantina_id;
    select id into v_carteira
      from public.koinonia_financeiro_carteiras
     where ativa and (padrao or (p_forma = 'dinheiro' and tipo = 'caixa'))
     order by (p_forma = 'dinheiro' and tipo = 'caixa') desc, padrao desc, created_at
     limit 1;

    insert into public.koinonia_financeiro_entradas
      (data, categoria, valor, forma_pagamento, descricao, cantina_id, carteira_id)
    values (
      v_data,
      'cantina',
      v_total,
      p_forma,
      'Vendas da cantina de ' || to_char(v_data, 'DD/MM/YYYY'),
      p_cantina_id,
      v_carteira
    )
    on conflict (cantina_id, forma_pagamento) do update set valor = excluded.valor;
  end if;

  perform set_config('koinonia.cantina_lancando', '', true);
end;
$$;

revoke execute on function public.koinonia_cantina_lancar(uuid, public.koinonia_forma_pagamento) from public, anon, authenticated;

create or replace function public.koinonia_cantina_vendas_lancar()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    perform public.koinonia_cantina_lancar(old.cantina_id, old.forma);
    return old;
  end if;
  perform public.koinonia_cantina_lancar(new.cantina_id, new.forma);
  return new;
end;
$$;

create trigger koinonia_cantina_vendas_lancar
  after insert or delete on public.koinonia_cantina_vendas
  for each row execute function public.koinonia_cantina_vendas_lancar();

-- a entrada da cantina só muda pelas vendas (conta, descrição e contribuinte podem ser ajustados)
create or replace function public.koinonia_financeiro_entradas_proteger_cantina()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_setting('koinonia.cantina_lancando', true) = 'on' then
    return coalesce(new, old);
  end if;

  if tg_op = 'INSERT' and (new.cantina_id is not null or new.categoria = 'cantina') then
    raise exception 'As vendas da cantina entram sozinhas: registre-as na página da cantina.' using errcode = 'P0001';
  elsif tg_op = 'DELETE' and old.cantina_id is not null then
    raise exception 'Este lançamento soma as vendas da cantina: desfaça as vendas lá.' using errcode = 'P0001';
  elsif tg_op = 'UPDATE' and (old.cantina_id is not null or new.categoria = 'cantina') and (
    new.cantina_id is distinct from old.cantina_id
    or new.valor <> old.valor
    or new.data <> old.data
    or new.categoria <> old.categoria
    or new.forma_pagamento <> old.forma_pagamento
  ) then
    raise exception 'O valor, a data e a forma vêm das vendas da cantina: ajuste as vendas lá.' using errcode = 'P0001';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger koinonia_financeiro_entradas_proteger_cantina
  before insert or update or delete on public.koinonia_financeiro_entradas
  for each row execute function public.koinonia_financeiro_entradas_proteger_cantina();

-- -----------------------------------------------------------------------------
-- Reserva paga não muda nem some sem desfazer o pagamento
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
  v_ocupado    integer;
begin
  if tg_op = 'UPDATE' and (new.item_id is distinct from old.item_id or new.profile_id is distinct from old.profile_id) then
    raise exception 'Não é possível mover a reserva para outro item ou pessoa.' using errcode = 'P0001';
  end if;

  if tg_op = 'UPDATE' and new.quantidade <> old.quantidade
     and exists (select 1 from public.koinonia_cantina_vendas where reserva_id = new.id) then
    raise exception 'Esta reserva já foi paga: fale com a equipe da cantina para mudar a quantidade.' using errcode = 'P0001';
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
    select coalesce((select sum(quantidade) from public.koinonia_cantina_reservas where item_id = new.item_id and id <> new.id), 0)
         + coalesce((select sum(quantidade) from public.koinonia_cantina_vendas where item_id = new.item_id and reserva_id is null), 0)
      into v_ocupado;
    if v_ocupado + new.quantidade > v_disponivel then
      raise exception 'Restam só % unidade(s) de "%".', greatest(v_disponivel - v_ocupado, 0), v_item using errcode = 'P0001';
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.koinonia_cantina_reservas_bloquear_paga()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.koinonia_cantina_vendas where reserva_id = old.id) then
    raise exception 'Há reserva já paga: desfaça o pagamento antes de removê-la.' using errcode = 'P0001';
  end if;
  return old;
end;
$$;

create trigger koinonia_cantina_reservas_bloquear_paga
  before delete on public.koinonia_cantina_reservas
  for each row execute function public.koinonia_cantina_reservas_bloquear_paga();

-- item e data com vendas carregam dinheiro já lançado no financeiro
create or replace function public.koinonia_cantina_bloquear_com_vendas()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.koinonia_cantina_vendas
    where (tg_table_name = 'koinonia_cantina_itens' and item_id = old.id)
       or (tg_table_name = 'koinonia_cantina_escalas' and cantina_id = old.id)
  ) then
    raise exception 'Já há vendas registradas aqui (lançadas no financeiro): desfaça as vendas antes de excluir.'
      using errcode = 'P0001';
  end if;
  return old;
end;
$$;

create trigger koinonia_cantina_itens_bloquear_com_vendas
  before delete on public.koinonia_cantina_itens
  for each row execute function public.koinonia_cantina_bloquear_com_vendas();

create trigger koinonia_cantina_escalas_bloquear_com_vendas
  before delete on public.koinonia_cantina_escalas
  for each row execute function public.koinonia_cantina_bloquear_com_vendas();

-- -----------------------------------------------------------------------------
-- Disponibilidade: reservado + vendido no balcão
-- -----------------------------------------------------------------------------
drop function public.koinonia_cantina_disponibilidade(uuid);

create function public.koinonia_cantina_disponibilidade(p_cantina_id uuid)
returns table (item_id uuid, reservado bigint, vendido bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select i.id,
         coalesce((select sum(r.quantidade) from public.koinonia_cantina_reservas r where r.item_id = i.id), 0),
         coalesce((select sum(v.quantidade) from public.koinonia_cantina_vendas v where v.item_id = i.id and v.reserva_id is null), 0)
  from public.koinonia_cantina_itens i
  where i.cantina_id = p_cantina_id
    and public.koinonia_is_membro_ativo();
$$;

revoke execute on function public.koinonia_cantina_disponibilidade(uuid) from public, anon;
grant execute on function public.koinonia_cantina_disponibilidade(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- RLS
--   vendas:   equipe da data e tesouraria veem (quem reservou vê o próprio
--             pagamento); registram/desfazem na janela
--   reservas: a tesouraria também vê (para conferir o que foi pago)
-- -----------------------------------------------------------------------------
revoke all on public.koinonia_cantina_vendas from anon;
grant select, insert, delete on public.koinonia_cantina_vendas to authenticated;
alter table public.koinonia_cantina_vendas enable row level security;

create policy "koinonia_cantina_vendas_select" on public.koinonia_cantina_vendas
  for select to authenticated
  using (
    (select public.koinonia_pode_financeiro())
    or public.koinonia_is_equipe_cantina(cantina_id)
    -- quem reservou vê que a própria reserva foi paga
    or exists (select 1 from public.koinonia_cantina_reservas r where r.id = reserva_id and r.profile_id = (select auth.uid()))
  );

create policy "koinonia_cantina_vendas_insert" on public.koinonia_cantina_vendas
  for insert to authenticated
  with check (public.koinonia_cantina_pode_vender(cantina_id));

create policy "koinonia_cantina_vendas_delete" on public.koinonia_cantina_vendas
  for delete to authenticated
  using (public.koinonia_cantina_pode_vender(cantina_id));

drop policy "koinonia_cantina_reservas_select" on public.koinonia_cantina_reservas;
create policy "koinonia_cantina_reservas_select" on public.koinonia_cantina_reservas
  for select to authenticated
  using (
    profile_id = (select auth.uid())
    or (select public.koinonia_pode_financeiro())
    or public.koinonia_is_equipe_cantina(public.koinonia_cantina_do_item(item_id))
  );
