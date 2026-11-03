-- =============================================================================
-- Koinonia — origem "visitante" para as notificações (resumo diário e aviso ao
-- responsável). Fica numa migração própria porque o Postgres só deixa usar um
-- valor novo de enum depois que a transação que o criou termina.
-- =============================================================================

alter type public.koinonia_notificacao_origem add value if not exists 'visitante';
