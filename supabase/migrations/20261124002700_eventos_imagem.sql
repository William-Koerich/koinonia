-- =============================================================================
-- Koinonia — imagem do evento (cartaz/arte de divulgação)
-- =============================================================================

alter table public.koinonia_eventos
  add column imagem_path text; -- caminho no bucket "koinonia-site" (pasta eventos/)

-- o site público (anon) lê os eventos por colunas liberadas uma a uma
grant select (imagem_path) on public.koinonia_eventos to anon;
