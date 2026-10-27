import { ArrowLeftRightIcon, ArrowRightIcon, CheckIcon, XIcon } from "lucide-react";
import Link from "next/link";
import { BotaoAcao } from "@/components/app/botao-acao";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { primeiroNome, type TrocaAberta } from "@/lib/data/escala";
import { formatarData } from "@/lib/format";
import { cancelarTroca, decidirTroca, responderTroca } from "../actions";

/** Pedidos de troca em andamento, com as ações de cada um conforme o papel de quem vê */
export function TrocasPainel({
  trocas,
  meuId,
  gerencia,
  mostrarEscala = true,
}: {
  trocas: TrocaAberta[];
  meuId: string;
  gerencia: boolean;
  mostrarEscala?: boolean;
}) {
  if (!trocas.length) return null;

  return (
    <Card className="mb-6 border-primary/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ArrowLeftRightIcon className="size-4 text-primary" /> Pedidos de troca
          <Badge variant="secondary">{trocas.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="divide-y">
          {trocas.map((t) => {
            const souSubstituto = t.substituto_id === meuId;
            const souSolicitante = t.solicitante_id === meuId;
            const aguardandoSubstituto = t.status === "aguardando_substituto";
            const escala = t.atribuicao.escala;

            return (
              <li key={t.id} className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 space-y-0.5">
                  <p className="flex flex-wrap items-center gap-1.5 text-sm font-medium">
                    {souSolicitante ? "Você" : primeiroNome(t.solicitante?.nome_completo)}
                    <ArrowRightIcon className="size-3.5 text-muted-foreground" />
                    {souSubstituto ? "você" : primeiroNome(t.substituto?.nome_completo)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {mostrarEscala && (
                      <>
                        <Link href={`/app/escala/${escala.id}`} className="hover:underline">
                          {escala.descricao} ({formatarData(escala.data)})
                        </Link>
                        {" · "}
                      </>
                    )}
                    {t.atribuicao.funcao?.funcao}
                    {" · "}
                    {aguardandoSubstituto ? "aguardando o substituto aceitar" : "aguardando aprovação da liderança"}
                  </p>
                  {t.motivo && <p className="text-xs text-muted-foreground italic">“{t.motivo}”</p>}
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  {souSubstituto && aguardandoSubstituto && (
                    <>
                      <BotaoAcao acao={responderTroca.bind(null, t.id, true)} variant="default">
                        <CheckIcon /> Aceitar
                      </BotaoAcao>
                      <BotaoAcao acao={responderTroca.bind(null, t.id, false)} variant="outline">
                        Não posso
                      </BotaoAcao>
                    </>
                  )}
                  {gerencia && !aguardandoSubstituto && (
                    <BotaoAcao acao={decidirTroca.bind(null, t.id, true)} variant="default">
                      <CheckIcon /> Aprovar
                    </BotaoAcao>
                  )}
                  {gerencia && !(souSubstituto && aguardandoSubstituto) && (
                    <BotaoAcao acao={decidirTroca.bind(null, t.id, false)} variant="outline">
                      <XIcon /> Recusar
                    </BotaoAcao>
                  )}
                  {souSolicitante && !gerencia && (
                    <BotaoAcao acao={cancelarTroca.bind(null, t.id)} variant="outline">
                      Cancelar pedido
                    </BotaoAcao>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
