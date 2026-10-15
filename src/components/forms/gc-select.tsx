"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { descreverEncontro } from "@/lib/constants";

export type GcOpcao = {
  id: string;
  nome: string;
  bairro: string;
  dia_semana: number | null;
  horario: string | null;
};

const SEM_GC = "nenhum";

export function GcSelect({
  id,
  gcs,
  value,
  onChange,
}: {
  id?: string;
  gcs: GcOpcao[];
  value: string | null;
  onChange: (gcId: string | null) => void;
}) {
  return (
    <Select value={value ?? SEM_GC} onValueChange={(v) => onChange(v === SEM_GC ? null : v)}>
      <SelectTrigger id={id} className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={SEM_GC}>Nenhum</SelectItem>
        {gcs.map((gc) => (
          <SelectItem key={gc.id} value={gc.id}>
            {gc.nome}
            <span className="text-muted-foreground">
              {" — "}
              {[gc.bairro, descreverEncontro(gc.dia_semana, gc.horario)].filter(Boolean).join(" · ")}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
