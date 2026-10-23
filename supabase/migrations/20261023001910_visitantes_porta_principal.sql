-- =============================================================================
-- Koinonia — visitantes: acesso da equipe da porta principal no dia da escala
--
-- Além de ADMIN/PASTOR, quem está escalado HOJE numa função marcada com
-- "cadastra_visitantes" (a Porta Principal) pode, só neste dia:
--   - cadastrar visitantes (com a data de hoje);
--   - ver os visitantes de hoje (para não cadastrar a mesma pessoa duas vezes);
--   - corrigir ou apagar os que ele mesmo cadastrou hoje.
-- O histórico completo continua só com ADMIN/PASTOR.
-- =============================================================================

alter table public.koinonia_escala_funcoes
  add column cadastra_visitantes boolean not null default false;

update public.koinonia_escala_funcoes set cadastra_visitantes = true where funcao ilike 'porta principal';

/** O usuário logado está escalado hoje (fuso de SP) numa função que cadastra visitantes */
create or replace function public.koinonia_na_porta_hoje()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.koinonia_is_membro_ativo() and exists (
    select 1
      from public.koinonia_escala_atribuicoes a
      join public.koinonia_escalas s on s.id = a.escala_id
      join public.koinonia_escala_funcoes f on f.id = a.funcao_id
     where a.profile_id = (select auth.uid())
       and f.cadastra_visitantes
       and s.data = (now() at time zone 'America/Sao_Paulo')::date
  );
$$;

create or replace function public.koinonia_hoje_sp()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'America/Sao_Paulo')::date;
$$;

create policy "koinonia_visitantes_porta_select" on public.koinonia_visitantes
  for select to authenticated
  using ((select public.koinonia_na_porta_hoje()) and data_visita = (select public.koinonia_hoje_sp()));

create policy "koinonia_visitantes_porta_insert" on public.koinonia_visitantes
  for insert to authenticated
  with check (
    (select public.koinonia_na_porta_hoje())
    and data_visita = (select public.koinonia_hoje_sp())
    and created_by = (select auth.uid())
  );

create policy "koinonia_visitantes_porta_update" on public.koinonia_visitantes
  for update to authenticated
  using (
    (select public.koinonia_na_porta_hoje())
    and data_visita = (select public.koinonia_hoje_sp())
    and created_by = (select auth.uid())
  )
  with check (
    (select public.koinonia_na_porta_hoje())
    and data_visita = (select public.koinonia_hoje_sp())
    and created_by = (select auth.uid())
  );

create policy "koinonia_visitantes_porta_delete" on public.koinonia_visitantes
  for delete to authenticated
  using (
    (select public.koinonia_na_porta_hoje())
    and data_visita = (select public.koinonia_hoje_sp())
    and created_by = (select auth.uid())
  );
