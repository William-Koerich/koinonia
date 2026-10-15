"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { autorizar, SEM_PERMISSAO } from "@/lib/actions";
import { erroValidacao, mensagemErroAuth, mensagemErroBanco } from "@/lib/errors";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";
import {
  novoUsuarioSchema,
  usuarioEdicaoSchema,
  type NovoUsuarioInput,
  type UsuarioEdicaoInput,
} from "@/lib/validation/usuario";

/**
 * Cria o acesso de uma pessoa. Não há cadastro público: só ADMIN/PASTOR criam
 * usuários, e só ADMIN escolhe um papel diferente de MEMBRO.
 *
 * O auth.users é compartilhado com outros apps: se o e-mail já tiver login,
 * apenas vinculamos o perfil Koinonia à conta existente (a senha dela não muda).
 */
export async function criarUsuario(input: NovoUsuarioInput): Promise<ActionResult> {
  const editor = await autorizar("ADMIN", "PASTOR");
  if (!editor) return { ok: false, error: SEM_PERMISSAO };

  const parsed = novoUsuarioSchema.safeParse(input);
  if (!parsed.success) return erroValidacao(parsed.error);
  const { email, senha, role, ...perfil } = parsed.data;

  if (role !== "MEMBRO" && editor.role !== "ADMIN") {
    return { ok: false, error: "Apenas administradores podem definir o papel de pastor ou administrador." };
  }

  // Chave secreta: liberada só depois da checagem de permissão acima
  const admin = createAdminClient();

  const { data: idExistente, error: erroBusca } = await admin.rpc("koinonia_auth_user_id_por_email", {
    p_email: email,
  });
  if (erroBusca) return { ok: false, error: mensagemErroBanco(erroBusca) };

  let userId = idExistente;
  let contaCriada = false;

  if (userId) {
    const { data: jaTemPerfil } = await admin.from("koinonia_profiles").select("id").eq("id", userId).maybeSingle();
    if (jaTemPerfil) return { ok: false, error: "Este e-mail já tem acesso ao Koinonia." };
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
      user_metadata: { nome: perfil.nome_completo },
    });
    if (error || !data.user) {
      return { ok: false, error: error ? mensagemErroAuth(error) : "Não foi possível criar o login." };
    }
    userId = data.user.id;
    contaCriada = true;
  }

  const { error: erroPerfil } = await admin
    .from("koinonia_profiles")
    .insert({ id: userId, email, role, ...perfil });

  if (erroPerfil) {
    // Não deixar login órfão criado por nós
    if (contaCriada) await admin.auth.admin.deleteUser(userId);
    return { ok: false, error: mensagemErroBanco(erroPerfil) };
  }

  revalidatePath("/app/usuarios");
  return {
    ok: true,
    message: contaCriada
      ? "Usuário criado. Passe o e-mail e a senha inicial para a pessoa."
      : "Este e-mail já tinha login em outro sistema: o acesso foi liberado e a senha atual dele foi mantida.",
  };
}

export async function atualizarUsuario(id: string, input: UsuarioEdicaoInput): Promise<ActionResult> {
  const editor = await autorizar("ADMIN", "PASTOR");
  if (!editor) return { ok: false, error: SEM_PERMISSAO };

  const parsed = usuarioEdicaoSchema.safeParse(input);
  if (!parsed.success) return erroValidacao(parsed.error);
  const { role, ...dados } = parsed.data;

  const supabase = await createClient();
  const { data: atual } = await supabase.from("koinonia_profiles").select("role").eq("id", id).maybeSingle();
  if (!atual) return { ok: false, error: "Usuário não encontrado." };

  // MEMBRO e LIDER_MINISTERIO aparecem como "Membro" no formulário; o banco
  // decide entre os dois pela liderança. Só enviamos role se mudou de fato.
  const papelAtualNoForm = atual.role === "LIDER_MINISTERIO" ? "MEMBRO" : atual.role;
  const mudouPapel = role !== papelAtualNoForm;
  if (mudouPapel && editor.role !== "ADMIN") {
    return { ok: false, error: "Apenas administradores podem alterar papéis." };
  }

  // Os triggers do banco ainda barram: alterar o próprio papel, desativar a si
  // mesmo e pastor desativando administrador
  const { error } = await supabase
    .from("koinonia_profiles")
    .update(mudouPapel ? { ...dados, role } : dados)
    .eq("id", id);
  if (error) return { ok: false, error: mensagemErroBanco(error) };

  revalidatePath("/app/usuarios");
  revalidatePath("/app", "layout");
  redirect("/app/usuarios");
}
