"use client";

import { MenuIcon, XIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { siteConfig } from "@/config/site";
import { navLinks } from "./nav-links";

const links = [{ href: "/", label: "Início" }, ...navLinks];

// true só no navegador, depois de montar (no servidor não há document)
const nadaAssinar = () => () => {};
const useMontado = () => useSyncExternalStore(nadaAssinar, () => true, () => false);

/**
 * Menu mobile em tela cheia, fundo creme, links grandes.
 *
 * O painel vai para fora do <header> via portal: o header ganha backdrop-blur
 * ao rolar, e `backdrop-filter` faz filhos `fixed` ficarem presos a ele em vez
 * de cobrirem a tela. O destino é o wrapper `.site`, que define as cores.
 */
export function MobileNav() {
  const [aberto, setAberto] = useState(false);
  const montado = useMontado();

  // trava a rolagem da página com o menu aberto
  useEffect(() => {
    document.body.style.overflow = aberto ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [aberto]);

  const painel = (
    <AnimatePresence>
      {aberto && (
        <motion.div
          className="fixed inset-0 z-70 flex h-dvh flex-col bg-creme text-tinta"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <div className="flex h-18 shrink-0 items-center justify-between border-b border-border px-5">
            <span className="font-display text-2xl">{siteConfig.nome.replace("Igreja ", "")}</span>
            <button
              type="button"
              onClick={() => setAberto(false)}
              className="-mr-2 flex size-10 items-center justify-center"
              aria-label="Fechar menu"
            >
              <XIcon className="size-5" />
            </button>
          </div>
          <nav className="flex flex-1 flex-col justify-center gap-1 overflow-y-auto px-5 py-6">
            {links.map((link, i) => (
              <motion.div
                key={link.href}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 + i * 0.04, duration: 0.35 }}
              >
                <Link href={link.href} onClick={() => setAberto(false)} className="block py-2 font-display text-4xl">
                  {link.label}
                </Link>
              </motion.div>
            ))}
          </nav>
          <p className="shrink-0 px-5 pb-10 font-display text-xl text-destaque italic">{siteConfig.tema}.</p>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="-ml-2 flex size-10 items-center justify-center md:hidden"
        aria-label="Abrir menu"
        aria-expanded={aberto}
      >
        <MenuIcon className="size-5" />
      </button>
      {montado && createPortal(painel, document.querySelector(".site") ?? document.body)}
    </>
  );
}
