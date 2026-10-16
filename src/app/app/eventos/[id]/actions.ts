"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getProfile } from "@/lib/auth";
import { SEM_PERMISSAO } from "@/lib/actions";
import { mensagemErroBanco } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";

const observacaoSchema = z
  .string()
  .trim()
  .max(500, "Use no máximo 500 caracteres.")
  .transform((v) => v || null);

function revalidar(eventoId: string) {
  revalidatePath(`/app/eventos/${eventoId}`);
  revalidatePath("/app/eventos");
  revalidatePath("/app");
}

/** O membro se inscreve. Status (pendente/confirmada) e regras ficam no banco. */
export async function inscrever(eventoId: string, observacao: string): Promise<ActionResult> {
  const profile = await getProfile();
  if (!profile?.ativo) return { ok: false, error: SEM_PERMISSAO };

  const obs = observacaoSchema.safeParse(observacao);
  if (!obs.success) return { ok: false, error: obs.error.issues[0].message };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("koinonia_evento_inscricoes")
    .insert({ evento_id: eventoId, profile_id: profile.id, observacao: obs.data })
    .select("status")
    .single();
  if (error) {
    return {
      ok: false,
      error: error.code === "23505" ? "Você já está inscrito neste evento." : mensagemErroBanco(error),
    };
  }

  revalidar(eventoId);
  return {
    ok: true,
    message:
      data.status === "confirmada"
        ? "Inscrição confirmada! Te esperamos lá."
        : "Inscrição feita! Faça o pagamento e avise pelo botão “Já paguei”.",
  };
}

/** O membro cancela a própria inscrição (pendente ou recusada) */
export async function cancelarInscricao(eventoId: string): Promise<ActionResult> {
  const profile = await getProfile();
  if (!profile?.ativo) return { ok: false, error: SEM_PERMISSAO };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("koinonia_evento_inscricoes")
    .delete()
    .eq("evento_id", eventoId)
    .eq("profile_id", profile.id)
    .select("id");
  if (error) return { ok: false, error: mensagemErroBanco(error) };
  // a RLS não deixa o membro apagar inscrição já confirmada
  if (!data.length) {
    return { ok: false, error: "Inscrição confirmada só pode ser cancelada pelo responsável do evento." };
  }

  revalidar(eventoId);
  return { ok: true, message: "Inscrição cancelada." };
}

export async function informarPagamento(eventoId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("koinonia_informar_pagamento", { p_evento_id: eventoId });
  if (error) return { ok: false, error: mensagemErroBanco(error) };

  revalidar(eventoId);
  return { ok: true, message: "Pronto! O responsável vai conferir o pagamento e confirmar sua inscrição." };
}

/** Responsável pelo evento / PASTOR / ADMIN confirma ou recusa (a RLS garante quem pode) */
export async function decidirInscricao(
  eventoId: string,
  inscricaoId: string,
  status: "confirmada" | "recusada" | "pendente",
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("koinonia_evento_inscricoes")
    .update({ status })
    .eq("id", inscricaoId)
    .select("id");
  if (error) return { ok: false, error: mensagemErroBanco(error) };
  if (!data.length) return { ok: false, error: SEM_PERMISSAO };

  revalidar(eventoId);
  return {
    ok: true,
    message: { confirmada: "Inscrição confirmada.", recusada: "Inscrição recusada.", pendente: "Inscrição voltou para pendente." }[status],
  };
}

export async function removerInscricao(eventoId: string, inscricaoId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("koinonia_evento_inscricoes").delete().eq("id", inscricaoId).select("id");
  if (error) return { ok: false, error: mensagemErroBanco(error) };
  if (!data.length) return { ok: false, error: SEM_PERMISSAO };

  revalidar(eventoId);
  return { ok: true, message: "Inscrição removida." };
}
