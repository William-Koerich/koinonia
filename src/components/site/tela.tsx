import type { StaticImageData } from "next/image";
import { cn } from "@/lib/utils";
import { ImagemFundo } from "./fx/imagem-fundo";

const FUNDOS = {
  creme: "bg-creme text-tinta",
  branco: "bg-white text-tinta",
  tinta: "bg-tinta text-creme",
};

/**
 * Seção que ocupa a tela inteira. Com `imagem`, a foto vira o fundo (texto
 * claro); sem ela, usa um fundo liso.
 */
export function Tela({
  imagem,
  posicao,
  prioridade,
  fundo = "creme",
  id,
  className,
  conteudoClassName,
  children,
}: {
  imagem?: StaticImageData | string;
  posicao?: string;
  prioridade?: boolean;
  fundo?: keyof typeof FUNDOS;
  id?: string;
  className?: string;
  conteudoClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className={cn(
        "relative isolate flex min-h-svh flex-col justify-center overflow-hidden",
        imagem ? "text-white" : FUNDOS[fundo],
        className,
      )}
    >
      {imagem && <ImagemFundo src={imagem} posicao={posicao} prioridade={prioridade} />}
      <div className={cn("relative mx-auto w-full max-w-6xl px-5 py-24 sm:px-8", conteudoClassName)}>{children}</div>
    </section>
  );
}

/** Rótulo pequeno acima dos títulos */
export function Rotulo({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("mb-5 text-xs font-medium tracking-[0.25em] text-destaque uppercase", className)}>{children}</p>;
}
