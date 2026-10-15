"use client";

import { motion, useScroll, useTransform } from "motion/react";
import Image, { type StaticImageData } from "next/image";
import { useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * Foto de fundo em tela cheia (hero e fechamento) com parallax sutil e um
 * degradê escuro só onde fica o texto, para a foto continuar aparecendo.
 */
export function ImagemFundo({
  src,
  posicao = "center",
  prioridade = false,
  className,
}: {
  /** Import estático (com blur de carregamento) ou URL (ex.: imagem do Storage) */
  src: StaticImageData | string;
  /** object-position, ex.: "center top" */
  posicao?: string;
  /** true só na primeira dobra: carrega a imagem com prioridade */
  prioridade?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["-6%", "6%"]);

  return (
    <div ref={ref} aria-hidden className={cn("absolute inset-0 -z-10 overflow-hidden bg-tinta", className)}>
      <motion.div className="absolute inset-x-0 inset-y-[-7%]" style={{ y }}>
        <Image
          src={src}
          alt=""
          fill
          sizes="100vw"
          placeholder={typeof src === "string" ? "empty" : "blur"}
          priority={prioridade}
          className="object-cover"
          style={{ objectPosition: posicao }}
        />
      </motion.div>
      <div className="absolute inset-0 bg-linear-to-t from-black/75 via-black/35 to-black/25" />
      {/* topo um pouco mais escuro para o menu ficar legível */}
      <div className="absolute inset-x-0 top-0 h-32 bg-linear-to-b from-black/45 to-transparent" />
    </div>
  );
}
