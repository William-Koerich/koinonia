-- =============================================================================
-- Koinonia — schema base: enums, tabelas, constraints e índices
--
-- O banco é compartilhado com outros apps (fertex_*, periferico_*), por isso
-- todo objeto deste projeto usa o prefixo koinonia_.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
create type public.koinonia_user_role as enum ('ADMIN', 'PASTOR', 'LIDER_MINISTERIO', 'MEMBRO');
create type public.koinonia_genero as enum ('masculino', 'feminino');
create type public.koinonia_publico_evento as enum ('homens', 'mulheres', 'todos');
create type public.koinonia_projeto_status as enum ('planejado', 'em_andamento', 'concluido');
create type public.koinonia_tipo_chave_pix as enum ('cnpj', 'cpf', 'email', 'telefone', 'aleatoria');

-- -----------------------------------------------------------------------------
-- koinonia_profiles (1:1 com auth.users; criado no cadastro)
-- -----------------------------------------------------------------------------
create table public.koinonia_profiles (
  id              uuid primary key references auth.users (id) on delete cascade,
  -- cópia do e-mail de auth.users (sincronizada por trigger) para listar/buscar
  -- usuários sem precisar da chave secreta
  email           text not null,
  nome_completo   text not null check (char_length(btrim(nome_completo)) between 3 and 150),
  celular         text not null check (celular ~ '^\d{11}$'),
  data_nascimento date not null check (data_nascimento >= date '1900-01-01'),
  genero          public.koinonia_genero not null,
  role            public.koinonia_user_role not null default 'MEMBRO',
  gc_id           uuid, -- FK adicionada após a criação de koinonia_gcs (referência circular)
  ativo           boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index koinonia_profiles_gc_id_idx on public.koinonia_profiles (gc_id);
create index koinonia_profiles_role_idx on public.koinonia_profiles (role);
-- aniversariantes do mês
create index koinonia_profiles_mes_nascimento_idx on public.koinonia_profiles ((extract(month from data_nascimento)));

-- -----------------------------------------------------------------------------
-- koinonia_gcs (Grupos de Crescimento)
-- -----------------------------------------------------------------------------
create table public.koinonia_gcs (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null check (char_length(btrim(nome)) between 2 and 100),
  -- dia/horário do encontro (opcionais) — ajudam o membro a escolher o GC
  dia_semana  smallint check (dia_semana between 0 and 6), -- 0 = domingo
  horario     time,
  cep         text not null check (cep ~ '^\d{8}$'),
  logradouro  text not null,
  numero      text not null,
  complemento text,
  bairro      text not null,
  cidade      text not null,
  uf          char(2) not null check (uf ~ '^[A-Z]{2}$'),
  lider_id    uuid references public.koinonia_profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create unique index koinonia_gcs_nome_key on public.koinonia_gcs (lower(nome));
create index koinonia_gcs_lider_id_idx on public.koinonia_gcs (lider_id);

alter table public.koinonia_profiles
  add constraint koinonia_profiles_gc_id_fkey
  foreign key (gc_id) references public.koinonia_gcs (id) on delete set null;

-- -----------------------------------------------------------------------------
-- koinonia_eventos
-- -----------------------------------------------------------------------------
create table public.koinonia_eventos (
  id             uuid primary key default gen_random_uuid(),
  titulo         text not null check (char_length(btrim(titulo)) between 3 and 150),
  descricao      text,
  cep            text not null check (cep ~ '^\d{8}$'),
  logradouro     text not null,
  numero         text not null,
  complemento    text,
  bairro         text not null,
  cidade         text not null,
  uf             char(2) not null check (uf ~ '^[A-Z]{2}$'),
  inicio         timestamptz not null,
  fim            timestamptz not null,
  valor          numeric(10, 2) check (valor is null or valor > 0), -- null = gratuito
  -- RESTRICT: usuários devem ser desativados, não excluídos, enquanto forem responsáveis
  responsavel_id uuid not null references public.koinonia_profiles (id) on delete restrict,
  publico        public.koinonia_publico_evento not null default 'todos',
  created_by     uuid default auth.uid() references public.koinonia_profiles (id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint koinonia_eventos_fim_apos_inicio check (fim > inicio)
);

create index koinonia_eventos_inicio_idx on public.koinonia_eventos (inicio);
create index koinonia_eventos_responsavel_id_idx on public.koinonia_eventos (responsavel_id);
create index koinonia_eventos_created_by_idx on public.koinonia_eventos (created_by);

-- -----------------------------------------------------------------------------
-- koinonia_ministerios / koinonia_ministerio_membros
-- -----------------------------------------------------------------------------
create table public.koinonia_ministerios (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null check (char_length(btrim(nome)) between 2 and 100),
  descricao  text,
  created_at timestamptz not null default now()
);

-- único sem diferenciar maiúsculas ("Louvor" = "louvor")
create unique index koinonia_ministerios_nome_key on public.koinonia_ministerios (lower(nome));

create table public.koinonia_ministerio_membros (
  ministerio_id uuid not null references public.koinonia_ministerios (id) on delete cascade,
  profile_id    uuid not null references public.koinonia_profiles (id) on delete cascade,
  is_lider      boolean not null default false,
  created_at    timestamptz not null default now(),
  primary key (ministerio_id, profile_id)
);

create index koinonia_ministerio_membros_profile_id_idx on public.koinonia_ministerio_membros (profile_id);
create index koinonia_ministerio_membros_lideres_idx on public.koinonia_ministerio_membros (profile_id) where is_lider;

-- -----------------------------------------------------------------------------
-- Escala de serviço
-- -----------------------------------------------------------------------------
create table public.koinonia_escala_funcoes (
  id     uuid primary key default gen_random_uuid(),
  funcao text not null unique,
  vagas  smallint not null check (vagas > 0),
  ordem  smallint not null default 0, -- ordem de exibição na grade
  ativo  boolean not null default true
);

create table public.koinonia_escalas (
  id         uuid primary key default gen_random_uuid(),
  data       date not null,
  descricao  text not null check (char_length(btrim(descricao)) between 2 and 150),
  evento_id  uuid references public.koinonia_eventos (id) on delete set null,
  created_by uuid default auth.uid() references public.koinonia_profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index koinonia_escalas_data_idx on public.koinonia_escalas (data);
create index koinonia_escalas_evento_id_idx on public.koinonia_escalas (evento_id);
create index koinonia_escalas_created_by_idx on public.koinonia_escalas (created_by);

create table public.koinonia_escala_atribuicoes (
  id         uuid primary key default gen_random_uuid(),
  escala_id  uuid not null references public.koinonia_escalas (id) on delete cascade,
  funcao_id  uuid not null references public.koinonia_escala_funcoes (id) on delete restrict,
  profile_id uuid not null references public.koinonia_profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  -- a mesma pessoa não pode ter duas funções na mesma escala
  constraint koinonia_escala_atribuicoes_pessoa_unica unique (escala_id, profile_id)
);

create index koinonia_escala_atribuicoes_funcao_id_idx on public.koinonia_escala_atribuicoes (funcao_id);
create index koinonia_escala_atribuicoes_profile_id_idx on public.koinonia_escala_atribuicoes (profile_id);
create index koinonia_escala_atribuicoes_escala_funcao_idx on public.koinonia_escala_atribuicoes (escala_id, funcao_id);

-- -----------------------------------------------------------------------------
-- Escala da cantina
-- -----------------------------------------------------------------------------
create table public.koinonia_cantina_escalas (
  id            uuid primary key default gen_random_uuid(),
  data          date not null,
  descricao     text,
  -- RESTRICT: não excluir GC/ministério que ainda tem escala de cantina vinculada
  gc_id         uuid references public.koinonia_gcs (id) on delete restrict,
  ministerio_id uuid references public.koinonia_ministerios (id) on delete restrict,
  created_at    timestamptz not null default now(),
  constraint koinonia_cantina_escalas_responsavel check (gc_id is not null or ministerio_id is not null),
  -- PENDENTE DE CONFIRMAÇÃO: uma escala de cantina por data
  constraint koinonia_cantina_escalas_data_key unique (data)
);

create index koinonia_cantina_escalas_gc_id_idx on public.koinonia_cantina_escalas (gc_id);
create index koinonia_cantina_escalas_ministerio_id_idx on public.koinonia_cantina_escalas (ministerio_id);

-- -----------------------------------------------------------------------------
-- Conteúdo do site público
-- -----------------------------------------------------------------------------
create table public.koinonia_pastores (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null,
  cargo      text not null,
  bio        text,
  foto_path  text, -- caminho no bucket "koinonia-site"
  ordem      smallint not null default 0,
  ativo      boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.koinonia_projetos (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'), -- URL da página de detalhe
  titulo      text not null,
  resumo      text, -- texto curto para o card da listagem
  descricao   text not null,
  imagem_path text, -- caminho no bucket "koinonia-site"
  status      public.koinonia_projeto_status not null default 'em_andamento',
  publicado   boolean not null default true,
  ordem       smallint not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- linha única (singleton): id é sempre true
create table public.koinonia_configuracoes_contribuicao (
  id             boolean primary key default true check (id),
  chave_pix      text,
  tipo_chave     public.koinonia_tipo_chave_pix,
  -- nome e cidade do recebedor são obrigatórios no payload do QR Code PIX (BR Code)
  pix_recebedor  text check (char_length(pix_recebedor) <= 25),
  pix_cidade     text check (char_length(pix_cidade) <= 15),
  banco          text,
  agencia        text,
  conta          text,
  titular        text,
  cnpj           text check (cnpj is null or cnpj ~ '^\d{14}$'),
  updated_at     timestamptz not null default now()
);
