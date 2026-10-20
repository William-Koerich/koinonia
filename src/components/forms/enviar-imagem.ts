"use client";

import { IMAGEM_TAMANHO_MAX, IMAGEM_TIPOS, STORAGE_BUCKET } from "@/lib/storage";
import { createClient } from "@/lib/supabase/client";

export type PastaImagem = "pastores" | "projetos" | "avisos";

/**
 * Envia uma imagem direto do navegador para o bucket público (a policy do
 * Storage só permite ADMIN/PASTOR). Devolve o caminho salvo ou uma mensagem
 * de erro amigável.
 */
export async function enviarImagem(
  pasta: PastaImagem,
  arquivo: File,
): Promise<{ path: string } | { erro: string }> {
  if (!IMAGEM_TIPOS.includes(arquivo.type)) return { erro: `"${arquivo.name}": use JPG, PNG ou WebP.` };
  if (arquivo.size > IMAGEM_TAMANHO_MAX) return { erro: `"${arquivo.name}": a imagem deve ter no máximo 5 MB.` };

  const extensao = arquivo.type.split("/")[1].replace("jpeg", "jpg");
  const path = `${pasta}/${crypto.randomUUID()}.${extensao}`;
  const { error } = await createClient().storage.from(STORAGE_BUCKET).upload(path, arquivo, {
    contentType: arquivo.type,
    cacheControl: "31536000", // nome único por upload, então pode cachear para sempre
  });
  return error ? { erro: `Não foi possível enviar "${arquivo.name}". Tente novamente.` } : { path };
}
