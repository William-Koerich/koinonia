"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { EASE_OUT } from "./reveal";

export type Trecho = { texto: string; className?: string; quebra?: boolean };

/**
 * Título que entra palavra por palavra (cada palavra sobe de dentro de uma
 * máscara). Usado com parcimônia: só nos títulos de abertura.
 */
export function TextReveal({
  trechos,
  as: Tag = "h2",
  className,
  delay = 0,
}: {
  trechos: Trecho[];
  as?: "h1" | "h2";
  className?: string;
  delay?: number;
}) {
  const MotionTag = motion[Tag];
  let indice = 0;

  return (
    <MotionTag
      className={className}
      initial="hidden"
      animate="show"
      transition={{ staggerChildren: 0.08, delayChildren: delay }}
      aria-label={trechos.map((t) => t.texto).join(" ")}
    >
      {trechos.map((trecho, t) => (
        <span key={t} aria-hidden>
          {trecho.quebra && <br />}
          {trecho.texto.split(" ").map((palavra) => {
            indice++;
            return (
              <span key={indice} className="inline-block overflow-hidden pb-[0.1em] align-bottom">
                <motion.span
                  className={cn("inline-block", trecho.className)}
                  variants={{
                    hidden: { y: "105%" },
                    show: { y: "0%", transition: { duration: 1, ease: EASE_OUT } },
                  }}
                >
                  {palavra}
                </motion.span>
                {" "}
              </span>
            );
          })}
        </span>
      ))}
    </MotionTag>
  );
}
