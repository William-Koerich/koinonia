"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getProfile } from "@/lib/auth";
import { SEM_PERMISSAO } from "@/lib/actions";
import { erroValidacao, mensagemErroBanco } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";
import { novoInscritoSchema, type NovoInscritoInput } from "@/lib/validation/inscricao";

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

/**
 * Responsável pelo evento / PASTOR / ADMIN inscreve outra pessoa: membro com
 * conta ou convidado sem conta. A RLS garante quem pode; o trigger valida
 * público do evento e encerramento.
 */
export async function adicionarInscrito(eventoId: string, input: NovoInscritoInput): Promise<ActionResult> {
  const profile = await getProfile();
  if (!profile?.ativo) return { ok: false, error: SEM_PERMISSAO };

  const parsed = novoInscritoSchema.safeParse(input);
  if (!parsed.success) return erroValidacao(parsed.error);
  const d = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.from("koinonia_evento_inscricoes").insert({
    evento_id: eventoId,
    status: d.pago ? "confirmada" : "pendente",
    observacao: d.observacao,
    ...(d.tipo === "membro"
      ? { profile_id: d.profile_id }
      : { profile_id: null, convidado_nome: d.convidado_nome, convidado_celular: d.convidado_celular || null }),
  });
  if (error) {
    if (error.code === "23505") return { ok: false, error: "Esta pessoa já está inscrita no evento." };
    if (error.code === "42501") return { ok: false, error: "Só o responsável pelo evento, pastores e administradores adicionam pessoas." };
    return { ok: false, error: mensagemErroBanco(error) };
  }

  revalidar(eventoId);
  const nome = d.tipo === "convidado" ? d.convidado_nome : "Pessoa";
  return { ok: true, message: `${nome} adicionado(a) à lista de inscritos.` };
}

export async function removerInscricao(eventoId: string, inscricaoId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("koinonia_evento_inscricoes").delete().eq("id", inscricaoId).select("id");
  if (error) return { ok: false, error: mensagemErroBanco(error) };
  if (!data.length) return { ok: false, error: SEM_PERMISSAO };

  revalidar(eventoId);
  return { ok: true, message: "Inscrição removida." };
}
