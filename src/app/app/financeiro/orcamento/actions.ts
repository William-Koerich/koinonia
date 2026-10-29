"use server";

import { revalidatePath } from "next/cache";
import { autorizar, SEM_PERMISSAO } from "@/lib/actions";
import { erroValidacao, mensagemErroBanco } from "@/lib/errors";
import { ROLES_FINANCEIRO } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";
import { orcamentoSchema, type OrcamentoInput } from "@/lib/validation/financeiro";

/** Cria ou atualiza o previsto do ano para um ministério (ou para as despesas gerais) */
export async function salvarOrcamento(input: OrcamentoInput): Promise<ActionResult> {
  if (!(await autorizar(...ROLES_FINANCEIRO))) return { ok: false, error: SEM_PERMISSAO };
  const parsed = orcamentoSchema.safeParse(input);
  if (!parsed.success) return erroValidacao(parsed.error);
  const { ano, ministerio_id, valor, observacao } = parsed.data;

  const supabase = await createClient();
  let busca = supabase.from("koinonia_financeiro_orcamentos").select("id").eq("ano", ano);
  busca = ministerio_id ? busca.eq("ministerio_id", ministerio_id) : busca.is("ministerio_id", null);
  const { data: existente } = await busca.maybeSingle();

  const { error } = existente
    ? await supabase.from("koinonia_financeiro_orcamentos").update({ valor, observacao }).eq("id", existente.id)
    : await supabase.from("koinonia_financeiro_orcamentos").insert({ ano, ministerio_id, valor, observacao });
  if (error) return { ok: false, error: mensagemErroBanco(error) };
  revalidatePath("/app/financeiro", "layout");
  return { ok: true, message: "Orçamento salvo." };
}

export async function excluirOrcamento(id: string): Promise<ActionResult> {
  if (!(await autorizar(...ROLES_FINANCEIRO))) return { ok: false, error: SEM_PERMISSAO };
  const supabase = await createClient();
  const { error } = await supabase.from("koinonia_financeiro_orcamentos").delete().eq("id", id);
  if (error) return { ok: false, error: mensagemErroBanco(error) };
  revalidatePath("/app/financeiro", "layout");
  return { ok: true, message: "Orçamento removido." };
}

/** Repete os valores previstos de um ano no seguinte (só onde ainda não há valor) */
export async function copiarOrcamento(deAno: number, paraAno: number): Promise<ActionResult> {
  if (!(await autorizar(...ROLES_FINANCEIRO))) return { ok: false, error: SEM_PERMISSAO };
  const supabase = await createClient();
  const [{ data: origem }, { data: destino }] = await Promise.all([
    supabase.from("koinonia_financeiro_orcamentos").select("ministerio_id, valor, observacao").eq("ano", deAno),
    supabase.from("koinonia_financeiro_orcamentos").select("ministerio_id").eq("ano", paraAno),
  ]);
  const ocupados = new Set((destino ?? []).map((o) => o.ministerio_id ?? "geral"));
  const novos = (origem ?? []).filter((o) => !ocupados.has(o.ministerio_id ?? "geral")).map((o) => ({ ...o, ano: paraAno }));
  if (!novos.length) return { ok: true, message: `Nada para copiar de ${deAno}.` };
  const { error } = await supabase.from("koinonia_financeiro_orcamentos").insert(novos);
  if (error) return { ok: false, error: mensagemErroBanco(error) };
  revalidatePath("/app/financeiro", "layout");
  return { ok: true, message: `${novos.length} ${novos.length === 1 ? "valor copiado" : "valores copiados"} de ${deAno}.` };
}
