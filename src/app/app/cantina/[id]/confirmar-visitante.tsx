"use client";

import { CheckCircle2Icon, Loader2Icon, UndoIcon } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { confirmarVisitante } from "./actions";

/** A equipe marca que o visitante pegou a cantina (nem todo visitante fica) */
export function ConfirmarVisitante({
  cantinaId,
  visitanteId,
  confirmado,
}: {
  cantinaId: string;
  visitanteId: string;
  confirmado: boolean;
}) {
  const [pending, startTransition] = useTransition();

  function alternar() {
    startTransition(async () => {
      const result = await confirmarVisitante(cantinaId, visitanteId, !confirmado);
      if (result.ok) toast.success(result.message);
      else toast.error(result.error);
    });
  }

  if (confirmado) {
    return (
      <div className="flex items-center gap-1">
        <span className="inline-flex items-center gap-1.5 text-sm">
          <CheckCircle2Icon className="size-4 text-emerald-600" /> Pegou a cantina
        </span>
        <Button size="icon" variant="ghost" className="size-8" onClick={alternar} disabled={pending} aria-label="Desfazer">
          {pending ? <Loader2Icon className="animate-spin" /> : <UndoIcon />}
        </Button>
      </div>
    );
  }

  return (
    <Button size="sm" variant="outline" onClick={alternar} disabled={pending}>
      {pending ? <Loader2Icon className="animate-spin" /> : <CheckCircle2Icon />} Pegou a cantina
    </Button>
  );
}
