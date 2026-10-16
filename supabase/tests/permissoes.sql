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
with u as (update koinonia_evento_inscricoes set status = 'confirmada'
           where evento_id = '99999999-0000-4000-a000-0000000000e5' returning decidido_por)
select koinonia_teste_ok(count(*) = 1 and bool_and(decidido_por = auth.uid()), 'responsável confirma a inscrição (e fica registrado quem decidiu)') from u;
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
select koinonia_teste_ok((select status = 'confirmada' and adicionado_por = auth.uid() from koinonia_evento_inscricoes where convidado_nome = 'Convidado Teste'),
  'responsável inscreve convidado sem conta (já confirmado)');
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
\echo '== Usuário INATIVO'
select set_config('request.jwt.claims', '', true); -- comandos de preparação rodam como sistema
update public.koinonia_profiles set ativo = false where id = :'membro_id';
select koinonia_teste_como('membro');
set local role authenticated;
select koinonia_teste_ok((select count(*) from koinonia_profiles where id = auth.uid()) = 1, 'ainda vê o próprio perfil (tela de conta inativa)');
select koinonia_teste_ok((select count(*) from koinonia_gcs) = 0, 'não vê GCs');
select koinonia_teste_ok((select count(*) from koinonia_perfis_basicos) = 0, 'não vê nomes de membros');
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
\echo 'Todos os testes passaram. Desfazendo alterações...'
rollback;
