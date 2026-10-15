-- =============================================================================
-- Koinonia — galeria de imagens dos projetos
--
-- Cada projeto pode ter várias imagens (ordenadas). A capa continua em
-- koinonia_projetos.imagem_path (uma das imagens da galeria), assim a
-- listagem e o Open Graph não precisam de join.
-- =============================================================================

create table public.koinonia_projeto_imagens (
  id         uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references public.koinonia_projetos (id) on delete cascade,
  path       text not null, -- caminho no bucket "koinonia-site"
  ordem      smallint not null default 0,
  created_at timestamptz not null default now(),
  constraint koinonia_projeto_imagens_unica unique (projeto_id, path)
);

create index koinonia_projeto_imagens_projeto_idx on public.koinonia_projeto_imagens (projeto_id, ordem);

-- capas já cadastradas viram a primeira imagem da galeria
insert into public.koinonia_projeto_imagens (projeto_id, path, ordem)
select id, imagem_path, 0 from public.koinonia_projetos where imagem_path is not null
on conflict do nothing;

-- -----------------------------------------------------------------------------
-- RLS: imagens de projetos publicados são públicas; ADMIN/PASTOR veem e
-- gerenciam todas (inclusive de rascunhos)
-- -----------------------------------------------------------------------------
revoke all on public.koinonia_projeto_imagens from anon;
grant select on public.koinonia_projeto_imagens to anon;
grant select, insert, update, delete on public.koinonia_projeto_imagens to authenticated;
alter table public.koinonia_projeto_imagens enable row level security;

create policy "koinonia_projeto_imagens_select_anon" on public.koinonia_projeto_imagens
  for select to anon
  using (exists (select 1 from public.koinonia_projetos p where p.id = projeto_id and p.publicado));

create policy "koinonia_projeto_imagens_select" on public.koinonia_projeto_imagens
  for select to authenticated
  using (
    exists (select 1 from public.koinonia_projetos p where p.id = projeto_id and p.publicado)
    or (select public.koinonia_is_admin_or_pastor())
  );

create policy "koinonia_projeto_imagens_gerenciar" on public.koinonia_projeto_imagens
  for all to authenticated
  using ((select public.koinonia_is_admin_or_pastor()))
  with check ((select public.koinonia_is_admin_or_pastor()));
