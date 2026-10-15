"use client";

import { ChevronLeftIcon, ChevronRightIcon, XIcon } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { urlDoStorage } from "@/lib/storage";
import { cn } from "@/lib/utils";
import { Stagger, StaggerItem } from "./fx/reveal";

/** Grade de fotos do projeto; clicar abre a foto ampliada com navegação */
export function Galeria({ imagens, titulo }: { imagens: string[]; titulo: string }) {
  const [aberta, setAberta] = useState<number | null>(null);
  const total = imagens.length;

  const navegar = useCallback(
    (passo: number) => setAberta((i) => (i === null ? i : (i + passo + total) % total)),
    [total],
  );

  // setas do teclado com a foto aberta
  useEffect(() => {
    if (aberta === null) return;
    function tecla(e: KeyboardEvent) {
      if (e.key === "ArrowRight") navegar(1);
      if (e.key === "ArrowLeft") navegar(-1);
    }
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [aberta, navegar]);

  return (
    <>
      <Stagger className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
        {imagens.map((path, i) => (
          <StaggerItem
            key={path}
            // a primeira foto ganha destaque ocupando duas colunas
            className={cn(i === 0 && total > 2 && "col-span-2 row-span-2")}
          >
            <button
              type="button"
              onClick={() => setAberta(i)}
              className="group relative block aspect-square w-full overflow-hidden rounded-2xl bg-muted"
              aria-label={`Ampliar foto ${i + 1} de ${total}`}
            >
              <Image
                src={urlDoStorage(path)!}
                alt=""
                fill
                sizes={i === 0 ? "(min-width: 768px) 66vw, 100vw" : "(min-width: 768px) 33vw, 50vw"}
                className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
              />
            </button>
          </StaggerItem>
        ))}
      </Stagger>

      <Dialog open={aberta !== null} onOpenChange={(abrir) => !abrir && setAberta(null)}>
        <DialogContent
          showCloseButton={false}
          className="max-w-[min(96vw,1200px)] border-0 bg-transparent p-0 shadow-none sm:max-w-[min(96vw,1200px)]"
        >
          <DialogTitle className="sr-only">
            {titulo} — foto {(aberta ?? 0) + 1} de {total}
          </DialogTitle>
          {aberta !== null && (
            <div className="relative h-[80svh] w-full">
              <Image src={urlDoStorage(imagens[aberta])!} alt="" fill sizes="96vw" className="object-contain" priority />
            </div>
          )}
          <div className="flex items-center justify-between text-white">
            <button
              type="button"
              onClick={() => navegar(-1)}
              className="flex size-11 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
              aria-label="Foto anterior"
            >
              <ChevronLeftIcon />
            </button>
            <span className="text-sm tabular-nums">
              {(aberta ?? 0) + 1} / {total}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => navegar(1)}
                className="flex size-11 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
                aria-label="Próxima foto"
              >
                <ChevronRightIcon />
              </button>
              <DialogClose className="flex size-11 items-center justify-center rounded-full bg-white/10 hover:bg-white/20">
                <XIcon />
                <span className="sr-only">Fechar</span>
              </DialogClose>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
