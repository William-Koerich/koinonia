import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { supabaseUrl } from "./env";

/**
 * Client com a chave secreta (antiga service_role): ignora a RLS.
 * Usar apenas no servidor e só depois de checar a permissão do usuário.
 * Nunca importar em Client Components ("server-only" quebra o build se isso acontecer).
 */
export function createAdminClient() {
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("Variável de ambiente ausente: SUPABASE_SECRET_KEY.");
  }

  return createSupabaseClient<Database>(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
