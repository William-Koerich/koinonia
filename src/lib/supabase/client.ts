import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";
import { supabasePublishableKey, supabaseUrl } from "./env";

/** Client para Client Components (sessão lida dos cookies do navegador). */
export function createClient() {
  return createBrowserClient<Database>(supabaseUrl, supabasePublishableKey);
}
