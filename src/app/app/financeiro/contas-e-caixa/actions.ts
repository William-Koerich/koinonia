"use server";

import { revalidatePath } from "next/cache";
import { autorizar, SEM_PERMISSAO } from "@/lib/actions";
import { erroValidacao, mensagemErroBanco } from "@/lib/errors";
import { ROLES_FINANCEIRO } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";
import {
  carteiraSchema,
  transferenciaSchema,
  type CarteiraInput,
  type TransferenciaInput,
} from "@/lib/validation/financeiro";

function revalidar() {
  revalidatePath("/app/financeiro", "layout");
}

export async function salvarCarteira(id: string | null, input: CarteiraInput): Promise<ActionResult> {
  if (!(await autorizar(...ROLES_FINANCEIRO))) return { ok: false, error: SEM_PERMISSAO };
  const parsed = carteiraSchema.safeParse(input);
  if (!parsed.success) return erroValidacao(parsed.error);

  const supabase = await createClient();
  // só uma conta padrão: desmarca a anterior antes
  if (parsed.data.padrao) {
    let anterior = supabase.from("koinonia_financeiro_carteiras").update({ padrao: false }).eq("padrao", true);
    if (id) anterior = anterior.neq("id", id);
    const { error } = await anterior;
    if (error) return { ok: false, error: mensagemErroBanco(error) };
  }

  const { error } = id
    ? await supabase.from("koinonia_financeiro_carteiras").update(parsed.data).eq("id", id)
    : await supabase.from("koinonia_financeiro_carteiras").insert(parsed.data);
  if (error) {
    return { ok: false, error: error.code === "23505" ? "Já existe uma conta com esse nome." : mensagemErroBanco(error) };
  }
  revalidar();
  return { ok: true, message: id ? "Conta atualizada." : "Conta cadastrada." };
}

/** Desativar esconde a conta dos novos lançamentos; o histórico continua */
export async function alternarCarteira(id: string, ativa: boolean): Promise<ActionResult> {
  if (!(await autorizar(...ROLES_FINANCEIRO))) return { ok: false, error: SEM_PERMISSAO };
  const supabase = await createClient();
  const { error } = await supabase
    .from("koinonia_financeiro_carteiras")
    .update(ativa ? { ativa } : { ativa, padrao: false })
    .eq("id", id);
  if (error) return { ok: false, error: mensagemErroBanco(error) };
  revalidar();
  return { ok: true, message: ativa ? "Conta reativada." : "Conta desativada." };
}

export async function excluirCarteira(id: string): Promise<ActionResult> {
  if (!(await autorizar(...ROLES_FINANCEIRO))) return { ok: false, error: SEM_PERMISSAO };
  const supabase = await createClient();
  const { error } = await supabase.from("koinonia_financeiro_carteiras").delete().eq("id", id);
  if (error) {
    return {
      ok: false,
      error: error.code === "23503" ? "Esta conta já tem lançamentos. Desative-a em vez de excluir." : mensagemErroBanco(error),
    };
  }
  revalidar();
  return { ok: true, message: "Conta excluída." };
}

/** Lançamentos antigos (sem conta) passam a contar no saldo de uma conta */
export async function atribuirSemConta(carteiraId: string): Promise<ActionResult> {
  if (!(await autorizar(...ROLES_FINANCEIRO))) return { ok: false, error: SEM_PERMISSAO };
  const supabase = await createClient();
  const [entradas, contas] = await Promise.all([
    supabase.from("koinonia_financeiro_entradas").update({ carteira_id: carteiraId }).is("carteira_id", null).select("id"),
    supabase
      .from("koinonia_financeiro_contas")
      .update({ carteira_id: carteiraId })
      .is("carteira_id", null)
      .eq("status", "paga")
      .select("id"),
  ]);
  const erro = entradas.error ?? contas.error;
  if (erro) return { ok: false, error: mensagemErroBanco(erro) };
  revalidar();
  const total = (entradas.data?.length ?? 0) + (contas.data?.length ?? 0);
  return { ok: true, message: `${total} ${total === 1 ? "lançamento atribuído" : "lançamentos atribuídos"} à conta.` };
}

export async function salvarTransferencia(id: string | null, input: TransferenciaInput): Promise<ActionResult> {
  if (!(await autorizar(...ROLES_FINANCEIRO))) return { ok: false, error: SEM_PERMISSAO };
  const parsed = transferenciaSchema.safeParse(input);
  if (!parsed.success) return erroValidacao(parsed.error);

  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("koinonia_financeiro_transferencias").update(parsed.data).eq("id", id)
    : await supabase.from("koinonia_financeiro_transferencias").insert(parsed.data);
  if (error) return { ok: false, error: mensagemErroBanco(error) };
  revalidar();
  return { ok: true, message: id ? "Transferência atualizada." : "Transferência registrada." };
}

export async function excluirTransferencia(id: string): Promise<ActionResult> {
  if (!(await autorizar(...ROLES_FINANCEIRO))) return { ok: false, error: SEM_PERMISSAO };
  const supabase = await createClient();
  const { error } = await supabase.from("koinonia_financeiro_transferencias").delete().eq("id", id);
  if (error) return { ok: false, error: mensagemErroBanco(error) };
  revalidar();
  return { ok: true, message: "Transferência excluída." };
}
