"use client";

import { CheckCircle2Icon, ClockIcon, Loader2Icon, XCircleIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { CopyButton } from "@/components/site/copy-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { formatarDataHora, formatarValorEvento } from "@/lib/format";
import type { ActionResult } from "@/lib/types";
import { cancelarInscricao, informarPagamento, inscrever } from "./actions";

type Inscricao = {
  status: "pendente" | "confirmada" | "recusada";
  pagamento_informado_em: string | null;
  created_at: string;
};

export type DadosPix = { payload: string; qrSvg: string; chave: string; tipo: string };

export function MinhaInscricao({
  eventoId,
  valor,
  inscricao,
  bloqueio,
  pix,
}: {
  eventoId: string;
  valor: number | null;
  inscricao: Inscricao | null;
  /** motivo para não poder se inscrever (encerrado, público) */
  bloqueio: string | null;
  pix: DadosPix | null;
}) {
  const [pending, startTransition] = useTransition();
  const [observacao, setObservacao] = useState("");

  function executar(acao: () => Promise<ActionResult>) {
    startTransition(async () => {
      const result = await acao();
      if (result.ok) toast.success(result.message);
      else toast.error(result.error);
    });
  }

  // ------------------------------------------------------- sem inscrição
  if (!inscricao) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Inscrição</CardTitle>
          <CardDescription>
            {valor === null ? "Evento gratuito: sua inscrição é confirmada na hora." : `Valor: ${formatarValorEvento(valor)}. Você paga por PIX depois de se inscrever.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {bloqueio ? (
            <p className="text-sm text-muted-foreground">{bloqueio}</p>
          ) : (
            <>
              <Field>
                <FieldLabel htmlFor="observacao">Observação</FieldLabel>
                <Textarea
                  id="observacao"
                  rows={2}
                  maxLength={500}
                  placeholder="Opcional (ex.: restrição alimentar, vou com acompanhante)"
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                />
                <FieldDescription>Visível só para o responsável pelo evento.</FieldDescription>
              </Field>
              <Button disabled={pending} onClick={() => executar(() => inscrever(eventoId, observacao))}>
                {pending && <Loader2Icon className="animate-spin" />}
                Quero me inscrever
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  // ------------------------------------------------------- confirmada
  if (inscricao.status === "confirmada") {
    return (
      <Card className="border-emerald-500/40 bg-emerald-500/5">
        <CardContent className="flex items-start gap-3">
          <CheckCircle2Icon className="mt-0.5 size-6 shrink-0 text-emerald-600" />
          <div>
            <p className="font-medium">Inscrição confirmada!</p>
            <p className="text-sm text-muted-foreground">Te esperamos no evento.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ------------------------------------------------------- recusada
  if (inscricao.status === "recusada") {
    return (
      <Card className="border-destructive/40 bg-destructive/5">
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <XCircleIcon className="mt-0.5 size-6 shrink-0 text-destructive" />
            <div>
              <p className="font-medium">Inscrição não aprovada</p>
              <p className="text-sm text-muted-foreground">
                Fale com o responsável pelo evento. Se quiser, você pode remover e se inscrever de novo.
              </p>
            </div>
          </div>
          <Button variant="outline" disabled={pending} onClick={() => executar(() => cancelarInscricao(eventoId))}>
            Remover inscrição
          </Button>
        </CardContent>
      </Card>
    );
  }

  // ------------------------------------------------------- pendente (pagamento)
  return (
    <Card className="border-amber-500/40 bg-amber-500/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClockIcon className="size-5 text-amber-600" /> Inscrição aguardando pagamento
        </CardTitle>
        <CardDescription>
          {inscricao.pagamento_informado_em
            ? `Você avisou que pagou em ${formatarDataHora(inscricao.pagamento_informado_em)}. O responsável vai conferir e confirmar.`
            : `Pague ${formatarValorEvento(valor)} por PIX e depois toque em “Já paguei”.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {pix ? (
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <div
              className="w-40 shrink-0 rounded-xl bg-white p-3 [&>svg]:h-auto [&>svg]:w-full"
              role="img"
              aria-label={`QR Code PIX de ${formatarValorEvento(valor)}`}
              // SVG gerado no servidor pela biblioteca qrcode a partir do payload PIX
              dangerouslySetInnerHTML={{ __html: pix.qrSvg }}
            />
            <div className="min-w-0 space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Valor</p>
                <p className="text-2xl font-semibold">{formatarValorEvento(valor)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Chave PIX ({pix.tipo})</p>
                <p className="font-mono text-sm break-all">{pix.chave}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <CopyButton texto={pix.payload} label="PIX copia e cola" mensagem="Código PIX copiado!" />
                <CopyButton texto={pix.chave} label="Copiar chave" mensagem="Chave copiada!" />
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Os dados de PIX da igreja ainda não foram cadastrados. Combine o pagamento com o responsável pelo evento.
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          {!inscricao.pagamento_informado_em && (
            <Button disabled={pending} onClick={() => executar(() => informarPagamento(eventoId))}>
              {pending && <Loader2Icon className="animate-spin" />}
              Já paguei
            </Button>
          )}
          <Button variant="ghost" disabled={pending} onClick={() => executar(() => cancelarInscricao(eventoId))}>
            Cancelar inscrição
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
