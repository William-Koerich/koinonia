"use client";

import { ImageIcon, Loader2Icon, UploadIcon, XIcon } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { IMAGEM_TIPOS, urlDoStorage } from "@/lib/storage";
import { cn } from "@/lib/utils";
import { enviarImagem, type PastaImagem } from "./enviar-imagem";

/**
 * Envia a imagem direto do navegador para o bucket público (a policy do
 * Storage só permite ADMIN/PASTOR) e devolve o caminho para o formulário.
 * A imagem antiga é apagada pela Server Action quando o registro é salvo.
 */
export function ImagemUpload({
  pasta,
  value,
  onChange,
  proporcao = "aspect-square",
}: {
  pasta: PastaImagem;
  value: string | null;
  onChange: (path: string | null) => void;
  proporcao?: "aspect-square" | "aspect-video";
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);
  const url = urlDoStorage(value);

  async function enviar(arquivo: File) {
    setEnviando(true);
    const resultado = await enviarImagem(pasta, arquivo);
    setEnviando(false);
    if ("erro" in resultado) toast.error(resultado.erro);
    else onChange(resultado.path);
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div
        className={cn(
          "relative w-40 overflow-hidden rounded-xl border bg-muted",
          proporcao,
          proporcao === "aspect-video" && "w-64",
        )}
      >
        {url ? (
          <Image src={url} alt="" fill sizes="256px" className="object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <ImageIcon className="size-8" />
          </div>
        )}
        {enviando && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70">
            <Loader2Icon className="size-6 animate-spin" />
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="file"
          accept={IMAGEM_TIPOS.join(",")}
          className="sr-only"
          onChange={(e) => {
            const arquivo = e.target.files?.[0];
            if (arquivo) void enviar(arquivo);
            e.target.value = "";
          }}
        />
        <Button type="button" variant="outline" disabled={enviando} onClick={() => inputRef.current?.click()}>
          <UploadIcon /> {url ? "Trocar imagem" : "Enviar imagem"}
        </Button>
        {url && (
          <Button type="button" variant="ghost" disabled={enviando} onClick={() => onChange(null)}>
            <XIcon /> Remover
          </Button>
        )}
      </div>
    </div>
  );
}
