"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";
import { COOKIE_FLASH, type Flash } from "@/lib/flash-tipos";

/** Mostra a mensagem deixada por uma action antes de redirecionar (ver lib/flash.ts) */
export function FlashToast() {
  const pathname = usePathname();

  useEffect(() => {
    const bruto = document.cookie
      .split("; ")
      .find((c) => c.startsWith(`${COOKIE_FLASH}=`))
      ?.slice(COOKIE_FLASH.length + 1);
    if (!bruto) return;
    document.cookie = `${COOKIE_FLASH}=; Max-Age=0; path=/`;
    try {
      const { tipo, mensagem } = JSON.parse(decodeURIComponent(bruto)) as Flash;
      if (tipo === "erro") toast.error(mensagem);
      else if (tipo === "info") toast.info(mensagem);
      else toast.success(mensagem);
    } catch {}
  }, [pathname]);

  return null;
}
