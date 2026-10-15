"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getProfile } from "@/lib/auth";
import { SEM_PERMISSAO } from "@/lib/actions";
import { mensagemErroBanco } from "@/lib/errors";
import { isAdminOrPastor } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";

const idSchema = z.uuid();

/**
 * ADMIN/PASTOR gerenciam qualquer ministério (inclusive líderes).
 * O líder só vincula/desvincula membros comuns do ministério que lidera.
 * A RLS de koinonia_ministerio_membros garante o mesmo no banco.
 */
async function permissao(ministerioId: string): Promise<"total" | "lider" | null> {
  const profile = await getProfile();
  if (!profile?.ativo) return null;
  if (isAdminOrPastor(profile.role)) return "total";

  const supabase = await createClient();
  const { data } = await supabase
    .from("koinonia_ministerio_membros")
    .select("is_lider")
    .eq("ministerio_id", ministerioId)
    .eq("profile_id", profile.id)
    .maybeSingle();
  return data?.is_lider ? "lider" : null;
}

function revalidar(ministerioId: string) {
  revalidatePath(`/app/ministerios/${ministerioId}`);
  revalidatePath("/app/ministerios");
  revalidatePath("/app/usuarios");
}

export async function adicionarMembro(
  ministerioId: string,
  profileId: string,
  comoLider: boolean,
): Promise<ActionResult> {
  if (!idSchema.safeParse(ministerioId).success || !idSchema.safeParse(profileId).success) {
    return { ok: false, error: "Selecione uma pessoa." };
  }
  const nivel = await permissao(ministerioId);
  if (!nivel) return { ok: false, error: SEM_PERMISSAO };
  if (comoLider && nivel !== "total") {
    return { ok: false, error: "Apenas administradores e pastores definem líderes." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("koinonia_ministerio_membros")
    .insert({ ministerio_id: ministerioId, profile_id: profileId, is_lider: comoLider });
  if (error) {
    return {
      ok: false,
      error: error.code === "23505" ? "Esta pessoa já faz parte do ministério." : mensagemErroBanco(error),
    };
  }

  revalidar(ministerioId);
  return { ok: true, message: comoLider ? "Líder adicionado." : "Membro adicionado." };
}

export async function removerMembro(ministerioId: string, profileId: string): Promise<ActionResult> {
  const nivel = await permissao(ministerioId);
  if (!nivel) return { ok: false, error: SEM_PERMISSAO };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("koinonia_ministerio_membros")
    .delete()
    .eq("ministerio_id", ministerioId)
    .eq("profile_id", profileId)
    .select("profile_id");
  if (error) return { ok: false, error: mensagemErroBanco(error) };
  // a RLS não dá erro ao filtrar: 0 linhas = líder tentando remover outro líder
  if (!data.length) return { ok: false, error: "Apenas administradores e pastores removem líderes." };

  revalidar(ministerioId);
  return { ok: true, message: "Removido do ministério." };
}

// ------------------------------------------------------------- pedidos

/** O próprio membro pede para participar do ministério */
export async function solicitarParticipacao(ministerioId: string): Promise<ActionResult> {
  const profile = await getProfile();
  if (!profile?.ativo) return { ok: false, error: SEM_PERMISSAO };

  const supabase = await createClient();
  const { error } = await supabase
    .from("koinonia_ministerio_solicitacoes")
    .insert({ ministerio_id: ministerioId, profile_id: profile.id });
  if (error) {
    // a RLS barra quem já participa; a constraint, pedido repetido
    return {
      ok: false,
      error:
        error.code === "23505"
          ? "Você já pediu para participar deste ministério."
          : error.code === "42501"
            ? "Você já participa deste ministério."
            : mensagemErroBanco(error),
    };
  }

  revalidar(ministerioId);
  revalidatePath("/app");
  return { ok: true, message: "Pedido enviado! Os líderes do ministério vão analisar." };
}

/** O membro cancela o próprio pedido; líder/PASTOR/ADMIN recusam (mesma operação) */
export async function removerSolicitacao(ministerioId: string, profileId: string): Promise<ActionResult> {
  const profile = await getProfile();
  if (!profile?.ativo) return { ok: false, error: SEM_PERMISSAO };
  const proprio = profile.id === profileId;
  if (!proprio && !(await permissao(ministerioId))) return { ok: false, error: SEM_PERMISSAO };

  const supabase = await createClient();
  const { error } = await supabase
    .from("koinonia_ministerio_solicitacoes")
    .delete()
    .eq("ministerio_id", ministerioId)
    .eq("profile_id", profileId);
  if (error) return { ok: false, error: mensagemErroBanco(error) };

  revalidar(ministerioId);
  revalidatePath("/app");
  return { ok: true, message: proprio ? "Pedido cancelado." : "Pedido recusado." };
}

/** Aprovar = adicionar como participante (o trigger do banco apaga o pedido) */
export async function aprovarSolicitacao(ministerioId: string, profileId: string): Promise<ActionResult> {
  const result = await adicionarMembro(ministerioId, profileId, false);
  if (!result.ok) return result;
  revalidatePath("/app");
  return { ok: true, message: "Pedido aprovado. A pessoa agora participa do ministério." };
}

/** Marca/desmarca líder. O papel LIDER_MINISTERIO é ajustado por trigger no banco. */
export async function definirLider(ministerioId: string, profileId: string, lider: boolean): Promise<ActionResult> {
  if ((await permissao(ministerioId)) !== "total") {
    return { ok: false, error: "Apenas administradores e pastores definem líderes." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("koinonia_ministerio_membros")
    .update({ is_lider: lider })
    .eq("ministerio_id", ministerioId)
    .eq("profile_id", profileId);
  if (error) return { ok: false, error: mensagemErroBanco(error) };

  revalidar(ministerioId);
  revalidatePath("/app", "layout"); // o papel (e o menu) da pessoa pode ter mudado
  return { ok: true, message: lider ? "Agora é líder do ministério." : "Liderança removida." };
}
