import type { StaticImageData } from "next/image";
import { imagens } from "@/lib/imagens";
import { cn } from "@/lib/utils";
import { Reveal } from "./fx/reveal";
import { TextReveal } from "./fx/text-reveal";
import { Rotulo, Tela } from "./tela";

/** Seção de conteúdo das páginas internas (tela cheia, fundo liso) */
export function Section({
  titulo,
  rotulo,
  descricao,
  fundo = "creme",
  className,
  children,
}: {
  titulo?: string;
  rotulo?: string;
  descricao?: string;
  fundo?: "creme" | "branco" | "tinta";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Tela fundo={fundo} conteudoClassName={className}>
      {(titulo || rotulo) && (
        <Reveal className="mb-14 max-w-2xl">
          {rotulo && <Rotulo>{rotulo}</Rotulo>}
          {titulo && <h2 className="font-display text-5xl leading-[1.05] sm:text-6xl">{titulo}</h2>}
          {descricao && <p className="mt-5 text-lg text-muted-foreground">{descricao}</p>}
        </Reveal>
      )}
      {children}
    </Tela>
  );
}

/** Abertura das páginas internas: foto em tela cheia e título grande embaixo */
export function PageHero({
  titulo,
  descricao,
  rotulo,
  imagem = imagens.paginaIgreja,
  posicao,
}: {
  titulo: string;
  descricao?: string;
  rotulo?: string;
  imagem?: StaticImageData | string;
  posicao?: string;
}) {
  return (
    <Tela imagem={imagem} posicao={posicao} prioridade className="justify-end" conteudoClassName="pb-20 sm:pb-24">
      {rotulo && (
        <Reveal>
          <p className="mb-5 text-xs font-medium tracking-[0.25em] text-white/80 uppercase">{rotulo}</p>
        </Reveal>
      )}
      <TextReveal
        as="h1"
        delay={0.1}
        className="max-w-4xl font-display text-[clamp(3rem,8vw,6.5rem)] leading-[0.95]"
        trechos={[{ texto: titulo }]}
      />
      {descricao && (
        <Reveal delay={0.5} className="mt-6 max-w-xl">
          <p className="text-lg text-white/85">{descricao}</p>
        </Reveal>
      )}
    </Tela>
  );
}

export function EmptyState({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <Reveal>
      <p className={cn("border-y border-border py-16 text-center text-muted-foreground", className)}>{children}</p>
    </Reveal>
  );
}
