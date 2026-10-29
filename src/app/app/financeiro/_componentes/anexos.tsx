"use client";

import { FileTextIcon, ImageIcon, Loader2Icon, PaperclipIcon, Trash2Icon, UploadIcon } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatarDataHora } from "@/lib/format";
import { COMPROVANTE_TAMANHO_MAX, COMPROVANTE_TIPOS, COMPROVANTES_BUCKET } from "@/lib/storage";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { abrirAnexo, excluirAnexo, listarAnexos, registrarAnexo, type Anexo, type DonoAnexo } from "../anexos-actions";

const EXTENSAO: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "application/pdf": "pdf",
};

function tamanho(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * Comprovantes de um lançamento (nota, recibo, boleto, comprovante de PIX).
 * O arquivo vai direto do navegador para o bucket privado; a lista e os links
 * (temporários) passam pelo servidor.
 */
export function Anexos({ dono, quantidade, descricao }: { dono: DonoAnexo; quantidade: number; descricao: string }) {
  const [aberto, setAberto] = useState(false);
  const [anexos, setAnexos] = useState<Anexo[] | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function carregar() {
    startTransition(async () => {
      const result = await listarAnexos(dono);
      if (result.ok) setAnexos(result.data ?? []);
      else toast.error(result.error);
    });
  }

  async function enviar(arquivos: FileList | null) {
    if (!arquivos?.length) return;
    setEnviando(true);
    const supabase = createClient();
    for (const arquivo of Array.from(arquivos)) {
      if (!COMPROVANTE_TIPOS.includes(arquivo.type)) {
        toast.error(`"${arquivo.name}": use foto (JPG, PNG, WebP, HEIC) ou PDF.`);
        continue;
      }
      if (arquivo.size > COMPROVANTE_TAMANHO_MAX) {
        toast.error(`"${arquivo.name}": o arquivo deve ter no máximo 10 MB.`);
        continue;
      }
      const path = `${dono.tipo}s/${dono.id}/${crypto.randomUUID()}.${EXTENSAO[arquivo.type]}`;
      const { error } = await supabase.storage.from(COMPROVANTES_BUCKET).upload(path, arquivo, { contentType: arquivo.type });
      if (error) {
        toast.error(`Não foi possível enviar "${arquivo.name}". Tente novamente.`);
        continue;
      }
      const result = await registrarAnexo(dono, { path, nome: arquivo.name, tipo: arquivo.type, tamanho: arquivo.size });
      if (result.ok) toast.success(result.message);
      else toast.error(result.error);
    }
    setEnviando(false);
    if (inputRef.current) inputRef.current.value = "";
    carregar();
  }

  function abrir(id: string) {
    // abre a aba antes do await: o Safari bloqueia window.open depois de uma promessa
    const aba = window.open("about:blank", "_blank");
    startTransition(async () => {
      const result = await abrirAnexo(id);
      if (result.ok && result.data) {
        if (aba) aba.location.href = result.data;
        else window.location.href = result.data;
      } else {
        aba?.close();
        toast.error(result.ok ? "Não foi possível abrir." : result.error);
      }
    });
  }

  function excluir(id: string) {
    startTransition(async () => {
      const result = await excluirAnexo(id);
      if (result.ok) {
        toast.success(result.message);
        setAnexos((lista) => lista?.filter((a) => a.id !== id) ?? null);
      } else toast.error(result.error);
    });
  }

  return (
    <Dialog
      open={aberto}
      onOpenChange={(abrir) => {
        setAberto(abrir);
        if (abrir) carregar();
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={quantidade ? `${quantidade} comprovante(s)` : "Anexar comprovante"}
          className={cn("relative", !quantidade && "text-muted-foreground")}
        >
          <PaperclipIcon />
          {quantidade > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
              {quantidade}
            </span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Comprovantes</DialogTitle>
          <DialogDescription>{descricao}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {anexos === null ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2Icon className="size-4 animate-spin" /> Carregando...
            </p>
          ) : anexos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum comprovante anexado.</p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {anexos.map((a) => {
                const Icone = a.tipo === "application/pdf" ? FileTextIcon : ImageIcon;
                return (
                  <li key={a.id} className="flex items-center gap-2 px-3 py-2">
                    <Icone className="size-4 shrink-0 text-muted-foreground" />
                    <button
                      type="button"
                      onClick={() => abrir(a.id)}
                      className="min-w-0 flex-1 text-left text-sm hover:underline"
                    >
                      <span className="block truncate font-medium">{a.nome}</span>
                      <span className="block text-xs text-muted-foreground">
                        {tamanho(a.tamanho)} · {formatarDataHora(a.created_at)}
                        {a.autor && ` · ${a.autor.split(" ")[0]}`}
                      </span>
                    </button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      disabled={pending}
                      onClick={() => excluir(a.id)}
                      aria-label={`Remover ${a.nome}`}
                    >
                      <Trash2Icon />
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}

          <input
            ref={inputRef}
            type="file"
            accept={COMPROVANTE_TIPOS.join(",")}
            multiple
            className="hidden"
            onChange={(e) => enviar(e.target.files)}
          />
          <Button variant="outline" className="w-full" disabled={enviando} onClick={() => inputRef.current?.click()}>
            {enviando ? <Loader2Icon className="animate-spin" /> : <UploadIcon />}
            {enviando ? "Enviando..." : "Anexar foto ou PDF"}
          </Button>
          <p className="text-xs text-muted-foreground">Até 10 MB por arquivo. No celular, dá para tirar a foto na hora.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
