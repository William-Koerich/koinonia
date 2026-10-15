"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { siteConfig } from "@/config/site";
import { getUserId } from "@/lib/auth";
import { erroValidacao, mensagemErroAuth, mensagemErroBanco } from "@/lib/errors";
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

async function origem(): Promise<string> {
  return (await headers()).get("origin") ?? siteConfig.url;
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

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password: senha,
    options: {
      emailRedirectTo: `${await origem()}/auth/callback?next=/app`,
      // "app" faz o trigger koinonia_handle_new_user criar o perfil (sempre
      // MEMBRO); auth.users é compartilhado com outros apps
      data: { app: "koinonia", nome: nome_completo, nome_completo, celular, data_nascimento, genero },
    },
  });
  if (error) {
    return error.code === "user_already_exists" || error.code === "email_exists"
      ? { ok: false, error: JA_TEM_CONTA }
      : { ok: false, error: mensagemErroAuth(error) };
  }

  // Com confirmação de e-mail ligada, e-mail já cadastrado volta sem erro e sem
  // identidades (o Supabase não revela quem tem conta)
  if (data.user && data.user.identities?.length === 0) return { ok: false, error: JA_TEM_CONTA };

  if (data.session) redirect("/app");
  return { ok: true, message: "Conta criada! Enviamos um link de confirmação para o seu e-mail." };
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

  redirect("/app");
}

export async function sair(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
