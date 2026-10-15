"use server";

import { revalidatePath } from "next/cache";
import { autorizar, SEM_PERMISSAO } from "@/lib/actions";
import { erroValidacao, mensagemErroBanco } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";
import { cantinaSchema, type CantinaInput } from "@/lib/validation/escala";

export async function salvarCantina(id: string | null, input: CantinaInput): Promise<ActionResult> {
  if (!(await autorizar("ADMIN", "PASTOR"))) return { ok: false, error: SEM_PERMISSAO };

  const parsed = cantinaSchema.safeParse(input);
  if (!parsed.success) return erroValidacao(parsed.error);

  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("koinonia_cantina_escalas").update(parsed.data).eq("id", id)
    : await supabase.from("koinonia_cantina_escalas").insert(parsed.data);
  if (error) {
    if (error.code === "23505") {
      return {
        ok: false,
        error: "Já existe uma escala de cantina nesta data.",
        fieldErrors: { data: ["Já existe uma escala de cantina nesta data."] },
      };
    }
    return { ok: false, error: mensagemErroBanco(error) };
  }

  revalidatePath("/app/cantina");
  return { ok: true, message: id ? "Escala da cantina atualizada." : "Escala da cantina criada." };
}

export async function excluirCantina(id: string): Promise<ActionResult> {
  if (!(await autorizar("ADMIN", "PASTOR"))) return { ok: false, error: SEM_PERMISSAO };

  const supabase = await createClient();
  const { error } = await supabase.from("koinonia_cantina_escalas").delete().eq("id", id);
  if (error) return { ok: false, error: mensagemErroBanco(error) };

  revalidatePath("/app/cantina");
  return { ok: true, message: "Escala da cantina excluída." };
}
