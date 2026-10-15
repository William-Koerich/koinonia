"use client";

import { SearchIcon, XIcon } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ROLE_LABEL } from "@/lib/permissions";

const TODOS = "todos";

/** Filtros da lista de usuários, guardados na URL (?q=&papel=&gc=&ministerio=&status=) */
export function Filtros({
  gcs,
  ministerios,
}: {
  gcs: { id: string; nome: string }[];
  ministerios: { id: string; nome: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [busca, setBusca] = useState(searchParams.get("q") ?? "");

  function atualizar(chave: string, valor: string | null) {
    const params = new URLSearchParams(searchParams);
    if (valor && valor !== TODOS) params.set(chave, valor);
    else params.delete(chave);
    startTransition(() => router.replace(`${pathname}?${params.toString()}`, { scroll: false }));
  }

  // busca com atraso para não recarregar a cada tecla
  useEffect(() => {
    if (busca === (searchParams.get("q") ?? "")) return;
    const timer = setTimeout(() => atualizar("q", busca.trim() || null), 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só reage à digitação
  }, [busca]);

  const temFiltro = ["q", "papel", "gc", "ministerio", "status"].some((k) => searchParams.has(k));

  return (
    <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto]">
      <InputGroup>
        <InputGroupAddon>
          <SearchIcon />
        </InputGroupAddon>
        <InputGroupInput
          placeholder="Buscar por nome, e-mail ou celular"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          aria-label="Buscar usuários"
        />
      </InputGroup>

      <Select value={searchParams.get("papel") ?? TODOS} onValueChange={(v) => atualizar("papel", v)}>
        <SelectTrigger className="w-full" aria-label="Filtrar por papel">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={TODOS}>Todos os papéis</SelectItem>
          {Object.entries(ROLE_LABEL).map(([valor, rotulo]) => (
            <SelectItem key={valor} value={valor}>
              {rotulo}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={searchParams.get("gc") ?? TODOS} onValueChange={(v) => atualizar("gc", v)}>
        <SelectTrigger className="w-full" aria-label="Filtrar por GC">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={TODOS}>Todos os GCs</SelectItem>
          <SelectItem value="sem">Sem GC</SelectItem>
          {gcs.map((gc) => (
            <SelectItem key={gc.id} value={gc.id}>
              {gc.nome}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={searchParams.get("ministerio") ?? TODOS} onValueChange={(v) => atualizar("ministerio", v)}>
        <SelectTrigger className="w-full" aria-label="Filtrar por ministério">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={TODOS}>Todos os ministérios</SelectItem>
          {ministerios.map((m) => (
            <SelectItem key={m.id} value={m.id}>
              {m.nome}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={searchParams.get("status") ?? TODOS} onValueChange={(v) => atualizar("status", v)}>
        <SelectTrigger className="w-full" aria-label="Filtrar por status">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={TODOS}>Ativos e inativos</SelectItem>
          <SelectItem value="ativos">Só ativos</SelectItem>
          <SelectItem value="inativos">Só inativos</SelectItem>
        </SelectContent>
      </Select>

      {temFiltro && (
        <Button
          variant="ghost"
          onClick={() => {
            setBusca("");
            startTransition(() => router.replace(pathname, { scroll: false }));
          }}
        >
          <XIcon /> Limpar
        </Button>
      )}
    </div>
  );
}
