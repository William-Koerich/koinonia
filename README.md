# Koinonia

Site institucional da igreja + área logada de gestão (membros, ministérios, GCs (Grupos Caseiros), eventos, escala de serviço, cantina, avisos e financeiro).

- **Next.js 16** (App Router, Server Components, Server Actions, Cache Components) com TypeScript estrito
- **Supabase**: Auth, Postgres com Row Level Security, Storage
- **Tailwind CSS 4 + shadcn/ui**, react-hook-form + zod (o mesmo schema valida no navegador e no servidor)
- Interface em pt-BR, datas no fuso `America/Sao_Paulo`, valores em BRL, mobile first

---

## Sumário

1. [Visão geral](#visão-geral)
2. [Estrutura do projeto](#estrutura-do-projeto)
3. [Setup local](#setup-local)
4. [Banco de dados: migrations, seed, tipos e testes](#banco-de-dados)
5. [Criando o primeiro ADMIN](#criando-o-primeiro-admin)
6. [Papéis e permissões](#papéis-e-permissões)
7. [Deploy na Vercel](#deploy-na-vercel)
8. [Personalização](#personalização)
9. [Decisões importantes](#decisões-importantes)

---

## Visão geral

**Site público** — Home, Quem Somos, Pastores, Projetos (com página de detalhe), Eventos, Contribuição (PIX copia e cola + QR Code, dados bancários) e Contato. Pastores, projetos, eventos e dados de contribuição vêm do banco e são editados pela área logada. Tem metadata por página, Open Graph, `sitemap.xml` e `robots.txt`.

**Área logada (`/app`)** — Início (avisos, minhas escalas, próximos eventos, aniversariantes), Meu perfil, Avisos, Eventos, Escala, Cantina, Ministérios, GCs, Financeiro, Usuários e Conteúdo do site. O menu mostra só o que o papel do usuário permite.

**Cadastro aberto, acesso liberado pela liderança.** Qualquer pessoa cria a própria conta em `/cadastro` e entra sempre como **MEMBRO**. Não há confirmação por e-mail: a conta é criada pelo servidor (chave secreta) já confirmada e a pessoa vai direto para o login. A opção *Confirm email* do Supabase continua ligada porque vale para os outros apps do projeto. ADMIN e PASTOR liberam os demais acessos: o PASTOR marca líderes de ministério (o que promove a LIDER_MINISTERIO automaticamente) e ativa/desativa contas; o ADMIN também define quem é PASTOR ou ADMIN. ADMIN/PASTOR ainda podem criar contas em **Usuários → Novo usuário**. Há recuperação de senha por e-mail.

---

## Estrutura do projeto

```
src/
  app/
    (site)/          páginas públicas
    (auth)/          entrar, cadastro, completar cadastro, recuperar/redefinir senha, conta inativa
    app/             área logada (/app/...) — cada pasta tem page.tsx + actions.ts
    auth/callback/   troca o código do link de e-mail pela sessão
    sitemap.ts, robots.ts, opengraph-image.tsx
  components/
    ui/              shadcn/ui
    forms/           campos reutilizáveis (endereço com ViaCEP, combobox de pessoa, R$, upload…)
    app/, site/, auth/
  config/            textos fixos do site (site.ts, institucional.ts)
  lib/
    supabase/        clients: server (cookies), client (navegador), public (anon, cacheável), admin (chave secreta)
    validation/      schemas zod compartilhados entre client e server
    data/            consultas reutilizadas (site público cacheado, opções de selects)
    auth.ts          sessão/perfil (requireProfile, requireRole)
    actions.ts       checagem de permissão nas Server Actions
  proxy.ts           renova a sessão e protege /app/* (no Next 16, "middleware" virou "proxy")
  types/database.ts  gerado pelo Supabase CLI — não editar
supabase/
  migrations/        migrations versionadas (aplicar em ordem)
  seed.sql           dados iniciais (funções da escala, exemplos)
  tests/permissoes.sql  testes de RLS por papel
  config.toml        configuração do Supabase local (CLI)
```

---

## Setup local

### Pré-requisitos

- Node.js 20+ e npm
- `psql` (cliente do Postgres) — usado para aplicar migrations e rodar os testes
- Um projeto Supabase **ou** Docker, se quiser rodar o Supabase localmente

### 1. Instalar dependências

```bash
npm install
```

### 2. Variáveis de ambiente

```bash
cp .env.example .env.local
```

| Variável | Onde encontrar | Observação |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API | |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Project Settings → API Keys (`sb_publishable_…`) | Pública, vai para o navegador |
| `SUPABASE_SECRET_KEY` | Project Settings → API Keys (`sb_secret_…`) | **Só no servidor.** Ignora a RLS. Nunca prefixe com `NEXT_PUBLIC_` |
| `NEXT_PUBLIC_SITE_URL` | URL do site | `http://localhost:3000` em dev; domínio em produção |
| `DATABASE_URL` | Project Settings → Database → Connection string (Session pooler) | Só para migrations, tipos e testes |

> A chave secreta é usada apenas em `src/lib/supabase/admin.ts`, que importa `server-only` — o build falha se alguém tentar usá-la em um Client Component.

### 3a. Usando um projeto Supabase na nuvem

Aplique as migrations e o seed (veja [Banco de dados](#banco-de-dados)), crie o primeiro ADMIN e rode:

```bash
npm run dev
```

### 3b. Usando o Supabase local (Docker)

```bash
npx supabase start          # sobe Postgres, Auth, Storage e Studio locais
npx supabase status         # mostra a URL e as chaves locais → copie para o .env.local
npx supabase db reset       # recria o banco LOCAL aplicando migrations + seed.sql
npm run dev
```

O Studio local fica em http://127.0.0.1:54323 e os e-mails (recuperação de senha) aparecem no Mailpit em http://127.0.0.1:54324.

> ⚠️ `supabase db reset` apaga o banco. Use **somente** no Supabase local, nunca com `--linked` ou `--db-url` apontando para o projeto na nuvem (que é compartilhado com outros apps).

### Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` / `npm start` | Build e servidor de produção |
| `npm run lint` | ESLint |
| `npm run typecheck` | Gera os tipos de rota do Next e roda o `tsc` |
| `npm run db:types` | Regenera `src/types/database.ts` a partir do banco em `DATABASE_URL` |
| `npm run db:test` | Roda os testes de permissão (`supabase/tests/permissoes.sql`) |

---

## Banco de dados

### Banco compartilhado e prefixo `koinonia_`

O projeto Supabase de produção é **compartilhado com outros apps** (o schema `public` e o `auth.users` também). Por isso **todo objeto deste projeto usa o prefixo `koinonia_`**: tabelas, enums, funções, triggers, policies e o bucket `koinonia-site`. Os grants das migrations listam as tabelas explicitamente para não afetar as dos outros apps.

### Aplicar migrations

As migrations ficam em `supabase/migrations/` e devem ser aplicadas em ordem. As versões aplicadas ficam registradas em `supabase_migrations.schema_migrations` (o mesmo controle do Supabase CLI).

**Com o Supabase CLI** (aplica só as pendentes):

```bash
set -a && source .env.local && set +a
npx supabase db push --db-url "$DATABASE_URL"
```

**Com `psql`**, uma migration por vez, numa transação:

```bash
psql "$DATABASE_URL" -1 -v ON_ERROR_STOP=1 -f supabase/migrations/<arquivo>.sql
psql "$DATABASE_URL" -c "insert into supabase_migrations.schema_migrations (version, name) values ('<versão>', '<nome>');"
```

Para criar uma nova migration: `npx supabase migration new <nome>`. Depois de aplicar, rode `npm run db:types` e `npm run db:test`.

| Migration | Conteúdo |
|---|---|
| `…0100_schema` | enums, tabelas, constraints e índices |
| `…0200_functions_triggers` | helpers de permissão, triggers de papel/líder, vagas da escala |
| `…0300_rls` | grants, RLS e a view `koinonia_perfis_basicos` |
| `…0400_storage` | bucket público `koinonia-site` e suas policies |
| `…0500_sem_cadastro_publico` | remove o autocadastro (só ADMIN/PASTOR criam usuários) |
| `…0600_buscar_usuario_por_email` | função usada ao criar usuário que já tem login em outro app |
| `…0700_leitura_so_membros_ativos` | dados da área logada só para quem tem perfil Koinonia ativo |
| `…0800_cadastro_publico_como_membro` | volta o cadastro público, sempre como MEMBRO (substitui a 0500) |
| `…0900_ministerio_solicitacoes` | pedidos para participar de ministérios (membro pede, líder/PASTOR/ADMIN aprova) |
| `…1000_projeto_imagens` | galeria de imagens dos projetos (capa em `imagem_path`) |
| `…1100_evento_inscricoes` | inscrições em eventos: pendente → membro avisa pagamento → responsável confirma |
| `…1200_responsavel_ve_inscritos` | responsável pelo evento vê o contato dos inscritos |
| `…1300_evento_pix_e_convidados` | chave PIX por evento (escondida do público) e inscrição de convidados sem conta |
| `…1400_cantina_cardapio_reservas` | cardápio por data de cantina e reservas (quantidade, levar ou comer na igreja) |
| `…1410_cantina_disponibilidade` | total reservado por item, sem expor quem reservou |
| `…1500_avisos` | avisos da igreja (título, mensagem e imagem opcionais; público ou só membros; data de fim) |
| `…1600_financeiro_entradas` | entradas do financeiro (dízimo, oferta, primícias, doação); acesso via `koinonia_pode_financeiro()` |

### Seed

`supabase/seed.sql` cria as funções da escala (Estacionamento 2, Porta Lateral 1, Porta Principal 2, DataShow 1, Transmissão 1, Câmera 1, Story 1), ministérios, GCs, pastores, projetos e dados de contribuição **de exemplo**. Não cria usuários. Os eventos de exemplo só são criados se já existir um ADMIN (ele vira o responsável), então rode o seed depois de criar o primeiro ADMIN. Ele pode ser executado mais de uma vez sem duplicar dados.

```bash
psql "$DATABASE_URL" -f supabase/seed.sql
```

> ⚠️ Os dados PIX do seed são fictícios — o CNPJ `00.000.000/0001-91` pertence ao Banco do Brasil. Troque em **Conteúdo do site → Contribuição** antes de publicar.

### Tipos do TypeScript

```bash
npm run db:types
```

Como o schema é compartilhado, o arquivo também traz os tipos das tabelas dos outros apps; isso é esperado.

### Testes de permissão

```bash
npm run db:test
```

Simula cada papel (visitante, conta de outro app, membro, inativo, pastor, líder, admin) e verifica o que cada um pode ler e alterar, além das regras dos triggers. Tudo roda numa transação com `ROLLBACK` — **nada é gravado**. Precisa de um ADMIN e de duas contas no `auth.users` sem perfil Koinonia.

---

## Criando o primeiro ADMIN

Toda conta criada pelo site entra como MEMBRO, então o primeiro administrador é promovido direto no banco:

1. **Crie sua conta** em `/cadastro` (ou, se já tiver login em outro app do mesmo projeto, entre em `/entrar` e complete o cadastro).
2. **Promova a ADMIN** no *SQL Editor*:

```sql
update public.koinonia_profiles set role = 'ADMIN'
where email = 'admin@suaigreja.com.br';
```

3. Entre de novo. A partir daí, os acessos dos demais são liberados pela área logada.

> Pelo SQL Editor (sem usuário logado) os triggers permitem definir o papel livremente. Dentro do app, só um ADMIN altera papéis, e nunca o próprio.

---

## Papéis e permissões

As permissões são garantidas por **RLS e triggers no banco**. A interface só esconde o que o usuário não pode fazer, e as Server Actions checam a permissão antes de ir ao banco para dar mensagens amigáveis.

| Ação | ADMIN | PASTOR | LÍDER MIN. | MEMBRO |
|---|---|---|---|---|
| Alterar papel de usuários | ✅ | ❌ | ❌ | ❌ |
| Criar usuários | ✅ | ✅ (só Membro) | ❌ | ❌ |
| Ver/editar usuários, ativar/desativar | ✅ | ✅ (não desativa ADMIN) | ver membros dos seus ministérios | só o próprio perfil |
| CRUD eventos | ✅ | ✅ | ver | ver |
| Inscrever-se em eventos | ✅ | ✅ | ✅ | ✅ (respeita o público do evento) |
| Confirmar/recusar inscrições | ✅ | ✅ | se for o responsável pelo evento | se for o responsável pelo evento |
| CRUD ministérios | ✅ | ✅ | ver | ver |
| Vincular membros a ministério / aprovar pedidos | ✅ | ✅ | só nos que lidera, só membros comuns | ❌ (pode **pedir para participar**) |
| Marcar líder de ministério | ✅ | ✅ | ❌ | ❌ |
| CRUD GCs / colocar pessoas em GCs | ✅ | ✅ | ver e escolher o seu | ver e escolher o seu |
| Escala e Cantina | ✅ | ✅ | ver | ver (destaca onde está escalado) |
| Cardápio da cantina | ✅ | ✅ | se a equipe dele estiver escalada na data | se o GC/ministério dele estiver escalado |
| Reservar na cantina | ✅ | ✅ | ✅ | ✅ |
| Ver avisos | ✅ (inclusive encerrados) | ✅ (inclusive encerrados) | vigentes | vigentes |
| Publicar avisos | ✅ | ✅ | ❌ | ❌ |
| Financeiro (entradas) | ✅ | ✅ | ❌ | ❌ |
| Conteúdo do site | ✅ | ✅ | ❌ | ❌ |

Regras automáticas:

- **LIDER_MINISTERIO é derivado**: marcar alguém como líder de um ministério promove a pessoa de MEMBRO para LIDER_MINISTERIO; deixar de liderar todos volta para MEMBRO. ADMIN e PASTOR nunca são rebaixados.
- Ninguém altera o próprio papel nem desativa a si mesmo.
- **Usuário inativo** não entra em `/app`, não pode ser escalado e não lê dados da área logada.
- **Escala**: a mesma pessoa não pode ter duas funções na mesma escala, e o número de vagas da função não pode ser excedido. Estar em duas escalas no mesmo dia é permitido, com aviso.
- **Cantina**: uma escala por data, com GC, ministério ou os dois. A equipe escalada (participantes do GC e membros do ministério), PASTOR e ADMIN montam o cardápio (preço e estoque opcionais) e veem as reservas com totais por item. Qualquer membro reserva: quantidade e se vai levar para casa ou comer na igreja. Reservas valem até o dia da cantina e respeitam o estoque.
- **Avisos**: PASTOR e ADMIN publicam em **Avisos** (título obrigatório; mensagem e imagem opcionais). Aparecem no início da área logada e, se marcados como públicos, na home do site (o mais recente também em destaque na primeira tela). Com "Mostrar até" preenchido, o aviso some sozinho depois desse dia.
- **Financeiro — entradas**: em **Financeiro**, ADMIN e PASTOR lançam o que a igreja recebeu (dízimo, oferta, primícias, doação ou outra), com data, valor, forma de recebimento e, opcionalmente, quem contribuiu (membro com conta ou nome livre). A tela mostra o mês com total geral e por categoria (clicar numa categoria filtra a lista). Para dar acesso a outro papel no futuro (ex.: tesouraria), altere `koinonia_pode_financeiro()` no banco e `ROLES_FINANCEIRO` em `src/lib/permissions.ts`.
- **Inscrições em eventos**: evento gratuito confirma na hora; evento pago fica pendente, o membro vê o PIX com o valor do evento, avisa "já paguei" e o responsável pelo evento (ou PASTOR/ADMIN) confirma. Inscrição confirmada só é cancelada pelo responsável. Cada evento pode ter a própria chave PIX; sem ela, vale a da igreja. O responsável também inscreve outras pessoas — membros com conta ou convidados sem conta (nome e celular). Integração com gateway de pagamento: futura.
- **Colunas visíveis ao público**: o papel `anon` só lê as colunas de `koinonia_eventos` liberadas na migration 1300 (a chave PIX fica de fora). Uma coluna nova que deva aparecer no site precisa de `grant select (coluna) ... to anon`.
- Contas do mesmo `auth.users` que não têm perfil Koinonia (outros apps) são levadas a completar o cadastro (entram como MEMBRO) e, até lá, não leem nenhum dado da área logada.
- **Toda conta criada pelo próprio usuário entra como MEMBRO**, ativa e sem GC — mesmo que alguém chame a API do Supabase direto pedindo outro papel.

Helpers SQL (`security definer`): `koinonia_current_user_role()`, `koinonia_is_admin()`, `koinonia_is_admin_or_pastor()`, `koinonia_is_lider_of(ministerio_id)`, `koinonia_is_lider_of_profile(profile_id)`, `koinonia_is_membro_ativo()`.

---

## Deploy na Vercel

1. Importe o repositório na Vercel (framework detectado: Next.js).
2. Em *Settings → Environment Variables*, cadastre `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` e `NEXT_PUBLIC_SITE_URL` (ex.: `https://www.suaigreja.com.br`). `DATABASE_URL` **não** é necessária no deploy.
3. No Supabase, em *Authentication → URL Configuration → Redirect URLs*, adicione `https://www.suaigreja.com.br/**` (e `http://localhost:3000/**` para desenvolvimento). Sem isso o link de recuperação de senha não volta para o site.
   > O *Site URL* do projeto é compartilhado com os outros apps — não altere; use só as Redirect URLs.
4. Aplique as migrations pendentes no banco **antes** de publicar uma versão que dependa delas.
5. Faça o deploy. As imagens do Storage já estão liberadas no `next.config.ts` a partir de `NEXT_PUBLIC_SUPABASE_URL`.

---

## Personalização

| O quê | Onde |
|---|---|
| Nome, horários de culto, endereço, mapa, WhatsApp, e-mail, redes | `src/config/site.ts` |
| História, missão, visão, valores, declaração de fé | `src/config/institucional.ts` |
| Pastores, projetos, PIX e dados bancários | Área logada → **Conteúdo do site** |
| Avisos (home do site e área logada) | Área logada → **Avisos** |
| Funções e vagas da escala | Tabela `koinonia_escala_funcoes` (SQL Editor) |
| Cores e tema | `src/app/globals.css` (variáveis do shadcn/ui; o site público usa o escopo `.site`) |
| Fotos de fundo do site | `public/images/site/` — substitua o arquivo mantendo o nome (mapeadas em `src/lib/imagens.ts`) |
| Agenda da contagem regressiva "Próximo culto" | `cultos` em `src/config/site.ts` |

As fotos de fundo vêm do [Unsplash](https://unsplash.com/license) (uso comercial gratuito, sem atribuição obrigatória). O ideal é trocá-las por fotos reais da igreja. As animações usam a biblioteca `motion` e respeitam a opção "reduzir movimento" do sistema.

---

## Decisões importantes

- **Cadastro público sempre como MEMBRO.** O trigger `koinonia_handle_new_user` cria o perfil no cadastro pelo site (só quando o metadata traz `app: "koinonia"`, já que o `auth.users` é compartilhado), e o trigger `koinonia_profiles_before_insert` força papel MEMBRO, ativo e sem GC em qualquer perfil criado pelo próprio usuário. Isso vale mesmo para quem chamar a API do Supabase diretamente. Atenção: como qualquer pessoa pode criar conta, os dados visíveis a membros (nomes, GCs com endereço, escalas) ficam acessíveis a quem se cadastrar; para restringir, desative a conta em *Usuários*.
- **View `koinonia_perfis_basicos`** (id, nome, gênero, GC de membros ativos): membros só enxergam o próprio perfil, mas precisam ver nomes na escala, no evento e no GC. A view expõe só isso, nunca celular, e-mail ou data de nascimento, e só para membros ativos.
- **Cache do site público**: as páginas públicas usam `'use cache'` com tags (`eventos`, `pastores`, `projetos`, `contribuicao`). As Server Actions da área logada chamam `updateTag` ao salvar, então o site atualiza na hora.
- **Datas**: colunas `date` são exibidas sem conversão de fuso; `timestamptz` são exibidos e editados no horário de Brasília (offset fixo −03:00, sem horário de verão desde 2019).
- **PIX**: o payload "copia e cola" e o QR Code seguem o padrão BR Code do Banco Central (CRC16 validado com o exemplo oficial).
