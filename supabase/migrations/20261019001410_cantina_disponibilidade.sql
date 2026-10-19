-- =============================================================================
-- Koinonia — total reservado por item da cantina
--
-- Todo membro precisa saber quanto resta de cada item, mas não pode ver as
-- reservas dos outros (RLS). Esta função devolve só os totais por item.
-- =============================================================================

create or replace function public.koinonia_cantina_disponibilidade(p_cantina_id uuid)
returns table (item_id uuid, reservado bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select i.id, coalesce(sum(r.quantidade), 0)
  from public.koinonia_cantina_itens i
  left join public.koinonia_cantina_reservas r on r.item_id = i.id
  where i.cantina_id = p_cantina_id
    and public.koinonia_is_membro_ativo()
  group by i.id;
$$;

revoke execute on function public.koinonia_cantina_disponibilidade(uuid) from public, anon;
grant execute on function public.koinonia_cantina_disponibilidade(uuid) to authenticated;
