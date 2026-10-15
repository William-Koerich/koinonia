import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { TAGS } from "@/lib/cache-tags";
import { createPublicClient } from "@/lib/supabase/public";
import type { Tables } from "@/lib/types";

export { urlDoStorage } from "@/lib/storage";

/**
 * Dados do site público. Usam o client anônimo (sem cookies), então podem ser
 * cacheados e entram no HTML estático. A RLS de anon só libera eventos,
 * pastores ativos, projetos publicados e dados de contribuição.
 */

export type EventoPublico = Pick<
  Tables<"koinonia_eventos">,
  | "id"
  | "titulo"
  | "descricao"
  | "inicio"
  | "fim"
  | "valor"
  | "publico"
  | "logradouro"
  | "numero"
  | "complemento"
  | "bairro"
  | "cidade"
  | "uf"
>;

export async function getProximosEventos(limite?: number): Promise<EventoPublico[]> {
  "use cache";
  cacheTag(TAGS.eventos);
  cacheLife("hours");

  let query = createPublicClient()
    .from("koinonia_eventos")
    .select("id, titulo, descricao, inicio, fim, valor, publico, logradouro, numero, complemento, bairro, cidade, uf")
    .gte("fim", new Date().toISOString())
    .order("inicio");
  if (limite) query = query.limit(limite);

  const { data, error } = await query;
  if (error) throw new Error(`Erro ao carregar eventos: ${error.message}`);
  return data;
}

export async function getPastores() {
  "use cache";
  cacheTag(TAGS.pastores);
  cacheLife("days");

  const { data, error } = await createPublicClient()
    .from("koinonia_pastores")
    .select("id, nome, cargo, bio, foto_path")
    .order("ordem")
    .order("nome");
  if (error) throw new Error(`Erro ao carregar pastores: ${error.message}`);
  return data;
}

export async function getProjetos() {
  "use cache";
  cacheTag(TAGS.projetos);
  cacheLife("days");

  const { data, error } = await createPublicClient()
    .from("koinonia_projetos")
    .select("id, slug, titulo, resumo, imagem_path, status")
    .order("ordem")
    .order("titulo");
  if (error) throw new Error(`Erro ao carregar projetos: ${error.message}`);
  return data;
}

export async function getProjeto(slug: string) {
  "use cache";
  cacheTag(TAGS.projetos);
  cacheLife("days");

  const { data, error } = await createPublicClient()
    .from("koinonia_projetos")
    .select("id, slug, titulo, resumo, descricao, imagem_path, status, updated_at, galeria:koinonia_projeto_imagens(path, ordem)")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(`Erro ao carregar projeto: ${error.message}`);
  if (!data) return null;

  const { galeria, ...projeto } = data;
  return { ...projeto, imagens: [...galeria].sort((a, b) => a.ordem - b.ordem).map((g) => g.path) };
}

export async function getContribuicao() {
  "use cache";
  cacheTag(TAGS.contribuicao);
  cacheLife("days");

  const { data, error } = await createPublicClient()
    .from("koinonia_configuracoes_contribuicao")
    .select("*")
    .maybeSingle();
  if (error) throw new Error(`Erro ao carregar dados de contribuição: ${error.message}`);
  return data;
}
