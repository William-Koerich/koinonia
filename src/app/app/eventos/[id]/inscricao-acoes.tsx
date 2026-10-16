"use client";

import { CheckIcon, Loader2Icon, RotateCcwIcon, XIcon } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { ConfirmarExclusao } from "@/components/app/confirmar-exclusao";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/types";
import { decidirInscricao, removerInscricao } from "./actions";

/** Ações do responsável pelo evento (ou PASTOR/ADMIN) sobre uma inscrição */
export function InscricaoAcoes({
  eventoId,
  inscricaoId,
  nome,
  status,
}: {
  eventoId: string;
  inscricaoId: string;
  nome: string;
  status: "pendente" | "confirmada" | "recusada";
}) {
  const [pending, startTransition] = useTransition();

  function executar(acao: () => Promise<ActionResult>) {
    startTransition(async () => {
      const result = await acao();
      if (result.ok) toast.success(result.message);
      else toast.error(result.error);
    });
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-1">
      {pending && <Loader2Icon className="size-4 animate-spin text-muted-foreground" />}
      {status !== "confirmada" && (
        <Button size="sm" disabled={pending} onClick={() => executar(() => decidirInscricao(eventoId, inscricaoId, "confirmada"))}>
          <CheckIcon /> Confirmar
        </Button>
      )}
      {status === "pendente" && (
        <Button
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() => executar(() => decidirInscricao(eventoId, inscricaoId, "recusada"))}
        >
          <XIcon /> Recusar
        </Button>
      )}
      {status !== "pendente" && (
        <Button
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() => executar(() => decidirInscricao(eventoId, inscricaoId, "pendente"))}
          title="Voltar para pendente"
        >
          <RotateCcwIcon /> Desfazer
        </Button>
      )}
      <ConfirmarExclusao
        somenteIcone
        rotulo="Remover"
        titulo={`Remover a inscrição de ${nome}?`}
        descricao="A pessoa sai da lista de inscritos deste evento. Se já pagou, combine a devolução com ela."
        acao={removerInscricao.bind(null, eventoId, inscricaoId)}
      />
    </div>
  );
}
