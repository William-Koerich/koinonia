-- =============================================================================
-- Koinonia — agendador das notificações (pg_cron + pg_net)
--
-- A cada 5 minutos chama POST /api/notificacoes/disparar no site. O segredo
-- (o mesmo CRON_SECRET da Vercel) fica no Vault do Supabase, fora do git:
--
--   select vault.create_secret('<CRON_SECRET>', 'koinonia_cron_secret');
--   -- para trocar: select vault.update_secret(id, '<novo>') ...
--
-- O endereço do site também fica no Vault ('koinonia_site_url'), para trocar
-- de domínio sem nova migration.
-- =============================================================================

create extension if not exists pg_cron;

select cron.unschedule('koinonia-notificacoes')
where exists (select 1 from cron.job where jobname = 'koinonia-notificacoes');

select cron.schedule(
  'koinonia-notificacoes',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'koinonia_site_url') || '/api/notificacoes/disparar',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'koinonia_cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);
