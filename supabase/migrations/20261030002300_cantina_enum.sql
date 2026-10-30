-- =============================================================================
-- Koinonia — categoria de entrada para as vendas da cantina. Fica numa migração
-- própria porque o Postgres só deixa usar um valor novo de enum depois que a
-- transação que o criou termina.
-- =============================================================================

alter type public.koinonia_entrada_categoria add value if not exists 'cantina' before 'outra';
