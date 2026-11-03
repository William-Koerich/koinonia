-- =============================================================================
-- Koinonia — visitantes do dia na cantina
--
-- A equipe da cantina (e a tesouraria) vê os visitantes cadastrados na mesma
-- data da cantina, para saber que tem visitante. Só o nome: o resto do
-- cadastro (celular, motivo) continua restrito a quem cuida dos visitantes.
-- =============================================================================

create or replace function public.koinonia_cantina_visitantes(p_cantina_id uuid)
returns table (id uuid, nome text, created_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select v.id, v.nome, v.created_at
  from public.koinonia_visitantes v
  join public.koinonia_cantina_escalas c on c.data = v.data_visita
  where c.id = p_cantina_id
    and (public.koinonia_is_equipe_cantina(p_cantina_id) or public.koinonia_pode_financeiro())
  order by v.created_at;
$$;

revoke execute on function public.koinonia_cantina_visitantes(uuid) from public, anon;
grant execute on function public.koinonia_cantina_visitantes(uuid) to authenticated;
