-- =============================================================================
-- Koinonia — funções helper, triggers e regras de negócio
-- =============================================================================

-- -----------------------------------------------------------------------------
-- updated_at
-- -----------------------------------------------------------------------------
create or replace function public.koinonia_set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger koinonia_gcs_set_updated_at before update on public.koinonia_gcs
  for each row execute function public.koinonia_set_updated_at();
create trigger koinonia_eventos_set_updated_at before update on public.koinonia_eventos
  for each row execute function public.koinonia_set_updated_at();
create trigger koinonia_pastores_set_updated_at before update on public.koinonia_pastores
  for each row execute function public.koinonia_set_updated_at();
create trigger koinonia_projetos_set_updated_at before update on public.koinonia_projetos
  for each row execute function public.koinonia_set_updated_at();
create trigger koinonia_configuracoes_contribuicao_set_updated_at before update on public.koinonia_configuracoes_contribuicao
  for each row execute function public.koinonia_set_updated_at();
-- koinonia_profiles.updated_at é tratado em koinonia_profiles_guard()

-- -----------------------------------------------------------------------------
-- Helpers de permissão (security definer: leem koinonia_profiles sem passar
-- pela RLS, evitando recursão nas policies). Usuário inativo = sem papel.
--
-- Obs.: o documento sugeria current_role(), mas CURRENT_ROLE é palavra
-- reservada do SQL — por isso koinonia_current_user_role().
-- -----------------------------------------------------------------------------
create or replace function public.koinonia_current_user_role()
returns public.koinonia_user_role
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.koinonia_profiles where id = (select auth.uid()) and ativo;
$$;

create or replace function public.koinonia_is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.koinonia_current_user_role() = 'ADMIN', false);
$$;

create or replace function public.koinonia_is_admin_or_pastor()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.koinonia_current_user_role() in ('ADMIN', 'PASTOR'), false);
$$;

-- o usuário logado lidera este ministério?
create or replace function public.koinonia_is_lider_of(p_ministerio_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.koinonia_ministerio_membros mm
    join public.koinonia_profiles p on p.id = mm.profile_id
    where mm.ministerio_id = p_ministerio_id
      and mm.profile_id = (select auth.uid())
      and mm.is_lider
      and p.ativo
  );
$$;

-- o usuário logado lidera algum ministério do qual p_profile_id participa?
create or replace function public.koinonia_is_lider_of_profile(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.koinonia_ministerio_membros lider
    join public.koinonia_profiles p on p.id = lider.profile_id
    join public.koinonia_ministerio_membros membro on membro.ministerio_id = lider.ministerio_id
    where lider.profile_id = (select auth.uid())
      and lider.is_lider
      and p.ativo
      and membro.profile_id = p_profile_id
  );
$$;

revoke execute on function
  public.koinonia_current_user_role(),
  public.koinonia_is_admin(),
  public.koinonia_is_admin_or_pastor(),
  public.koinonia_is_lider_of(uuid),
  public.koinonia_is_lider_of_profile(uuid)
from public, anon;

grant execute on function
  public.koinonia_current_user_role(),
  public.koinonia_is_admin(),
  public.koinonia_is_admin_or_pastor(),
  public.koinonia_is_lider_of(uuid),
  public.koinonia_is_lider_of_profile(uuid)
to authenticated;

-- -----------------------------------------------------------------------------
-- Cadastro: cria o profile a partir de raw_user_meta_data (enviado no signUp).
--
-- auth.users é compartilhado com outros apps, então só age quando o metadata
-- traz app = 'koinonia'. Quem já tem conta em outro app completa o perfil ao
-- entrar no Koinonia (INSERT direto, ver koinonia_profiles_before_insert).
-- O papel NUNCA vem do metadata — sempre MEMBRO (default da coluna).
-- -----------------------------------------------------------------------------
create or replace function public.koinonia_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  if meta ->> 'app' is distinct from 'koinonia' then
    return new;
  end if;

  insert into public.koinonia_profiles (id, email, nome_completo, celular, data_nascimento, genero)
  values (
    new.id,
    new.email,
    btrim(meta ->> 'nome_completo'),
    regexp_replace(coalesce(meta ->> 'celular', ''), '\D', '', 'g'),
    (meta ->> 'data_nascimento')::date,
    (meta ->> 'genero')::public.koinonia_genero
  );
  return new;
end;
$$;

create trigger koinonia_on_auth_user_created
  after insert on auth.users
  for each row execute function public.koinonia_handle_new_user();

-- mantém koinonia_profiles.email em sincronia quando o usuário troca de e-mail
create or replace function public.koinonia_handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.koinonia_profiles set email = new.email where id = new.id;
  return new;
end;
$$;

create trigger koinonia_on_auth_user_email_updated
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function public.koinonia_handle_user_email_change();

-- -----------------------------------------------------------------------------
-- INSERT direto em koinonia_profiles (usuário com conta em outro app
-- completando o cadastro): força MEMBRO, ativo e o e-mail real da conta.
-- -----------------------------------------------------------------------------
create or replace function public.koinonia_profiles_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null then
    new.role := 'MEMBRO';
    new.ativo := true;
    new.gc_id := null;
    select email into new.email from auth.users where id = new.id;
  end if;
  return new;
end;
$$;

create trigger koinonia_profiles_before_insert
  before insert on public.koinonia_profiles
  for each row execute function public.koinonia_profiles_before_insert();

-- -----------------------------------------------------------------------------
-- Guarda de koinonia_profiles: protege role, ativo, email e id.
--
-- * auth.uid() nulo = SQL editor / chave secreta / seed → permitido (é assim
--   que o primeiro ADMIN é criado).
-- * role: só ADMIN altera, e nunca o próprio. LIDER_MINISTERIO é derivado da
--   liderança em ministérios, então MEMBRO/LIDER_MINISTERIO são normalizados.
-- * ativo: ADMIN/PASTOR; pastor não desativa ADMIN; ninguém desativa a si mesmo.
-- -----------------------------------------------------------------------------
create or replace function public.koinonia_profiles_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if new.id is distinct from old.id then
    raise exception 'Não é permitido alterar o identificador do perfil.' using errcode = '42501';
  end if;

  if new.email is distinct from old.email and v_uid is not null then
    raise exception 'O e-mail deve ser alterado pela tela de conta.' using errcode = '42501';
  end if;

  if new.role is distinct from old.role
     and coalesce(current_setting('app.koinonia_sincronizando_papel', true), '') <> 'on' then
    if v_uid is not null then
      if not public.koinonia_is_admin() then
        raise exception 'Apenas administradores podem alterar papéis.' using errcode = '42501';
      end if;
      if v_uid = new.id then
        raise exception 'Você não pode alterar o seu próprio papel.' using errcode = '42501';
      end if;
    end if;

    if new.role in ('MEMBRO', 'LIDER_MINISTERIO') then
      new.role := case
        when exists (select 1 from public.koinonia_ministerio_membros where profile_id = new.id and is_lider)
          then 'LIDER_MINISTERIO'::public.koinonia_user_role
        else 'MEMBRO'::public.koinonia_user_role
      end;
    end if;
  end if;

  if new.ativo is distinct from old.ativo and v_uid is not null then
    if not public.koinonia_is_admin_or_pastor() then
      raise exception 'Apenas administradores e pastores podem ativar ou desativar usuários.' using errcode = '42501';
    end if;
    if v_uid = new.id then
      raise exception 'Você não pode desativar o seu próprio usuário.' using errcode = '42501';
    end if;
    if old.role = 'ADMIN' and not public.koinonia_is_admin() then
      raise exception 'Apenas administradores podem desativar outro administrador.' using errcode = '42501';
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create trigger koinonia_profiles_guard
  before update on public.koinonia_profiles
  for each row execute function public.koinonia_profiles_guard();

-- -----------------------------------------------------------------------------
-- Promoção/rebaixamento automático de LIDER_MINISTERIO.
-- Só mexe em quem é MEMBRO ou LIDER_MINISTERIO — nunca em ADMIN/PASTOR.
-- -----------------------------------------------------------------------------
create or replace function public.koinonia_sincronizar_papel_lider(p_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_novo public.koinonia_user_role;
begin
  v_novo := case
    when exists (select 1 from public.koinonia_ministerio_membros where profile_id = p_profile_id and is_lider)
      then 'LIDER_MINISTERIO'::public.koinonia_user_role
    else 'MEMBRO'::public.koinonia_user_role
  end;

  perform set_config('app.koinonia_sincronizando_papel', 'on', true);
  update public.koinonia_profiles
     set role = v_novo
   where id = p_profile_id
     and role in ('MEMBRO', 'LIDER_MINISTERIO')
     and role <> v_novo;
  perform set_config('app.koinonia_sincronizando_papel', 'off', true);
end;
$$;

revoke execute on function public.koinonia_sincronizar_papel_lider(uuid) from public, anon, authenticated;

create or replace function public.koinonia_ministerio_membros_sincronizar_papel()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op in ('INSERT', 'UPDATE') then
    perform public.koinonia_sincronizar_papel_lider(new.profile_id);
  end if;
  if tg_op = 'DELETE' or (tg_op = 'UPDATE' and old.profile_id <> new.profile_id) then
    perform public.koinonia_sincronizar_papel_lider(old.profile_id);
  end if;
  return null;
end;
$$;

create trigger koinonia_ministerio_membros_sincronizar_papel
  after insert or update of is_lider, profile_id or delete on public.koinonia_ministerio_membros
  for each row execute function public.koinonia_ministerio_membros_sincronizar_papel();

-- -----------------------------------------------------------------------------
-- Escala: não exceder as vagas da função e não escalar usuário inativo.
-- O lock na linha da escala serializa inserções concorrentes na mesma escala.
-- -----------------------------------------------------------------------------
create or replace function public.koinonia_escala_atribuicoes_validar()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_funcao   text;
  v_vagas    smallint;
  v_ocupadas integer;
begin
  perform 1 from public.koinonia_escalas where id = new.escala_id for update;

  if not exists (select 1 from public.koinonia_profiles where id = new.profile_id and ativo) then
    raise exception 'Este usuário está inativo e não pode ser escalado.' using errcode = '23514';
  end if;

  select funcao, vagas into v_funcao, v_vagas
  from public.koinonia_escala_funcoes
  where id = new.funcao_id;

  select count(*) into v_ocupadas
  from public.koinonia_escala_atribuicoes
  where escala_id = new.escala_id
    and funcao_id = new.funcao_id
    and id <> new.id;

  if v_ocupadas >= v_vagas then
    raise exception 'Todas as vagas de "%" já estão preenchidas nesta escala (%/%).', v_funcao, v_ocupadas, v_vagas
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger koinonia_escala_atribuicoes_validar
  before insert or update of escala_id, funcao_id, profile_id on public.koinonia_escala_atribuicoes
  for each row execute function public.koinonia_escala_atribuicoes_validar();
