"use server";

import { revalidatePath } from "next/cache";
import { autorizar, SEM_PERMISSAO } from "@/lib/actions";
import { removerArquivosDe } from "@/lib/data/financeiro";
import { erroValidacao, mensagemErroBanco } from "@/lib/errors";
import { hojeISO } from "@/lib/format";
import { ROLES_FINANCEIRO } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";
import {
  contaSchema,
  fimDoMes,
  pagamentoSchema,
  recorrenciaSchema,
  somarMes,
  type ContaInput,
  type PagamentoInput,
  type RecorrenciaInput,
} from "@/lib/validation/financeiro";

type Supabase = Awaited<ReturnType<typeof createClient>>;

function revalidar() {
  revalidatePath("/app/financeiro", "layout");
}

/** Gera as contas recorrentes até o fim do mês seguinte (ou do mês informado, se for depois) */
async function gerarContas(supabase: Supabase, ateData?: string) {
  const padrao = fimDoMes(somarMes(hojeISO().slice(0, 7), 1));
  const ate = ateData && ateData > padrao ? fimDoMes(ateData.slice(0, 7)) : padrao;
  return supabase.rpc("koinonia_financeiro_gerar_contas", { p_ate: ate });
}

// ---------------------------------------------------------------- contas

export async function salvarConta(id: string | null, input: ContaInput): Promise<ActionResult> {
  if (!(await autorizar(...ROLES_FINANCEIRO))) return { ok: false, error: SEM_PERMISSAO };

  const parsed = contaSchema.safeParse(input);
  if (!parsed.success) return erroValidacao(parsed.error);
  const { conta, recorrencia } = parsed.data;

  const supabase = await createClient();

  // edição: só esta conta (mesmo que ela venha de uma recorrência)
  if (id) {
    const { error } = await supabase.from("koinonia_financeiro_contas").update(conta).eq("id", id);
    if (error) return { ok: false, error: mensagemErroBanco(error) };
    revalidar();
    return { ok: true, message: "Conta atualizada." };
  }

  if (!recorrencia) {
    const { error } = await supabase.from("koinonia_financeiro_contas").insert(conta);
    if (error) return { ok: false, error: mensagemErroBanco(error) };
    revalidar();
    return { ok: true, message: "Conta lançada." };
  }

  const { descricao, categoria, fornecedor, valor, observacao, ministerio_id } = conta;
  const { error } = await supabase
    .from("koinonia_financeiro_recorrencias")
    .insert({ descricao, categoria, fornecedor, valor, observacao, ministerio_id, ...recorrencia });
  if (error) return { ok: false, error: mensagemErroBanco(error) };

  const { error: erroGerar } = await gerarContas(supabase, conta.vencimento);
  if (erroGerar) return { ok: false, error: mensagemErroBanco(erroGerar) };

  revalidar();
  return { ok: true, message: "Conta recorrente criada. As próximas aparecem automaticamente." };
}

export async function pagarConta(id: string, input: PagamentoInput): Promise<ActionResult> {
  if (!(await autorizar(...ROLES_FINANCEIRO))) return { ok: false, error: SEM_PERMISSAO };

  const parsed = pagamentoSchema.safeParse(input);
  if (!parsed.success) return erroValidacao(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase
    .from("koinonia_financeiro_contas")
    .update({ status: "paga", ...parsed.data })
    .eq("id", id);
  if (error) return { ok: false, error: mensagemErroBanco(error) };

  revalidar();
  return { ok: true, message: "Pagamento registrado." };
}

export async function desfazerPagamento(id: string): Promise<ActionResult> {
  if (!(await autorizar(...ROLES_FINANCEIRO))) return { ok: false, error: SEM_PERMISSAO };

  const supabase = await createClient();
  const { error } = await supabase
    .from("koinonia_financeiro_contas")
    .update({ status: "pendente", pago_em: null, valor_pago: null, forma_pagamento: null, carteira_id: null })
    .eq("id", id);
  if (error) return { ok: false, error: mensagemErroBanco(error) };

  revalidar();
  return { ok: true, message: "Pagamento desfeito: a conta voltou para “a pagar”." };
}

/** Conta avulsa é apagada; conta recorrente é cancelada (senão seria gerada de novo) */
export async function excluirConta(id: string): Promise<ActionResult> {
  if (!(await autorizar(...ROLES_FINANCEIRO))) return { ok: false, error: SEM_PERMISSAO };

  const supabase = await createClient();
  const { data: conta } = await supabase.from("koinonia_financeiro_contas").select("recorrencia_id").eq("id", id).maybeSingle();
  if (!conta) return { ok: false, error: "Conta não encontrada." };

  if (!conta.recorrencia_id) await removerArquivosDe("conta_id", id);
  const { error } = conta.recorrencia_id
    ? await supabase
        .from("koinonia_financeiro_contas")
        .update({ status: "cancelada", pago_em: null, valor_pago: null, forma_pagamento: null, carteira_id: null })
        .eq("id", id)
    : await supabase.from("koinonia_financeiro_contas").delete().eq("id", id);
  if (error) return { ok: false, error: mensagemErroBanco(error) };

  revalidar();
  return { ok: true, message: conta.recorrencia_id ? "Conta cancelada (só esta)." : "Conta excluída." };
}

export async function reativarConta(id: string): Promise<ActionResult> {
  if (!(await autorizar(...ROLES_FINANCEIRO))) return { ok: false, error: SEM_PERMISSAO };

  const supabase = await createClient();
  const { error } = await supabase.from("koinonia_financeiro_contas").update({ status: "pendente" }).eq("id", id);
  if (error) return { ok: false, error: mensagemErroBanco(error) };

  revalidar();
  return { ok: true, message: "Conta reativada." };
}

// ---------------------------------------------------------------- recorrências

/**
 * Altera a recorrência e as contas dela que ainda vão vencer e não foram pagas.
 * Contas pagas ou já vencidas ficam como estão (são histórico).
 */
export async function salvarRecorrencia(id: string, input: RecorrenciaInput): Promise<ActionResult> {
  if (!(await autorizar(...ROLES_FINANCEIRO))) return { ok: false, error: SEM_PERMISSAO };

  const parsed = recorrenciaSchema.safeParse(input);
  if (!parsed.success) return erroValidacao(parsed.error);
  const { data_fim, parcelas, ...campos } = parsed.data;
  const hoje = hojeISO();

  const supabase = await createClient();
  const { error } = await supabase
    .from("koinonia_financeiro_recorrencias")
    .update({ ...campos, data_fim, parcelas })
    .eq("id", id);
  if (error) return { ok: false, error: mensagemErroBanco(error) };

  // próximas contas em aberto recebem os novos valores
  const { error: erroAtualizar } = await supabase
    .from("koinonia_financeiro_contas")
    .update(campos)
    .eq("recorrencia_id", id)
    .eq("status", "pendente")
    .gte("vencimento", hoje);
  if (erroAtualizar) return { ok: false, error: mensagemErroBanco(erroAtualizar) };

  // término antecipado: apaga as contas em aberto que passaram do novo fim
  let fora = supabase.from("koinonia_financeiro_contas").delete().eq("recorrencia_id", id).eq("status", "pendente");
  if (data_fim) fora = fora.gt("vencimento", data_fim);
  else if (parcelas) fora = fora.gt("ocorrencia", parcelas);
  if (data_fim || parcelas) {
    const { error: erroFora } = await fora;
    if (erroFora) return { ok: false, error: mensagemErroBanco(erroFora) };
  }

  const { error: erroGerar } = await gerarContas(supabase);
  if (erroGerar) return { ok: false, error: mensagemErroBanco(erroGerar) };

  revalidar();
  return { ok: true, message: "Recorrência atualizada (e as próximas contas em aberto)." };
}

/** Para de gerar contas e apaga as que ainda iam vencer (as pagas e as vencidas ficam) */
export async function encerrarRecorrencia(id: string): Promise<ActionResult> {
  if (!(await autorizar(...ROLES_FINANCEIRO))) return { ok: false, error: SEM_PERMISSAO };

  const supabase = await createClient();
  const { error } = await supabase.from("koinonia_financeiro_recorrencias").update({ ativa: false }).eq("id", id);
  if (error) return { ok: false, error: mensagemErroBanco(error) };

  const { error: erroApagar } = await supabase
    .from("koinonia_financeiro_contas")
    .delete()
    .eq("recorrencia_id", id)
    .eq("status", "pendente")
    .gte("vencimento", hojeISO());
  if (erroApagar) return { ok: false, error: mensagemErroBanco(erroApagar) };

  revalidar();
  return { ok: true, message: "Recorrência encerrada: não serão geradas novas contas." };
}
