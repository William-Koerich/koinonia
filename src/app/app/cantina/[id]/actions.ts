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
  type ItemCantinaInput,
  type ReservaCantinaInput,
} from "@/lib/validation/cantina";

function revalidar(cantinaId: string) {
  revalidatePath(`/app/cantina/${cantinaId}`);
  revalidatePath("/app/cantina");
  revalidatePath("/app");
}

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
