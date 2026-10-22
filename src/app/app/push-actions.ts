"use server";

import { z } from "zod";
import { getProfile } from "@/lib/auth";
import { mensagemErroBanco } from "@/lib/errors";
import { enviarTeste } from "@/lib/notificacoes";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";

// Inscrição do aparelho do próprio usuário nas notificações push

const inscricaoSchema = z.object({
  endpoint: z.url().max(1000),
  keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(100) }),
});

export async function ativarNotificacoes(inscricao: unknown, userAgent: string): Promise<ActionResult> {
  const parsed = inscricaoSchema.safeParse(inscricao);
  if (!parsed.success) return { ok: false, error: "Não foi possível ativar neste aparelho." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("koinonia_push_inscrever", {
    p_endpoint: parsed.data.endpoint,
    p_p256dh: parsed.data.keys.p256dh,
    p_auth: parsed.data.keys.auth,
    p_user_agent: userAgent,
  });
  if (error) return { ok: false, error: mensagemErroBanco(error) };
  return { ok: true, message: "Notificações ativadas neste aparelho." };
}

export async function desativarNotificacoes(endpoint: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("koinonia_push_cancelar", { p_endpoint: endpoint });
  if (error) return { ok: false, error: mensagemErroBanco(error) };
  return { ok: true, message: "Notificações desativadas neste aparelho." };
}

export async function testarNotificacao(): Promise<ActionResult> {
  const profile = await getProfile();
  if (!profile?.ativo) return { ok: false, error: "Faça login novamente." };
  try {
    const enviadas = await enviarTeste(profile.id);
    return enviadas
      ? { ok: true, message: "Notificação de teste enviada." }
      : { ok: false, error: "Nenhum aparelho ativo encontrado. Ative as notificações primeiro." };
  } catch {
    return { ok: false, error: "As notificações ainda não estão configuradas no servidor." };
  }
}
