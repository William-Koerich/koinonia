"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { autorizar, SEM_PERMISSAO } from "@/lib/actions";
import { TAGS } from "@/lib/cache-tags";
import { erroValidacao, mensagemErroBanco } from "@/lib/errors";
import { notificarCriacao } from "@/lib/notificacoes";
import { STORAGE_BUCKET } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";
import { avisoSchema, type AvisoInput } from "@/lib/validation/aviso";

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** Apaga do bucket a imagem que deixou de ser usada (falha aqui não impede o salvamento) */
async function removerImagem(supabase: Supabase, path: string | null | undefined) {
  if (path) await supabase.storage.from(STORAGE_BUCKET).remove([path]);
}

function revalidar() {
  updateTag(TAGS.avisos);
  revalidatePath("/app/avisos");
  revalidatePath("/app");
}

export async function salvarAviso(id: string | null, input: AvisoInput): Promise<ActionResult> {
  if (!(await autorizar("ADMIN", "PASTOR"))) return { ok: false, error: SEM_PERMISSAO };

  const parsed = avisoSchema.safeParse(input);
  if (!parsed.success) return erroValidacao(parsed.error);

  const supabase = await createClient();
  let imagemAntiga: string | null = null;
  if (id) {
    const { data } = await supabase.from("koinonia_avisos").select("imagem_path").eq("id", id).maybeSingle();
    imagemAntiga = data?.imagem_path ?? null;
  }

  const { data: salvo, error } = id
    ? await supabase.from("koinonia_avisos").update(parsed.data).eq("id", id).select("id").single()
    : await supabase.from("koinonia_avisos").insert(parsed.data).select("id").single();
  if (error) return { ok: false, error: mensagemErroBanco(error) };

  if (!id) {
    await notificarCriacao(supabase, "aviso_ativo", {
      titulo: parsed.data.titulo,
      mensagem: parsed.data.mensagem,
      url: "/app/avisos",
      origem: "aviso",
      publico: "todos",
      chave: `aviso:${salvo.id}`,
    });
  }

  if (imagemAntiga !== parsed.data.imagem_path) await removerImagem(supabase, imagemAntiga);

  revalidar();
  redirect("/app/avisos");
}

export async function excluirAviso(id: string): Promise<ActionResult> {
  if (!(await autorizar("ADMIN", "PASTOR"))) return { ok: false, error: SEM_PERMISSAO };

  const supabase = await createClient();
  const { data, error } = await supabase.from("koinonia_avisos").delete().eq("id", id).select("imagem_path").maybeSingle();
  if (error) return { ok: false, error: mensagemErroBanco(error) };
  await removerImagem(supabase, data?.imagem_path);

  revalidar();
  return { ok: true, message: "Aviso removido." };
}
