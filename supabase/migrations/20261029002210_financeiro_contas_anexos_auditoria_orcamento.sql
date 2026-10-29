-- =============================================================================
-- Koinonia — financeiro completo
--
-- Tesoureiro     koinonia_pode_financeiro() passa a incluir TESOUREIRO.
-- Contas         "carteiras" no código (para não confundir com contas a
--                pagar): contas bancárias, caixa e aplicações, cada uma com
--                saldo inicial numa data. Entradas e pagamentos dizem de qual
--                conta entrou/saiu; transferências movem dinheiro entre elas
--                (ex.: depósito da oferta em dinheiro no banco).
-- Comprovantes   arquivos (foto/PDF) anexados a entradas e contas a pagar, num
--                bucket privado.
-- Auditoria      todo insert/update/delete nas tabelas do financeiro grava
--                quem fez, quando e o que mudou (só leitura, ninguém apaga).
-- Orçamento      valor previsto por ministério (ou geral) no ano; o realizado
--                vem das despesas pagas marcadas com o ministério.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tesoureiro
-- -----------------------------------------------------------------------------
create or replace function public.koinonia_pode_financeiro()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.koinonia_current_user_role() in ('ADMIN', 'PASTOR', 'TESOUREIRO'), false);
$$;

-- espelha koinonia_pode_financeiro()
create or replace function public.koinonia_notificar_financeiro(p_titulo text, p_mensagem text, p_url text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.koinonia_notificacoes (titulo, mensagem, url, origem, publico, publico_id)
  select left(p_titulo, 100), left(p_mensagem, 300), p_url, 'evento', 'perfil', p.id
    from public.koinonia_profiles p
   where p.ativo and p.role in ('ADMIN', 'PASTOR', 'TESOUREIRO');
$$;

revoke execute on function public.koinonia_notificar_financeiro(text, text, text) from public, anon, authenticated;

-- o tesoureiro vê o perfil (nome) de quem contribuiu, para conferir lançamentos
alter policy "koinonia_profiles_select" on public.koinonia_profiles
  using (
    id = (select auth.uid())
    or (select public.koinonia_is_admin_or_pastor())
    or (select public.koinonia_pode_financeiro())
    or public.koinonia_is_lider_of_profile(id)
    or public.koinonia_is_responsavel_por_inscrito(id)
  );

-- -----------------------------------------------------------------------------
-- Contas (carteiras) e transferências
-- -----------------------------------------------------------------------------
create type public.koinonia_carteira_tipo as enum ('banco', 'caixa', 'aplicacao');

create table public.koinonia_financeiro_carteiras (
  id               uuid primary key default gen_random_uuid(),
  nome             text not null unique check (char_length(btrim(nome)) between 2 and 80),
  tipo             public.koinonia_carteira_tipo not null,
  -- saldo no começo do dia "saldo_inicial_em"; movimentos a partir dessa data somam
  saldo_inicial    numeric(12, 2) not null default 0,
  saldo_inicial_em date not null,
  -- conta usada quando o lançamento é automático (ex.: pagamento de inscrição)
  padrao           boolean not null default false,
  ativa            boolean not null default true,
  observacao       text check (char_length(observacao) <= 300),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create unique index koinonia_financeiro_carteiras_padrao_idx on public.koinonia_financeiro_carteiras (padrao) where padrao;

create trigger koinonia_financeiro_carteiras_set_updated_at before update on public.koinonia_financeiro_carteiras
  for each row execute function public.koinonia_set_updated_at();

alter table public.koinonia_financeiro_entradas
  add column carteira_id uuid references public.koinonia_financeiro_carteiras (id) on delete restrict;
alter table public.koinonia_financeiro_contas
  add column carteira_id uuid references public.koinonia_financeiro_carteiras (id) on delete restrict;

create index koinonia_financeiro_entradas_carteira_idx on public.koinonia_financeiro_entradas (carteira_id);
create index koinonia_financeiro_contas_carteira_idx on public.koinonia_financeiro_contas (carteira_id);

create table public.koinonia_financeiro_transferencias (
  id         uuid primary key default gen_random_uuid(),
  data       date not null,
  origem_id  uuid not null references public.koinonia_financeiro_carteiras (id) on delete restrict,
  destino_id uuid not null references public.koinonia_financeiro_carteiras (id) on delete restrict,
  valor      numeric(12, 2) not null check (valor > 0),
  descricao  text check (char_length(descricao) <= 300),
  created_by uuid references public.koinonia_profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint koinonia_financeiro_transferencias_contas check (origem_id <> destino_id)
);

create index koinonia_financeiro_transferencias_data_idx on public.koinonia_financeiro_transferencias (data);
create index koinonia_financeiro_transferencias_origem_idx on public.koinonia_financeiro_transferencias (origem_id);
create index koinonia_financeiro_transferencias_destino_idx on public.koinonia_financeiro_transferencias (destino_id);
create index koinonia_financeiro_transferencias_created_by_idx on public.koinonia_financeiro_transferencias (created_by);

create trigger koinonia_financeiro_transferencias_set_updated_at before update on public.koinonia_financeiro_transferencias
  for each row execute function public.koinonia_set_updated_at();

/**
 * Saldo de cada conta até uma data: saldo inicial + entradas − pagamentos
 * ± transferências, contando só o que aconteceu a partir da data do saldo
 * inicial. Lançamentos sem conta não entram (a tela avisa quantos são).
 * Roda com as permissões de quem chama (RLS do financeiro).
 */
create or replace function public.koinonia_financeiro_saldos(p_ate date)
returns table (carteira_id uuid, entradas numeric, saidas numeric, saldo numeric)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    c.id,
    coalesce(e.total, 0) + coalesce(ti.total, 0),
    coalesce(p.total, 0) + coalesce(tsai.total, 0),
    c.saldo_inicial + coalesce(e.total, 0) + coalesce(ti.total, 0) - coalesce(p.total, 0) - coalesce(tsai.total, 0)
  from public.koinonia_financeiro_carteiras c
  left join lateral (
    select sum(valor) as total from public.koinonia_financeiro_entradas
     where carteira_id = c.id and data between c.saldo_inicial_em and p_ate
  ) e on true
  left join lateral (
    select sum(valor_pago) as total from public.koinonia_financeiro_contas
     where carteira_id = c.id and status = 'paga' and pago_em between c.saldo_inicial_em and p_ate
  ) p on true
  left join lateral (
    select sum(valor) as total from public.koinonia_financeiro_transferencias
     where destino_id = c.id and data between c.saldo_inicial_em and p_ate
  ) ti on true
  left join lateral (
    select sum(valor) as total from public.koinonia_financeiro_transferencias
     where origem_id = c.id and data between c.saldo_inicial_em and p_ate
  ) tsai on true;
$$;

revoke execute on function public.koinonia_financeiro_saldos(date) from public, anon;
grant execute on function public.koinonia_financeiro_saldos(date) to authenticated;

-- -----------------------------------------------------------------------------
-- Orçamento por ministério
-- -----------------------------------------------------------------------------
alter table public.koinonia_financeiro_contas
  add column ministerio_id uuid references public.koinonia_ministerios (id) on delete set null;
alter table public.koinonia_financeiro_recorrencias
  add column ministerio_id uuid references public.koinonia_ministerios (id) on delete set null;

create index koinonia_financeiro_contas_ministerio_idx on public.koinonia_financeiro_contas (ministerio_id);
create index koinonia_financeiro_recorrencias_ministerio_idx on public.koinonia_financeiro_recorrencias (ministerio_id);

create table public.koinonia_financeiro_orcamentos (
  id            uuid primary key default gen_random_uuid(),
  ano           smallint not null check (ano between 2000 and 2100),
  ministerio_id uuid references public.koinonia_ministerios (id) on delete cascade, -- null = despesas gerais
  valor         numeric(12, 2) not null check (valor > 0),
  observacao    text check (char_length(observacao) <= 300),
  created_by    uuid references public.koinonia_profiles (id) on delete set null default auth.uid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint koinonia_financeiro_orcamentos_unico unique nulls not distinct (ano, ministerio_id)
);

create index koinonia_financeiro_orcamentos_ministerio_idx on public.koinonia_financeiro_orcamentos (ministerio_id);
create index koinonia_financeiro_orcamentos_created_by_idx on public.koinonia_financeiro_orcamentos (created_by);

create trigger koinonia_financeiro_orcamentos_set_updated_at before update on public.koinonia_financeiro_orcamentos
  for each row execute function public.koinonia_set_updated_at();

-- contas geradas pela recorrência levam o ministério (mesma função de
-- 20261021001700, agora copiando ministerio_id)
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
        (descricao, categoria, fornecedor, valor, vencimento, observacao, recorrencia_id, ocorrencia, created_by, ministerio_id)
      values
        (r.descricao, r.categoria, r.fornecedor, r.valor, v_venc, r.observacao, r.id, n, r.created_by, r.ministerio_id)
      on conflict (recorrencia_id, ocorrencia) do nothing;
      get diagnostics v_qtd = row_count;
      v_total := v_total + v_qtd;

      n := n + 1;
    end loop;
  end loop;

  return v_total;
end;
$$;

-- -----------------------------------------------------------------------------
-- Comprovantes
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('koinonia-financeiro', 'koinonia-financeiro', false, 10485760,
        array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'])
on conflict (id) do nothing;

create policy "koinonia_financeiro_anexos_storage_select" on storage.objects
  for select to authenticated
  using (bucket_id = 'koinonia-financeiro' and (select public.koinonia_pode_financeiro()));
create policy "koinonia_financeiro_anexos_storage_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'koinonia-financeiro' and (select public.koinonia_pode_financeiro()));
create policy "koinonia_financeiro_anexos_storage_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'koinonia-financeiro' and (select public.koinonia_pode_financeiro()));

create table public.koinonia_financeiro_anexos (
  id         uuid primary key default gen_random_uuid(),
  entrada_id uuid references public.koinonia_financeiro_entradas (id) on delete cascade,
  conta_id   uuid references public.koinonia_financeiro_contas (id) on delete cascade,
  path       text not null unique,
  nome       text not null check (char_length(nome) between 1 and 200),
  tipo       text not null,
  tamanho    integer not null check (tamanho > 0),
  created_by uuid references public.koinonia_profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  constraint koinonia_financeiro_anexos_dono check (num_nonnulls(entrada_id, conta_id) = 1)
);

create index koinonia_financeiro_anexos_entrada_idx on public.koinonia_financeiro_anexos (entrada_id);
create index koinonia_financeiro_anexos_conta_idx on public.koinonia_financeiro_anexos (conta_id);
create index koinonia_financeiro_anexos_created_by_idx on public.koinonia_financeiro_anexos (created_by);

-- -----------------------------------------------------------------------------
-- RLS das tabelas novas: só quem acessa o financeiro
-- -----------------------------------------------------------------------------
revoke all on public.koinonia_financeiro_carteiras, public.koinonia_financeiro_transferencias,
              public.koinonia_financeiro_orcamentos, public.koinonia_financeiro_anexos from anon;
grant select, insert, update, delete on public.koinonia_financeiro_carteiras, public.koinonia_financeiro_transferencias,
              public.koinonia_financeiro_orcamentos to authenticated;
-- anexo não é editado: envia ou apaga
grant select, insert, delete on public.koinonia_financeiro_anexos to authenticated;

alter table public.koinonia_financeiro_carteiras enable row level security;
alter table public.koinonia_financeiro_transferencias enable row level security;
alter table public.koinonia_financeiro_orcamentos enable row level security;
alter table public.koinonia_financeiro_anexos enable row level security;

create policy "koinonia_financeiro_carteiras_gerenciar" on public.koinonia_financeiro_carteiras
  for all to authenticated
  using ((select public.koinonia_pode_financeiro())) with check ((select public.koinonia_pode_financeiro()));
create policy "koinonia_financeiro_transferencias_gerenciar" on public.koinonia_financeiro_transferencias
  for all to authenticated
  using ((select public.koinonia_pode_financeiro())) with check ((select public.koinonia_pode_financeiro()));
create policy "koinonia_financeiro_orcamentos_gerenciar" on public.koinonia_financeiro_orcamentos
  for all to authenticated
  using ((select public.koinonia_pode_financeiro())) with check ((select public.koinonia_pode_financeiro()));
create policy "koinonia_financeiro_anexos_gerenciar" on public.koinonia_financeiro_anexos
  for all to authenticated
  using ((select public.koinonia_pode_financeiro())) with check ((select public.koinonia_pode_financeiro()));

-- -----------------------------------------------------------------------------
-- Auditoria
-- -----------------------------------------------------------------------------
create table public.koinonia_financeiro_auditoria (
  id           bigint generated always as identity primary key,
  tabela       text not null,
  registro_id  uuid not null,
  acao         text not null check (acao in ('criou', 'alterou', 'excluiu')),
  alterado_por uuid references public.koinonia_profiles (id) on delete set null,
  alterado_em  timestamptz not null default now(),
  -- criou/excluiu: o registro inteiro; alterou: só os campos que mudaram {campo: [antes, depois]}
  dados        jsonb not null
);

create index koinonia_financeiro_auditoria_registro_idx on public.koinonia_financeiro_auditoria (registro_id);
create index koinonia_financeiro_auditoria_data_idx on public.koinonia_financeiro_auditoria (alterado_em desc);
create index koinonia_financeiro_auditoria_por_idx on public.koinonia_financeiro_auditoria (alterado_por);

revoke all on public.koinonia_financeiro_auditoria from anon, authenticated;
grant select on public.koinonia_financeiro_auditoria to authenticated;
alter table public.koinonia_financeiro_auditoria enable row level security;

create policy "koinonia_financeiro_auditoria_select" on public.koinonia_financeiro_auditoria
  for select to authenticated
  using ((select public.koinonia_pode_financeiro()));

create or replace function public.koinonia_financeiro_auditar()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_mudou jsonb;
begin
  if tg_op = 'INSERT' then
    -- contas geradas automaticamente pela recorrência não poluem o histórico
    -- (a criação da recorrência já fica registrada)
    -- (via jsonb: as outras tabelas não têm essas colunas)
    if tg_table_name = 'koinonia_financeiro_contas' and to_jsonb(new) ->> 'recorrencia_id' is not null
       and to_jsonb(new) ->> 'ocorrencia' is not null then
      return new;
    end if;
    insert into public.koinonia_financeiro_auditoria (tabela, registro_id, acao, alterado_por, dados)
    values (tg_table_name, new.id, 'criou', (select auth.uid()), to_jsonb(new) - 'created_at' - 'updated_at');
    return new;
  elsif tg_op = 'UPDATE' then
    select jsonb_object_agg(n.key, jsonb_build_array(o.value, n.value)) into v_mudou
      from jsonb_each(to_jsonb(new)) n
      join jsonb_each(to_jsonb(old)) o using (key)
     where n.value is distinct from o.value and n.key not in ('updated_at', 'created_at');
    if v_mudou is not null then
      insert into public.koinonia_financeiro_auditoria (tabela, registro_id, acao, alterado_por, dados)
      values (tg_table_name, new.id, 'alterou', (select auth.uid()), v_mudou);
    end if;
    return new;
  else
    insert into public.koinonia_financeiro_auditoria (tabela, registro_id, acao, alterado_por, dados)
    values (tg_table_name, old.id, 'excluiu', (select auth.uid()), to_jsonb(old) - 'created_at' - 'updated_at');
    return old;
  end if;
end;
$$;

revoke execute on function public.koinonia_financeiro_auditar() from public, anon, authenticated;

create trigger koinonia_financeiro_entradas_auditar after insert or update or delete on public.koinonia_financeiro_entradas
  for each row execute function public.koinonia_financeiro_auditar();
create trigger koinonia_financeiro_contas_auditar after insert or update or delete on public.koinonia_financeiro_contas
  for each row execute function public.koinonia_financeiro_auditar();
create trigger koinonia_financeiro_recorrencias_auditar after insert or update or delete on public.koinonia_financeiro_recorrencias
  for each row execute function public.koinonia_financeiro_auditar();
create trigger koinonia_financeiro_carteiras_auditar after insert or update or delete on public.koinonia_financeiro_carteiras
  for each row execute function public.koinonia_financeiro_auditar();
create trigger koinonia_financeiro_transferencias_auditar after insert or update or delete on public.koinonia_financeiro_transferencias
  for each row execute function public.koinonia_financeiro_auditar();
create trigger koinonia_financeiro_orcamentos_auditar after insert or update or delete on public.koinonia_financeiro_orcamentos
  for each row execute function public.koinonia_financeiro_auditar();
create trigger koinonia_financeiro_anexos_auditar after insert or delete on public.koinonia_financeiro_anexos
  for each row execute function public.koinonia_financeiro_auditar();

-- -----------------------------------------------------------------------------
-- Pagamento de inscrição → entrada já com a conta: dinheiro vai para o caixa,
-- o resto para a conta padrão (mesma função de 20261028002110, + carteira_id)
-- -----------------------------------------------------------------------------
create or replace function public.koinonia_evento_inscricoes_lancar_entrada()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_evento   record;
  v_forma    public.koinonia_forma_pagamento :=
               coalesce(nullif(current_setting('koinonia.forma_pagamento', true), ''), 'pix')::public.koinonia_forma_pagamento;
  v_carteira uuid;
begin
  select titulo, valor into v_evento from public.koinonia_eventos where id = new.evento_id;
  if v_evento.valor is null then return new; end if;

  if new.status = 'confirmada' and (tg_op = 'INSERT' or old.status <> 'confirmada') then
    select id into v_carteira
      from public.koinonia_financeiro_carteiras
     where ativa and (padrao or (v_forma = 'dinheiro' and tipo = 'caixa'))
     order by (v_forma = 'dinheiro' and tipo = 'caixa') desc, padrao desc, created_at
     limit 1;

    insert into public.koinonia_financeiro_entradas
      (data, categoria, valor, forma_pagamento, profile_id, contribuinte_nome, descricao, inscricao_id, carteira_id)
    values (
      (now() at time zone 'America/Sao_Paulo')::date,
      'evento',
      v_evento.valor,
      v_forma,
      new.profile_id,
      new.convidado_nome,
      left('Inscrição: ' || v_evento.titulo, 500),
      new.id,
      v_carteira
    )
    on conflict (inscricao_id) do nothing;

    if new.profile_id is not null and new.profile_id is distinct from (select auth.uid()) then
      perform public.koinonia_notificar_perfil(
        new.profile_id,
        'Pagamento confirmado',
        v_evento.titulo || ' · Sua inscrição está confirmada.',
        '/app/eventos/' || new.evento_id,
        'evento'
      );
    end if;
  elsif tg_op = 'UPDATE' and old.status = 'confirmada' and new.status <> 'confirmada' then
    delete from public.koinonia_financeiro_entradas where inscricao_id = new.id;
  end if;
  return new;
end;
$$;
