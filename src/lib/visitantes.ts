import "server-only";
import { ROLES_VISITANTES } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

/**
 * Acesso ao cadastro de visitantes (espelha a RLS):
 * - "total": ADMIN/PASTOR, veem e editam todo o histórico;
 * - "porta": escalado hoje na Porta Principal, cadastra e vê só os de hoje;
 * - "acompanha": responsável pelo acompanhamento de algum visitante, vê os
 *   seus e registra os contatos;
 * - null: sem acesso.
 */
export type AcessoVisitantes = "total" | "porta" | "acompanha" | null;

export async function acessoVisitantes(profile: Profile | null): Promise<AcessoVisitantes> {
  if (!profile?.ativo) return null;
  if (ROLES_VISITANTES.includes(profile.role)) return "total";
  const supabase = await createClient();
  const [{ data: porta }, { count }] = await Promise.all([
    supabase.rpc("koinonia_na_porta_hoje"),
    supabase.from("koinonia_visitantes").select("id", { count: "exact", head: true }).eq("responsavel_id", profile.id),
  ]);
  if (porta) return "porta";
  return count ? "acompanha" : null;
}
