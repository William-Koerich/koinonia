"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { autorizar, SEM_PERMISSAO } from "@/lib/actions";
import { erroValidacao, mensagemErroBanco } from "@/lib/errors";
import { dispararPendentes } from "@/lib/notificacoes";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";
import {
  configNotificacaoSchema,
  notificacaoSchema,
  type ConfigNotificacaoInput,
  type NotificacaoInput,
} from "@/lib/validation/notificacao";

export async function criarNotificacao(input: NotificacaoInput): Promise<ActionResult> {
  if (!(await autorizar("ADMIN", "PASTOR"))) return { ok: false, error: SEM_PERMISSAO };

  const parsed = notificacaoSchema.safeParse(input);
  if (!parsed.success) return erroValidacao(parsed.error);
  const { enviarAgora, ...notificacao } = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.from("koinonia_notificacoes").insert({ ...notificacao, origem: "manual" });
  if (error) return { ok: false, error: mensagemErroBanco(error) };

  // "enviar agora" sai em seguida, sem esperar o cron (que roda a cada 5 min)
  if (enviarAgora) {
    after(dispararPendentes);
  }

  revalidatePath("/app/notificacoes");
  return { ok: true, message: enviarAgora ? "Notificação enviada." : "Notificação agendada." };
}

export async function cancelarNotificacao(id: string): Promise<ActionResult> {
  if (!(await autorizar("ADMIN", "PASTOR"))) return { ok: false, error: SEM_PERMISSAO };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("koinonia_notificacoes")
    .update({ status: "cancelada" })
    .eq("id", id)
    .eq("status", "agendada")
    .select("id");
  if (error) return { ok: false, error: mensagemErroBanco(error) };
  if (!data.length) return { ok: false, error: "Essa notificação já foi enviada." };

  revalidatePath("/app/notificacoes");
  return { ok: true, message: "Notificação cancelada." };
}

export async function salvarConfigNotificacoes(input: ConfigNotificacaoInput): Promise<ActionResult> {
  if (!(await autorizar("ADMIN", "PASTOR"))) return { ok: false, error: SEM_PERMISSAO };

  const parsed = configNotificacaoSchema.safeParse(input);
  if (!parsed.success) return erroValidacao(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase
    .from("koinonia_notificacao_config")
    .update({ ...parsed.data, evento_dias_antes: [...new Set(parsed.data.evento_dias_antes)].sort((a, b) => b - a) })
    .eq("id", true);
  if (error) return { ok: false, error: mensagemErroBanco(error) };

  revalidatePath("/app/notificacoes", "layout");
  return { ok: true, message: "Regras de notificação salvas." };
}
