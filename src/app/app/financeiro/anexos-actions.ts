"use server";

import { revalidatePath } from "next/cache";
import { autorizar, SEM_PERMISSAO } from "@/lib/actions";
import { mensagemErroBanco } from "@/lib/errors";
import { ROLES_FINANCEIRO } from "@/lib/permissions";
import { COMPROVANTE_TAMANHO_MAX, COMPROVANTE_TIPOS, COMPROVANTES_BUCKET } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";

export type DonoAnexo = { tipo: "entrada" | "conta"; id: string };
export type Anexo = { id: string; nome: string; tipo: string; tamanho: number; created_at: string; autor: string | null };

const coluna = (dono: DonoAnexo) => (dono.tipo === "entrada" ? "entrada_id" : "conta_id");

export async function listarAnexos(dono: DonoAnexo): Promise<ActionResult<Anexo[]>> {
  if (!(await autorizar(...ROLES_FINANCEIRO))) return { ok: false, error: SEM_PERMISSAO };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("koinonia_financeiro_anexos")
    .select("id, nome, tipo, tamanho, created_at, autor:koinonia_perfis_basicos!koinonia_financeiro_anexos_created_by_fkey(nome_completo)")
    .eq(coluna(dono), dono.id)
    .order("created_at");
  if (error) return { ok: false, error: mensagemErroBanco(error) };
  return {
    ok: true,
    data: data.map(({ autor, ...a }) => ({ ...a, autor: autor?.nome_completo ?? null })),
  };
}

/** Registra o arquivo que o navegador já enviou ao bucket (o caminho começa pela pasta do lançamento) */
export async function registrarAnexo(
  dono: DonoAnexo,
  arquivo: { path: string; nome: string; tipo: string; tamanho: number },
): Promise<ActionResult> {
  if (!(await autorizar(...ROLES_FINANCEIRO))) return { ok: false, error: SEM_PERMISSAO };
  if (!arquivo.path.startsWith(`${dono.tipo}s/${dono.id}/`)) return { ok: false, error: "Arquivo inválido." };
  if (!COMPROVANTE_TIPOS.includes(arquivo.tipo) || arquivo.tamanho > COMPROVANTE_TAMANHO_MAX) {
    return { ok: false, error: "Use foto (JPG, PNG, WebP, HEIC) ou PDF de até 10 MB." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("koinonia_financeiro_anexos").insert({
    entrada_id: dono.tipo === "entrada" ? dono.id : null,
    conta_id: dono.tipo === "conta" ? dono.id : null,
    path: arquivo.path,
    nome: arquivo.nome.slice(0, 200),
    tipo: arquivo.tipo,
    tamanho: arquivo.tamanho,
  });
  if (error) {
    await supabase.storage.from(COMPROVANTES_BUCKET).remove([arquivo.path]);
    return { ok: false, error: mensagemErroBanco(error) };
  }
  revalidatePath("/app/financeiro", "layout");
  return { ok: true, message: "Comprovante anexado." };
}

/** Link temporário (5 min) para abrir o comprovante */
export async function abrirAnexo(id: string): Promise<ActionResult<string>> {
  if (!(await autorizar(...ROLES_FINANCEIRO))) return { ok: false, error: SEM_PERMISSAO };
  const supabase = await createClient();
  const { data: anexo } = await supabase.from("koinonia_financeiro_anexos").select("path, nome").eq("id", id).maybeSingle();
  if (!anexo) return { ok: false, error: "Comprovante não encontrado." };
  const { data, error } = await supabase.storage.from(COMPROVANTES_BUCKET).createSignedUrl(anexo.path, 300);
  if (error || !data) return { ok: false, error: "Não foi possível abrir o comprovante." };
  return { ok: true, data: data.signedUrl };
}

export async function excluirAnexo(id: string): Promise<ActionResult> {
  if (!(await autorizar(...ROLES_FINANCEIRO))) return { ok: false, error: SEM_PERMISSAO };
  const supabase = await createClient();
  const { data, error } = await supabase.from("koinonia_financeiro_anexos").delete().eq("id", id).select("path");
  if (error) return { ok: false, error: mensagemErroBanco(error) };
  if (data[0]) await supabase.storage.from(COMPROVANTES_BUCKET).remove([data[0].path]);
  revalidatePath("/app/financeiro", "layout");
  return { ok: true, message: "Comprovante removido." };
}
