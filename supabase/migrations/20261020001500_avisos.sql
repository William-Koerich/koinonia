-- =============================================================================
-- Koinonia — avisos da igreja
--
-- Comunicados como "domingo o culto será às 9h por causa das eleições".
-- Título obrigatório; mensagem e imagem opcionais. ADMIN/PASTOR publicam.
--   - publico = true  → aparece também no site (anon)
--   - exibir_ate      → último dia em que o aviso aparece (fuso de SP);
--                       null = até ser removido
-- =============================================================================

create table public.koinonia_avisos (
  id          uuid primary key default gen_random_uuid(),
  titulo      text not null check (char_length(titulo) between 1 and 150),
  mensagem    text check (char_length(mensagem) <= 3000),
  imagem_path text, -- caminho no bucket "koinonia-site"
  publico     boolean not null default true,
  exibir_ate  date,
  created_by  uuid references public.koinonia_profiles (id) on delete set null default auth.uid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index koinonia_avisos_exibir_ate_idx on public.koinonia_avisos (exibir_ate);

create trigger koinonia_avisos_set_updated_at before update on public.koinonia_avisos
  for each row execute function public.koinonia_set_updated_at();

/** Aviso ainda dentro do prazo de exibição (data de hoje em SP) */
create or replace function public.koinonia_aviso_vigente(p_exibir_ate date)
returns boolean
language sql
stable
set search_path = ''
as $$
  select p_exibir_ate is null or p_exibir_ate >= (now() at time zone 'America/Sao_Paulo')::date;
$$;

-- -----------------------------------------------------------------------------
-- RLS
--   anon: avisos públicos vigentes
--   membros ativos: avisos vigentes
--   ADMIN/PASTOR: todos (inclusive vencidos) e gerenciam
-- -----------------------------------------------------------------------------
revoke all on public.koinonia_avisos from anon;
grant select on public.koinonia_avisos to anon;
grant select, insert, update, delete on public.koinonia_avisos to authenticated;
alter table public.koinonia_avisos enable row level security;

create policy "koinonia_avisos_select_anon" on public.koinonia_avisos
  for select to anon
  using (publico and public.koinonia_aviso_vigente(exibir_ate));

create policy "koinonia_avisos_select" on public.koinonia_avisos
  for select to authenticated
  using (
    (select public.koinonia_is_admin_or_pastor())
    or ((select public.koinonia_is_membro_ativo()) and public.koinonia_aviso_vigente(exibir_ate))
  );

create policy "koinonia_avisos_gerenciar" on public.koinonia_avisos
  for all to authenticated
  using ((select public.koinonia_is_admin_or_pastor()))
  with check ((select public.koinonia_is_admin_or_pastor()));
