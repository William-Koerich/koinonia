-- =============================================================================
-- Koinonia — grants, Row Level Security e view de nomes
-- Grants listam as tabelas explicitamente: o schema public é compartilhado
-- com outros apps e não deve ser afetado.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Grants: anon só lê o que o site público usa; o resto é decidido pela RLS.
-- -----------------------------------------------------------------------------
revoke all on
  public.koinonia_profiles,
  public.koinonia_gcs,
  public.koinonia_eventos,
  public.koinonia_ministerios,
  public.koinonia_ministerio_membros,
  public.koinonia_escala_funcoes,
  public.koinonia_escalas,
  public.koinonia_escala_atribuicoes,
  public.koinonia_cantina_escalas,
  public.koinonia_pastores,
  public.koinonia_projetos,
  public.koinonia_configuracoes_contribuicao
from anon;

grant select on
  public.koinonia_eventos,
  public.koinonia_pastores,
  public.koinonia_projetos,
  public.koinonia_configuracoes_contribuicao
to anon;

grant select, insert, update, delete on
  public.koinonia_profiles,
  public.koinonia_gcs,
  public.koinonia_eventos,
  public.koinonia_ministerios,
  public.koinonia_ministerio_membros,
  public.koinonia_escala_funcoes,
  public.koinonia_escalas,
  public.koinonia_escala_atribuicoes,
  public.koinonia_cantina_escalas,
  public.koinonia_pastores,
  public.koinonia_projetos,
  public.koinonia_configuracoes_contribuicao
to authenticated;

alter table public.koinonia_profiles                   enable row level security;
alter table public.koinonia_gcs                        enable row level security;
alter table public.koinonia_eventos                    enable row level security;
alter table public.koinonia_ministerios                enable row level security;
alter table public.koinonia_ministerio_membros         enable row level security;
alter table public.koinonia_escala_funcoes             enable row level security;
alter table public.koinonia_escalas                    enable row level security;
alter table public.koinonia_escala_atribuicoes         enable row level security;
alter table public.koinonia_cantina_escalas            enable row level security;
alter table public.koinonia_pastores                   enable row level security;
alter table public.koinonia_projetos                   enable row level security;
alter table public.koinonia_configuracoes_contribuicao enable row level security;

-- -----------------------------------------------------------------------------
-- koinonia_profiles
--   ver:     o próprio | ADMIN/PASTOR todos | LÍDER os membros dos seus ministérios
--   inserir: só o próprio (completar cadastro; role/ativo forçados por trigger)
--   editar:  o próprio | ADMIN/PASTOR (role/ativo protegidos por koinonia_profiles_guard)
--   excluir: só com a chave secreta
-- -----------------------------------------------------------------------------
create policy "koinonia_profiles_select" on public.koinonia_profiles
  for select to authenticated
  using (
    id = (select auth.uid())
    or (select public.koinonia_is_admin_or_pastor())
    or public.koinonia_is_lider_of_profile(id)
  );

create policy "koinonia_profiles_insert" on public.koinonia_profiles
  for insert to authenticated
  with check (id = (select auth.uid()));

create policy "koinonia_profiles_update" on public.koinonia_profiles
  for update to authenticated
  using (id = (select auth.uid()) or (select public.koinonia_is_admin_or_pastor()))
  with check (id = (select auth.uid()) or (select public.koinonia_is_admin_or_pastor()));

-- -----------------------------------------------------------------------------
-- koinonia_perfis_basicos: só id + nome (e gênero/GC) de usuários ativos, para
-- qualquer usuário logado. Necessária porque MEMBRO só enxerga o próprio
-- profile, mas precisa ver nomes na escala, responsável do evento, líder do GC;
-- e o LÍDER precisa buscar pessoas para adicionar ao ministério.
-- Roda com os privilégios do dono (ignora a RLS de koinonia_profiles) de
-- propósito; não expõe e-mail, celular nem data de nascimento.
-- -----------------------------------------------------------------------------
create view public.koinonia_perfis_basicos as
  select id, nome_completo, genero, gc_id
  from public.koinonia_profiles
  where ativo;

revoke all on public.koinonia_perfis_basicos from public, anon, authenticated;
grant select on public.koinonia_perfis_basicos to authenticated;

-- -----------------------------------------------------------------------------
-- koinonia_ministerios: todos logados veem; ADMIN/PASTOR gerenciam
-- -----------------------------------------------------------------------------
create policy "koinonia_ministerios_select" on public.koinonia_ministerios
  for select to authenticated using (true);

create policy "koinonia_ministerios_gerenciar" on public.koinonia_ministerios
  for all to authenticated
  using ((select public.koinonia_is_admin_or_pastor()))
  with check ((select public.koinonia_is_admin_or_pastor()));

-- -----------------------------------------------------------------------------
-- koinonia_ministerio_membros
--   ver:      os próprios vínculos | ADMIN/PASTOR | LÍDER do ministério
--   vincular/desvincular: ADMIN/PASTOR | LÍDER do ministério (só não-líderes)
--   marcar/desmarcar líder: ADMIN/PASTOR
-- -----------------------------------------------------------------------------
create policy "koinonia_ministerio_membros_select" on public.koinonia_ministerio_membros
  for select to authenticated
  using (
    profile_id = (select auth.uid())
    or (select public.koinonia_is_admin_or_pastor())
    or public.koinonia_is_lider_of(ministerio_id)
  );

create policy "koinonia_ministerio_membros_insert" on public.koinonia_ministerio_membros
  for insert to authenticated
  with check (
    (select public.koinonia_is_admin_or_pastor())
    or (public.koinonia_is_lider_of(ministerio_id) and not is_lider)
  );

create policy "koinonia_ministerio_membros_update" on public.koinonia_ministerio_membros
  for update to authenticated
  using ((select public.koinonia_is_admin_or_pastor()))
  with check ((select public.koinonia_is_admin_or_pastor()));

create policy "koinonia_ministerio_membros_delete" on public.koinonia_ministerio_membros
  for delete to authenticated
  using (
    (select public.koinonia_is_admin_or_pastor())
    or (public.koinonia_is_lider_of(ministerio_id) and not is_lider)
  );

-- -----------------------------------------------------------------------------
-- koinonia_gcs: todos logados veem (para escolher o seu); ADMIN/PASTOR gerenciam.
-- A escolha do GC é um UPDATE em koinonia_profiles.gc_id.
-- -----------------------------------------------------------------------------
create policy "koinonia_gcs_select" on public.koinonia_gcs
  for select to authenticated using (true);

create policy "koinonia_gcs_gerenciar" on public.koinonia_gcs
  for all to authenticated
  using ((select public.koinonia_is_admin_or_pastor()))
  with check ((select public.koinonia_is_admin_or_pastor()));

-- -----------------------------------------------------------------------------
-- koinonia_eventos: públicos (site); ADMIN/PASTOR gerenciam
-- -----------------------------------------------------------------------------
create policy "koinonia_eventos_select_publico" on public.koinonia_eventos
  for select to anon, authenticated using (true);

create policy "koinonia_eventos_gerenciar" on public.koinonia_eventos
  for all to authenticated
  using ((select public.koinonia_is_admin_or_pastor()))
  with check ((select public.koinonia_is_admin_or_pastor()));

-- -----------------------------------------------------------------------------
-- Escala e cantina: todos logados veem; ADMIN/PASTOR gerenciam
-- -----------------------------------------------------------------------------
create policy "koinonia_escala_funcoes_select" on public.koinonia_escala_funcoes
  for select to authenticated using (true);
create policy "koinonia_escala_funcoes_gerenciar" on public.koinonia_escala_funcoes
  for all to authenticated
  using ((select public.koinonia_is_admin_or_pastor()))
  with check ((select public.koinonia_is_admin_or_pastor()));

create policy "koinonia_escalas_select" on public.koinonia_escalas
  for select to authenticated using (true);
create policy "koinonia_escalas_gerenciar" on public.koinonia_escalas
  for all to authenticated
  using ((select public.koinonia_is_admin_or_pastor()))
  with check ((select public.koinonia_is_admin_or_pastor()));

create policy "koinonia_escala_atribuicoes_select" on public.koinonia_escala_atribuicoes
  for select to authenticated using (true);
create policy "koinonia_escala_atribuicoes_gerenciar" on public.koinonia_escala_atribuicoes
  for all to authenticated
  using ((select public.koinonia_is_admin_or_pastor()))
  with check ((select public.koinonia_is_admin_or_pastor()));

create policy "koinonia_cantina_escalas_select" on public.koinonia_cantina_escalas
  for select to authenticated using (true);
create policy "koinonia_cantina_escalas_gerenciar" on public.koinonia_cantina_escalas
  for all to authenticated
  using ((select public.koinonia_is_admin_or_pastor()))
  with check ((select public.koinonia_is_admin_or_pastor()));

-- -----------------------------------------------------------------------------
-- Conteúdo do site: público vê o que está ativo/publicado; ADMIN/PASTOR
-- veem tudo e gerenciam. Policies de anon não chamam helpers (anon não tem
-- EXECUTE neles).
-- -----------------------------------------------------------------------------
create policy "koinonia_pastores_select_anon" on public.koinonia_pastores
  for select to anon using (ativo);
create policy "koinonia_pastores_select" on public.koinonia_pastores
  for select to authenticated using (ativo or (select public.koinonia_is_admin_or_pastor()));
create policy "koinonia_pastores_gerenciar" on public.koinonia_pastores
  for all to authenticated
  using ((select public.koinonia_is_admin_or_pastor()))
  with check ((select public.koinonia_is_admin_or_pastor()));

create policy "koinonia_projetos_select_anon" on public.koinonia_projetos
  for select to anon using (publicado);
create policy "koinonia_projetos_select" on public.koinonia_projetos
  for select to authenticated using (publicado or (select public.koinonia_is_admin_or_pastor()));
create policy "koinonia_projetos_gerenciar" on public.koinonia_projetos
  for all to authenticated
  using ((select public.koinonia_is_admin_or_pastor()))
  with check ((select public.koinonia_is_admin_or_pastor()));

create policy "koinonia_configuracoes_contribuicao_select" on public.koinonia_configuracoes_contribuicao
  for select to anon, authenticated using (true);
create policy "koinonia_configuracoes_contribuicao_gerenciar" on public.koinonia_configuracoes_contribuicao
  for all to authenticated
  using ((select public.koinonia_is_admin_or_pastor()))
  with check ((select public.koinonia_is_admin_or_pastor()));
