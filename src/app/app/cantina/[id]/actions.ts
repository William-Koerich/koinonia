"use server";

import { revalidatePath } from "next/cache";
import { getProfile } from "@/lib/auth";
import { SEM_PERMISSAO } from "@/lib/actions";
import { erroValidacao, mensagemErroBanco } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";
import {
  itemCantinaSchema,
  reservaCantinaSchema,
  vendaCantinaSchema,
  type FormaCantina,
  type ItemCantinaInput,
  type ReservaCantinaInput,
  type VendaCantinaInput,
} from "@/lib/validation/cantina";

function revalidar(cantinaId: string) {
  revalidatePath(`/app/cantina/${cantinaId}`);
  revalidatePath("/app/cantina");
  revalidatePath("/app");
}

/** As vendas mudam a entrada da cantina no financeiro */
function revalidarVendas(cantinaId: string) {
  revalidar(cantinaId);
  revalidatePath("/app/financeiro", "layout");
}

const SEM_PERMISSAO_VENDA = "Só a equipe da cantina (até 7 dias depois da data) e a tesouraria registram vendas.";

// ------------------------------------------------------------ cardápio (equipe)

/** A RLS só deixa a equipe da data (GC/ministério escalado), PASTOR e ADMIN */
export async function salvarItem(cantinaId: string, itemId: string | null, input: ItemCantinaInput): Promise<ActionResult> {
  const parsed = itemCantinaSchema.safeParse(input);
  if (!parsed.success) return erroValidacao(parsed.error);

  const supabase = await createClient();
  const { data, error } = itemId
    ? await supabase.from("koinonia_cantina_itens").update(parsed.data).eq("id", itemId).select("id")
    : await supabase.from("koinonia_cantina_itens").insert({ ...parsed.data, cantina_id: cantinaId }).select("id");
  if (error) {
    return {
      ok: false,
      error: error.code === "42501" ? "Só a equipe escalada para esta cantina edita o cardápio." : mensagemErroBanco(error),
    };
  }
  if (!data.length) return { ok: false, error: SEM_PERMISSAO };

  revalidar(cantinaId);
  return { ok: true, message: itemId ? "Item atualizado." : "Item adicionado ao cardápio." };
}

export async function excluirItem(cantinaId: string, itemId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("koinonia_cantina_itens").delete().eq("id", itemId).select("id");
  if (error) return { ok: false, error: mensagemErroBanco(error) };
  if (!data.length) return { ok: false, error: SEM_PERMISSAO };

  revalidar(cantinaId);
  return { ok: true, message: "Item removido (as reservas dele também)." };
}

// ------------------------------------------------------------ reservas (membro)

/** Cria ou atualiza a reserva do próprio membro para o item */
export async function reservar(cantinaId: string, itemId: string, input: ReservaCantinaInput): Promise<ActionResult> {
  const profile = await getProfile();
  if (!profile?.ativo) return { ok: false, error: SEM_PERMISSAO };

  const parsed = reservaCantinaSchema.safeParse(input);
  if (!parsed.success) return erroValidacao(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase
    .from("koinonia_cantina_reservas")
    .upsert({ item_id: itemId, profile_id: profile.id, ...parsed.data }, { onConflict: "item_id,profile_id" });
  if (error) return { ok: false, error: mensagemErroBanco(error) };

  revalidar(cantinaId);
  return { ok: true, message: "Reserva salva! É só retirar no dia." };
}

export async function cancelarReserva(cantinaId: string, itemId: string): Promise<ActionResult> {
  const profile = await getProfile();
  if (!profile?.ativo) return { ok: false, error: SEM_PERMISSAO };

  const supabase = await createClient();
  const { error } = await supabase
    .from("koinonia_cantina_reservas")
    .delete()
    .eq("item_id", itemId)
    .eq("profile_id", profile.id);
  if (error) return { ok: false, error: mensagemErroBanco(error) };

  revalidar(cantinaId);
  return { ok: true, message: "Reserva cancelada." };
}

/** Equipe remove a reserva de alguém */
export async function removerReserva(cantinaId: string, reservaId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("koinonia_cantina_reservas").delete().eq("id", reservaId).select("id");
  if (error) return { ok: false, error: mensagemErroBanco(error) };
  if (!data.length) return { ok: false, error: SEM_PERMISSAO };

  revalidar(cantinaId);
  return { ok: true, message: "Reserva removida." };
}

// ------------------------------------------------------------ vendas (equipe e tesouraria)

/** Venda no balcão; o banco soma tudo numa entrada do financeiro por forma de pagamento */
export async function registrarVenda(cantinaId: string, input: VendaCantinaInput): Promise<ActionResult> {
  const parsed = vendaCantinaSchema.safeParse(input);
  if (!parsed.success) return erroValidacao(parsed.error);

  const supabase = await createClient();
  // valor null: o banco usa preço × quantidade
  const { error } = await supabase
    .from("koinonia_cantina_vendas")
    .insert({ ...parsed.data, valor: parsed.data.valor as number, cantina_id: cantinaId });
  if (error) return { ok: false, error: error.code === "42501" ? SEM_PERMISSAO_VENDA : mensagemErroBanco(error) };

  revalidarVendas(cantinaId);
  return { ok: true, message: "Venda registrada e lançada no financeiro." };
}

/** Pagamento de uma reserva: item e quantidade vêm da própria reserva */
export async function pagarReserva(
  cantinaId: string,
  reservaId: string,
  forma: FormaCantina,
  valor: string,
): Promise<ActionResult> {
  const parsed = vendaCantinaSchema.pick({ forma: true, valor: true }).safeParse({ forma, valor });
  if (!parsed.success) return erroValidacao(parsed.error);

  const supabase = await createClient();
  const { data: reserva } = await supabase
    .from("koinonia_cantina_reservas")
    .select("item_id, quantidade")
    .eq("id", reservaId)
    .maybeSingle();
  if (!reserva) return { ok: false, error: SEM_PERMISSAO_VENDA };

  const { error } = await supabase.from("koinonia_cantina_vendas").insert({
    ...reserva,
    cantina_id: cantinaId,
    reserva_id: reservaId,
    forma: parsed.data.forma,
    // null: o banco usa preço × quantidade
    valor: parsed.data.valor as number,
  });
  if (error) {
    if (error.code === "23505") return { ok: false, error: "Esta reserva já foi paga." };
    return { ok: false, error: error.code === "42501" ? SEM_PERMISSAO_VENDA : mensagemErroBanco(error) };
  }

  revalidarVendas(cantinaId);
  return { ok: true, message: "Pagamento registrado e lançado no financeiro." };
}

/** Desfaz uma venda (ou o pagamento de uma reserva); o valor sai da entrada do financeiro */
export async function desfazerVenda(cantinaId: string, vendaId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("koinonia_cantina_vendas").delete().eq("id", vendaId).select("id");
  if (error) return { ok: false, error: mensagemErroBanco(error) };
  if (!data.length) return { ok: false, error: SEM_PERMISSAO_VENDA };

  revalidarVendas(cantinaId);
  return { ok: true, message: "Venda desfeita e retirada do financeiro." };
}
