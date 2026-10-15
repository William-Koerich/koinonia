"use client";

import { ArrowLeftIcon, ArrowRightIcon, ImagePlusIcon, Loader2Icon, StarIcon, Trash2Icon } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { IMAGEM_TIPOS, urlDoStorage } from "@/lib/storage";
import { cn } from "@/lib/utils";
import { enviarImagem, type PastaImagem } from "./enviar-imagem";

/**
 * Galeria de imagens com escolha de capa. Envia várias de uma vez direto para
 * o Storage; a ordem e a capa só são gravadas quando o formulário é salvo
 * (imagens removidas são apagadas do bucket pela Server Action).
 */
export function GaleriaUpload({
  pasta,
  imagens,
  capa,
  onChange,
  maximo,
}: {
  pasta: PastaImagem;
  imagens: string[];
  capa: string | null;
  onChange: (imagens: string[], capa: string | null) => void;
  maximo: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(0);
  // a capa efetiva: a escolhida ou, se nenhuma, a primeira imagem
  const capaEfetiva = capa ?? imagens[0] ?? null;

  async function enviar(arquivos: File[]) {
    const vagas = maximo - imagens.length;
    if (arquivos.length > vagas) {
      toast.warning(`Cabem mais ${vagas} imagem(ns); as demais foram ignoradas.`);
      arquivos = arquivos.slice(0, vagas);
    }
    if (!arquivos.length) return;

    setEnviando(arquivos.length);
    const resultados = await Promise.all(
      arquivos.map(async (arquivo) => {
        const r = await enviarImagem(pasta, arquivo);
        setEnviando((n) => n - 1);
        return r;
      }),
    );

    const novos: string[] = [];
    for (const r of resultados) {
      if ("erro" in r) toast.error(r.erro);
      else novos.push(r.path);
    }
    if (novos.length) {
      const lista = [...imagens, ...novos];
      onChange(lista, capa ?? lista[0]);
      toast.success(novos.length === 1 ? "Imagem enviada." : `${novos.length} imagens enviadas.`);
    }
  }

  function remover(path: string) {
    const lista = imagens.filter((p) => p !== path);
    onChange(lista, capa === path ? (lista[0] ?? null) : capa);
  }

  function mover(indice: number, direcao: -1 | 1) {
    const lista = [...imagens];
    const destino = indice + direcao;
    [lista[indice], lista[destino]] = [lista[destino], lista[indice]];
    onChange(lista, capa);
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {imagens.map((path, i) => {
          const ehCapa = path === capaEfetiva;
          return (
            <div
              key={path}
              className={cn(
                "group relative aspect-video overflow-hidden rounded-lg border bg-muted",
                ehCapa && "ring-2 ring-primary ring-offset-2 ring-offset-background",
              )}
            >
              <Image src={urlDoStorage(path)!} alt="" fill sizes="(min-width: 1024px) 20vw, 45vw" className="object-cover" />
              {ehCapa && (
                <span className="absolute top-1.5 left-1.5 flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
                  <StarIcon className="size-3 fill-current" /> Capa
                </span>
              )}
              {/* ações: sempre visíveis no celular, no hover no desktop */}
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-linear-to-t from-black/70 to-transparent p-1.5 opacity-100 transition-opacity sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
                <div className="flex gap-1">
                  <Button
                    type="button"
                    size="icon-xs"
                    variant="secondary"
                    disabled={i === 0}
                    onClick={() => mover(i, -1)}
                    aria-label="Mover para a esquerda"
                  >
                    <ArrowLeftIcon />
                  </Button>
                  <Button
                    type="button"
                    size="icon-xs"
                    variant="secondary"
                    disabled={i === imagens.length - 1}
                    onClick={() => mover(i, 1)}
                    aria-label="Mover para a direita"
                  >
                    <ArrowRightIcon />
                  </Button>
                </div>
                <div className="flex gap-1">
                  {!ehCapa && (
                    <Button type="button" size="xs" variant="secondary" onClick={() => onChange(imagens, path)}>
                      <StarIcon /> Capa
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="icon-xs"
                    variant="destructive"
                    onClick={() => remover(path)}
                    aria-label="Remover imagem"
                  >
                    <Trash2Icon />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}

        {imagens.length < maximo && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={enviando > 0}
            className="flex aspect-video flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed text-sm text-muted-foreground transition-colors hover:border-primary hover:text-foreground disabled:opacity-60"
          >
            {enviando > 0 ? (
              <>
                <Loader2Icon className="size-5 animate-spin" /> Enviando {enviando}…
              </>
            ) : (
              <>
                <ImagePlusIcon className="size-5" /> Adicionar imagens
              </>
            )}
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={IMAGEM_TIPOS.join(",")}
        className="sr-only"
        onChange={(e) => {
          const arquivos = Array.from(e.target.files ?? []);
          e.target.value = "";
          void enviar(arquivos);
        }}
      />
    </div>
  );
}
