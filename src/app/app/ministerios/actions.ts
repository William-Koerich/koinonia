"use server";

import { revalidatePath } from "next/cache";
import { autorizar, SEM_PERMISSAO } from "@/lib/actions";
import { erroValidacao, mensagemErroBanco } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";
import { ministerioSchema, type MinisterioInput } from "@/lib/validation/ministerio";

function mensagemErro(error: Parameters<typeof mensagemErroBanco>[0]) {
  return error.code === "23505" ? "Já existe um ministério com esse nome." : mensagemErroBanco(error);
}

export async function salvarMinisterio(id: string | null, input: MinisterioInput): Promise<ActionResult> {
  if (!(await autorizar("ADMIN", "PASTOR"))) return { ok: false, error: SEM_PERMISSAO };

  const parsed = ministerioSchema.safeParse(input);
  if (!parsed.success) return erroValidacao(parsed.error);

  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("koinonia_ministerios").update(parsed.data).eq("id", id)
    : await supabase.from("koinonia_ministerios").insert(parsed.data);
  if (error) return { ok: false, error: mensagemErro(error) };

  revalidatePath("/app/ministerios");
  return { ok: true, message: id ? "Ministério atualizado." : "Ministério criado." };
}

export async function excluirMinisterio(id: string): Promise<ActionResult> {
  if (!(await autorizar("ADMIN", "PASTOR"))) return { ok: false, error: SEM_PERMISSAO };

  const supabase = await createClient();
  const { error } = await supabase.from("koinonia_ministerios").delete().eq("id", id);
  if (error) {
    return {
      ok: false,
      error:
        error.code === "23503"
          ? "Este ministério está em escalas de cantina. Remova-o dessas escalas antes de excluir."
          : mensagemErroBanco(error),
    };
  }

  revalidatePath("/app/ministerios");
  return { ok: true, message: "Ministério excluído." };
}
