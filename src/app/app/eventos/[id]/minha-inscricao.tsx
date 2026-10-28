"use client";

import { CheckCircle2Icon, ClockIcon, HourglassIcon, Loader2Icon, QrCodeIcon, XCircleIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { CopyButton } from "@/components/site/copy-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { formatarDataHora, formatarHora, formatarValorEvento } from "@/lib/format";
import type { ActionResult } from "@/lib/types";
import { cancelarInscricao, informarPagamento, inscrever } from "./actions";

type Inscricao = {
  status: "pendente" | "confirmada" | "recusada" | "espera";
  pagamento_informado_em: string | null;
  created_at: string;
  checkin_em: string | null;
};

export type DadosPix = { payload: string; qrSvg: string; chave: string; tipo: string };
export type Lotacao = { vagas: number | null; ocupadas: number; na_espera: number; minha_posicao: number | null };

/** "Restam 3 vagas" / "Esgotado · 2 na fila"; sem limite, nada */
function textoVagas(l: Lotacao | null) {
  if (!l?.vagas) return null;
  const restam = Math.max(l.vagas - l.ocupadas, 0);
  if (restam > 0) return `${restam} de ${l.vagas} ${l.vagas === 1 ? "vaga disponível" : "vagas disponíveis"}.`;
  return `Vagas esgotadas${l.na_espera ? ` · ${l.na_espera} na fila de espera` : ""}.`;
}

export function MinhaInscricao({
  eventoId,
  valor,
  inscricao,
  bloqueio,
  pix,
  lotacao,
  qrCheckin,
}: {
  eventoId: string;
  valor: number | null;
  inscricao: Inscricao | null;
  /** motivo para não poder se inscrever (encerrado, público) */
  bloqueio: string | null;
  pix: DadosPix | null;
  lotacao: Lotacao | null;
  /** SVG do QR Code de check-in (inscrição confirmada) */
  qrCheckin: string | null;
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
    const lotado = !!lotacao?.vagas && lotacao.ocupadas >= lotacao.vagas;
    return (
      <Card>
        <CardHeader>
          <CardTitle>Inscrição</CardTitle>
          <CardDescription>
            {lotado
              ? "O evento está lotado. Entre na fila de espera: se alguém desistir, a vaga é sua (na ordem da fila) e você é avisado."
              : valor === null
                ? "Evento gratuito: sua inscrição é confirmada na hora."
                : `Valor: ${formatarValorEvento(valor)}. Você paga por PIX depois de se inscrever.`}
          </CardDescription>
          {textoVagas(lotacao) && <p className="text-sm font-medium">{textoVagas(lotacao)}</p>}
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
                {lotado ? "Entrar na fila de espera" : "Quero me inscrever"}
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
        <CardContent className="space-y-5">
          <div className="flex items-start gap-3">
            <CheckCircle2Icon className="mt-0.5 size-6 shrink-0 text-emerald-600" />
            <div>
              <p className="font-medium">Inscrição confirmada!</p>
              <p className="text-sm text-muted-foreground">
                {inscricao.checkin_em
                  ? `Presença registrada às ${formatarHora(inscricao.checkin_em)}. Bom evento!`
                  : "Te esperamos no evento."}
              </p>
            </div>
          </div>
          {qrCheckin && !inscricao.checkin_em && (
            <div className="flex flex-col items-center gap-3 rounded-xl border bg-background p-4 sm:flex-row sm:items-center">
              <div
                className="w-44 shrink-0 rounded-lg bg-white p-2 [&>svg]:h-auto [&>svg]:w-full"
                role="img"
                aria-label="QR Code de check-in"
                // SVG gerado no servidor pela biblioteca qrcode a partir do código da inscrição
                dangerouslySetInnerHTML={{ __html: qrCheckin }}
              />
              <div className="space-y-1 text-center sm:text-left">
                <p className="flex items-center justify-center gap-1.5 font-medium sm:justify-start">
                  <QrCodeIcon className="size-4" /> Seu ingresso
                </p>
                <p className="text-sm text-muted-foreground">
                  Mostre este QR Code na entrada do evento para registrar sua presença. Dica: tire um print.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // ------------------------------------------------------- fila de espera
  if (inscricao.status === "espera") {
    return (
      <Card className="border-sky-500/40 bg-sky-500/5">
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <HourglassIcon className="mt-0.5 size-6 shrink-0 text-sky-600" />
            <div>
              <p className="font-medium">
                Você está na fila de espera
                {lotacao?.minha_posicao ? ` · ${lotacao.minha_posicao}º lugar` : ""}
              </p>
              <p className="text-sm text-muted-foreground">
                Se alguém desistir, a vaga é sua e você recebe um aviso
                {valor === null ? "." : ". Aí é só fazer o pagamento para garantir."}
              </p>
            </div>
          </div>
          <Button variant="outline" disabled={pending} onClick={() => executar(() => cancelarInscricao(eventoId))}>
            Sair da fila
          </Button>
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
            ? `Você avisou que pagou em ${formatarDataHora(inscricao.pagamento_informado_em)}. A tesouraria vai conferir e confirmar.`
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
