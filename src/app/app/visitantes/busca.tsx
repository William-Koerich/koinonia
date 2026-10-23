"use client";

import { SearchIcon } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";

/** Busca por nome ou celular, guardada na URL (?q=) */
export function Busca() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [busca, setBusca] = useState(searchParams.get("q") ?? "");

  // com atraso, para não recarregar a cada tecla
  useEffect(() => {
    if (busca === (searchParams.get("q") ?? "")) return;
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams);
      if (busca.trim()) params.set("q", busca.trim());
      else params.delete("q");
      startTransition(() => router.replace(`${pathname}?${params.toString()}`, { scroll: false }));
    }, 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só reage à digitação
  }, [busca]);

  return (
    <InputGroup className="mb-4 sm:max-w-sm">
      <InputGroupAddon>
        <SearchIcon />
      </InputGroupAddon>
      <InputGroupInput
        placeholder="Buscar por nome ou celular"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        aria-label="Buscar visitantes"
      />
    </InputGroup>
  );
}
