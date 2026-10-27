"use client";

import { ArrowLeftRightIcon, CheckIcon, Loader2Icon, XIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { BotaoAcao } from "@/components/app/botao-acao";
import { PessoaCombobox } from "@/components/forms/pessoa-combobox";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import type { Enums } from "@/lib/types";
import { cancelarTroca, candidatosTroca, responderEscala, solicitarTroca } from "../actions";
import { StatusResposta } from "./status-resposta";

export type TrocaPendente = { id: string; substituto: string; status: Enums<"koinonia_escala_troca_status"> };

/**
 * Ações de quem está escalado: confirmar, avisar que não pode (com motivo) ou
 * pedir para outro voluntário da função assumir a vaga.
 */
export function MinhaResposta({
  atribuicaoId,
  resposta,
  troca,
}: {
  atribuicaoId: string;
  resposta: Enums<"koinonia_escala_resposta">;
  troca: TrocaPendente | null;
}) {
  if (troca) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-xs text-muted-foreground">
          <ArrowLeftRightIcon className="mr-1 inline size-3.5" />
          Troca com {troca.substituto}:{" "}
          {troca.status === "aguardando_substituto" ? "aguardando a resposta dele(a)" : "aguardando a liderança aprovar"}
        </p>
        <BotaoAcao acao={() => cancelarTroca(troca.id)} size="xs">
          Cancelar pedido
        </BotaoAcao>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {resposta === "pendente" ? (
        <BotaoAcao acao={() => responderEscala(atribuicaoId, true)} variant="default" size="sm">
          <CheckIcon /> Confirmar presença
        </BotaoAcao>
      ) : (
        <StatusResposta resposta={resposta} />
      )}
      {resposta === "recusado" ? (
        <BotaoAcao acao={() => responderEscala(atribuicaoId, true)} variant="outline" size="sm">
          Posso servir, sim
        </BotaoAcao>
      ) : (
        <>
          <NaoPossoDialog atribuicaoId={atribuicaoId} />
          <PedirTrocaDialog atribuicaoId={atribuicaoId} />
        </>
      )}
    </div>
  );
}

function NaoPossoDialog({ atribuicaoId }: { atribuicaoId: string }) {
  const [aberto, setAberto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [pending, startTransition] = useTransition();

  function enviar() {
    startTransition(async () => {
      const result = await responderEscala(atribuicaoId, false, motivo);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message);
      setAberto(false);
    });
  }

  return (
    <Dialog
      open={aberto}
      onOpenChange={(abrir) => {
        setAberto(abrir);
        if (abrir) setMotivo("");
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <XIcon /> Não posso
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Não vai poder servir?</DialogTitle>
          <DialogDescription>
            A liderança será avisada para escolher outra pessoa. Se você já combinou com alguém, use “Pedir troca”.
          </DialogDescription>
        </DialogHeader>
        <Field className="py-2">
          <FieldLabel htmlFor={`motivo-${atribuicaoId}`}>Motivo</FieldLabel>
          <Textarea
            id={`motivo-${atribuicaoId}`}
            rows={3}
            maxLength={300}
            placeholder="Opcional (ex.: vou viajar, plantão no trabalho)"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
          />
        </Field>
        <DialogFooter>
          <Button variant="destructive" onClick={enviar} disabled={pending}>
            {pending && <Loader2Icon className="animate-spin" />}
            Avisar que não posso
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type Candidato = { id: string; nome_completo: string; indisponivel: boolean };

function PedirTrocaDialog({ atribuicaoId }: { atribuicaoId: string }) {
  const [aberto, setAberto] = useState(false);
  const [candidatos, setCandidatos] = useState<Candidato[] | null>(null);
  const [substituto, setSubstituto] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("");
  const [carregando, startCarregar] = useTransition();
  const [pending, startTransition] = useTransition();

  function abrir(valor: boolean) {
    setAberto(valor);
    if (!valor) return;
    setSubstituto(null);
    setMotivo("");
    startCarregar(async () => {
      const result = await candidatosTroca(atribuicaoId);
      if (!result.ok) {
        toast.error(result.error);
        setAberto(false);
        return;
      }
      setCandidatos(result.data ?? []);
    });
  }

  function enviar() {
    if (!substituto) {
      toast.error("Escolha quem vai assumir.");
      return;
    }
    startTransition(async () => {
      const result = await solicitarTroca(atribuicaoId, substituto, motivo);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message);
      setAberto(false);
    });
  }

  const indisponiveis = new Set(candidatos?.filter((c) => c.indisponivel).map((c) => c.id));
  const avisos = new Map([...indisponiveis].map((id) => [id, "Marcou que não pode neste dia"]));

  return (
    <Dialog open={aberto} onOpenChange={abrir}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <ArrowLeftRightIcon /> Pedir troca
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pedir troca</DialogTitle>
          <DialogDescription>
            Escolha quem vai servir no seu lugar. A pessoa recebe o pedido e, se aceitar, a liderança aprova a troca.
            Até lá, você continua na escala.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <Field>
            <FieldLabel>Quem assume</FieldLabel>
            {carregando || !candidatos ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2Icon className="size-4 animate-spin" /> Carregando voluntários...
              </p>
            ) : candidatos.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Ninguém mais serviu nesta função ainda. Fale com a liderança ou use “Não posso”.
              </p>
            ) : (
              <PessoaCombobox
                pessoas={candidatos}
                value={substituto}
                onChange={setSubstituto}
                placeholder="Escolher voluntário"
                desabilitarIds={indisponiveis}
                avisos={avisos}
              />
            )}
            <FieldDescription>Aparecem as pessoas que já serviram nesta função.</FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor={`troca-motivo-${atribuicaoId}`}>Mensagem</FieldLabel>
            <Textarea
              id={`troca-motivo-${atribuicaoId}`}
              rows={2}
              maxLength={300}
              placeholder="Opcional (ex.: vou viajar, te cubro no próximo)"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
            />
          </Field>
        </div>
        <DialogFooter>
          <Button onClick={enviar} disabled={pending || !candidatos?.length}>
            {pending && <Loader2Icon className="animate-spin" />}
            Enviar pedido
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
