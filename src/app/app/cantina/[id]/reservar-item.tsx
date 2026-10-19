"use client";

import { CheckCircle2Icon, HomeIcon, Loader2Icon, MinusIcon, PlusIcon, UtensilsIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { MODOS_CANTINA } from "@/lib/validation/cantina";
import { cancelarReserva, reservar } from "./actions";

type Modo = "levar" | "comer_aqui";
export type MinhaReserva = { quantidade: number; modo: Modo; observacao: string | null };

const ICONE_MODO = { comer_aqui: UtensilsIcon, levar: HomeIcon };

/** Reserva do membro para um item: quantidade, levar/comer na igreja e observação */
export function ReservarItem({
  cantinaId,
  itemId,
  minha,
  restante,
  encerrado,
}: {
  cantinaId: string;
  itemId: string;
  minha: MinhaReserva | null;
  /** unidades ainda livres (sem contar a reserva do próprio membro); null = sem limite */
  restante: number | null;
  encerrado: boolean;
}) {
  const [editando, setEditando] = useState(false);
  const [quantidade, setQuantidade] = useState(minha?.quantidade ?? 1);
  const [modo, setModo] = useState<Modo | null>(minha?.modo ?? null);
  const [observacao, setObservacao] = useState(minha?.observacao ?? "");
  const [pending, startTransition] = useTransition();

  // máximo que este membro pode reservar: o que sobrou + o que ele já tem
  const maximo = Math.min(50, restante === null ? 50 : restante + (minha?.quantidade ?? 0));
  const esgotado = maximo <= 0;

  function salvar() {
    if (!modo) {
      toast.error("Escolha se vai comer na igreja ou levar para casa.");
      return;
    }
    startTransition(async () => {
      const result = await reservar(cantinaId, itemId, { quantidade, modo, observacao });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message);
      setEditando(false);
    });
  }

  function cancelar() {
    startTransition(async () => {
      const result = await cancelarReserva(cantinaId, itemId);
      if (result.ok) {
        toast.success(result.message);
        setEditando(false);
        setQuantidade(1);
        setModo(null);
        setObservacao("");
      } else toast.error(result.error);
    });
  }

  // já reservou e não está editando
  if (minha && !editando) {
    const Icone = ICONE_MODO[minha.modo];
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm">
        <p className="flex items-center gap-2">
          <CheckCircle2Icon className="size-4 text-emerald-600" />
          <span>
            Você reservou <strong>{minha.quantidade}</strong> ·{" "}
            <Icone className="inline size-3.5" /> {MODOS_CANTINA.find((m) => m.value === minha.modo)?.label}
          </span>
        </p>
        {!encerrado && (
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" onClick={() => setEditando(true)} disabled={pending}>
              Alterar
            </Button>
            <Button size="sm" variant="ghost" className="text-destructive" onClick={cancelar} disabled={pending}>
              Cancelar
            </Button>
          </div>
        )}
      </div>
    );
  }

  if (encerrado) return <p className="text-sm text-muted-foreground">Reservas encerradas.</p>;
  if (esgotado) return <p className="text-sm font-medium text-destructive">Esgotado</p>;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        {/* quantidade */}
        <div className="flex items-center rounded-lg border">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Diminuir"
            disabled={quantidade <= 1}
            onClick={() => setQuantidade((q) => Math.max(1, q - 1))}
          >
            <MinusIcon />
          </Button>
          <span className="w-8 text-center font-medium tabular-nums" aria-live="polite">
            {quantidade}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Aumentar"
            disabled={quantidade >= maximo}
            onClick={() => setQuantidade((q) => Math.min(maximo, q + 1))}
          >
            <PlusIcon />
          </Button>
        </div>

        {/* comer na igreja ou levar */}
        <div className="flex gap-2" role="radiogroup" aria-label="Como vai consumir">
          {MODOS_CANTINA.map((m) => {
            const Icone = ICONE_MODO[m.value];
            return (
              <button
                key={m.value}
                type="button"
                role="radio"
                aria-checked={modo === m.value}
                onClick={() => setModo(m.value)}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-colors",
                  modo === m.value ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
                )}
              >
                <Icone className="size-4" /> {m.label}
              </button>
            );
          })}
        </div>
      </div>

      <Input
        placeholder="Observação (opcional, ex.: sem cebola)"
        maxLength={300}
        value={observacao}
        onChange={(e) => setObservacao(e.target.value)}
      />

      <div className="flex gap-2">
        <Button onClick={salvar} disabled={pending}>
          {pending && <Loader2Icon className="animate-spin" />}
          {minha ? "Salvar alteração" : "Reservar"}
        </Button>
        {editando && (
          <Button variant="ghost" onClick={() => setEditando(false)} disabled={pending}>
            Voltar
          </Button>
        )}
      </div>
    </div>
  );
}
