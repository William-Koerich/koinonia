"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { autorizar, SEM_PERMISSAO } from "@/lib/actions";
import { TAGS } from "@/lib/cache-tags";
import { erroValidacao, mensagemErroBanco } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";
import { eventoSchema, type EventoInput } from "@/lib/validation/evento";

export async function salvarEvento(id: string | null, input: EventoInput): Promise<ActionResult> {
  if (!(await autorizar("ADMIN", "PASTOR"))) return { ok: false, error: SEM_PERMISSAO };

  const parsed = eventoSchema.safeParse(input);
  if (!parsed.success) return erroValidacao(parsed.error);

  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("koinonia_eventos").update(parsed.data).eq("id", id)
    : await supabase.from("koinonia_eventos").insert(parsed.data);
  if (error) return { ok: false, error: mensagemErroBanco(error) };

  updateTag(TAGS.eventos); // site público
  revalidatePath("/app/eventos");
  redirect("/app/eventos");
}

export async function excluirEvento(id: string): Promise<ActionResult> {
  if (!(await autorizar("ADMIN", "PASTOR"))) return { ok: false, error: SEM_PERMISSAO };

  const supabase = await createClient();
  const { error } = await supabase.from("koinonia_eventos").delete().eq("id", id);
  if (error) return { ok: false, error: mensagemErroBanco(error) };

  updateTag(TAGS.eventos);
  revalidatePath("/app/eventos");
  return { ok: true, message: "Evento excluído." };
}
