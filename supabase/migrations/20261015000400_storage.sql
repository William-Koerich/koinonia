-- =============================================================================
-- Koinonia — Storage: bucket público "koinonia-site" (fotos de pastores e projetos)
-- Leitura pública via URL; upload/alteração/exclusão só ADMIN/PASTOR.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('koinonia-site', 'koinonia-site', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "koinonia_site_select_admin_pastor" on storage.objects
  for select to authenticated
  using (bucket_id = 'koinonia-site' and (select public.koinonia_is_admin_or_pastor()));

create policy "koinonia_site_insert_admin_pastor" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'koinonia-site' and (select public.koinonia_is_admin_or_pastor()));

create policy "koinonia_site_update_admin_pastor" on storage.objects
  for update to authenticated
  using (bucket_id = 'koinonia-site' and (select public.koinonia_is_admin_or_pastor()))
  with check (bucket_id = 'koinonia-site' and (select public.koinonia_is_admin_or_pastor()));

create policy "koinonia_site_delete_admin_pastor" on storage.objects
  for delete to authenticated
  using (bucket_id = 'koinonia-site' and (select public.koinonia_is_admin_or_pastor()));
