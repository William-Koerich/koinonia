-- =============================================================================
-- Koinonia — sem cadastro público
--
-- Usuários são criados apenas por ADMIN/PASTOR na área administrativa, via
-- servidor com a chave secreta (que ignora a RLS). Como a chave publicável é
-- pública, não basta esconder a tela: qualquer signUp no auth.users
-- (compartilhado com outros apps) deixa de gerar perfil Koinonia, e usuários
-- logados não podem mais inserir o próprio perfil.
-- =============================================================================

drop trigger if exists koinonia_on_auth_user_created on auth.users;
drop function if exists public.koinonia_handle_new_user();

drop policy if exists "koinonia_profiles_insert" on public.koinonia_profiles;
revoke insert on public.koinonia_profiles from authenticated;

-- Com o INSERT restrito à chave secreta, o trigger que forçava MEMBRO no
-- autocadastro não tem mais função
drop trigger if exists koinonia_profiles_before_insert on public.koinonia_profiles;
drop function if exists public.koinonia_profiles_before_insert();
