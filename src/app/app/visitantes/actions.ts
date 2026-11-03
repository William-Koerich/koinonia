"use server";

import { revalidatePath } from "next/cache";
import { SEM_PERMISSAO } from "@/lib/actions";
import { getProfile } from "@/lib/auth";
import { erroValidacao, mensagemErroBanco } from "@/lib/errors";
import { hojeISO } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";
import {
  contatoVisitanteSchema,
  visitanteSchema,
  type ContatoVisitanteInput,
  type SituacaoVisitante,
  type VisitanteInput,
} from "@/lib/validation/visitante";
import { acessoVisitantes } from "@/lib/visitantes";

export async function salvarVisitante(id: string | null, input: VisitanteInput): Promise<ActionResult> {
  const acesso = await acessoVisitantes(await getProfile());
  if (!acesso || acesso === "acompanha") return { ok: false, error: "O cadastro de visitantes só fica liberado no dia em que você está na Porta Principal." };

  const parsed = visitanteSchema.safeParse(input);
  if (!parsed.success) return erroValidacao(parsed.error);
  // a equipe da porta só cadastra visitas do dia
  const dados = acesso === "porta" ? { ...parsed.data, data_visita: hojeISO() } : parsed.data;

  const supabase = await createClient();
  const { data, error } = id
    ? await supabase.from("koinonia_visitantes").update(dados).eq("id", id).select("id")
    : await supabase.from("koinonia_visitantes").insert(dados).select("id");
  if (error) return { ok: false, error: mensagemErroBanco(error) };
  if (!data.length) return { ok: false, error: SEM_PERMISSAO };

  revalidatePath("/app/visitantes");
  return { ok: true, message: id ? "Visitante atualizado." : "Visitante cadastrado. Seja bem-vindo(a)!" };
}

export async function excluirVisitante(id: string): Promise<ActionResult> {
  const acesso = await acessoVisitantes(await getProfile());
  if (!acesso || acesso === "acompanha") return { ok: false, error: SEM_PERMISSAO };

  const supabase = await createClient();
  const { data, error } = await supabase.from("koinonia_visitantes").delete().eq("id", id).select("id");
  if (error) return { ok: false, error: mensagemErroBanco(error) };
  if (!data.length) return { ok: false, error: SEM_PERMISSAO };

  revalidatePath("/app/visitantes");
  return { ok: true, message: "Visitante excluído." };
}

function revalidarVisitante(id: string) {
  revalidatePath("/app/visitantes");
  revalidatePath(`/app/visitantes/${id}`);
}

// ------------------------------------------------------------ acompanhamento

/** ADMIN/PASTOR: quem acompanha e em que pé está (o banco avisa o responsável novo) */
export async function definirAcompanhamento(
  id: string,
  dados: { responsavel_id: string | null; situacao: SituacaoVisitante },
): Promise<ActionResult> {
  if ((await acessoVisitantes(await getProfile())) !== "total") return { ok: false, error: SEM_PERMISSAO };
  if (dados.situacao === "membro") return { ok: false, error: "Use “Tornar membro” para cadastrar o visitante como membro." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("koinonia_visitantes")
    .update({ responsavel_id: dados.responsavel_id, situacao: dados.situacao })
    .eq("id", id)
    .neq("situacao", "membro")
    .select("id");
  if (error) return { ok: false, error: mensagemErroBanco(error) };
  if (!data.length) return { ok: false, error: SEM_PERMISSAO };

  revalidarVisitante(id);
  return { ok: true, message: dados.responsavel_id ? "Acompanhamento salvo. O responsável foi avisado." : "Acompanhamento salvo." };
}

/** ADMIN/PASTOR ou o responsável registram o contato feito */
export async function registrarContato(id: string, input: ContatoVisitanteInput): Promise<ActionResult> {
  const parsed = contatoVisitanteSchema.safeParse(input);
  if (!parsed.success) return erroValidacao(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.rpc("koinonia_visitante_registrar_contato", {
    p_visitante_id: id,
    p_feito_em: parsed.data.feito_em,
    p_meio: parsed.data.meio,
    p_resultado: parsed.data.resultado,
    p_situacao: parsed.data.situacao,
  });
  if (error) return { ok: false, error: mensagemErroBanco(error) };

  revalidarVisitante(id);
  return { ok: true, message: "Contato registrado." };
}

export async function excluirContato(visitanteId: string, contatoId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("koinonia_visitante_contatos").delete().eq("id", contatoId).select("id");
  if (error) return { ok: false, error: mensagemErroBanco(error) };
  if (!data.length) return { ok: false, error: SEM_PERMISSAO };

  revalidarVisitante(visitanteId);
  return { ok: true, message: "Contato excluído." };
}
