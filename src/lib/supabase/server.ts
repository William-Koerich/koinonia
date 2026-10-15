import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";
import { supabasePublishableKey, supabaseUrl } from "./env";

/**
 * Client com a sessão do usuário (Server Components, Server Actions, Route
 * Handlers). Lê cookies(), então em Server Components precisa estar dentro de
 * um <Suspense> (Cache Components). Crie um por requisição.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Chamado de um Server Component, onde não dá para gravar cookies.
          // O proxy já renova a sessão a cada requisição.
        }
      },
    },
  });
}
