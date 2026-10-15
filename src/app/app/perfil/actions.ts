"use server";

import { revalidatePath } from "next/cache";
import { getUserId } from "@/lib/auth";
import { erroValidacao, mensagemErroAuth, mensagemErroBanco } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";
import { redefinirSenhaSchema, type RedefinirSenhaInput } from "@/lib/validation/auth";
import { meuPerfilSchema, type MeuPerfilInput } from "@/lib/validation/perfil";

/** Troca a senha do usuário logado (ex.: a senha inicial dada pela secretaria) */
export async function alterarSenha(input: RedefinirSenhaInput): Promise<ActionResult> {
  const parsed = redefinirSenhaSchema.safeParse(input);
  if (!parsed.success) return erroValidacao(parsed.error);

  if (!(await getUserId())) return { ok: false, error: "Sua sessão expirou. Entre novamente." };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.senha });
  if (error) return { ok: false, error: mensagemErroAuth(error) };

  return { ok: true, message: "Senha alterada." };
}

export async function atualizarMeuPerfil(input: MeuPerfilInput): Promise<ActionResult> {
  const parsed = meuPerfilSchema.safeParse(input);
  if (!parsed.success) return erroValidacao(parsed.error);

  const userId = await getUserId();
  if (!userId) return { ok: false, error: "Sua sessão expirou. Entre novamente." };

  // A RLS só permite atualizar o próprio perfil (ou admin/pastor);
  // role e ativo não fazem parte do payload e são protegidos por trigger
  const supabase = await createClient();
  const { error } = await supabase
    .from("koinonia_profiles")
    .update(parsed.data)
    .eq("id", userId);

  if (error) return { ok: false, error: mensagemErroBanco(error) };

  revalidatePath("/app", "layout");
  return { ok: true, message: "Perfil atualizado." };
}
