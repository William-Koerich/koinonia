"use server";

import { revalidatePath } from "next/cache";
import { autorizar, SEM_PERMISSAO } from "@/lib/actions";
import { erroValidacao, mensagemErroBanco } from "@/lib/errors";
import { ROLES_FINANCEIRO } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";
import { entradaSchema, type EntradaInput } from "@/lib/validation/financeiro";

export async function salvarEntrada(id: string | null, input: EntradaInput): Promise<ActionResult> {
  if (!(await autorizar(...ROLES_FINANCEIRO))) return { ok: false, error: SEM_PERMISSAO };

  const parsed = entradaSchema.safeParse(input);
  if (!parsed.success) return erroValidacao(parsed.error);

  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("koinonia_financeiro_entradas").update(parsed.data).eq("id", id)
    : await supabase.from("koinonia_financeiro_entradas").insert(parsed.data);
  if (error) return { ok: false, error: mensagemErroBanco(error) };

  revalidatePath("/app/financeiro");
  return { ok: true, message: id ? "Entrada atualizada." : "Entrada registrada." };
}

export async function excluirEntrada(id: string): Promise<ActionResult> {
  if (!(await autorizar(...ROLES_FINANCEIRO))) return { ok: false, error: SEM_PERMISSAO };

  const supabase = await createClient();
  const { error } = await supabase.from("koinonia_financeiro_entradas").delete().eq("id", id);
  if (error) return { ok: false, error: mensagemErroBanco(error) };

  revalidatePath("/app/financeiro");
  return { ok: true, message: "Entrada excluída." };
}
