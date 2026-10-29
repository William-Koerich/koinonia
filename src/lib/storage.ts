import { supabaseUrl } from "@/lib/supabase/env";

/** Bucket público com fotos de pastores e imagens de projetos */
export const STORAGE_BUCKET = "koinonia-site";

export const IMAGEM_TIPOS = ["image/jpeg", "image/png", "image/webp"];
export const IMAGEM_TAMANHO_MAX = 5 * 1024 * 1024; // igual ao limite do bucket

export function urlDoStorage(path: string | null): string | null {
  return path ? `${supabaseUrl}/storage/v1/object/public/${STORAGE_BUCKET}/${path}` : null;
}

/** Bucket privado dos comprovantes do financeiro (acesso só por URL assinada) */
export const COMPROVANTES_BUCKET = "koinonia-financeiro";
export const COMPROVANTE_TIPOS = ["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"];
export const COMPROVANTE_TAMANHO_MAX = 10 * 1024 * 1024; // igual ao limite do bucket
