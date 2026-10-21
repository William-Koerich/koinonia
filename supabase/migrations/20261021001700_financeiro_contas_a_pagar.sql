-- =============================================================================
-- Koinonia — financeiro: contas a pagar (avulsas e recorrentes)
--
-- koinonia_financeiro_contas: cada conta com vencimento, pagamento e status.
-- koinonia_financeiro_recorrencias: o "molde" de contas que se repetem
--   (aluguel todo mês, seguro anual, compra parcelada em 10x...). As contas de
--   cada recorrência são geradas por koinonia_financeiro_gerar_contas(até),
--   numeradas por "ocorrencia" (1, 2, 3...). O unique (recorrencia_id,
--   ocorrencia) torna a geração idempotente: chamar de novo não duplica, e
--   mudar o vencimento de uma conta gerada não faz ela "renascer".
--   Conta recorrente não é apagada, é cancelada (senão seria gerada de novo).
--
-- Acesso: koinonia_pode_financeiro() (hoje ADMIN e PASTOR).
-- =============================================================================

create type public.koinonia_despesa_categoria as enum (
  'aluguel', 'energia', 'agua', 'internet_telefone', 'salarios', 'manutencao',
  'materiais', 'impostos_taxas', 'missoes', 'eventos', 'outra'
);
create type public.koinonia_recorrencia_frequencia as enum (
  'semanal', 'quinzenal', 'mensal', 'bimestral', 'trimestral', 'semestral', 'anual'
);
create type public.koinonia_conta_status as enum ('pendente', 'paga', 'cancelada');

create table public.koinonia_financeiro_recorrencias (
  id          uuid primary key default gen_random_uuid(),
  descricao   text not null check (char_length(descricao) between 1 and 150),
  categoria   public.koinonia_despesa_categoria not null,
  fornecedor  text check (char_length(fornecedor) <= 150),
  valor       numeric(12, 2) not null check (valor > 0),
  frequencia  public.koinonia_recorrencia_frequencia not null,
  data_inicio date not null,  -- 1º vencimento
  data_fim    date,           -- último vencimento possível (opcional)
  parcelas    smallint check (parcelas between 2 and 360), -- ou: termina após N vezes
  ativa       boolean not null default true,                -- false = encerrada
  observacao  text check (char_length(observacao) <= 500),
  created_by  uuid references public.koinonia_profiles (id) on delete set null default auth.uid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint koinonia_financeiro_recorrencias_fim check (data_fim is null or data_fim >= data_inicio),
  constraint koinonia_financeiro_recorrencias_termino check (data_fim is null or parcelas is null)
);

create table public.koinonia_financeiro_contas (
  id              uuid primary key default gen_random_uuid(),
  descricao       text not null check (char_length(descricao) between 1 and 150),
  categoria       public.koinonia_despesa_categoria not null,
  fornecedor      text check (char_length(fornecedor) <= 150),
  valor           numeric(12, 2) not null check (valor > 0),
  vencimento      date not null,
  status          public.koinonia_conta_status not null default 'pendente',
  pago_em         date,
  valor_pago      numeric(12, 2) check (valor_pago > 0),
  forma_pagamento public.koinonia_forma_pagamento,
  observacao      text check (char_length(observacao) <= 500),
  recorrencia_id  uuid references public.koinonia_financeiro_recorrencias (id) on delete set null,
  ocorrencia      smallint, -- nº da conta dentro da recorrência (1, 2, 3...)
  created_by      uuid references public.koinonia_profiles (id) on delete set null default auth.uid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint koinonia_financeiro_contas_ocorrencia_unica unique (recorrencia_id, ocorrencia),
  -- paga ⇔ tem data e valor de pagamento
  constraint koinonia_financeiro_contas_pagamento check (
    (status = 'paga') = (pago_em is not null and valor_pago is not null)
  )
);

create index koinonia_financeiro_contas_vencimento_idx on public.koinonia_financeiro_contas (vencimento);
create index koinonia_financeiro_contas_status_idx on public.koinonia_financeiro_contas (status, vencimento);

create trigger koinonia_financeiro_recorrencias_set_updated_at before update on public.koinonia_financeiro_recorrencias
  for each row execute function public.koinonia_set_updated_at();
create trigger koinonia_financeiro_contas_set_updated_at before update on public.koinonia_financeiro_contas
  for each row execute function public.koinonia_set_updated_at();

-- -----------------------------------------------------------------------------
-- Vencimento da n-ésima conta (n começa em 1). Sempre calculado a partir do
-- 1º vencimento, então dia 31 vira 28/29/30 nos meses curtos sem "escorregar".
-- -----------------------------------------------------------------------------
create or replace function public.koinonia_financeiro_vencimento(
  p_frequencia public.koinonia_recorrencia_frequencia,
  p_inicio date,
  p_n integer
)
returns date
language sql
immutable
set search_path = ''
as $$
  select case p_frequencia
    when 'semanal'    then p_inicio + (p_n - 1) * 7
    when 'quinzenal'  then p_inicio + (p_n - 1) * 14
    when 'mensal'     then (p_inicio + make_interval(months => (p_n - 1)))::date
    when 'bimestral'  then (p_inicio + make_interval(months => (p_n - 1) * 2))::date
    when 'trimestral' then (p_inicio + make_interval(months => (p_n - 1) * 3))::date
    when 'semestral'  then (p_inicio + make_interval(months => (p_n - 1) * 6))::date
    when 'anual'      then (p_inicio + make_interval(years => (p_n - 1)))::date
  end;
$$;

-- -----------------------------------------------------------------------------
-- Gera as contas das recorrências ativas com vencimento até p_ate (no máximo
-- 5 anos à frente). Idempotente. Roda com as permissões de quem chama (RLS).
-- Devolve quantas contas foram criadas.
-- -----------------------------------------------------------------------------
create or replace function public.koinonia_financeiro_gerar_contas(p_ate date)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  r       record;
  n       integer;
  v_venc  date;
  v_ate   date := least(p_ate, (now() at time zone 'America/Sao_Paulo')::date + interval '5 years');
  v_total integer := 0;
  v_qtd   integer;
begin
  if not public.koinonia_pode_financeiro() then
    raise exception 'Sem permissão para o financeiro.' using errcode = '42501';
  end if;

  for r in select * from public.koinonia_financeiro_recorrencias where ativa loop
    n := 1;
    loop
      v_venc := public.koinonia_financeiro_vencimento(r.frequencia, r.data_inicio, n);
      exit when v_venc > v_ate
        or (r.data_fim is not null and v_venc > r.data_fim)
        or (r.parcelas is not null and n > r.parcelas)
        or n > 2000;

      insert into public.koinonia_financeiro_contas
        (descricao, categoria, fornecedor, valor, vencimento, observacao, recorrencia_id, ocorrencia, created_by)
      values
        (r.descricao, r.categoria, r.fornecedor, r.valor, v_venc, r.observacao, r.id, n, r.created_by)
      on conflict (recorrencia_id, ocorrencia) do nothing;
      get diagnostics v_qtd = row_count;
      v_total := v_total + v_qtd;

      n := n + 1;
    end loop;
  end loop;

  return v_total;
end;
$$;

revoke execute on function public.koinonia_financeiro_gerar_contas(date) from public, anon;
grant execute on function public.koinonia_financeiro_gerar_contas(date) to authenticated;

-- -----------------------------------------------------------------------------
-- RLS: nada para anon; autenticados só com permissão de financeiro
-- -----------------------------------------------------------------------------
revoke all on public.koinonia_financeiro_recorrencias, public.koinonia_financeiro_contas from anon;
grant select, insert, update, delete on public.koinonia_financeiro_recorrencias, public.koinonia_financeiro_contas to authenticated;
alter table public.koinonia_financeiro_recorrencias enable row level security;
alter table public.koinonia_financeiro_contas enable row level security;

create policy "koinonia_financeiro_recorrencias_gerenciar" on public.koinonia_financeiro_recorrencias
  for all to authenticated
  using ((select public.koinonia_pode_financeiro()))
  with check ((select public.koinonia_pode_financeiro()));

create policy "koinonia_financeiro_contas_gerenciar" on public.koinonia_financeiro_contas
  for all to authenticated
  using ((select public.koinonia_pode_financeiro()))
  with check ((select public.koinonia_pode_financeiro()));
