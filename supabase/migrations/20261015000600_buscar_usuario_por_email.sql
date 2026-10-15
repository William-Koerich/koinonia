-- =============================================================================
-- Koinonia — localizar conta existente no auth.users pelo e-mail
--
-- Ao criar um usuário na área administrativa, o e-mail pode já ter login em
-- outro app que compartilha o auth.users. Nesse caso só vinculamos o perfil
-- Koinonia à conta existente. Executável apenas com a chave secreta.
-- =============================================================================

create or replace function public.koinonia_auth_user_id_por_email(p_email text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select id from auth.users where lower(email) = lower(btrim(p_email)) limit 1;
$$;

revoke execute on function public.koinonia_auth_user_id_por_email(text) from public, anon, authenticated;
grant execute on function public.koinonia_auth_user_id_por_email(text) to service_role;
