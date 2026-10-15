import "server-only";
import { createClient } from "@/lib/supabase/server";

/** Pessoas ativas (id + nome) para comboboxes; visível a qualquer usuário logado */
export async function getPessoas() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("koinonia_perfis_basicos")
    .select("id, nome_completo")
    .order("nome_completo");
  if (error) throw new Error(`Erro ao carregar pessoas: ${error.message}`);
  // colunas de view chegam como anuláveis nos tipos gerados
  return data.flatMap((p) => (p.id && p.nome_completo ? [{ id: p.id, nome_completo: p.nome_completo }] : []));
}

/** GCs para seletores (Meu perfil, edição de usuário) */
export async function getGcsOpcoes() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("koinonia_gcs")
    .select("id, nome, bairro, dia_semana, horario")
    .order("nome");
  if (error) throw new Error(`Erro ao carregar GCs: ${error.message}`);
  return data;
}

export async function getMinisteriosOpcoes() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("koinonia_ministerios").select("id, nome").order("nome");
  if (error) throw new Error(`Erro ao carregar ministérios: ${error.message}`);
  return data;
}
