-- =============================================================================
-- Koinonia — testes de permissão (RLS + triggers) por papel
--
-- Uso:  npm run db:test      (psql "$DATABASE_URL" -f supabase/tests/permissoes.sql)
--
-- Roda tudo dentro de uma transação e termina com ROLLBACK: nada fica gravado.
-- Precisa de 1 perfil ADMIN e de 2 contas no auth.users SEM perfil Koinonia
-- (o banco é compartilhado com outros apps, então elas costumam existir); essas
-- contas recebem perfis temporários de PASTOR e MEMBRO durante o teste
-- (o de MEMBRO via autocadastro, como no site).
-- Cada verificação imprime ✓; a primeira que falhar (✗) interrompe o script.
-- =============================================================================

\set ON_ERROR_STOP on
\set QUIET on
set client_min_messages = notice;
begin;

-- ------------------------------------------------------------------ helpers
create function public.koinonia_teste_ok(p_cond boolean, p_msg text) returns void
language plpgsql as $$
begin
  if coalesce(p_cond, false) then raise notice '✓ %', p_msg;
  else raise exception '✗ %', p_msg;
  end if;
end $$;

create function public.koinonia_teste_bloqueia(p_sql text, p_msg text) returns void
language plpgsql as $$
declare passou boolean := false;
begin
  begin
    execute p_sql;
    passou := true;
  exception when others then
    raise notice '✓ % [%]', p_msg, sqlerrm;
  end;
  if passou then raise exception '✗ % — deveria ter sido bloqueado', p_msg; end if;
end $$;

create function public.koinonia_teste_como(p_quem text) returns void
language plpgsql as $$
begin
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', current_setting('teste.' || p_quem), 'role', 'authenticated')::text,
    true
  );
end $$;

-- ------------------------------------------------------------------ dados
select id as admin_id from public.koinonia_profiles where role = 'ADMIN' and ativo order by created_at limit 1 \gset
select id as pastor_id from auth.users u
  where not exists (select 1 from public.koinonia_profiles p where p.id = u.id) order by created_at limit 1 \gset
select id as membro_id from auth.users u
  where not exists (select 1 from public.koinonia_profiles p where p.id = u.id) order by created_at offset 1 limit 1 \gset
-- conta logada de outro app (sem perfil); se não houver uma 3ª, um uuid
-- qualquer simula o mesmo caso (JWT válido, sem perfil Koinonia)
select coalesce(
  (select id::text from auth.users u
    where not exists (select 1 from public.koinonia_profiles p where p.id = u.id) order by created_at offset 2 limit 1),
  gen_random_uuid()::text
) as externo_id \gset

select set_config('teste.admin', :'admin_id', false),
       set_config('teste.pastor', :'pastor_id', false),
       set_config('teste.membro', :'membro_id', false),
       set_config('teste.externo', :'externo_id', false);

insert into public.koinonia_profiles (id, email, nome_completo, celular, data_nascimento, genero, role) values
  (:'pastor_id', 'pastor@teste', 'Pastor Teste', '11900000001', '1980-01-01', 'masculino', 'PASTOR');
-- o perfil do MEMBRO é criado pelo próprio usuário, na seção "Cadastro público"

-- ministérios próprios do teste (não depende dos ministérios reais da igreja)
insert into public.koinonia_ministerios (nome) values ('Teste Ministério A'), ('Teste Ministério B'), ('Teste Ministério C');

insert into public.koinonia_eventos (id, titulo, cep, logradouro, numero, bairro, cidade, uf, inicio, fim, responsavel_id)
values ('99999999-0000-4000-a000-000000000001', 'Evento Teste', '01310100', 'Av', '1', 'B', 'C', 'SP',
        now() + interval '1 day', now() + interval '1 day 2 hours', :'admin_id');
insert into public.koinonia_escalas (id, data, descricao)
values ('99999999-0000-4000-a000-000000000002', current_date + 3, 'Escala Teste');

\echo
\echo '== Visitante (anon)'
set local role anon;
select koinonia_teste_ok((select count(*) from koinonia_eventos) > 0, 'vê eventos no site');
select koinonia_teste_ok((select count(*) >= 0 from koinonia_pastores), 'vê pastores no site');
select koinonia_teste_bloqueia('select 1 from koinonia_profiles', 'não lê perfis');
select koinonia_teste_bloqueia('select 1 from koinonia_gcs', 'não lê GCs');
select koinonia_teste_bloqueia('select 1 from koinonia_escalas', 'não lê escalas');
select koinonia_teste_bloqueia('insert into koinonia_eventos (titulo) values (''x'')', 'não cria evento');
reset role;

\echo
\echo '== Conta de outro app (logada, sem perfil Koinonia)'
select koinonia_teste_como('externo');
set local role authenticated;
select koinonia_teste_ok((select count(*) from koinonia_gcs) = 0, 'não vê GCs (endereços)');
select koinonia_teste_ok((select count(*) from koinonia_perfis_basicos) = 0, 'não vê nomes de membros');
select koinonia_teste_ok((select count(*) from koinonia_profiles) = 0, 'não vê perfis');
select koinonia_teste_ok((select count(*) from koinonia_escalas) = 0, 'não vê escalas');
reset role;

\echo
\echo '== Cadastro público (conta logada criando o próprio perfil)'
select koinonia_teste_como('membro');
set local role authenticated;
-- tenta se cadastrar já como ADMIN, num GC e com e-mail falso
insert into koinonia_profiles (id, email, nome_completo, celular, data_nascimento, genero, role, gc_id)
select auth.uid(), 'falso@x', 'Membro Teste', '11900000002', '1995-01-01', 'feminino', 'ADMIN', (select id from koinonia_gcs limit 1);
select koinonia_teste_ok((select role = 'MEMBRO' from koinonia_profiles where id = auth.uid()), 'conta nova entra sempre como MEMBRO (mesmo pedindo ADMIN)');
select koinonia_teste_ok((select gc_id is null and ativo and email <> 'falso@x' from koinonia_profiles where id = auth.uid()),
  'GC, status e e-mail também são definidos pelo banco');
select koinonia_teste_bloqueia(
  format('insert into koinonia_profiles (id, email, nome_completo, celular, data_nascimento, genero) values (%L, ''x@x'', ''Fulano Tal'', ''11999999999'', ''2000-01-01'', ''masculino'')', current_setting('teste.externo')),
  'não cria perfil para outra pessoa');
reset role;

\echo
\echo '== MEMBRO'
select koinonia_teste_como('membro');
set local role authenticated;
select koinonia_teste_ok((select count(*) from koinonia_profiles) = 1, 'vê só o próprio perfil');
select koinonia_teste_ok((select count(*) from koinonia_perfis_basicos) >= 3, 'vê nomes dos membros (escala, GCs)');
select koinonia_teste_ok((select count(*) from koinonia_gcs) > 0, 'vê os GCs para escolher o seu');
with u as (update koinonia_profiles set gc_id = (select id from koinonia_gcs limit 1), nome_completo = 'Membro Editado'
           where id = auth.uid() returning 1)
select koinonia_teste_ok(count(*) = 1, 'edita o próprio perfil e escolhe o GC') from u;
with u as (update koinonia_profiles set nome_completo = 'Hack' where id = current_setting('teste.admin')::uuid returning 1)
select koinonia_teste_ok(count(*) = 0, 'não edita perfil de outra pessoa') from u;
select koinonia_teste_bloqueia('update koinonia_profiles set role = ''ADMIN'' where id = auth.uid()', 'não altera o próprio papel');
select koinonia_teste_bloqueia('update koinonia_profiles set ativo = false where id = auth.uid()', 'não se desativa');
select koinonia_teste_bloqueia($$insert into koinonia_eventos (titulo, cep, logradouro, numero, bairro, cidade, uf, inicio, fim, responsavel_id)
  values ('x', '01310100', 'a', '1', 'b', 'c', 'SP', now(), now() + interval '1h', auth.uid())$$, 'não cria evento');
select koinonia_teste_bloqueia('insert into koinonia_ministerios (nome) values (''Hack'')', 'não cria ministério');
select koinonia_teste_bloqueia($$insert into koinonia_gcs (nome, cep, logradouro, numero, bairro, cidade, uf) values ('Hack', '01310100', 'a', '1', 'b', 'c', 'SP')$$, 'não cria GC');
select koinonia_teste_bloqueia('insert into koinonia_escalas (data, descricao) values (current_date, ''Hack'')', 'não cria escala');
select koinonia_teste_bloqueia($$insert into koinonia_escala_atribuicoes (escala_id, funcao_id, profile_id)
  select '99999999-0000-4000-a000-000000000002', id, auth.uid() from koinonia_escala_funcoes limit 1$$, 'não se escala');
select koinonia_teste_bloqueia($$insert into koinonia_cantina_escalas (data, gc_id) select current_date + 400, id from koinonia_gcs limit 1$$, 'não cria cantina');
select koinonia_teste_bloqueia($$insert into koinonia_ministerio_membros (ministerio_id, profile_id) select id, auth.uid() from koinonia_ministerios limit 1$$, 'não se vincula a ministério');
with u as (update koinonia_pastores set nome = 'Hack' returning 1)
select koinonia_teste_ok(count(*) = 0, 'não edita conteúdo do site (pastores)') from u;
with u as (update koinonia_configuracoes_contribuicao set chave_pix = 'golpe' returning 1)
select koinonia_teste_ok(count(*) = 0, 'não altera a chave PIX') from u;
select koinonia_teste_bloqueia($$insert into storage.objects (bucket_id, name) values ('koinonia-site', 'pastores/hack.jpg')$$, 'não envia imagens');
select koinonia_teste_bloqueia($$select koinonia_auth_user_id_por_email('a@b.c')$$, 'não consulta contas por e-mail');
reset role;

\echo
\echo '== Pedidos para participar de ministério'
select koinonia_teste_como('membro');
set local role authenticated;
with i as (insert into koinonia_ministerio_solicitacoes (ministerio_id, profile_id)
           select id, auth.uid() from koinonia_ministerios where nome = 'Teste Ministério B' returning 1)
select koinonia_teste_ok(count(*) = 1, 'membro pede para participar') from i;
select koinonia_teste_bloqueia($$insert into koinonia_ministerio_solicitacoes (ministerio_id, profile_id)
  select id, auth.uid() from koinonia_ministerios where nome = 'Teste Ministério B'$$, 'não repete o mesmo pedido');
select koinonia_teste_bloqueia(format($$insert into koinonia_ministerio_solicitacoes (ministerio_id, profile_id)
  select id, %L from koinonia_ministerios where nome = 'Teste Ministério C'$$, current_setting('teste.pastor')), 'não pede em nome de outra pessoa');
select koinonia_teste_bloqueia($$insert into koinonia_ministerio_membros (ministerio_id, profile_id)
  select id, auth.uid() from koinonia_ministerios where nome = 'Teste Ministério B'$$, 'não aprova o próprio pedido');
with i as (insert into koinonia_ministerio_solicitacoes (ministerio_id, profile_id)
           select id, auth.uid() from koinonia_ministerios where nome = 'Teste Ministério C' returning 1)
select koinonia_teste_ok(count(*) = 1, 'pede em outro ministério') from i;
with d as (delete from koinonia_ministerio_solicitacoes s using koinonia_ministerios m
           where m.id = s.ministerio_id and m.nome = 'Teste Ministério C' and s.profile_id = auth.uid() returning 1)
select koinonia_teste_ok(count(*) = 1, 'cancela o próprio pedido') from d;
reset role;
select koinonia_teste_como('pastor');
set local role authenticated;
select koinonia_teste_ok((select count(*) from koinonia_ministerio_solicitacoes where profile_id = current_setting('teste.membro')::uuid) = 1,
  'pastor vê o pedido');
insert into koinonia_ministerio_membros (ministerio_id, profile_id)
select id, current_setting('teste.membro')::uuid from koinonia_ministerios where nome = 'Teste Ministério B';
select koinonia_teste_ok((select count(*) from koinonia_ministerio_solicitacoes where profile_id = current_setting('teste.membro')::uuid) = 0,
  'aprovar (adicionar ao ministério) apaga o pedido automaticamente');
reset role;
select koinonia_teste_como('membro');
set local role authenticated;
select koinonia_teste_bloqueia($$insert into koinonia_ministerio_solicitacoes (ministerio_id, profile_id)
  select id, auth.uid() from koinonia_ministerios where nome = 'Teste Ministério B'$$, 'quem já participa não pede de novo');
reset role;

\echo
\echo '== Inscrições em eventos'
reset role;
select set_config('request.jwt.claims', '', true); -- eventos de teste criados como sistema
insert into public.koinonia_eventos (id, titulo, cep, logradouro, numero, bairro, cidade, uf, inicio, fim, valor, responsavel_id, publico) values
  ('99999999-0000-4000-a000-0000000000e2', 'Pago Teste', '89030410', 'R', '1', 'B', 'C', 'SC', now() + interval '2 days', now() + interval '2 days 2 hours', 50, :'admin_id', 'todos'),
  ('99999999-0000-4000-a000-0000000000e3', 'Só Homens Teste', '89030410', 'R', '1', 'B', 'C', 'SC', now() + interval '2 days', now() + interval '2 days 2 hours', null, :'admin_id', 'homens'),
  ('99999999-0000-4000-a000-0000000000e4', 'Encerrado Teste', '89030410', 'R', '1', 'B', 'C', 'SC', now() - interval '3 days', now() - interval '2 days', null, :'admin_id', 'todos'),
  ('99999999-0000-4000-a000-0000000000e5', 'Responsável Membro Teste', '89030410', 'R', '1', 'B', 'C', 'SC', now() + interval '3 days', now() + interval '3 days 2 hours', 30, :'membro_id', 'todos');

select koinonia_teste_como('membro');
set local role authenticated;
insert into koinonia_evento_inscricoes (evento_id, profile_id, status) values ('99999999-0000-4000-a000-000000000001', auth.uid(), 'pendente');
select koinonia_teste_ok((select status = 'confirmada' from koinonia_evento_inscricoes where evento_id = '99999999-0000-4000-a000-000000000001' and profile_id = auth.uid()),
  'evento gratuito confirma a inscrição na hora');
insert into koinonia_evento_inscricoes (evento_id, profile_id, status) values ('99999999-0000-4000-a000-0000000000e2', auth.uid(), 'confirmada');
select koinonia_teste_ok((select status = 'pendente' from koinonia_evento_inscricoes where evento_id = '99999999-0000-4000-a000-0000000000e2' and profile_id = auth.uid()),
  'evento pago fica pendente (mesmo pedindo confirmada)');
with u as (update koinonia_evento_inscricoes set status = 'confirmada' where profile_id = auth.uid() returning 1)
select koinonia_teste_ok(count(*) = 0, 'membro não confirma a própria inscrição') from u;
select koinonia_informar_pagamento('99999999-0000-4000-a000-0000000000e2');
select koinonia_teste_ok((select pagamento_informado_em is not null from koinonia_evento_inscricoes where evento_id = '99999999-0000-4000-a000-0000000000e2' and profile_id = auth.uid()),
  'membro avisa “já paguei”');
select koinonia_teste_bloqueia($$insert into koinonia_evento_inscricoes (evento_id, profile_id) values ('99999999-0000-4000-a000-0000000000e2', auth.uid())$$,
  'não se inscreve duas vezes');
select koinonia_teste_bloqueia($$insert into koinonia_evento_inscricoes (evento_id, profile_id) values ('99999999-0000-4000-a000-0000000000e3', auth.uid())$$,
  'respeita o público do evento');
select koinonia_teste_bloqueia($$insert into koinonia_evento_inscricoes (evento_id, profile_id) values ('99999999-0000-4000-a000-0000000000e4', auth.uid())$$,
  'não se inscreve em evento encerrado');
select koinonia_teste_bloqueia(format($$insert into koinonia_evento_inscricoes (evento_id, profile_id) values ('99999999-0000-4000-a000-0000000000e2', %L)$$, current_setting('teste.pastor')),
  'não inscreve outra pessoa');
with d as (delete from koinonia_evento_inscricoes where evento_id = '99999999-0000-4000-a000-000000000001' and profile_id = auth.uid() returning 1)
select koinonia_teste_ok(count(*) = 0, 'não cancela sozinho uma inscrição já confirmada') from d;
reset role;

-- o admin se inscreve no evento em que o MEMBRO é o responsável
select koinonia_teste_como('admin');
set local role authenticated;
insert into koinonia_evento_inscricoes (evento_id, profile_id) values ('99999999-0000-4000-a000-0000000000e5', auth.uid());
reset role;

select koinonia_teste_como('membro');
set local role authenticated;
select koinonia_teste_ok((select count(*) from koinonia_evento_inscricoes where profile_id <> auth.uid()) = 1,
  'responsável vê só as inscrições do seu evento');
select koinonia_teste_ok((select count(*) from koinonia_profiles where id = current_setting('teste.admin')::uuid) = 1,
  'responsável vê o contato de quem se inscreveu');
-- evento pago: o pagamento é confirmado pela tesouraria (seção "Eventos: vagas..."); o responsável recusa
select koinonia_teste_bloqueia($$update koinonia_evento_inscricoes set status = 'confirmada'
  where evento_id = '99999999-0000-4000-a000-0000000000e5'$$, 'responsável sem financeiro não confirma pagamento');
with u as (update koinonia_evento_inscricoes set status = 'recusada'
           where evento_id = '99999999-0000-4000-a000-0000000000e5' returning decidido_por)
select koinonia_teste_ok(count(*) = 1 and bool_and(decidido_por = auth.uid()), 'responsável recusa a inscrição (e fica registrado quem decidiu)') from u;
with u as (update koinonia_evento_inscricoes set status = 'confirmada'
           where evento_id = '99999999-0000-4000-a000-0000000000e2' and profile_id = auth.uid() returning 1)
select koinonia_teste_ok(count(*) = 0, 'não aprova inscrição de evento que não é responsável') from u;
with d as (delete from koinonia_evento_inscricoes where evento_id = '99999999-0000-4000-a000-0000000000e2' and profile_id = auth.uid() returning 1)
select koinonia_teste_ok(count(*) = 1, 'cancela a própria inscrição pendente') from d;
reset role;

select koinonia_teste_como('pastor');
set local role authenticated;
select koinonia_teste_ok((select count(*) from koinonia_evento_inscricoes) >= 2, 'pastor vê as inscrições de todos os eventos');
reset role;

\echo
\echo '== Convidados e PIX do evento'
select koinonia_teste_como('membro');
set local role authenticated;
-- MEMBRO é o responsável pelo evento e5: adiciona um convidado já pago
insert into koinonia_evento_inscricoes (evento_id, convidado_nome, convidado_celular, status)
values ('99999999-0000-4000-a000-0000000000e5', 'Convidado Teste', '4733089872', 'confirmada');
select koinonia_teste_ok((select status = 'pendente' and adicionado_por = auth.uid() from koinonia_evento_inscricoes where convidado_nome = 'Convidado Teste'),
  'responsável inscreve convidado sem conta (o "já pago" fica para a tesouraria)');
select koinonia_teste_bloqueia($$insert into koinonia_evento_inscricoes (evento_id, convidado_nome)
  values ('99999999-0000-4000-a000-0000000000e2', 'Intruso')$$, 'não adiciona convidado em evento que não é responsável');
select koinonia_teste_bloqueia($$insert into koinonia_evento_inscricoes (evento_id, profile_id, convidado_nome)
  values ('99999999-0000-4000-a000-0000000000e5', auth.uid(), 'Os dois')$$, 'inscrição é de membro OU de convidado, nunca os dois');
reset role;
select koinonia_teste_como('pastor');
set local role authenticated;
insert into koinonia_evento_inscricoes (evento_id, profile_id, status) values ('99999999-0000-4000-a000-0000000000e2', current_setting('teste.membro')::uuid, 'pendente');
select koinonia_teste_ok((select adicionado_por = auth.uid() from koinonia_evento_inscricoes where evento_id = '99999999-0000-4000-a000-0000000000e2' and profile_id = current_setting('teste.membro')::uuid),
  'pastor inscreve um membro com conta');
reset role;
select set_config('request.jwt.claims', '', true);
update public.koinonia_eventos set pix_chave = '47999990000', pix_tipo = 'telefone' where id = '99999999-0000-4000-a000-0000000000e2';
set local role anon;
select koinonia_teste_bloqueia('select pix_chave from koinonia_eventos', 'visitante não vê a chave PIX do evento');
select koinonia_teste_ok((select count(*) from koinonia_eventos where id = '99999999-0000-4000-a000-0000000000e2') = 1, 'visitante continua vendo o evento');
reset role;
select koinonia_teste_como('membro');
set local role authenticated;
select koinonia_teste_ok((select pix_chave = '47999990000' from koinonia_eventos where id = '99999999-0000-4000-a000-0000000000e2'), 'membro logado vê a chave PIX do evento');
reset role;

\echo
\echo '== Cantina: cardápio e reservas'
reset role;
select set_config('request.jwt.claims', '', true); -- dados de teste criados como sistema
-- B: equipe = ministério B (o MEMBRO participa); C: ministério C (MEMBRO não participa); passada
insert into public.koinonia_cantina_escalas (id, data, ministerio_id)
select '99999999-0000-4000-a000-0000000000c1', current_date + 900, id from public.koinonia_ministerios where nome = 'Teste Ministério B';
insert into public.koinonia_cantina_escalas (id, data, ministerio_id)
select '99999999-0000-4000-a000-0000000000c2', current_date + 901, id from public.koinonia_ministerios where nome = 'Teste Ministério C';
insert into public.koinonia_cantina_escalas (id, data, ministerio_id)
select '99999999-0000-4000-a000-0000000000c3', current_date - 900, id from public.koinonia_ministerios where nome = 'Teste Ministério C';
insert into public.koinonia_cantina_itens (id, cantina_id, nome, preco, quantidade_disponivel) values
  ('99999999-0000-4000-a000-0000000001c2', '99999999-0000-4000-a000-0000000000c2', 'Pastel Teste', 8, 3),
  ('99999999-0000-4000-a000-0000000001c3', '99999999-0000-4000-a000-0000000000c3', 'Bolo Passado', 5, null);

select koinonia_teste_como('membro');
set local role authenticated;
with i as (insert into koinonia_cantina_itens (cantina_id, nome) values ('99999999-0000-4000-a000-0000000000c1', 'Cachorro-quente Teste') returning id)
select koinonia_teste_ok(count(*) = 1, 'equipe escalada (ministério) monta o cardápio') from i;
select koinonia_teste_bloqueia($$insert into koinonia_cantina_itens (cantina_id, nome) values ('99999999-0000-4000-a000-0000000000c2', 'Intruso')$$,
  'quem não está na equipe não mexe no cardápio');
with r as (insert into koinonia_cantina_reservas (item_id, profile_id, quantidade, modo)
           values ('99999999-0000-4000-a000-0000000001c2', auth.uid(), 2, 'levar') returning 1)
select koinonia_teste_ok(count(*) = 1, 'qualquer membro reserva (quantidade + levar/comer)') from r;
select koinonia_teste_bloqueia($$insert into koinonia_cantina_reservas (item_id, profile_id, quantidade, modo)
  values ('99999999-0000-4000-a000-0000000001c3', auth.uid(), 1, 'comer_aqui')$$, 'não reserva em cantina que já passou');
select koinonia_teste_bloqueia(format($$insert into koinonia_cantina_reservas (item_id, profile_id, quantidade, modo)
  values ('99999999-0000-4000-a000-0000000001c2', %L, 1, 'levar')$$, current_setting('teste.pastor')), 'não reserva em nome de outra pessoa');
reset role;

select koinonia_teste_como('admin');
set local role authenticated;
insert into koinonia_cantina_reservas (item_id, profile_id, quantidade, modo) values ('99999999-0000-4000-a000-0000000001c2', auth.uid(), 1, 'comer_aqui');
insert into koinonia_cantina_reservas (item_id, profile_id, quantidade, modo)
select i.id, auth.uid(), 1, 'levar' from koinonia_cantina_itens i where i.nome = 'Cachorro-quente Teste';
reset role;

select koinonia_teste_como('membro');
set local role authenticated;
select koinonia_teste_bloqueia($$update koinonia_cantina_reservas set quantidade = 3 where item_id = '99999999-0000-4000-a000-0000000001c2' and profile_id = auth.uid()$$,
  'respeita a quantidade disponível do item');
select koinonia_teste_ok((select count(*) from koinonia_cantina_reservas r join koinonia_cantina_itens i on i.id = r.item_id
                          where i.cantina_id = '99999999-0000-4000-a000-0000000000c2') = 1,
  'fora da equipe, vê só a própria reserva');
select koinonia_teste_ok((select reservado = 3 from koinonia_cantina_disponibilidade('99999999-0000-4000-a000-0000000000c2')
                          where item_id = '99999999-0000-4000-a000-0000000001c2'),
  'vê quanto já foi reservado de cada item (sem ver de quem)');
select koinonia_teste_ok((select count(*) from koinonia_cantina_reservas r join koinonia_cantina_itens i on i.id = r.item_id
                          where i.cantina_id = '99999999-0000-4000-a000-0000000000c1' and r.profile_id <> auth.uid()) = 1,
  'equipe vê as reservas de todos na sua cantina');
with u as (update koinonia_cantina_reservas set quantidade = 5 where profile_id = current_setting('teste.admin')::uuid returning 1)
select koinonia_teste_ok(count(*) = 0, 'não altera a reserva de outra pessoa') from u;
with u as (update koinonia_cantina_reservas set modo = 'comer_aqui', quantidade = 1 where item_id = '99999999-0000-4000-a000-0000000001c2' and profile_id = auth.uid() returning 1)
select koinonia_teste_ok(count(*) = 1, 'altera a própria reserva') from u;
reset role;

\echo
\echo '== Avisos'
select set_config('request.jwt.claims', '', true);
-- a1: público e vigente; a2: só membros; a3: público, mas já venceu
insert into public.koinonia_avisos (id, titulo, publico, exibir_ate) values
  ('99999999-0000-4000-a000-0000000000a1', 'Aviso Teste Público', true, current_date + 3),
  ('99999999-0000-4000-a000-0000000000a2', 'Aviso Teste Membros', false, null),
  ('99999999-0000-4000-a000-0000000000a3', 'Aviso Teste Vencido', true, current_date - 2);
set local role anon;
select koinonia_teste_ok((select array_agg(titulo order by titulo) from koinonia_avisos where titulo like 'Aviso Teste%') = array['Aviso Teste Público'],
  'anon vê só o aviso público vigente');
reset role;
select koinonia_teste_como('membro');
set local role authenticated;
select koinonia_teste_ok((select array_agg(titulo order by titulo) from koinonia_avisos where titulo like 'Aviso Teste%') = array['Aviso Teste Membros', 'Aviso Teste Público'],
  'membro vê os vigentes (inclusive só para membros), não os vencidos');
select koinonia_teste_bloqueia($$insert into koinonia_avisos (titulo) values ('Aviso Intruso')$$, 'membro não publica aviso');
with u as (update koinonia_avisos set titulo = 'Editado' where id = '99999999-0000-4000-a000-0000000000a1' returning 1)
select koinonia_teste_ok(count(*) = 0, 'membro não edita aviso') from u;
with d as (delete from koinonia_avisos where id = '99999999-0000-4000-a000-0000000000a1' returning 1)
select koinonia_teste_ok(count(*) = 0, 'membro não remove aviso') from d;
reset role;

\echo
\echo '== Financeiro: entradas'
select set_config('request.jwt.claims', '', true);
insert into public.koinonia_financeiro_entradas (id, data, categoria, valor, forma_pagamento, profile_id) values
  ('99999999-0000-4000-a000-0000000000f1', current_date, 'dizimo', 150.00, 'pix', :'membro_id');
set local role anon;
select koinonia_teste_bloqueia($$select * from koinonia_financeiro_entradas$$, 'anon não lê entradas');
reset role;
select koinonia_teste_como('membro');
set local role authenticated;
select koinonia_teste_ok((select count(*) from koinonia_financeiro_entradas) = 0, 'membro não vê entradas (nem o próprio dízimo)');
select koinonia_teste_bloqueia($$insert into koinonia_financeiro_entradas (data, categoria, valor, forma_pagamento) values (current_date, 'oferta', 10, 'dinheiro')$$,
  'membro não lança entrada');
reset role;
select koinonia_teste_como('pastor');
set local role authenticated;
select koinonia_teste_ok((select count(*) from koinonia_financeiro_entradas where id = '99999999-0000-4000-a000-0000000000f1') = 1, 'pastor vê entradas');
with i as (insert into koinonia_financeiro_entradas (data, categoria, valor, forma_pagamento, contribuinte_nome)
           values (current_date, 'doacao', 500, 'transferencia', 'Doador Externo') returning created_by)
select koinonia_teste_ok((select created_by from i) = auth.uid(), 'pastor lança entrada (com autor)');
select koinonia_teste_bloqueia($$insert into koinonia_financeiro_entradas (data, categoria, valor, forma_pagamento) values (current_date, 'oferta', 0, 'pix')$$,
  'valor precisa ser maior que zero');
select koinonia_teste_bloqueia(format($$insert into koinonia_financeiro_entradas (data, categoria, valor, forma_pagamento, profile_id, contribuinte_nome)
  values (current_date, 'oferta', 10, 'pix', %L, 'Fulano')$$, current_setting('teste.membro')), 'não aceita membro e nome livre juntos');
reset role;

\echo
\echo '== Financeiro: contas a pagar e recorrências'
select koinonia_teste_como('membro');
set local role authenticated;
select koinonia_teste_bloqueia($$select koinonia_financeiro_gerar_contas(current_date)$$, 'membro não gera contas recorrentes');
select koinonia_teste_bloqueia($$insert into koinonia_financeiro_contas (descricao, categoria, valor, vencimento) values ('Intrusa', 'outra', 10, current_date)$$,
  'membro não lança conta');
select koinonia_teste_ok((select count(*) from koinonia_financeiro_recorrencias) = 0, 'membro não vê recorrências');
reset role;
select koinonia_teste_como('pastor');
set local role authenticated;
-- r1: parcelada em 3x, mensal; r2: semanal sem fim; r3: mensal até daqui a 2 meses
insert into koinonia_financeiro_recorrencias (id, descricao, categoria, valor, frequencia, data_inicio, parcelas) values
  ('99999999-0000-4000-a000-0000000000b1', 'Teste Parcelado', 'materiais', 100, 'mensal', '2030-01-31', 3);
insert into koinonia_financeiro_recorrencias (id, descricao, categoria, valor, frequencia, data_inicio) values
  ('99999999-0000-4000-a000-0000000000b2', 'Teste Semanal', 'outra', 10, 'semanal', current_date);
insert into koinonia_financeiro_recorrencias (id, descricao, categoria, valor, frequencia, data_inicio, data_fim) values
  ('99999999-0000-4000-a000-0000000000b3', 'Teste Até Data', 'aluguel', 1000, 'mensal', current_date, current_date + 61);
select koinonia_financeiro_gerar_contas('2030-12-31');
select koinonia_teste_ok((select array_agg(vencimento order by ocorrencia)::text from koinonia_financeiro_contas
                          where recorrencia_id = '99999999-0000-4000-a000-0000000000b1') = '{2030-01-31,2030-02-28,2030-03-31}',
  'parcelada em 3x gera 3 contas (dia 31 vira fim de mês)');
select koinonia_teste_ok((select count(*) from koinonia_financeiro_contas where recorrencia_id = '99999999-0000-4000-a000-0000000000b3') between 2 and 3,
  'recorrência com data de fim para nela');
select koinonia_teste_ok((select max(vencimento) from koinonia_financeiro_contas where recorrencia_id = '99999999-0000-4000-a000-0000000000b2')
                          <= current_date + interval '5 years', 'recorrência sem fim gera no máximo 5 anos à frente');
select koinonia_teste_ok(koinonia_financeiro_gerar_contas('2030-12-31') = 0, 'gerar de novo não duplica');
update koinonia_financeiro_contas set status = 'cancelada' where recorrencia_id = '99999999-0000-4000-a000-0000000000b1' and ocorrencia = 2;
update koinonia_financeiro_contas set vencimento = '2030-01-10' where recorrencia_id = '99999999-0000-4000-a000-0000000000b1' and ocorrencia = 1;
select koinonia_financeiro_gerar_contas('2030-12-31');
select koinonia_teste_ok((select count(*) from koinonia_financeiro_contas where recorrencia_id = '99999999-0000-4000-a000-0000000000b1') = 3,
  'conta cancelada ou com vencimento alterado não é gerada de novo');
select koinonia_teste_bloqueia($$update koinonia_financeiro_contas set status = 'paga' where recorrencia_id = '99999999-0000-4000-a000-0000000000b1' and ocorrencia = 3$$,
  'conta paga exige data e valor do pagamento');
with u as (update koinonia_financeiro_contas set status = 'paga', pago_em = current_date, valor_pago = 102.50, forma_pagamento = 'pix'
           where recorrencia_id = '99999999-0000-4000-a000-0000000000b1' and ocorrencia = 3 returning 1)
select koinonia_teste_ok(count(*) = 1, 'registra pagamento (com valor diferente)') from u;
select koinonia_teste_bloqueia($$insert into koinonia_financeiro_recorrencias (descricao, categoria, valor, frequencia, data_inicio, data_fim, parcelas)
  values ('X', 'outra', 1, 'mensal', current_date, current_date + 30, 3)$$, 'não aceita data de fim e nº de vezes juntos');
reset role;

\echo
\echo '== Notificações push'
select koinonia_teste_como('membro');
set local role authenticated;
select koinonia_push_inscrever('https://push.exemplo.test/membro-1', 'chave-p256dh', 'chave-auth', 'Teste');
select koinonia_teste_ok((select count(*) from koinonia_push_inscricoes where endpoint = 'https://push.exemplo.test/membro-1' and profile_id = auth.uid()) = 1,
  'membro ativa notificações no próprio aparelho');
select koinonia_teste_ok((select count(*) from koinonia_notificacoes) = 0 and (select count(*) from koinonia_notificacao_config) = 0,
  'membro não vê fila nem regras de notificação');
select koinonia_teste_bloqueia($$insert into koinonia_notificacoes (titulo) values ('Intrusa')$$, 'membro não cria notificação');
select koinonia_teste_bloqueia($$select koinonia_notificacoes_gerar_automaticas()$$, 'membro não roda o disparo');
select koinonia_teste_bloqueia($$select * from koinonia_notificacao_destinos(gen_random_uuid())$$, 'membro não lê aparelhos dos outros');
reset role;
select koinonia_teste_como('pastor');
set local role authenticated;
-- o mesmo aparelho, agora logado como pastor: passa a ser do pastor
select koinonia_push_inscrever('https://push.exemplo.test/membro-1', 'chave-p256dh', 'chave-auth', 'Teste');
select koinonia_teste_ok((select profile_id from koinonia_push_inscricoes where endpoint = 'https://push.exemplo.test/membro-1') = auth.uid(),
  'aparelho que troca de login passa para a nova conta');
with i as (insert into koinonia_notificacoes (titulo, publico) values ('Teste Manual', 'todos') returning created_by)
select koinonia_teste_ok((select created_by from i) = auth.uid(), 'pastor cria notificação manual');
select koinonia_teste_bloqueia($$insert into koinonia_notificacoes (titulo, publico) values ('Sem GC', 'gc')$$, 'público GC exige o GC');
with u as (update koinonia_notificacao_config set escala_dias_antes = 3 returning 1)
select koinonia_teste_ok(count(*) = 1, 'pastor altera as regras') from u;
select koinonia_teste_bloqueia($$update koinonia_notificacao_config set evento_dias_antes = '{8}'$$, 'só aceita os dias de lembrete previstos');
reset role;

-- lembretes automáticos (rodam como o servidor): horário dos lembretes = 1 min atrás
select set_config('request.jwt.claims', '', true);
update public.koinonia_notificacao_config set
  escala_ativo = true, escala_dias_antes = 6, escala_horario = ((now() at time zone 'America/Sao_Paulo') - interval '1 minute')::time,
  evento_dias_antes = '{7}', evento_horario = ((now() at time zone 'America/Sao_Paulo') - interval '1 minute')::time, evento_na_hora = false;
insert into public.koinonia_eventos (id, titulo, cep, logradouro, numero, bairro, cidade, uf, inicio, fim, publico, responsavel_id) values
  ('99999999-0000-4000-a000-0000000000d1', 'Evento Notificação Teste', '89030410', 'Rua A', '1', 'Centro', 'Blumenau', 'SC',
   (((now() at time zone 'America/Sao_Paulo')::date + 7) + time '23:00') at time zone 'America/Sao_Paulo',
   (((now() at time zone 'America/Sao_Paulo')::date + 7) + time '23:30') at time zone 'America/Sao_Paulo', 'homens', :'admin_id');
insert into public.koinonia_escalas (id, data, descricao) values
  ('99999999-0000-4000-a000-0000000000d2', (now() at time zone 'America/Sao_Paulo')::date + 2, 'Culto Notificação Teste');
insert into public.koinonia_escala_atribuicoes (escala_id, funcao_id, profile_id)
select '99999999-0000-4000-a000-0000000000d2', id, :'membro_id' from public.koinonia_escala_funcoes where ativo order by ordem limit 1;
select public.koinonia_notificacoes_gerar_automaticas();
select koinonia_teste_ok((select publico::text from public.koinonia_notificacoes where chave = 'evento:99999999-0000-4000-a000-0000000000d1:d7') = 'homens',
  'lembrete de 7 dias do evento entra na fila (com o público do evento)');
select koinonia_teste_ok((select titulo from public.koinonia_notificacoes
                          where origem = 'escala' and publico_id = :'membro_id' and url = '/app/escala/99999999-0000-4000-a000-0000000000d2') = 'Você está na escala em 2 dias',
  'lembrete diário de escala para quem está escalado');
select koinonia_teste_ok(public.koinonia_notificacoes_gerar_automaticas() = 0, 'gerar de novo não repete lembretes');
insert into public.koinonia_push_inscricoes (profile_id, endpoint, p256dh, auth) values (:'membro_id', 'https://push.exemplo.test/membro-2', 'k', 'a');
select koinonia_teste_ok((select count(*) from public.koinonia_notificacao_destinos(
                           (select id from public.koinonia_notificacoes where origem = 'escala' and publico_id = :'membro_id'))) = 1,
  'lembrete de escala vai só para os aparelhos da pessoa');
select koinonia_teste_ok((select count(*) from public.koinonia_notificacoes_reservar(500) where titulo = 'Teste Manual') = 1,
  'disparo pega o que está agendado até agora');
select koinonia_teste_ok((select status::text from public.koinonia_notificacoes where titulo = 'Teste Manual') = 'enviando'
                         and (select count(*) from public.koinonia_notificacoes_reservar(500) where titulo = 'Teste Manual') = 0,
  'e não pega a mesma notificação duas vezes');

\echo
\echo '== Visitantes'
set local role anon;
select koinonia_teste_bloqueia($$select * from koinonia_visitantes$$, 'anon não lê visitantes');
reset role;
select koinonia_teste_como('membro');
set local role authenticated;
select koinonia_teste_bloqueia($$insert into koinonia_visitantes (nome, celular) values ('Visitante Intruso', '47999999999')$$, 'membro não cadastra visitante');
select koinonia_teste_ok((select count(*) from koinonia_visitantes) = 0, 'membro não vê visitantes');
reset role;
select koinonia_teste_como('pastor');
set local role authenticated;
with i as (insert into koinonia_visitantes (nome, celular, motivo) values ('Visitante Teste', '47999998888', 'Convidado por amigo') returning data_visita, created_by)
select koinonia_teste_ok((select data_visita = (now() at time zone 'America/Sao_Paulo')::date and created_by = auth.uid() from i),
  'pastor cadastra visitante (data de hoje e autor por padrão)');
select koinonia_teste_bloqueia($$insert into koinonia_visitantes (nome, celular) values ('Sem DDD', '99998888')$$, 'celular precisa de DDD');
reset role;

-- MEMBRO escalado HOJE na Porta Principal
select set_config('request.jwt.claims', '', true);
insert into public.koinonia_escalas (id, data, descricao) values
  ('99999999-0000-4000-a000-0000000000f9', (now() at time zone 'America/Sao_Paulo')::date, 'Culto Porta Teste');
insert into public.koinonia_escala_atribuicoes (escala_id, funcao_id, profile_id)
select '99999999-0000-4000-a000-0000000000f9', id, :'membro_id' from public.koinonia_escala_funcoes where cadastra_visitantes limit 1;
select koinonia_teste_como('membro');
set local role authenticated;
select koinonia_teste_ok(koinonia_na_porta_hoje(), 'escalado hoje na Porta Principal tem acesso');
with i as (insert into koinonia_visitantes (nome, celular) values ('Visitante da Porta', '47988887777') returning 1)
select koinonia_teste_ok(count(*) = 1, 'porta cadastra visitante no dia') from i;
select koinonia_teste_bloqueia($$insert into koinonia_visitantes (nome, celular, data_visita) values ('Ontem', '47988887777', current_date - 1)$$,
  'porta não cadastra visita de outro dia');
select koinonia_teste_ok((select count(*) from koinonia_visitantes where nome in ('Visitante Teste', 'Visitante da Porta')) = 2,
  'porta vê os visitantes de hoje (inclusive os cadastrados por outros)');
with u as (update koinonia_visitantes set motivo = 'Editado pela porta' where nome = 'Visitante Teste' returning 1)
select koinonia_teste_ok(count(*) = 0, 'porta não edita visitante cadastrado por outra pessoa') from u;
with u as (update koinonia_visitantes set motivo = 'Primeira vez' where nome = 'Visitante da Porta' returning 1)
select koinonia_teste_ok(count(*) = 1, 'porta corrige o que ela mesma cadastrou') from u;
reset role;
-- a mesma escala, mas amanhã: sem acesso hoje
select set_config('request.jwt.claims', '', true);
update public.koinonia_escalas set data = data + 1 where id = '99999999-0000-4000-a000-0000000000f9';
select koinonia_teste_como('membro');
set local role authenticated;
select koinonia_teste_ok(not koinonia_na_porta_hoje() and (select count(*) from koinonia_visitantes) = 0,
  'fora do dia da escala, a porta não vê nem cadastra visitantes');
reset role;

\echo
\echo '== Usuário INATIVO'
select set_config('request.jwt.claims', '', true); -- comandos de preparação rodam como sistema
update public.koinonia_profiles set ativo = false where id = :'membro_id';
select koinonia_teste_como('membro');
set local role authenticated;
select koinonia_teste_ok((select count(*) from koinonia_profiles where id = auth.uid()) = 1, 'ainda vê o próprio perfil (tela de conta inativa)');
select koinonia_teste_ok((select count(*) from koinonia_gcs) = 0, 'não vê GCs');
select koinonia_teste_ok((select count(*) from koinonia_perfis_basicos) = 0, 'não vê nomes de membros');
select koinonia_teste_ok((select count(*) from koinonia_avisos where titulo = 'Aviso Teste Membros') = 0, 'não vê avisos só para membros');
with u as (update koinonia_profiles set nome_completo = 'Inativo Editando' where id = auth.uid() returning 1)
select koinonia_teste_ok(count(*) = 0, 'não edita o próprio perfil') from u;
reset role;
select set_config('request.jwt.claims', '', true);
update public.koinonia_profiles set ativo = true where id = :'membro_id';

\echo
\echo '== PASTOR'
select koinonia_teste_como('pastor');
set local role authenticated;
select koinonia_teste_ok((select count(*) from koinonia_profiles) = (select count(*) from koinonia_perfis_basicos), 'vê todos os perfis');
with u as (update koinonia_profiles set celular = '11911111111' where id = current_setting('teste.membro')::uuid returning 1)
select koinonia_teste_ok(count(*) = 1, 'edita dados de um membro') from u;
select koinonia_teste_bloqueia(format('update koinonia_profiles set role = ''PASTOR'' where id = %L', current_setting('teste.membro')), 'não altera papéis');
select koinonia_teste_bloqueia(format('update koinonia_profiles set ativo = false where id = %L', current_setting('teste.admin')), 'não desativa administrador');
with u as (update koinonia_profiles set ativo = false where id = current_setting('teste.membro')::uuid returning 1)
select koinonia_teste_ok(count(*) = 1, 'desativa um membro') from u;
update koinonia_profiles set ativo = true where id = current_setting('teste.membro')::uuid;
with i as (insert into koinonia_ministerios (nome) values ('Ministério Teste') returning 1)
select koinonia_teste_ok(count(*) = 1, 'cria ministério') from i;
select koinonia_teste_ok((select count(*) from koinonia_avisos where titulo like 'Aviso Teste%') = 3, 'vê todos os avisos, inclusive vencidos');
with i as (insert into koinonia_avisos (titulo, mensagem) values ('Aviso Teste Culto 9h', 'Por causa das eleições') returning created_by)
select koinonia_teste_ok((select created_by from i) = auth.uid(), 'publica aviso (com autor)');
with u as (update koinonia_avisos set exibir_ate = current_date where id = '99999999-0000-4000-a000-0000000000a2' returning 1)
select koinonia_teste_ok(count(*) = 1, 'edita aviso') from u;
with i as (insert into koinonia_gcs (nome, cep, logradouro, numero, bairro, cidade, uf) values ('GC Teste', '01310100', 'a', '1', 'b', 'c', 'SP') returning 1)
select koinonia_teste_ok(count(*) = 1, 'cria GC') from i;
with u as (update koinonia_eventos set titulo = 'Evento Editado' where id = '99999999-0000-4000-a000-000000000001' returning 1)
select koinonia_teste_ok(count(*) = 1, 'edita evento') from u;
with u as (update koinonia_pastores set ordem = ordem returning 1)
select koinonia_teste_ok(count(*) = (select count(*) from koinonia_pastores), 'edita conteúdo do site') from u;
-- torna o membro líder do Teste Ministério A
insert into koinonia_ministerio_membros (ministerio_id, profile_id, is_lider)
select id, current_setting('teste.membro')::uuid, true from koinonia_ministerios where nome = 'Teste Ministério A';
reset role;
select koinonia_teste_ok((select role = 'LIDER_MINISTERIO' from public.koinonia_profiles where id = :'membro_id'), 'marcar como líder promove a LIDER_MINISTERIO');

\echo
\echo '== LÍDER DE MINISTÉRIO (Teste Ministério A)'
-- o admin entra no Teste Ministério A como membro comum, para o líder enxergar e gerenciar
insert into public.koinonia_ministerio_membros (ministerio_id, profile_id)
select id, :'admin_id' from public.koinonia_ministerios where nome = 'Teste Ministério A';
select koinonia_teste_como('membro');
set local role authenticated;
select koinonia_teste_ok((select count(*) from koinonia_profiles) = 2, 'vê o próprio perfil e o dos membros do seu ministério');
select koinonia_teste_ok((select count(*) from koinonia_financeiro_entradas) = 0, 'líder não vê o financeiro');
with d as (delete from koinonia_ministerio_membros mm using koinonia_ministerios m
           where m.id = mm.ministerio_id and m.nome = 'Teste Ministério A' and mm.profile_id = current_setting('teste.admin')::uuid returning 1)
select koinonia_teste_ok(count(*) = 1, 'remove membro comum do seu ministério') from d;
with i as (insert into koinonia_ministerio_membros (ministerio_id, profile_id)
           select id, current_setting('teste.admin')::uuid from koinonia_ministerios where nome = 'Teste Ministério A' returning 1)
select koinonia_teste_ok(count(*) = 1, 'adiciona membro ao seu ministério') from i;
with u as (update koinonia_ministerio_membros set is_lider = true where profile_id = current_setting('teste.admin')::uuid returning 1)
select koinonia_teste_ok(count(*) = 0, 'não marca outra pessoa como líder') from u;
select koinonia_teste_bloqueia(format($$insert into koinonia_ministerio_membros (ministerio_id, profile_id) select id, %L from koinonia_ministerios where nome = 'Teste Ministério B'$$, current_setting('teste.admin')), 'não vincula em ministério que não lidera');
with d as (delete from koinonia_ministerio_membros where profile_id = auth.uid() returning 1)
select koinonia_teste_ok(count(*) = 0, 'não remove líder (nem a si mesmo)') from d;
select koinonia_teste_bloqueia('insert into koinonia_escalas (data, descricao) values (current_date, ''x'')', 'não cria escala');
with u as (update koinonia_eventos set titulo = 'Hack' returning 1)
select koinonia_teste_ok(count(*) = 0, 'não edita eventos') from u;
reset role;

\echo
\echo '== ADMIN'
select koinonia_teste_como('admin');
set local role authenticated;
with u as (update koinonia_profiles set role = 'ADMIN' where id = current_setting('teste.pastor')::uuid returning 1)
select koinonia_teste_ok(count(*) = 1, 'altera o papel de outra pessoa') from u;
select koinonia_teste_bloqueia('update koinonia_profiles set role = ''MEMBRO'' where id = auth.uid()', 'não altera o próprio papel');
select koinonia_teste_bloqueia('update koinonia_profiles set ativo = false where id = auth.uid()', 'não se desativa');
update koinonia_profiles set role = 'MEMBRO' where id = current_setting('teste.membro')::uuid;
select koinonia_teste_ok((select role = 'LIDER_MINISTERIO' from koinonia_profiles where id = current_setting('teste.membro')::uuid),
  'quem lidera continua LIDER_MINISTERIO mesmo se definido como Membro');
-- escala: DataShow tem 1 vaga
insert into koinonia_escala_atribuicoes (escala_id, funcao_id, profile_id)
select '99999999-0000-4000-a000-000000000002', id, current_setting('teste.membro')::uuid from koinonia_escala_funcoes where funcao = 'DataShow';
select koinonia_teste_bloqueia($$insert into koinonia_escala_atribuicoes (escala_id, funcao_id, profile_id)
  select '99999999-0000-4000-a000-000000000002', id, auth.uid() from koinonia_escala_funcoes where funcao = 'DataShow'$$, 'não excede as vagas da função');
select koinonia_teste_bloqueia(format($$insert into koinonia_escala_atribuicoes (escala_id, funcao_id, profile_id)
  select '99999999-0000-4000-a000-000000000002', id, %L from koinonia_escala_funcoes where funcao = 'Câmera'$$, current_setting('teste.membro')), 'mesma pessoa não tem duas funções na escala');
update koinonia_ministerio_membros set is_lider = false where profile_id = current_setting('teste.membro')::uuid;
select koinonia_teste_ok((select role = 'MEMBRO' from koinonia_profiles where id = current_setting('teste.membro')::uuid),
  'deixar de liderar volta para MEMBRO');
select koinonia_teste_bloqueia($$insert into koinonia_cantina_escalas (data) values (current_date + 500)$$, 'cantina exige GC ou ministério');
reset role;

\echo
\echo '== Escala: confirmação, indisponibilidade e trocas'
-- o membro está no DataShow da Escala Teste (seção ADMIN); o admin já serviu
-- no DataShow em outra escala, então pode assumir a vaga numa troca
-- indisponibilidades reais do admin atrapalhariam a troca (o ROLLBACK final as devolve)
delete from public.koinonia_escala_indisponibilidades where profile_id = :'admin_id';
insert into public.koinonia_escalas (id, data, descricao) values
  ('99999999-0000-4000-a000-0000000000c1', current_date + 10, 'Escala Teste Troca');
insert into public.koinonia_escala_atribuicoes (escala_id, funcao_id, profile_id)
select '99999999-0000-4000-a000-0000000000c1', id, :'admin_id' from public.koinonia_escala_funcoes where funcao = 'DataShow';
select id as atrib_membro from public.koinonia_escala_atribuicoes
 where escala_id = '99999999-0000-4000-a000-000000000002' and profile_id = :'membro_id' \gset
select id as atrib_admin from public.koinonia_escala_atribuicoes
 where escala_id = '99999999-0000-4000-a000-0000000000c1' and profile_id = :'admin_id' \gset
select set_config('teste.atrib_membro', :'atrib_membro', false), set_config('teste.atrib_admin', :'atrib_admin', false);
insert into public.koinonia_escala_indisponibilidades (profile_id, data_inicio, data_fim, motivo)
values (:'admin_id', current_date + 30, current_date + 32, 'Viagem');

select koinonia_teste_como('membro');
set local role authenticated;
select koinonia_teste_ok((select resposta = 'pendente' from koinonia_escala_atribuicoes where id = current_setting('teste.atrib_membro')::uuid),
  'quem é escalado começa sem resposta (pendente)');
select koinonia_escala_responder(current_setting('teste.atrib_membro')::uuid, true);
select koinonia_teste_ok((select resposta = 'confirmado' and respondido_em is not null from koinonia_escala_atribuicoes where id = current_setting('teste.atrib_membro')::uuid),
  'membro confirma a própria escala');
select koinonia_teste_bloqueia($$select koinonia_escala_responder(current_setting('teste.atrib_admin')::uuid, false)$$, 'não responde pela escala de outra pessoa');
with u as (update koinonia_escala_atribuicoes set resposta = 'recusado' returning 1)
select koinonia_teste_ok(count(*) = 0, 'não altera a resposta direto na tabela') from u;

with i as (insert into koinonia_escala_indisponibilidades (data_inicio, data_fim, motivo) values (current_date + 20, current_date + 20, 'Trabalho') returning profile_id)
select koinonia_teste_ok((select profile_id from i) = auth.uid(), 'marca a própria indisponibilidade');
select koinonia_teste_bloqueia(format($$insert into koinonia_escala_indisponibilidades (profile_id, data_inicio, data_fim) values (%L, current_date + 5, current_date + 5)$$,
  current_setting('teste.admin')), 'não marca indisponibilidade de outra pessoa');
select koinonia_teste_bloqueia($$insert into koinonia_escala_indisponibilidades (data_inicio, data_fim) values (current_date - 1, current_date)$$, 'não marca indisponibilidade no passado');
select koinonia_teste_ok((select count(*) from koinonia_escala_indisponibilidades where profile_id <> auth.uid()) = 0, 'vê só as próprias indisponibilidades');

select koinonia_teste_ok(
  exists (select 1 from koinonia_escala_troca_candidatos(current_setting('teste.atrib_membro')::uuid) where id = current_setting('teste.admin')::uuid)
  and not exists (select 1 from koinonia_escala_troca_candidatos(current_setting('teste.atrib_membro')::uuid) where id = auth.uid()),
  'candidatos à troca: quem já serviu na função, menos ele mesmo');
select koinonia_teste_bloqueia(format($$select koinonia_escala_troca_solicitar(%L, %L)$$, current_setting('teste.atrib_membro'), current_setting('teste.pastor')),
  'não pede troca para quem nunca serviu na função');
select koinonia_teste_bloqueia(format($$select koinonia_escala_troca_solicitar(%L, %L)$$, current_setting('teste.atrib_admin'), current_setting('teste.membro')),
  'não pede troca da escala de outra pessoa');
select koinonia_escala_troca_solicitar(current_setting('teste.atrib_membro')::uuid, current_setting('teste.admin')::uuid, 'Vou viajar') as troca_id \gset
select set_config('teste.troca', :'troca_id', false);
select koinonia_teste_bloqueia(format($$select koinonia_escala_troca_solicitar(%L, %L)$$, current_setting('teste.atrib_membro'), current_setting('teste.admin')),
  'um pedido de troca em andamento por vaga');
select koinonia_teste_bloqueia($$select koinonia_escala_troca_decidir(current_setting('teste.troca')::uuid, true)$$, 'membro não aprova troca');
select koinonia_teste_bloqueia($$insert into koinonia_escala_trocas (atribuicao_id, solicitante_id, substituto_id)
  values (current_setting('teste.atrib_membro')::uuid, auth.uid(), current_setting('teste.admin')::uuid)$$, 'não cria troca direto na tabela');
reset role;
select koinonia_teste_ok((select count(*) from public.koinonia_notificacoes
                           where created_at = now() and origem = 'escala' and publico_id = :'admin_id' and titulo like '% pediu uma troca na escala') = 1,
  'substituto é notificado do pedido');

select koinonia_teste_como('pastor');
set local role authenticated;
select koinonia_teste_bloqueia($$select koinonia_escala_troca_decidir(current_setting('teste.troca')::uuid, true)$$, 'liderança só aprova depois que o substituto aceita');
reset role;

select koinonia_teste_como('admin');
set local role authenticated;
select koinonia_escala_troca_responder(current_setting('teste.troca')::uuid, true);
select koinonia_teste_ok((select status = 'aguardando_lider' from koinonia_escala_trocas where id = current_setting('teste.troca')::uuid),
  'substituto aceita e a troca vai para aprovação');
reset role;

select koinonia_teste_como('pastor');
set local role authenticated;
select koinonia_teste_ok((select count(*) from koinonia_escala_indisponibilidades where created_at = now()) = 2, 'liderança vê as indisponibilidades de todos');
select koinonia_escala_troca_decidir(current_setting('teste.troca')::uuid, true);
select koinonia_teste_ok((select profile_id = current_setting('teste.admin')::uuid and resposta = 'confirmado'
                            from koinonia_escala_atribuicoes where id = current_setting('teste.atrib_membro')::uuid),
  'troca aprovada: a vaga passa para o substituto, já confirmado');
reset role;
select koinonia_teste_ok((select count(*) from public.koinonia_notificacoes where created_at = now() and origem = 'escala' and publico_id = :'membro_id' and titulo = 'Troca aprovada') = 1,
  'quem pediu é avisado da aprovação');

select koinonia_teste_como('admin');
set local role authenticated;
select koinonia_escala_responder(current_setting('teste.atrib_membro')::uuid, false, 'Fiquei doente');
select koinonia_teste_ok((select resposta = 'recusado' and motivo_recusa = 'Fiquei doente' from koinonia_escala_atribuicoes where id = current_setting('teste.atrib_membro')::uuid),
  'recusa a escala com motivo');
reset role;
select koinonia_teste_ok((select count(*) from public.koinonia_notificacoes where created_at = now() and origem = 'escala' and publico_id = :'pastor_id' and titulo like '% não poderá servir') = 1,
  'liderança é avisada da recusa');

select koinonia_teste_como('pastor');
set local role authenticated;
update koinonia_escala_atribuicoes set profile_id = current_setting('teste.membro')::uuid where id = current_setting('teste.atrib_membro')::uuid;
select koinonia_teste_ok((select resposta = 'pendente' and motivo_recusa is null from koinonia_escala_atribuicoes where id = current_setting('teste.atrib_membro')::uuid),
  'trocar a pessoa da vaga zera a resposta');
reset role;

-- admin indisponível no dia da Escala Teste: não pode ser escolhido para a troca
insert into public.koinonia_escala_indisponibilidades (profile_id, data_inicio, data_fim)
select :'admin_id', data, data from public.koinonia_escalas where id = '99999999-0000-4000-a000-000000000002';
delete from public.koinonia_escala_atribuicoes where escala_id = '99999999-0000-4000-a000-000000000002' and profile_id = :'admin_id';
select koinonia_teste_como('membro');
set local role authenticated;
select koinonia_teste_ok((select indisponivel from koinonia_escala_troca_candidatos(current_setting('teste.atrib_membro')::uuid) where id = current_setting('teste.admin')::uuid),
  'candidato indisponível no dia aparece marcado');
select koinonia_teste_bloqueia(format($$select koinonia_escala_troca_solicitar(%L, %L)$$, current_setting('teste.atrib_membro'), current_setting('teste.admin')),
  'não pede troca para quem está indisponível no dia');
reset role;

\echo
\echo '== Eventos: vagas, fila de espera, check-in e pagamento'
-- (o "pastor" do teste virou ADMIN na seção ADMIN; os dois têm acesso ao financeiro)
insert into public.koinonia_eventos (id, titulo, cep, logradouro, numero, bairro, cidade, uf, inicio, fim, responsavel_id, vagas)
values ('99999999-0000-4000-a000-0000000000b1', 'Evento Vagas', '01310100', 'Av', '1', 'B', 'C', 'SP',
        now() + interval '5 days', now() + interval '5 days 2 hours', :'admin_id', 1);
-- evento pago cujo responsável é o MEMBRO (gerencia o evento, mas não o financeiro)
insert into public.koinonia_eventos (id, titulo, cep, logradouro, numero, bairro, cidade, uf, inicio, fim, responsavel_id, valor)
values ('99999999-0000-4000-a000-0000000000b2', 'Evento Pago', '01310100', 'Av', '1', 'B', 'C', 'SP',
        now() + interval '6 days', now() + interval '6 days 2 hours', :'membro_id', 50);

select koinonia_teste_como('pastor');
set local role authenticated;
with i as (insert into koinonia_evento_inscricoes (evento_id, profile_id) values ('99999999-0000-4000-a000-0000000000b1', auth.uid()) returning status)
select koinonia_teste_ok((select status from i) = 'confirmada', 'evento com vaga: inscrição ocupa a vaga');
reset role;

select koinonia_teste_como('membro');
set local role authenticated;
with i as (insert into koinonia_evento_inscricoes (evento_id, profile_id) values ('99999999-0000-4000-a000-0000000000b1', auth.uid()) returning status)
select koinonia_teste_ok((select status from i) = 'espera', 'evento lotado: inscrição vai para a fila de espera');
select koinonia_teste_ok((select vagas = 1 and ocupadas = 1 and na_espera = 1 and minha_posicao = 1
                            from koinonia_evento_lotacao('99999999-0000-4000-a000-0000000000b1')),
  'membro vê a lotação e a própria posição na fila');
reset role;

select koinonia_teste_como('pastor');
set local role authenticated;
delete from koinonia_evento_inscricoes where evento_id = '99999999-0000-4000-a000-0000000000b1' and profile_id = auth.uid();
reset role;
select koinonia_teste_ok((select status = 'confirmada' and decidido_por is null from public.koinonia_evento_inscricoes
                           where evento_id = '99999999-0000-4000-a000-0000000000b1' and profile_id = :'membro_id'),
  'vaga liberada promove o primeiro da fila');
select koinonia_teste_ok((select count(*) from public.koinonia_notificacoes where created_at = now() and publico_id = :'membro_id' and titulo = 'Abriu uma vaga para você!') = 1,
  'quem sai da fila é avisado');

select koinonia_teste_como('pastor');
set local role authenticated;
with i as (insert into koinonia_evento_inscricoes (evento_id, profile_id) values ('99999999-0000-4000-a000-0000000000b1', auth.uid()) returning status)
select koinonia_teste_ok((select status from i) = 'espera', 'lotou de novo: próximo vai para a fila');
update koinonia_eventos set vagas = 2 where id = '99999999-0000-4000-a000-0000000000b1';
select koinonia_teste_ok((select status = 'confirmada' from koinonia_evento_inscricoes
                           where evento_id = '99999999-0000-4000-a000-0000000000b1' and profile_id = auth.uid()),
  'aumentar as vagas promove a fila');
reset role;

-- check-in
select codigo as codigo_membro from public.koinonia_evento_inscricoes
 where evento_id = '99999999-0000-4000-a000-0000000000b1' and profile_id = :'membro_id' \gset
select set_config('teste.codigo', :'codigo_membro', false);
select koinonia_teste_como('membro');
set local role authenticated;
select koinonia_teste_bloqueia($$select * from koinonia_evento_checkin('99999999-0000-4000-a000-0000000000b1', current_setting('teste.codigo')::uuid)$$,
  'quem não gerencia o evento não faz check-in');
with u as (update koinonia_evento_inscricoes set checkin_em = now() where profile_id = auth.uid() returning 1)
select koinonia_teste_ok(count(*) = 0, 'membro não marca a própria presença') from u;
reset role;
select koinonia_teste_como('admin');
set local role authenticated;
select koinonia_teste_ok((select not ja_registrado and checkin_em is not null
                            from koinonia_evento_checkin('99999999-0000-4000-a000-0000000000b1', current_setting('teste.codigo')::uuid)),
  'responsável faz check-in lendo o QR Code');
select koinonia_teste_ok((select ja_registrado from koinonia_evento_checkin('99999999-0000-4000-a000-0000000000b1', current_setting('teste.codigo')::uuid)),
  'segunda leitura avisa que a presença já foi registrada');
select koinonia_teste_ok((select checkin_por = auth.uid() from koinonia_evento_inscricoes where codigo = current_setting('teste.codigo')::uuid),
  'registra quem fez o check-in');
select koinonia_teste_bloqueia($$select * from koinonia_evento_checkin('99999999-0000-4000-a000-0000000000b2', current_setting('teste.codigo')::uuid)$$,
  'QR Code de outro evento é rejeitado');
-- convidado no evento pago, aguardando pagamento
insert into koinonia_evento_inscricoes (evento_id, convidado_nome) values ('99999999-0000-4000-a000-0000000000b2', 'Convidado Pago');
reset role;
select id as insc_pago from public.koinonia_evento_inscricoes
 where evento_id = '99999999-0000-4000-a000-0000000000b2' and convidado_nome = 'Convidado Pago' \gset
select set_config('teste.insc_pago', :'insc_pago', false);

-- pagamento: o responsável (sem financeiro) não confirma; a tesouraria confirma e lança a entrada
select koinonia_teste_como('membro');
set local role authenticated;
select koinonia_teste_bloqueia($$update koinonia_evento_inscricoes set status = 'confirmada' where id = current_setting('teste.insc_pago')::uuid$$,
  'responsável sem financeiro não confirma pagamento');
select koinonia_teste_bloqueia($$select koinonia_evento_confirmar_pagamento(current_setting('teste.insc_pago')::uuid, 'pix')$$,
  'responsável sem financeiro não usa a confirmação da tesouraria');
with i as (insert into koinonia_evento_inscricoes (evento_id, convidado_nome, status) values ('99999999-0000-4000-a000-0000000000b2', 'Outro Convidado', 'confirmada') returning status)
select koinonia_teste_ok((select status from i) = 'pendente', 'responsável sem financeiro não inscreve como "já pago"');
insert into koinonia_evento_inscricoes (evento_id, profile_id) values ('99999999-0000-4000-a000-0000000000b2', auth.uid());
select koinonia_informar_pagamento('99999999-0000-4000-a000-0000000000b2');
reset role;
select koinonia_teste_ok((select count(*) from public.koinonia_notificacoes
                           where created_at = now() and publico_id = :'pastor_id' and titulo = 'Pagamento de inscrição para conferir'
                             and mensagem like '%Evento Pago') = 1,
  '"já paguei" avisa a tesouraria');

select koinonia_teste_como('pastor');
set local role authenticated;
select koinonia_evento_confirmar_pagamento(current_setting('teste.insc_pago')::uuid, 'dinheiro');
select koinonia_teste_ok((select status = 'confirmada' from koinonia_evento_inscricoes where id = current_setting('teste.insc_pago')::uuid),
  'tesouraria confirma o pagamento');
select koinonia_teste_ok((select categoria = 'evento' and valor = 50 and forma_pagamento = 'dinheiro' and contribuinte_nome = 'Convidado Pago'
                            from koinonia_financeiro_entradas where inscricao_id = current_setting('teste.insc_pago')::uuid),
  'confirmação lança a entrada no financeiro (categoria evento, forma escolhida)');
reset role;
select koinonia_teste_como('membro');
set local role authenticated;
select koinonia_teste_bloqueia($$update koinonia_evento_inscricoes set status = 'pendente' where id = current_setting('teste.insc_pago')::uuid$$,
  'responsável sem financeiro não desfaz pagamento confirmado');
reset role;
select koinonia_teste_como('pastor');
set local role authenticated;
update koinonia_evento_inscricoes set status = 'pendente' where id = current_setting('teste.insc_pago')::uuid;
select koinonia_teste_ok((select count(*) from koinonia_financeiro_entradas where inscricao_id = current_setting('teste.insc_pago')::uuid) = 0,
  'desfazer a confirmação apaga a entrada');
reset role;

\echo
\echo '== Financeiro: tesoureiro, contas e saldos, comprovantes, auditoria e orçamento'
select koinonia_teste_como('membro');
set local role authenticated;
select koinonia_teste_ok((select count(*) from koinonia_financeiro_carteiras) = 0
                         and (select count(*) from koinonia_financeiro_auditoria) = 0,
  'membro comum não vê contas nem o histórico do financeiro');
select koinonia_teste_bloqueia($$insert into koinonia_financeiro_carteiras (nome, tipo, saldo_inicial_em) values ('Hack', 'caixa', current_date)$$,
  'membro comum não cria conta');
select koinonia_teste_bloqueia($$insert into storage.objects (bucket_id, name) values ('koinonia-financeiro', 'hack.pdf')$$,
  'membro comum não envia comprovante');
reset role;

-- o admin torna o MEMBRO tesoureiro
select koinonia_teste_como('admin');
set local role authenticated;
with u as (update koinonia_profiles set role = 'TESOUREIRO' where id = current_setting('teste.membro')::uuid returning role)
select koinonia_teste_ok((select role from u) = 'TESOUREIRO', 'admin define o papel Tesoureiro');
reset role;

select koinonia_teste_como('membro');
set local role authenticated;
select koinonia_teste_ok(koinonia_pode_financeiro(), 'tesoureiro acessa o financeiro');
with i as (insert into storage.objects (bucket_id, name) values ('koinonia-financeiro', 'entradas/teste/recibo.pdf') returning 1)
select koinonia_teste_ok(count(*) = 1, 'tesoureiro envia comprovante ao bucket privado') from i;
select koinonia_teste_ok((select count(*) from koinonia_profiles) > 1, 'tesoureiro vê o nome de quem contribuiu');
select koinonia_teste_bloqueia('insert into koinonia_escalas (data, descricao) values (current_date, ''x'')', 'tesoureiro não gerencia escala');
with u as (update koinonia_eventos set titulo = 'Hack' returning 1)
select koinonia_teste_ok(count(*) = 0, 'tesoureiro não edita eventos') from u;

insert into koinonia_financeiro_carteiras (id, nome, tipo, saldo_inicial, saldo_inicial_em) values
  ('99999999-0000-4000-a000-0000000000f1', 'Caixa Teste', 'caixa', 100, current_date - 10);
insert into koinonia_financeiro_carteiras (id, nome, tipo, saldo_inicial, saldo_inicial_em, padrao) values
  ('99999999-0000-4000-a000-0000000000f2', 'Banco Teste', 'banco', 1000, current_date - 10, true);
select koinonia_teste_bloqueia($$insert into koinonia_financeiro_carteiras (nome, tipo, saldo_inicial_em, padrao) values ('Outra', 'banco', current_date, true)$$,
  'só uma conta padrão');
insert into koinonia_financeiro_entradas (id, data, categoria, valor, forma_pagamento, carteira_id) values
  ('99999999-0000-4000-a000-0000000000f3', current_date, 'oferta', 50, 'dinheiro', '99999999-0000-4000-a000-0000000000f1'),
  -- antes do saldo inicial: não conta
  ('99999999-0000-4000-a000-0000000000f4', current_date - 20, 'oferta', 999, 'dinheiro', '99999999-0000-4000-a000-0000000000f1');
insert into koinonia_financeiro_contas (descricao, categoria, valor, vencimento, status, pago_em, valor_pago, forma_pagamento, carteira_id)
values ('Conta Teste', 'energia', 30, current_date, 'paga', current_date, 30, 'pix', '99999999-0000-4000-a000-0000000000f2');
insert into koinonia_financeiro_transferencias (data, origem_id, destino_id, valor)
values (current_date, '99999999-0000-4000-a000-0000000000f1', '99999999-0000-4000-a000-0000000000f2', 20);
select koinonia_teste_bloqueia($$insert into koinonia_financeiro_transferencias (data, origem_id, destino_id, valor)
  values (current_date, '99999999-0000-4000-a000-0000000000f1', '99999999-0000-4000-a000-0000000000f1', 5)$$, 'transferência entre contas diferentes');
select koinonia_teste_ok(
  (select saldo from koinonia_financeiro_saldos(current_date) where carteira_id = '99999999-0000-4000-a000-0000000000f1') = 130
  and (select saldo from koinonia_financeiro_saldos(current_date) where carteira_id = '99999999-0000-4000-a000-0000000000f2') = 990,
  'saldo = inicial + entradas − pagamentos ± transferências (desde a data do saldo inicial)');

update koinonia_financeiro_entradas set valor = 60 where id = '99999999-0000-4000-a000-0000000000f3';
select koinonia_teste_ok((select acao = 'alterou' and alterado_por = auth.uid() and dados->'valor' = '[50, 60]'::jsonb
                            from koinonia_financeiro_auditoria
                           where registro_id = '99999999-0000-4000-a000-0000000000f3' and acao = 'alterou'),
  'histórico registra quem alterou e o valor antes/depois');
select koinonia_teste_ok((select count(*) from koinonia_financeiro_auditoria
                           where registro_id = '99999999-0000-4000-a000-0000000000f3' and acao = 'criou' and alterado_por = auth.uid()) = 1,
  'histórico registra quem criou');
select koinonia_teste_bloqueia($$update koinonia_financeiro_auditoria set acao = 'criou'$$, 'ninguém altera o histórico');
select koinonia_teste_bloqueia($$delete from koinonia_financeiro_auditoria$$, 'ninguém apaga o histórico');
select koinonia_teste_bloqueia($$insert into koinonia_financeiro_auditoria (tabela, registro_id, acao, dados) values ('x', gen_random_uuid(), 'criou', '{}')$$,
  'ninguém escreve no histórico à mão');

insert into koinonia_financeiro_anexos (entrada_id, path, nome, tipo, tamanho)
values ('99999999-0000-4000-a000-0000000000f3', 'entradas/teste.pdf', 'recibo.pdf', 'application/pdf', 1000);
select koinonia_teste_ok((select count(*) from koinonia_financeiro_anexos where entrada_id = '99999999-0000-4000-a000-0000000000f3') = 1,
  'tesoureiro anexa comprovante');
select koinonia_teste_bloqueia($$insert into koinonia_financeiro_anexos (path, nome, tipo, tamanho) values ('solto.pdf', 'x', 'application/pdf', 1)$$,
  'comprovante sempre pertence a um lançamento');

insert into koinonia_financeiro_orcamentos (ano, ministerio_id, valor) values (2026, null, 1000);
insert into koinonia_financeiro_orcamentos (ano, ministerio_id, valor)
select 2026, id, 500 from koinonia_ministerios where nome = 'Teste Ministério A';
select koinonia_teste_bloqueia($$insert into koinonia_financeiro_orcamentos (ano, ministerio_id, valor) values (2026, null, 10)$$,
  'um orçamento geral por ano');

-- pagamento de inscrição em dinheiro cai no caixa
select koinonia_evento_confirmar_pagamento(current_setting('teste.insc_pago')::uuid, 'dinheiro');
select koinonia_teste_ok((select carteira_id = '99999999-0000-4000-a000-0000000000f1' from koinonia_financeiro_entradas
                           where inscricao_id = current_setting('teste.insc_pago')::uuid),
  'pagamento de inscrição em dinheiro entra no caixa');
reset role;

\echo
\echo 'Todos os testes passaram. Desfazendo alterações...'
rollback;
