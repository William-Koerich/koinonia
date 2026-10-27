"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { autorizar, SEM_PERMISSAO } from "@/lib/actions";
import { getProfile } from "@/lib/auth";
import { erroValidacao, mensagemErroBanco } from "@/lib/errors";
import { flash } from "@/lib/flash";
import { hojeISO } from "@/lib/format";
import { dispararPendentes } from "@/lib/notificacoes";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";
import { escalaSchema, motivoEscalaSchema, type EscalaInput } from "@/lib/validation/escala";

export async function salvarEscala(id: string | null, input: EscalaInput): Promise<ActionResult> {
  if (!(await autorizar("ADMIN", "PASTOR"))) return { ok: false, error: SEM_PERMISSAO };

  const parsed = escalaSchema.safeParse(input);
  if (!parsed.success) return erroValidacao(parsed.error);

  const supabase = await createClient();
  if (id) {
    const { error } = await supabase.from("koinonia_escalas").update(parsed.data).eq("id", id);
    if (error) return { ok: false, error: mensagemErroBanco(error) };
    revalidatePath("/app/escala", "layout");
    return { ok: true, message: "Escala atualizada." };
  }

  const { data, error } = await supabase.from("koinonia_escalas").insert(parsed.data).select("id").single();
  if (error) return { ok: false, error: mensagemErroBanco(error) };

  revalidatePath("/app/escala");
  redirect(`/app/escala/${data.id}`);
}

export async function excluirEscala(id: string): Promise<ActionResult> {
  if (!(await autorizar("ADMIN", "PASTOR"))) return { ok: false, error: SEM_PERMISSAO };

  const supabase = await createClient();
  const { error } = await supabase.from("koinonia_escalas").delete().eq("id", id);
  if (error) return { ok: false, error: mensagemErroBanco(error) };

  revalidatePath("/app/escala");
  await flash("Escala excluída.");
  redirect("/app/escala");
}

/**
 * Escala uma pessoa numa função. O banco garante as vagas e que a pessoa não
 * tenha duas funções na mesma escala; aqui só avisamos se ela já está em
 * outra escala no mesmo dia (permitido, ex.: culto da manhã e da noite).
 */
export async function atribuir(escalaId: string, funcaoId: string, profileId: string): Promise<ActionResult> {
  if (!(await autorizar("ADMIN", "PASTOR"))) return { ok: false, error: SEM_PERMISSAO };

  const supabase = await createClient();
  const { error } = await supabase
    .from("koinonia_escala_atribuicoes")
    .insert({ escala_id: escalaId, funcao_id: funcaoId, profile_id: profileId });
  if (error) {
    return {
      ok: false,
      error:
        error.code === "23505" && error.message.includes("pessoa_unica")
          ? "Esta pessoa já tem uma função nesta escala."
          : mensagemErroBanco(error),
    };
  }

  const { data: escala } = await supabase.from("koinonia_escalas").select("data").eq("id", escalaId).single();
  const { data: outras } = escala
    ? await supabase
        .from("koinonia_escala_atribuicoes")
        .select("escala:koinonia_escalas!inner(descricao, data)")
        .eq("profile_id", profileId)
        .eq("escala.data", escala.data)
        .neq("escala_id", escalaId)
    : { data: null };

  // a liderança vê todas as indisponibilidades (RLS)
  const { count: indisponivel } = escala
    ? await supabase
        .from("koinonia_escala_indisponibilidades")
        .select("id", { count: "exact", head: true })
        .eq("profile_id", profileId)
        .lte("data_inicio", escala.data)
        .gte("data_fim", escala.data)
    : { count: 0 };

  revalidatePath(`/app/escala/${escalaId}`);
  revalidatePath("/app/escala");

  const alertas = [
    indisponivel ? "marcou que não pode servir neste dia" : null,
    outras?.length ? `também está em “${outras.map((o) => o.escala.descricao).join("”, “")}” neste dia` : null,
  ].filter(Boolean);
  return { ok: true, message: alertas.length ? `Escalado. Atenção: ${alertas.join(" e ")}.` : "Escalado." };
}

export async function removerAtribuicao(escalaId: string, atribuicaoId: string): Promise<ActionResult> {
  if (!(await autorizar("ADMIN", "PASTOR"))) return { ok: false, error: SEM_PERMISSAO };

  const supabase = await createClient();
  const { error } = await supabase.from("koinonia_escala_atribuicoes").delete().eq("id", atribuicaoId);
  if (error) return { ok: false, error: mensagemErroBanco(error) };

  revalidatePath(`/app/escala/${escalaId}`);
  revalidatePath("/app/escala");
  return { ok: true, message: "Removido da escala." };
}

/** Notificações que as funções de resposta/troca puseram na fila saem logo após a resposta */
function concluir(message: string): ActionResult {
  after(dispararPendentes);
  revalidatePath("/app", "layout");
  return { ok: true, message };
}

/** O voluntário confirma ou recusa a própria escala */
export async function responderEscala(atribuicaoId: string, confirmar: boolean, motivo = ""): Promise<ActionResult> {
  if (!(await getProfile())?.ativo) return { ok: false, error: SEM_PERMISSAO };
  const motivoLimpo = motivoEscalaSchema.safeParse(motivo);
  if (!motivoLimpo.success) return { ok: false, error: "Use no máximo 300 caracteres no motivo." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("koinonia_escala_responder", {
    p_atribuicao_id: atribuicaoId,
    p_confirmar: confirmar,
    p_motivo: motivoLimpo.data ?? undefined,
  });
  if (error) return { ok: false, error: mensagemErroBanco(error) };
  return concluir(confirmar ? "Presença confirmada. Obrigado por servir!" : "Recusa registrada. A liderança foi avisada.");
}

/** Quem pode assumir a vaga numa troca (já serviu na função e não está nesta escala) */
export async function candidatosTroca(
  atribuicaoId: string,
): Promise<ActionResult<{ id: string; nome_completo: string; indisponivel: boolean }[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("koinonia_escala_troca_candidatos", { p_atribuicao_id: atribuicaoId });
  if (error) return { ok: false, error: mensagemErroBanco(error) };
  return { ok: true, data };
}

export async function solicitarTroca(atribuicaoId: string, substitutoId: string, motivo = ""): Promise<ActionResult> {
  if (!(await getProfile())?.ativo) return { ok: false, error: SEM_PERMISSAO };
  const motivoLimpo = motivoEscalaSchema.safeParse(motivo);
  if (!motivoLimpo.success) return { ok: false, error: "Use no máximo 300 caracteres no motivo." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("koinonia_escala_troca_solicitar", {
    p_atribuicao_id: atribuicaoId,
    p_substituto_id: substitutoId,
    p_motivo: motivoLimpo.data ?? undefined,
  });
  if (error) return { ok: false, error: mensagemErroBanco(error) };
  return concluir("Pedido enviado. Depois que a pessoa aceitar, a liderança aprova a troca.");
}

/** O substituto aceita ou recusa assumir a vaga */
export async function responderTroca(trocaId: string, aceitar: boolean): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("koinonia_escala_troca_responder", { p_troca_id: trocaId, p_aceitar: aceitar });
  if (error) return { ok: false, error: mensagemErroBanco(error) };
  return concluir(aceitar ? "Você aceitou. Falta a liderança aprovar." : "Pedido recusado.");
}

/** ADMIN/PASTOR aprovam ou recusam a troca */
export async function decidirTroca(trocaId: string, aprovar: boolean): Promise<ActionResult> {
  if (!(await autorizar("ADMIN", "PASTOR"))) return { ok: false, error: SEM_PERMISSAO };
  const supabase = await createClient();
  const { error } = await supabase.rpc("koinonia_escala_troca_decidir", { p_troca_id: trocaId, p_aprovar: aprovar });
  if (error) {
    return {
      ok: false,
      error:
        error.code === "23505" ? "O substituto já está nesta escala em outra função." : mensagemErroBanco(error),
    };
  }
  return concluir(aprovar ? "Troca aprovada. A escala foi atualizada." : "Troca recusada.");
}

export async function cancelarTroca(trocaId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("koinonia_escala_troca_cancelar", { p_troca_id: trocaId });
  if (error) return { ok: false, error: mensagemErroBanco(error) };
  revalidatePath("/app", "layout");
  return { ok: true, message: "Pedido de troca cancelado." };
}

/** Lembrete (push) para quem ainda não confirmou; no máximo um por pessoa por dia */
export async function lembrarPendentes(escalaId: string): Promise<ActionResult> {
  if (!(await autorizar("ADMIN", "PASTOR"))) return { ok: false, error: SEM_PERMISSAO };

  const supabase = await createClient();
  const { data: escala } = await supabase.from("koinonia_escalas").select("data, descricao").eq("id", escalaId).single();
  if (!escala) return { ok: false, error: "Escala não encontrada." };
  const hoje = hojeISO();
  if (escala.data < hoje) return { ok: false, error: "Esta escala já passou." };

  const { data: pendentes, error } = await supabase
    .from("koinonia_escala_atribuicoes")
    .select("id, profile_id, funcao:koinonia_escala_funcoes(funcao)")
    .eq("escala_id", escalaId)
    .eq("resposta", "pendente");
  if (error) return { ok: false, error: mensagemErroBanco(error) };
  if (!pendentes.length) return { ok: true, message: "Todos já responderam." };

  const [, mes, dia] = escala.data.split("-");
  const { data: inseridas, error: erroFila } = await supabase
    .from("koinonia_notificacoes")
    .upsert(
      pendentes.map((p) => ({
        titulo: "Confirme sua escala",
        mensagem: `${escala.descricao} (${dia}/${mes}) · ${p.funcao?.funcao ?? ""}`.slice(0, 300),
        url: `/app/escala/${escalaId}`,
        origem: "escala" as const,
        publico: "perfil" as const,
        publico_id: p.profile_id,
        chave: `escala-confirmar:${p.id}:${hoje}`,
      })),
      { onConflict: "chave", ignoreDuplicates: true },
    )
    .select("id");
  if (erroFila) return { ok: false, error: mensagemErroBanco(erroFila) };

  after(dispararPendentes);
  const n = inseridas?.length ?? 0;
  return {
    ok: true,
    message: n
      ? `Lembrete enviado para ${n} ${n === 1 ? "pessoa" : "pessoas"}.`
      : "Quem está pendente já foi lembrado hoje.",
  };
}
