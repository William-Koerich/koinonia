-- =============================================================================
-- Koinonia — papel TESOUREIRO (acesso ao financeiro, sem gerenciar o resto).
-- Migração própria porque o valor novo do enum só pode ser usado depois que
-- esta transação termina (as regras ficam em 20261029002210).
-- =============================================================================

alter type public.koinonia_user_role add value if not exists 'TESOUREIRO' after 'PASTOR';
