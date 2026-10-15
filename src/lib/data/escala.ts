import "server-only";
import { createClient } from "@/lib/supabase/server";

/** Funções ativas da escala, na ordem da grade */
export async function getFuncoes() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("koinonia_escala_funcoes")
    .select("id, funcao, vagas")
    .eq("ativo", true)
    .order("ordem");
  if (error) throw new Error(`Erro ao carregar funções da escala: ${error.message}`);
  return data;
}

/** Eventos a partir de hoje, para vincular a uma escala */
export async function getEventosOpcoes() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("koinonia_eventos")
    .select("id, titulo, inicio")
    .gte("fim", new Date().toISOString())
    .order("inicio")
    .limit(50);
  if (error) throw new Error(`Erro ao carregar eventos: ${error.message}`);
  return data;
}
