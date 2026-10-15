"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getUserId } from "@/lib/auth";
import { autorizar, SEM_PERMISSAO } from "@/lib/actions";
import { erroValidacao, mensagemErroBanco } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";
import { gcSchema, type GcInput } from "@/lib/validation/gc";

export async function salvarGc(id: string | null, input: GcInput): Promise<ActionResult> {
  if (!(await autorizar("ADMIN", "PASTOR"))) return { ok: false, error: SEM_PERMISSAO };

  const parsed = gcSchema.safeParse(input);
  if (!parsed.success) return erroValidacao(parsed.error);

  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("koinonia_gcs").update(parsed.data).eq("id", id)
    : await supabase.from("koinonia_gcs").insert(parsed.data);
  if (error) {
    return {
      ok: false,
      error: error.code === "23505" ? "Já existe um GC com esse nome." : mensagemErroBanco(error),
    };
  }

  revalidatePath("/app/gcs");
  redirect("/app/gcs");
}

export async function excluirGc(id: string): Promise<ActionResult> {
  if (!(await autorizar("ADMIN", "PASTOR"))) return { ok: false, error: SEM_PERMISSAO };

  const supabase = await createClient();
  const { error } = await supabase.from("koinonia_gcs").delete().eq("id", id);
  if (error) {
    return {
      ok: false,
      error:
        error.code === "23503"
          ? "Este GC está em escalas de cantina. Remova-o dessas escalas antes de excluir."
          : mensagemErroBanco(error),
    };
  }

  revalidatePath("/app/gcs");
  return { ok: true, message: "GC excluído. Os membros dele ficaram sem GC." };
}

/** ADMIN/PASTOR colocam uma pessoa no GC (se estava em outro, ela muda de GC) */
export async function adicionarAoGc(gcId: string, profileId: string): Promise<ActionResult> {
  if (!(await autorizar("ADMIN", "PASTOR"))) return { ok: false, error: SEM_PERMISSAO };

  const supabase = await createClient();
  const { error } = await supabase.from("koinonia_profiles").update({ gc_id: gcId }).eq("id", profileId);
  if (error) return { ok: false, error: mensagemErroBanco(error) };

  revalidatePath(`/app/gcs/${gcId}`);
  revalidatePath("/app/gcs");
  return { ok: true, message: "Pessoa adicionada ao GC." };
}

export async function removerDoGc(gcId: string, profileId: string): Promise<ActionResult> {
  if (!(await autorizar("ADMIN", "PASTOR"))) return { ok: false, error: SEM_PERMISSAO };

  const supabase = await createClient();
  const { error } = await supabase
    .from("koinonia_profiles")
    .update({ gc_id: null })
    .eq("id", profileId)
    .eq("gc_id", gcId);
  if (error) return { ok: false, error: mensagemErroBanco(error) };

  revalidatePath(`/app/gcs/${gcId}`);
  revalidatePath("/app/gcs");
  return { ok: true, message: "Pessoa removida do GC." };
}

/** O próprio membro entra (ou sai, com null) de um GC */
export async function escolherGc(gcId: string | null): Promise<ActionResult> {
  const userId = await getUserId();
  if (!userId) return { ok: false, error: "Sua sessão expirou. Entre novamente." };

  const supabase = await createClient();
  const { error } = await supabase.from("koinonia_profiles").update({ gc_id: gcId }).eq("id", userId);
  if (error) return { ok: false, error: mensagemErroBanco(error) };

  revalidatePath("/app", "layout");
  return { ok: true, message: gcId ? "Pronto! Agora você faz parte deste GC." : "Você saiu do GC." };
}
