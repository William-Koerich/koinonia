"use client";

import { ArrowUpIcon, CheckIcon, Loader2Icon, RotateCcwIcon, XIcon } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { ConfirmarExclusao } from "@/components/app/confirmar-exclusao";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/types";
import { decidirInscricao, liberarDaFila, removerInscricao } from "./actions";
import { ConfirmarPagamento } from "./confirmar-pagamento";

/**
 * Ações do responsável pelo evento (ou PASTOR/ADMIN) sobre uma inscrição.
 * Em evento pago, confirmar ou desfazer o pagamento é com a tesouraria.
 */
export function InscricaoAcoes({
  eventoId,
  inscricaoId,
  nome,
  status,
  pago,
  podeFinanceiro,
}: {
  eventoId: string;
  inscricaoId: string;
  nome: string;
  status: "pendente" | "confirmada" | "recusada" | "espera";
  pago: boolean;
  podeFinanceiro: boolean;
}) {
  const [pending, startTransition] = useTransition();

  function executar(acao: () => Promise<ActionResult>) {
    startTransition(async () => {
      const result = await acao();
      if (result.ok) toast.success(result.message);
      else toast.error(result.error);
    });
  }

  const podeConfirmar = !pago || podeFinanceiro;

  return (
    <div className="flex flex-wrap items-center justify-end gap-1">
      {pending && <Loader2Icon className="size-4 animate-spin text-muted-foreground" />}
      {status === "espera" && (
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          title="Passa do limite de vagas do evento"
          onClick={() => executar(() => liberarDaFila(eventoId, inscricaoId, pago))}
        >
          <ArrowUpIcon /> Liberar vaga extra
        </Button>
      )}
      {(status === "pendente" || status === "recusada") &&
        (pago && podeFinanceiro ? (
          <ConfirmarPagamento eventoId={eventoId} inscricaoId={inscricaoId} nome={nome} />
        ) : podeConfirmar ? (
          <Button size="sm" disabled={pending} onClick={() => executar(() => decidirInscricao(eventoId, inscricaoId, "confirmada"))}>
            <CheckIcon /> Confirmar
          </Button>
        ) : (
          <span className="px-2 text-xs text-muted-foreground">Pagamento: com a tesouraria</span>
        ))}
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
      {(status === "recusada" || (status === "confirmada" && podeConfirmar)) && (
        <Button
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() => executar(() => decidirInscricao(eventoId, inscricaoId, "pendente"))}
          title={status === "confirmada" && pago ? "Volta para pendente e apaga a entrada no financeiro" : "Voltar para pendente"}
        >
          <RotateCcwIcon /> Desfazer
        </Button>
      )}
      <ConfirmarExclusao
        somenteIcone
        rotulo="Remover"
        titulo={`Remover a inscrição de ${nome}?`}
        descricao={
          status === "espera"
            ? "A pessoa sai da fila de espera deste evento."
            : "A pessoa sai da lista de inscritos e a vaga vai para o primeiro da fila de espera. Se já pagou, combine a devolução com ela (a entrada continua no financeiro)."
        }
        acao={removerInscricao.bind(null, eventoId, inscricaoId)}
      />
    </div>
  );
}
