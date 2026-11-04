-- =============================================================================
-- Koinonia — confirmar que o visitante pegou a cantina
--
-- Nem todo visitante fica para a cantina: a equipe marca quem pegou. É só um
-- registro (não mexe no estoque nem no financeiro) e pode ser desfeito.
-- =============================================================================

create table public.koinonia_cantina_visitantes_confirmados (
  cantina_id    uuid not null references public.koinonia_cantina_escalas (id) on delete cascade,
  visitante_id  uuid not null references public.koinonia_visitantes (id) on delete cascade,
  confirmado_por uuid references public.koinonia_profiles (id) on delete set null default auth.uid(),
  created_at    timestamptz not null default now(),
  primary key (cantina_id, visitante_id)
);

alter table public.koinonia_cantina_visitantes_confirmados enable row level security;
-- sem policies nem grants: leitura e escrita só pelas funções abaixo
revoke all on public.koinonia_cantina_visitantes_confirmados from anon, authenticated;

-- a lista passa a dizer se o visitante já pegou
drop function public.koinonia_cantina_visitantes(uuid);

create function public.koinonia_cantina_visitantes(p_cantina_id uuid)
returns table (id uuid, nome text, created_at timestamptz, confirmado boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select v.id, v.nome, v.created_at, k.visitante_id is not null
  from public.koinonia_visitantes v
  join public.koinonia_cantina_escalas c on c.data = v.data_visita
  left join public.koinonia_cantina_visitantes_confirmados k on k.cantina_id = c.id and k.visitante_id = v.id
  where c.id = p_cantina_id
    and (public.koinonia_is_equipe_cantina(p_cantina_id) or public.koinonia_pode_financeiro())
  order by v.created_at;
$$;

revoke execute on function public.koinonia_cantina_visitantes(uuid) from public, anon;
grant execute on function public.koinonia_cantina_visitantes(uuid) to authenticated;

create function public.koinonia_cantina_confirmar_visitante(p_cantina_id uuid, p_visitante_id uuid, p_confirmado boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (public.koinonia_is_equipe_cantina(p_cantina_id) or public.koinonia_pode_financeiro()) then
    raise exception 'Só a equipe desta cantina confirma os visitantes.' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.koinonia_visitantes v
    join public.koinonia_cantina_escalas c on c.data = v.data_visita
    where c.id = p_cantina_id and v.id = p_visitante_id
  ) then
    raise exception 'Este visitante não é do dia desta cantina.' using errcode = 'P0001';
  end if;

  if p_confirmado then
    insert into public.koinonia_cantina_visitantes_confirmados (cantina_id, visitante_id)
    values (p_cantina_id, p_visitante_id)
    on conflict do nothing;
  else
    delete from public.koinonia_cantina_visitantes_confirmados
    where cantina_id = p_cantina_id and visitante_id = p_visitante_id;
  end if;
end;
$$;

revoke execute on function public.koinonia_cantina_confirmar_visitante(uuid, uuid, boolean) from public, anon;
grant execute on function public.koinonia_cantina_confirmar_visitante(uuid, uuid, boolean) to authenticated;
