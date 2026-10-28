"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { getProfile } from "@/lib/auth";
import { SEM_PERMISSAO } from "@/lib/actions";
import { erroValidacao, mensagemErroBanco } from "@/lib/errors";
import { formatarHora } from "@/lib/format";
import { dispararPendentes } from "@/lib/notificacoes";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult, Enums } from "@/lib/types";
import { FORMAS_PAGAMENTO } from "@/lib/validation/financeiro";
import { novoInscritoSchema, type NovoInscritoInput } from "@/lib/validation/inscricao";

const observacaoSchema = z
  .string()
  .trim()
  .max(500, "Use no máximo 500 caracteres.")
  .transform((v) => v || null);

function revalidar(eventoId: string) {
  revalidatePath(`/app/eventos/${eventoId}`, "layout");
  revalidatePath("/app/eventos");
  revalidatePath("/app/financeiro", "layout");
  revalidatePath("/app");
}

/**
 * Os triggers do banco põem na fila os avisos de vaga liberada, pagamento
 * confirmado e "já paguei"; o envio sai logo depois da resposta.
 */
function enviarAvisos() {
  after(dispararPendentes);
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
    message: {
      confirmada: "Inscrição confirmada! Te esperamos lá.",
      pendente: "Inscrição feita! Faça o pagamento e avise pelo botão “Já paguei”.",
      espera: "O evento está lotado. Você entrou na fila de espera e será avisado se abrir uma vaga.",
      recusada: "Inscrição registrada.",
    }[data.status],
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
  enviarAvisos();
  return { ok: true, message: "Inscrição cancelada." };
}

export async function informarPagamento(eventoId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("koinonia_informar_pagamento", { p_evento_id: eventoId });
  if (error) return { ok: false, error: mensagemErroBanco(error) };

  revalidar(eventoId);
  enviarAvisos();
  return { ok: true, message: "Pronto! A tesouraria vai conferir o pagamento e confirmar sua inscrição." };
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
  enviarAvisos();
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
  enviarAvisos();
  return { ok: true, message: "Inscrição removida." };
}

const formaSchema = z.enum(FORMAS_PAGAMENTO.map((f) => f.value) as [Enums<"koinonia_forma_pagamento">]);

/** Tesouraria confirma o pagamento; o banco lança a entrada no financeiro */
export async function confirmarPagamento(
  eventoId: string,
  inscricaoId: string,
  forma: Enums<"koinonia_forma_pagamento">,
): Promise<ActionResult> {
  const formaValida = formaSchema.safeParse(forma);
  if (!formaValida.success) return { ok: false, error: "Escolha como o pagamento foi recebido." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("koinonia_evento_confirmar_pagamento", {
    p_inscricao_id: inscricaoId,
    p_forma: formaValida.data,
  });
  if (error) return { ok: false, error: mensagemErroBanco(error) };

  revalidar(eventoId);
  enviarAvisos();
  return { ok: true, message: "Pagamento confirmado e lançado nas entradas do financeiro." };
}

/** Tira alguém da fila de espera mesmo sem vaga (passa do limite do evento) */
export async function liberarDaFila(eventoId: string, inscricaoId: string, pago: boolean): Promise<ActionResult> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("koinonia_evento_inscricoes")
    .update({ status: pago ? "pendente" : "confirmada" })
    .eq("id", inscricaoId)
    .eq("status", "espera")
    .select("id");
  if (error) return { ok: false, error: mensagemErroBanco(error) };
  if (!data.length) return { ok: false, error: SEM_PERMISSAO };

  revalidar(eventoId);
  return { ok: true, message: pago ? "Vaga liberada. Falta o pagamento." : "Vaga liberada e inscrição confirmada." };
}

export type ResultadoCheckin = {
  nome: string;
  situacao: "ok" | "repetido" | "nao_confirmada";
  status: Enums<"koinonia_inscricao_status">;
  checkinEm: string | null;
};

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

/** Check-in pelo QR Code: aceita a URL do QR (…?codigo=<uuid>) ou o código puro */
export async function checkinPorCodigo(eventoId: string, lido: string): Promise<ActionResult<ResultadoCheckin>> {
  let codigo: string | null = null;
  try {
    codigo = new URL(lido).searchParams.get("codigo");
  } catch {
    // não é URL: pode ser o código direto
  }
  codigo = (codigo ?? lido).match(UUID)?.[0] ?? null;
  if (!codigo) return { ok: false, error: "Este QR Code não é de inscrição." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("koinonia_evento_checkin", { p_evento_id: eventoId, p_codigo: codigo })
    .single();
  if (error) return { ok: false, error: mensagemErroBanco(error) };

  revalidatePath(`/app/eventos/${eventoId}`, "layout");
  const situacao = data.status !== "confirmada" ? "nao_confirmada" : data.ja_registrado ? "repetido" : "ok";
  return {
    ok: true,
    message:
      situacao === "ok"
        ? `${data.nome}: presença registrada.`
        : situacao === "repetido"
          ? `${data.nome} já tinha feito check-in às ${formatarHora(data.checkin_em!)}.`
          : `${data.nome}: inscrição ainda não confirmada.`,
    data: { nome: data.nome, situacao, status: data.status, checkinEm: data.checkin_em },
  };
}

/** Marcar/desmarcar presença pela lista (sem QR Code, ex.: convidado) */
export async function marcarPresenca(eventoId: string, inscricaoId: string, presente: boolean): Promise<ActionResult> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("koinonia_evento_inscricoes")
    .update({ checkin_em: presente ? new Date().toISOString() : null })
    .eq("id", inscricaoId)
    .select("id");
  if (error) return { ok: false, error: mensagemErroBanco(error) };
  if (!data.length) return { ok: false, error: SEM_PERMISSAO };

  revalidatePath(`/app/eventos/${eventoId}`, "layout");
  return { ok: true, message: presente ? "Presença registrada." : "Presença desmarcada." };
}
