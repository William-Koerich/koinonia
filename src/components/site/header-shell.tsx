"use client";

import { useMotionValueEvent, useScroll } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";
import { MobileNav } from "./mobile-nav";
import { navLinks } from "./nav-links";

/**
 * Header fixo: transparente (texto claro) sobre a foto de abertura e creme
 * com borda ao rolar. `acesso` é o botão Entrar/Minha área (vem do servidor,
 * pois depende da sessão).
 */
export function HeaderShell({ acesso }: { acesso: React.ReactNode }) {
  const pathname = usePathname();
  const { scrollY } = useScroll();
  const [rolou, setRolou] = useState(false);

  useMotionValueEvent(scrollY, "change", (y) => setRolou(y > 40));

  return (
    <header
      data-rolou={rolou}
      className={cn(
        "group/header fixed inset-x-0 top-0 z-50 transition-colors duration-500",
        rolou ? "border-b border-border bg-creme/90 text-tinta backdrop-blur-md" : "text-white",
      )}
    >
      <div className="mx-auto flex h-18 max-w-6xl items-center gap-6 px-5 sm:px-8">
        <MobileNav />
        <Link href="/" className="font-display text-2xl">
          {siteConfig.nome.replace("Igreja ", "")}
        </Link>

        <nav className="ml-auto hidden items-center gap-7 text-sm md:flex">
          {navLinks.map((link) => {
            const ativo = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "relative py-1 transition-opacity hover:opacity-100",
                  ativo ? "opacity-100" : "opacity-75",
                )}
              >
                {link.label}
                <span
                  className={cn(
                    "absolute -bottom-0.5 left-0 h-px w-full origin-left bg-current transition-transform duration-300",
                    ativo ? "scale-x-100" : "scale-x-0",
                  )}
                />
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto md:ml-2">{acesso}</div>
      </div>
    </header>
  );
}
