"use client";

import Link from "next/link";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { CarteiraOpcao } from "@/lib/carteiras";

const NENHUMA = "nenhuma";

/** Seletor da conta (banco/caixa) de um lançamento */
export function CarteiraSelect({
  id,
  carteiras,
  value,
  onChange,
  invalido,
}: {
  id?: string;
  carteiras: CarteiraOpcao[];
  value: string | null;
  onChange: (id: string | null) => void;
  invalido?: boolean;
}) {
  if (!carteiras.length) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhuma conta cadastrada.{" "}
        <Link href="/app/financeiro/contas-e-caixa" className="text-primary underline-offset-4 hover:underline">
          Cadastre o banco e o caixa
        </Link>{" "}
        para acompanhar o saldo de cada um.
      </p>
    );
  }
  // uma conta desativada continua aparecendo no lançamento antigo que a usa
  return (
    <Select value={value ?? NENHUMA} onValueChange={(v) => onChange(v === NENHUMA ? null : v)}>
      <SelectTrigger id={id} className="w-full" aria-invalid={invalido}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NENHUMA}>Não informar</SelectItem>
        {carteiras
          .filter((c) => c.ativa || c.id === value)
          .map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.nome}
            </SelectItem>
          ))}
      </SelectContent>
    </Select>
  );
}
