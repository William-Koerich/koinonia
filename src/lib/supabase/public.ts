import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { supabasePublishableKey, supabaseUrl } from "./env";

/**
 * Client anônimo, sem cookies, para dados públicos do site (eventos, pastores,
 * projetos, contribuição). Por não ler a requisição, pode ser usado dentro de
 * funções 'use cache'. Só enxerga o que a RLS libera para o papel anon.
 */
export function createPublicClient() {
  return createSupabaseClient<Database>(supabaseUrl, supabasePublishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
