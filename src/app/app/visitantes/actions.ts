"use server";

import { revalidatePath } from "next/cache";
import { autorizar, SEM_PERMISSAO } from "@/lib/actions";
import { erroValidacao, mensagemErroBanco } from "@/lib/errors";
import { ROLES_VISITANTES } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";
import { visitanteSchema, type VisitanteInput } from "@/lib/validation/visitante";

export async function salvarVisitante(id: string | null, input: VisitanteInput): Promise<ActionResult> {
  if (!(await autorizar(...ROLES_VISITANTES))) return { ok: false, error: SEM_PERMISSAO };

  const parsed = visitanteSchema.safeParse(input);
  if (!parsed.success) return erroValidacao(parsed.error);

  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("koinonia_visitantes").update(parsed.data).eq("id", id)
    : await supabase.from("koinonia_visitantes").insert(parsed.data);
  if (error) return { ok: false, error: mensagemErroBanco(error) };

  revalidatePath("/app/visitantes");
  return { ok: true, message: id ? "Visitante atualizado." : "Visitante cadastrado. Seja bem-vindo(a)!" };
}

export async function excluirVisitante(id: string): Promise<ActionResult> {
  if (!(await autorizar(...ROLES_VISITANTES))) return { ok: false, error: SEM_PERMISSAO };

  const supabase = await createClient();
  const { error } = await supabase.from("koinonia_visitantes").delete().eq("id", id);
  if (error) return { ok: false, error: mensagemErroBanco(error) };

  revalidatePath("/app/visitantes");
  return { ok: true, message: "Visitante excluído." };
}
