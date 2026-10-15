"use client";

import { CrownIcon, Loader2Icon } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { ConfirmarExclusao } from "@/components/app/confirmar-exclusao";
import { Button } from "@/components/ui/button";
import { definirLider, removerMembro } from "./actions";

export function MembroAcoes({
  ministerioId,
  profileId,
  nome,
  isLider,
  podeDefinirLider,
  podeRemover,
}: {
  ministerioId: string;
  profileId: string;
  nome: string;
  isLider: boolean;
  podeDefinirLider: boolean;
  podeRemover: boolean;
}) {
  const [pending, startTransition] = useTransition();

  function alternarLider() {
    startTransition(async () => {
      const result = await definirLider(ministerioId, profileId, !isLider);
      if (result.ok) toast.success(result.message);
      else toast.error(result.error);
    });
  }

  return (
    <div className="flex items-center justify-end gap-1">
      {podeDefinirLider && (
        <Button variant="ghost" size="sm" onClick={alternarLider} disabled={pending}>
          {pending ? <Loader2Icon className="animate-spin" /> : <CrownIcon />}
          <span className="hidden sm:inline">{isLider ? "Remover liderança" : "Tornar líder"}</span>
        </Button>
      )}
      {podeRemover && (
        <ConfirmarExclusao
          somenteIcone
          rotulo="Remover"
          titulo={`Remover ${nome} do ministério?`}
          descricao={
            isLider
              ? "Esta pessoa é líder. Se não liderar outro ministério, volta a ser Membro."
              : "A pessoa deixa de fazer parte deste ministério."
          }
          acao={removerMembro.bind(null, ministerioId, profileId)}
        />
      )}
    </div>
  );
}
