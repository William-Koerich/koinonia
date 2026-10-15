"use client";

import { CheckIcon, ClockIcon, HandIcon, Loader2Icon, XIcon } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/types";
import { aprovarSolicitacao, removerSolicitacao, solicitarParticipacao } from "./actions";

function useAcao() {
  const [pending, startTransition] = useTransition();
  function executar(acao: () => Promise<ActionResult>) {
    startTransition(async () => {
      const result = await acao();
      if (result.ok) toast.success(result.message);
      else toast.error(result.error);
    });
  }
  return { pending, executar };
}

/** Botão do membro: pedir para participar ou cancelar o pedido pendente */
export function PedidoParticipacao({
  ministerioId,
  meuId,
  pendente,
  compacto = false,
}: {
  ministerioId: string;
  meuId: string;
  pendente: boolean;
  /** Versão para o card da lista de ministérios */
  compacto?: boolean;
}) {
  const { pending, executar } = useAcao();

  if (pendente && compacto) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <ClockIcon className="size-4" /> Aguardando aprovação
        </span>
        <Button
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() => executar(() => removerSolicitacao(ministerioId, meuId))}
        >
          Cancelar
        </Button>
      </div>
    );
  }

  if (pendente) {
    return (
      <div className="flex flex-col items-center gap-3">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <ClockIcon className="size-4" /> Pedido enviado — aguardando aprovação dos líderes.
        </p>
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => executar(() => removerSolicitacao(ministerioId, meuId))}
        >
          {pending && <Loader2Icon className="animate-spin" />}
          Cancelar pedido
        </Button>
      </div>
    );
  }

  return (
    <Button
      size={compacto ? "sm" : "default"}
      disabled={pending}
      onClick={() => executar(() => solicitarParticipacao(ministerioId))}
    >
      {pending ? <Loader2Icon className="animate-spin" /> : <HandIcon />}
      Quero participar
    </Button>
  );
}

/** Botões do líder/PASTOR/ADMIN para cada pedido pendente */
export function DecisaoPedido({ ministerioId, profileId }: { ministerioId: string; profileId: string }) {
  const { pending, executar } = useAcao();

  return (
    <div className="flex justify-end gap-1">
      <Button size="sm" disabled={pending} onClick={() => executar(() => aprovarSolicitacao(ministerioId, profileId))}>
        {pending ? <Loader2Icon className="animate-spin" /> : <CheckIcon />}
        Aprovar
      </Button>
      <Button
        size="sm"
        variant="ghost"
        disabled={pending}
        onClick={() => executar(() => removerSolicitacao(ministerioId, profileId))}
      >
        <XIcon /> Recusar
      </Button>
    </div>
  );
}
