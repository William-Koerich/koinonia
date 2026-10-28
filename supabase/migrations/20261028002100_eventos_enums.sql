-- =============================================================================
-- Koinonia — novos valores de enum para eventos (fila de espera e entrada de
-- inscrição no financeiro). Ficam numa migração própria porque o Postgres só
-- deixa usar um valor novo de enum depois que a transação que o criou termina.
-- =============================================================================

alter type public.koinonia_inscricao_status add value if not exists 'espera';
alter type public.koinonia_entrada_categoria add value if not exists 'evento' before 'outra';
