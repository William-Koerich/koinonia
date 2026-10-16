-- =============================================================================
-- Koinonia — responsável pelo evento vê o perfil (contato) dos inscritos
--
-- Para conferir pagamentos ele precisa falar com quem se inscreveu. Libera a
-- leitura do perfil de quem tem inscrição em algum evento sob sua
-- responsabilidade (além das regras que já existiam).
-- =============================================================================

create or replace function public.koinonia_is_responsavel_por_inscrito(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.koinonia_evento_inscricoes i
    join public.koinonia_eventos e on e.id = i.evento_id
    where i.profile_id = p_profile_id
      and e.responsavel_id = (select auth.uid())
  ) and public.koinonia_is_membro_ativo();
$$;

revoke execute on function public.koinonia_is_responsavel_por_inscrito(uuid) from public, anon;
grant execute on function public.koinonia_is_responsavel_por_inscrito(uuid) to authenticated;

alter policy "koinonia_profiles_select" on public.koinonia_profiles
  using (
    id = (select auth.uid())
    or (select public.koinonia_is_admin_or_pastor())
    or public.koinonia_is_lider_of_profile(id)
    or public.koinonia_is_responsavel_por_inscrito(id)
  );
