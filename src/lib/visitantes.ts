import "server-only";
import { ROLES_VISITANTES } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

/**
 * Acesso ao cadastro de visitantes (espelha a RLS):
 * - "total": ADMIN/PASTOR, veem e editam todo o histórico;
 * - "porta": escalado hoje na Porta Principal, cadastra e vê só os de hoje;
 * - null: sem acesso.
 */
export type AcessoVisitantes = "total" | "porta" | null;

export async function acessoVisitantes(profile: Profile | null): Promise<AcessoVisitantes> {
  if (!profile?.ativo) return null;
  if (ROLES_VISITANTES.includes(profile.role)) return "total";
  const supabase = await createClient();
  const { data } = await supabase.rpc("koinonia_na_porta_hoje");
  return data ? "porta" : null;
}
