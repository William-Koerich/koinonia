"use server";

import { revalidatePath } from "next/cache";
import { SEM_PERMISSAO } from "@/lib/actions";
import { getProfile } from "@/lib/auth";
import { erroValidacao, mensagemErroBanco } from "@/lib/errors";
import { formatarData, hojeISO } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";
import { indisponibilidadeSchema, type IndisponibilidadeInput } from "@/lib/validation/escala";

export async function marcarIndisponibilidade(input: IndisponibilidadeInput): Promise<ActionResult> {
  const profile = await getProfile();
  if (!profile?.ativo) return { ok: false, error: SEM_PERMISSAO };

  const parsed = indisponibilidadeSchema.safeParse(input);
  if (!parsed.success) return erroValidacao(parsed.error);
  if (parsed.data.data_inicio < hojeISO()) {
    return { ok: false, error: "Escolha uma data a partir de hoje.", fieldErrors: { data_inicio: ["Escolha uma data a partir de hoje."] } };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("koinonia_escala_indisponibilidades").insert(parsed.data);
  if (error) {
    return {
      ok: false,
      error: error.code === "23514" ? "O período pode ter no máximo 120 dias." : mensagemErroBanco(error),
    };
  }

  // já estava escalado nesse período? lembra de avisar a liderança
  const { data: conflitos } = await supabase
    .from("koinonia_escala_atribuicoes")
    .select("resposta, escala:koinonia_escalas!inner(data)")
    .eq("profile_id", profile.id)
    .neq("resposta", "recusado")
    .gte("escala.data", parsed.data.data_inicio)
    .lte("escala.data", parsed.data.data_fim);

  revalidatePath("/app/escala", "layout");
  if (conflitos?.length) {
    const datas = conflitos.map((c) => formatarData(c.escala.data)).join(", ");
    return {
      ok: true,
      message: `Anotado. Você já está escalado em ${datas}: responda “Não posso” ou peça troca na escala.`,
    };
  }
  return { ok: true, message: "Anotado. A liderança vai ver isso ao montar a escala." };
}

export async function removerIndisponibilidade(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("koinonia_escala_indisponibilidades").delete().eq("id", id);
  if (error) return { ok: false, error: mensagemErroBanco(error) };
  revalidatePath("/app/escala", "layout");
  return { ok: true, message: "Removido." };
}
