-- =============================================================================
-- Koinonia — cadastro público (sempre como MEMBRO)
--
-- Qualquer pessoa pode criar a própria conta. O papel nunca vem do usuário:
-- todo perfil criado pelo próprio usuário entra como MEMBRO, ativo e sem GC.
-- ADMIN/PASTOR liberam os demais acessos depois (liderança de ministério,
-- papel, ativação). Substitui o bloqueio da migration 0500.
-- =============================================================================

-- 1) Cadastro pelo site: cria o perfil a partir do metadata enviado no signUp.
--    auth.users é compartilhado com outros apps, então só age com app = 'koinonia'.
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

  -- role/ativo ficam nos defaults da tabela (MEMBRO, ativo)
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

drop trigger if exists koinonia_on_auth_user_created on auth.users;
create trigger koinonia_on_auth_user_created
  after insert on auth.users
  for each row execute function public.koinonia_handle_new_user();

-- 2) Quem já tem login em outro app completa o perfil Koinonia ao entrar
--    (INSERT do próprio perfil). O trigger abaixo força MEMBRO.
create or replace function public.koinonia_profiles_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- auth.uid() nulo = chave secreta (ADMIN/PASTOR criando usuário pelo app,
  -- seed ou SQL Editor): mantém o papel informado
  if (select auth.uid()) is not null then
    new.role := 'MEMBRO';
    new.ativo := true;
    new.gc_id := null;
    select email into new.email from auth.users where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists koinonia_profiles_before_insert on public.koinonia_profiles;
create trigger koinonia_profiles_before_insert
  before insert on public.koinonia_profiles
  for each row execute function public.koinonia_profiles_before_insert();

grant insert on public.koinonia_profiles to authenticated;

drop policy if exists "koinonia_profiles_insert" on public.koinonia_profiles;
create policy "koinonia_profiles_insert" on public.koinonia_profiles
  for insert to authenticated
  with check (id = (select auth.uid()));
