-- =============================================================================
-- Koinonia — leitura da área logada só para membros ativos
--
-- O auth.users é compartilhado com outros apps: "authenticated" inclui contas
-- que não têm perfil Koinonia (ex.: compradores do Fertex) e usuários
-- desativados. As policies de leitura com `using (true)` deixavam essas
-- contas consultarem pela API nomes de membros e endereços de GCs.
-- Agora é preciso ter perfil Koinonia ativo.
-- =============================================================================

create or replace function public.koinonia_is_membro_ativo()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.koinonia_current_user_role() is not null;
$$;

revoke execute on function public.koinonia_is_membro_ativo() from public, anon;
grant execute on function public.koinonia_is_membro_ativo() to authenticated;

-- Tabelas que qualquer membro ativo pode ver
alter policy "koinonia_ministerios_select" on public.koinonia_ministerios
  using ((select public.koinonia_is_membro_ativo()));
alter policy "koinonia_gcs_select" on public.koinonia_gcs
  using ((select public.koinonia_is_membro_ativo()));
alter policy "koinonia_escala_funcoes_select" on public.koinonia_escala_funcoes
  using ((select public.koinonia_is_membro_ativo()));
alter policy "koinonia_escalas_select" on public.koinonia_escalas
  using ((select public.koinonia_is_membro_ativo()));
alter policy "koinonia_escala_atribuicoes_select" on public.koinonia_escala_atribuicoes
  using ((select public.koinonia_is_membro_ativo()));
alter policy "koinonia_cantina_escalas_select" on public.koinonia_cantina_escalas
  using ((select public.koinonia_is_membro_ativo()));

-- Usuário inativo continua vendo o próprio perfil (para a tela "conta
-- inativa"), mas não o edita mais
alter policy "koinonia_profiles_update" on public.koinonia_profiles
  using (
    (id = (select auth.uid()) and (select public.koinonia_is_membro_ativo()))
    or (select public.koinonia_is_admin_or_pastor())
  )
  with check (
    (id = (select auth.uid()) and (select public.koinonia_is_membro_ativo()))
    or (select public.koinonia_is_admin_or_pastor())
  );

-- A view roda com os privilégios do dono (ignora RLS), então o filtro vai
-- nela: auth.uid() continua sendo o usuário da requisição
create or replace view public.koinonia_perfis_basicos as
  select id, nome_completo, genero, gc_id
  from public.koinonia_profiles
  where ativo
    and public.koinonia_is_membro_ativo();

revoke all on public.koinonia_perfis_basicos from public, anon, authenticated;
grant select on public.koinonia_perfis_basicos to authenticated;
