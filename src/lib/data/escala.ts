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

/**
 * Pedidos de troca em andamento que o usuário enxerga (RLS): os que ele pediu,
 * os que pedem para ele assumir e, para ADMIN/PASTOR, todos.
 */
export async function getTrocasAbertas(escalaId?: string) {
  const supabase = await createClient();
  let query = supabase
    .from("koinonia_escala_trocas")
    .select(
      `id, status, motivo, atribuicao_id, solicitante_id, substituto_id,
       solicitante:koinonia_perfis_basicos!koinonia_escala_trocas_solicitante_id_fkey(nome_completo),
       substituto:koinonia_perfis_basicos!koinonia_escala_trocas_substituto_id_fkey(nome_completo),
       atribuicao:koinonia_escala_atribuicoes!inner(escala_id, funcao:koinonia_escala_funcoes(funcao),
         escala:koinonia_escalas!inner(id, data, descricao))`,
    )
    .in("status", ["aguardando_substituto", "aguardando_lider"])
    .order("created_at");
  if (escalaId) query = query.eq("atribuicao.escala_id", escalaId);
  const { data, error } = await query;
  if (error) throw new Error(`Erro ao carregar trocas: ${error.message}`);
  return data;
}

export type TrocaAberta = Awaited<ReturnType<typeof getTrocasAbertas>>[number];

/** "Maria" de "Maria da Silva" */
export function primeiroNome(nome: string | null | undefined) {
  return nome?.split(" ")[0] ?? "Usuário inativo";
}
