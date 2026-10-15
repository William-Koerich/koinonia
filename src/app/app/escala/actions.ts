"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { autorizar, SEM_PERMISSAO } from "@/lib/actions";
import { erroValidacao, mensagemErroBanco } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";
import { escalaSchema, type EscalaInput } from "@/lib/validation/escala";

export async function salvarEscala(id: string | null, input: EscalaInput): Promise<ActionResult> {
  if (!(await autorizar("ADMIN", "PASTOR"))) return { ok: false, error: SEM_PERMISSAO };

  const parsed = escalaSchema.safeParse(input);
  if (!parsed.success) return erroValidacao(parsed.error);

  const supabase = await createClient();
  if (id) {
    const { error } = await supabase.from("koinonia_escalas").update(parsed.data).eq("id", id);
    if (error) return { ok: false, error: mensagemErroBanco(error) };
    revalidatePath("/app/escala", "layout");
    return { ok: true, message: "Escala atualizada." };
  }

  const { data, error } = await supabase.from("koinonia_escalas").insert(parsed.data).select("id").single();
  if (error) return { ok: false, error: mensagemErroBanco(error) };

  revalidatePath("/app/escala");
  redirect(`/app/escala/${data.id}`);
}

export async function excluirEscala(id: string): Promise<ActionResult> {
  if (!(await autorizar("ADMIN", "PASTOR"))) return { ok: false, error: SEM_PERMISSAO };

  const supabase = await createClient();
  const { error } = await supabase.from("koinonia_escalas").delete().eq("id", id);
  if (error) return { ok: false, error: mensagemErroBanco(error) };

  revalidatePath("/app/escala");
  redirect("/app/escala");
}

/**
 * Escala uma pessoa numa função. O banco garante as vagas e que a pessoa não
 * tenha duas funções na mesma escala; aqui só avisamos se ela já está em
 * outra escala no mesmo dia (permitido, ex.: culto da manhã e da noite).
 */
export async function atribuir(escalaId: string, funcaoId: string, profileId: string): Promise<ActionResult> {
  if (!(await autorizar("ADMIN", "PASTOR"))) return { ok: false, error: SEM_PERMISSAO };

  const supabase = await createClient();
  const { error } = await supabase
    .from("koinonia_escala_atribuicoes")
    .insert({ escala_id: escalaId, funcao_id: funcaoId, profile_id: profileId });
  if (error) {
    return {
      ok: false,
      error:
        error.code === "23505" && error.message.includes("pessoa_unica")
          ? "Esta pessoa já tem uma função nesta escala."
          : mensagemErroBanco(error),
    };
  }

  const { data: escala } = await supabase.from("koinonia_escalas").select("data").eq("id", escalaId).single();
  const { data: outras } = escala
    ? await supabase
        .from("koinonia_escala_atribuicoes")
        .select("escala:koinonia_escalas!inner(descricao, data)")
        .eq("profile_id", profileId)
        .eq("escala.data", escala.data)
        .neq("escala_id", escalaId)
    : { data: null };

  revalidatePath(`/app/escala/${escalaId}`);
  revalidatePath("/app/escala");

  const conflitos = outras?.map((o) => o.escala.descricao) ?? [];
  return {
    ok: true,
    message: conflitos.length
      ? `Escalado. Atenção: também está em “${conflitos.join("”, “")}” neste dia.`
      : "Escalado.",
  };
}

export async function removerAtribuicao(escalaId: string, atribuicaoId: string): Promise<ActionResult> {
  if (!(await autorizar("ADMIN", "PASTOR"))) return { ok: false, error: SEM_PERMISSAO };

  const supabase = await createClient();
  const { error } = await supabase.from("koinonia_escala_atribuicoes").delete().eq("id", atribuicaoId);
  if (error) return { ok: false, error: mensagemErroBanco(error) };

  revalidatePath(`/app/escala/${escalaId}`);
  revalidatePath("/app/escala");
  return { ok: true, message: "Removido da escala." };
}
