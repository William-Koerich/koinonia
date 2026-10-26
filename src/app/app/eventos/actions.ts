"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { autorizar, SEM_PERMISSAO } from "@/lib/actions";
import { TAGS } from "@/lib/cache-tags";
import { erroValidacao, mensagemErroBanco } from "@/lib/errors";
import { flash } from "@/lib/flash";
import { formatarDataHora } from "@/lib/format";
import { notificarCriacao } from "@/lib/notificacoes";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";
import { eventoSchema, type EventoInput } from "@/lib/validation/evento";

export async function salvarEvento(id: string | null, input: EventoInput): Promise<ActionResult> {
  if (!(await autorizar("ADMIN", "PASTOR"))) return { ok: false, error: SEM_PERMISSAO };

  const parsed = eventoSchema.safeParse(input);
  if (!parsed.success) return erroValidacao(parsed.error);

  const supabase = await createClient();
  const { data: salvo, error } = id
    ? await supabase.from("koinonia_eventos").update(parsed.data).eq("id", id).select("id").single()
    : await supabase.from("koinonia_eventos").insert(parsed.data).select("id").single();
  if (error) return { ok: false, error: mensagemErroBanco(error) };

  if (!id) {
    const e = parsed.data;
    await notificarCriacao(supabase, "evento_ao_cadastrar", {
      titulo: `Novo evento: ${e.titulo}`,
      mensagem: `${formatarDataHora(e.inicio)} · ${e.logradouro}, ${e.bairro}`,
      url: `/app/eventos/${salvo.id}`,
      origem: "evento",
      publico: e.publico,
      chave: `evento:${salvo.id}:novo`,
    });
  }

  updateTag(TAGS.eventos); // site público
  revalidatePath("/app/eventos");
  await flash(id ? "Evento atualizado." : "Evento criado.");
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
