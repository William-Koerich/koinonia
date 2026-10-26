"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { siteConfig } from "@/config/site";
import { getUserId } from "@/lib/auth";
import { erroValidacao, mensagemErroAuth, mensagemErroBanco } from "@/lib/errors";
import { flash } from "@/lib/flash";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";
import {
  cadastroSchema,
  caminhoSeguro,
  entrarSchema,
  recuperarSenhaSchema,
  redefinirSenhaSchema,
  type CadastroInput,
  type EntrarInput,
  type RecuperarSenhaInput,
  type RedefinirSenhaInput,
} from "@/lib/validation/auth";
import { perfilSchema, type PerfilInput } from "@/lib/validation/perfil";

// Cadastro público: toda conta nova entra como MEMBRO (garantido no banco).
// ADMIN/PASTOR liberam os demais acessos na área logada.

/**
 * Endereço do site para os links enviados por e-mail: o domínio por onde a
 * pessoa está acessando (Origin, ou o host repassado pela Vercel). O Supabase
 * só aceita esse endereço se ele estiver nas "Redirect URLs" do projeto.
 */
async function origem(): Promise<string> {
  const h = await headers();
  const origin = h.get("origin");
  if (origin) return origin;
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (host) return `${h.get("x-forwarded-proto") ?? "https"}://${host}`;
  return siteConfig.url;
}

export async function entrar(input: EntrarInput, next?: string): Promise<ActionResult> {
  const parsed = entrarSchema.safeParse(input);
  if (!parsed.success) return erroValidacao(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.senha,
  });
  if (error) return { ok: false, error: mensagemErroAuth(error) };

  redirect(caminhoSeguro(next));
}

export async function cadastrar(input: CadastroInput): Promise<ActionResult> {
  const parsed = cadastroSchema.safeParse(input);
  if (!parsed.success) return erroValidacao(parsed.error);
  const { email, senha, nome_completo, celular, data_nascimento, genero } = parsed.data;

  // Criada pelo servidor já com o e-mail confirmado: sem link de confirmação.
  // (A opção "Confirm email" do Supabase vale para todos os apps do projeto,
  // por isso não é desligada lá.)
  const { error } = await createAdminClient().auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    // "app" faz o trigger koinonia_handle_new_user criar o perfil (sempre
    // MEMBRO); auth.users é compartilhado com outros apps
    user_metadata: { app: "koinonia", nome: nome_completo, nome_completo, celular, data_nascimento, genero },
  });
  if (error) {
    return error.code === "user_already_exists" || error.code === "email_exists"
      ? { ok: false, error: JA_TEM_CONTA }
      : { ok: false, error: mensagemErroAuth(error) };
  }

  redirect(`/entrar?cadastro=ok&email=${encodeURIComponent(email)}`);
}

const JA_TEM_CONTA =
  "Este e-mail já tem cadastro (talvez em outro sistema da igreja). Entre com sua senha para completar seu perfil.";

/** Quem já tem login em outro app (mesmo auth.users) cria o perfil Koinonia */
export async function completarCadastro(input: PerfilInput): Promise<ActionResult> {
  const parsed = perfilSchema.safeParse(input);
  if (!parsed.success) return erroValidacao(parsed.error);

  const userId = await getUserId();
  if (!userId) redirect("/entrar");

  // papel, ativo e e-mail são forçados pelo trigger koinonia_profiles_before_insert
  const supabase = await createClient();
  const { error } = await supabase
    .from("koinonia_profiles")
    .insert({ id: userId, email: "", ...parsed.data });
  if (error && error.code !== "23505") return { ok: false, error: mensagemErroBanco(error) };

  await flash("Cadastro concluído. Seja bem-vindo(a)!");
  redirect("/app");
}

export async function recuperarSenha(input: RecuperarSenhaInput): Promise<ActionResult> {
  const parsed = recuperarSenhaSchema.safeParse(input);
  if (!parsed.success) return erroValidacao(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${await origem()}/auth/callback?next=/redefinir-senha`,
  });

  // Só mostramos erro de limite de envio; os demais respondem igual a sucesso
  // para não revelar quais e-mails têm conta
  if (error?.code?.startsWith("over_")) return { ok: false, error: mensagemErroAuth(error) };

  return {
    ok: true,
    message: "Se houver uma conta com este e-mail, você receberá um link para redefinir a senha.",
  };
}

export async function redefinirSenha(input: RedefinirSenhaInput): Promise<ActionResult> {
  const parsed = redefinirSenhaSchema.safeParse(input);
  if (!parsed.success) return erroValidacao(parsed.error);

  if (!(await getUserId())) {
    return { ok: false, error: "O link expirou. Solicite a recuperação de senha novamente." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.senha });
  if (error) return { ok: false, error: mensagemErroAuth(error) };

  await flash("Senha alterada.");
  redirect("/app");
}

export async function sair(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
