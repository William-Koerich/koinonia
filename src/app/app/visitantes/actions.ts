"use server";

import { revalidatePath } from "next/cache";
import { SEM_PERMISSAO } from "@/lib/actions";
import { getProfile } from "@/lib/auth";
import { erroValidacao, mensagemErroBanco } from "@/lib/errors";
import { hojeISO } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";
import { visitanteSchema, type VisitanteInput } from "@/lib/validation/visitante";
import { acessoVisitantes } from "@/lib/visitantes";

export async function salvarVisitante(id: string | null, input: VisitanteInput): Promise<ActionResult> {
  const acesso = await acessoVisitantes(await getProfile());
  if (!acesso) return { ok: false, error: "O cadastro de visitantes só fica liberado no dia em que você está na Porta Principal." };

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
  if (!(await acessoVisitantes(await getProfile()))) return { ok: false, error: SEM_PERMISSAO };

  const supabase = await createClient();
  const { data, error } = await supabase.from("koinonia_visitantes").delete().eq("id", id).select("id");
  if (error) return { ok: false, error: mensagemErroBanco(error) };
  if (!data.length) return { ok: false, error: SEM_PERMISSAO };

  revalidatePath("/app/visitantes");
  return { ok: true, message: "Visitante excluído." };
}
