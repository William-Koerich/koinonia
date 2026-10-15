-- =============================================================================
-- Koinonia — dados iniciais
-- Não cria usuários: o primeiro ADMIN é criado pelo cadastro do site e
-- promovido via SQL (ver README). Os eventos de exemplo só são criados se
-- já existir um ADMIN, que fica como responsável.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Funções da escala
-- -----------------------------------------------------------------------------
insert into public.koinonia_escala_funcoes (funcao, vagas, ordem) values
  ('Estacionamento',  2, 1),
  ('Porta Lateral',   1, 2),
  ('Porta Principal', 2, 3),
  ('DataShow',        1, 4),
  ('Transmissão',     1, 5),
  ('Câmera',          1, 6),
  ('Story',           1, 7)
on conflict (funcao) do nothing;

-- -----------------------------------------------------------------------------
-- Ministérios
-- -----------------------------------------------------------------------------
insert into public.koinonia_ministerios (nome, descricao) values
  ('Louvor',      'Ministério de música e adoração'),
  ('Infantil',    'Cuidado e ensino das crianças'),
  ('Mídia',       'Transmissão, fotos e redes sociais'),
  ('Recepção',    'Acolhimento nos cultos'),
  ('Intercessão', 'Oração pela igreja')
on conflict do nothing;

-- -----------------------------------------------------------------------------
-- GCs (sem líder definido)
-- -----------------------------------------------------------------------------
insert into public.koinonia_gcs (nome, dia_semana, horario, cep, logradouro, numero, bairro, cidade, uf) values
  ('GC Centro',   3, '20:00', '01310100', 'Avenida Paulista', '1000', 'Bela Vista', 'São Paulo', 'SP'),
  ('GC Zona Sul', 4, '20:00', '04094050', 'Avenida Pedro Álvares Cabral', 's/n', 'Vila Mariana', 'São Paulo', 'SP'),
  ('GC Jovens',   5, '19:30', '05508000', 'Avenida Professor Luciano Gualberto', '315', 'Butantã', 'São Paulo', 'SP')
on conflict do nothing;

-- -----------------------------------------------------------------------------
-- Eventos de exemplo (datas relativas ao dia do seed, horário de Brasília)
-- -----------------------------------------------------------------------------
with admin as (
  select id from public.koinonia_profiles where role = 'ADMIN' and ativo order by created_at limit 1
)
insert into public.koinonia_eventos (titulo, descricao, cep, logradouro, numero, bairro, cidade, uf, inicio, fim, valor, responsavel_id, publico, created_by)
select e.titulo, e.descricao, '89030410', 'Rua Alfredo Hering', '98', 'Itoupava Seca', 'Blumenau', 'SC',
       e.inicio, e.fim, e.valor, admin.id, e.publico::public.koinonia_publico_evento, admin.id
from admin
cross join (values
  ('Culto de Celebração', 'Culto especial com Santa Ceia.',
   ((current_date + 7) + time '19:00') at time zone 'America/Sao_Paulo',
   ((current_date + 7) + time '21:00') at time zone 'America/Sao_Paulo',
   null::numeric, 'todos'),
  ('Encontro de Homens', 'Café da manhã e palavra.',
   ((current_date + 14) + time '08:00') at time zone 'America/Sao_Paulo',
   ((current_date + 14) + time '11:00') at time zone 'America/Sao_Paulo',
   35.00, 'homens'),
  ('Conferência de Mulheres', 'Dois dias de louvor e ministração.',
   ((current_date + 30) + time '19:00') at time zone 'America/Sao_Paulo',
   ((current_date + 31) + time '22:00') at time zone 'America/Sao_Paulo',
   80.00, 'mulheres')
) as e(titulo, descricao, inicio, fim, valor, publico)
where not exists (select 1 from public.koinonia_eventos);

-- -----------------------------------------------------------------------------
-- Conteúdo do site
-- -----------------------------------------------------------------------------
insert into public.koinonia_pastores (nome, cargo, bio, ordem)
select * from (values
  ('Pastor Exemplo', 'Pastor Presidente', 'Pastoreia a igreja desde 2010.', 1::smallint),
  ('Pastora Exemplo', 'Pastora de Família', 'Cuida dos ministérios de casais e família.', 2::smallint)
) as p
where not exists (select 1 from public.koinonia_pastores);

insert into public.koinonia_projetos (slug, titulo, resumo, descricao, status, ordem) values
  ('cesta-solidaria', 'Cesta Solidária', 'Arrecadação mensal de alimentos.',
   'Todo mês arrecadamos alimentos e montamos cestas básicas para famílias da comunidade.', 'em_andamento', 1),
  ('reforma-do-templo', 'Reforma do Templo', 'Ampliação do salão principal.',
   'Projeto de ampliação do salão principal e acessibilidade.', 'planejado', 2)
on conflict (slug) do nothing;

insert into public.koinonia_configuracoes_contribuicao (chave_pix, tipo_chave, pix_recebedor, pix_cidade, banco, agencia, conta, titular, cnpj) values
  ('00000000000191', 'cnpj', 'IGREJA KOINONIA', 'BLUMENAU', 'Banco Exemplo (000)', '0001', '12345-6', 'Igreja Koinonia', '00000000000191')
on conflict (id) do nothing;
