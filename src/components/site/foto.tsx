"use client";

import { motion } from "motion/react";
import Image, { type StaticImageData } from "next/image";
import { cn } from "@/lib/utils";
import { EASE_OUT } from "./fx/reveal";

/** Foto em painel ao lado do texto; a imagem "assenta" (leve zoom-out) ao aparecer */
export function Foto({
  src,
  alt = "",
  className,
  posicao = "center",
}: {
  src: StaticImageData;
  alt?: string;
  className?: string;
  posicao?: string;
}) {
  return (
    <div className={cn("relative overflow-hidden rounded-[2rem] bg-muted", className)}>
      <motion.div
        className="absolute inset-0"
        initial={{ scale: 1.12, opacity: 0 }}
        whileInView={{ scale: 1, opacity: 1 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 1.4, ease: EASE_OUT }}
      >
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(min-width: 1024px) 50vw, 100vw"
          placeholder="blur"
          className="object-cover"
          style={{ objectPosition: posicao }}
        />
      </motion.div>
    </div>
  );
}
