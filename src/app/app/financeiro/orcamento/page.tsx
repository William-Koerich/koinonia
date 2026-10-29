import { ChevronLeftIcon, ChevronRightIcon, CopyIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { BotaoAcao } from "@/components/app/botao-acao";
import { ConfirmarExclusao } from "@/components/app/confirmar-exclusao";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireRole } from "@/lib/auth";
import { getOrcamento, type LinhaOrcamento } from "@/lib/data/financeiro";
import { formatarMoeda, formatarMoedaInput, hojeISO } from "@/lib/format";
import { ROLES_FINANCEIRO } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { copiarOrcamento, excluirOrcamento } from "./actions";
import { OrcamentoDialog } from "./orcamento-dialog";

export const metadata: Metadata = { title: "Orçamento" };

/** Fração do ano já passada (para comparar o gasto com o ritmo esperado) */
function fracaoDoAno(ano: number, hoje: string) {
  const anoAtual = Number(hoje.slice(0, 4));
  if (ano < anoAtual) return 1;
  if (ano > anoAtual) return 0;
  const inicio = Date.UTC(ano, 0, 1);
  const fim = Date.UTC(ano + 1, 0, 1);
  return (new Date(`${hoje}T12:00:00Z`).getTime() - inicio) / (fim - inicio);
}

export default async function OrcamentoPage({ searchParams }: PageProps<"/app/financeiro/orcamento">) {
  await requireRole(...ROLES_FINANCEIRO);
  const params = await searchParams;
  const hoje = hojeISO();
  const anoAtual = Number(hoje.slice(0, 4));
  const ano = /^\d{4}$/.test(String(params.ano)) ? Number(params.ano) : anoAtual;

  // contas recorrentes do ano precisam existir para entrar no "a pagar"
  if (ano >= anoAtual) {
    const supabase = await createClient();
    await supabase.rpc("koinonia_financeiro_gerar_contas", { p_ate: `${ano}-12-31` });
  }
  const linhas = await getOrcamento(ano);
  const ritmo = fracaoDoAno(ano, hoje);

  // ministérios com orçamento ou com gasto primeiro; o resto (sem nada) no fim
  const comAlgo = (l: LinhaOrcamento) => !!l.orcamento || l.realizado > 0 || l.aPagar > 0;
  const ordenadas = [...linhas.filter(comAlgo), ...linhas.filter((l) => !comAlgo(l))];
  const soma = (f: (l: LinhaOrcamento) => number) => linhas.reduce((t, l) => t + f(l), 0);
  const previsto = soma((l) => l.orcamento?.valor ?? 0);
  const realizado = soma((l) => l.realizado);
  const aPagar = soma((l) => l.aPagar);
  const semOrcamento = linhas.filter((l) => !l.orcamento && l.realizado > 0).reduce((t, l) => t + l.realizado, 0);
  const temAlgumOrcamento = linhas.some((l) => l.orcamento);

  return (
    <>
      <PageHeader
        titulo="Orçamento"
        descricao="Quanto cada ministério pode gastar no ano e quanto já gastou. Marque o ministério ao lançar cada conta a pagar."
      >
        {!temAlgumOrcamento && (
          <BotaoAcao acao={copiarOrcamento.bind(null, ano - 1, ano)} variant="outline" size="default">
            <CopyIcon /> Copiar de {ano - 1}
          </BotaoAcao>
        )}
      </PageHeader>

      <div className="mb-6 flex items-center gap-2">
        <Button asChild variant="outline" size="icon" aria-label="Ano anterior">
          <Link href={`/app/financeiro/orcamento?ano=${ano - 1}`}>
            <ChevronLeftIcon />
          </Link>
        </Button>
        <span className="min-w-16 text-center text-lg font-semibold tabular-nums">{ano}</span>
        <Button asChild variant="outline" size="icon" aria-label="Próximo ano">
          <Link href={`/app/financeiro/orcamento?ano=${ano + 1}`}>
            <ChevronRightIcon />
          </Link>
        </Button>
        {ano !== anoAtual && (
          <Button asChild variant="link" size="sm">
            <Link href="/app/financeiro/orcamento">Voltar para {anoAtual}</Link>
          </Button>
        )}
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { rotulo: "Previsto no ano", valor: previsto },
          { rotulo: "Já gasto (pago)", valor: realizado, detalhe: previsto ? `${Math.round((realizado / previsto) * 100)}% do previsto` : undefined },
          { rotulo: "Ainda a pagar no ano", valor: aPagar },
          {
            rotulo: "Disponível",
            valor: previsto - realizado - aPagar,
            detalhe: semOrcamento ? `${formatarMoeda(semOrcamento)} gastos sem orçamento definido` : undefined,
          },
        ].map((c) => (
          <Card key={c.rotulo} className="py-4">
            <CardContent className="px-4">
              <p className="text-xs text-muted-foreground">{c.rotulo}</p>
              <p className={cn("mt-1 text-xl font-semibold tabular-nums", c.valor < 0 && "text-destructive")}>{formatarMoeda(c.valor)}</p>
              {c.detalhe && <p className="mt-0.5 text-xs text-muted-foreground">{c.detalhe}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      {ritmo > 0 && ritmo < 1 && (
        <p className="mb-3 text-xs text-muted-foreground">
          A linha vertical em cada barra marca onde o gasto “deveria” estar hoje se fosse distribuído igualmente no ano (
          {Math.round(ritmo * 100)}%).
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ministério</TableHead>
              <TableHead className="text-right">Previsto</TableHead>
              <TableHead className="text-right">Gasto</TableHead>
              <TableHead className="hidden text-right md:table-cell">A pagar</TableHead>
              <TableHead className="min-w-40">Uso do orçamento</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {ordenadas.map((l) => {
              const valorPrevisto = l.orcamento?.valor ?? 0;
              const uso = valorPrevisto ? l.realizado / valorPrevisto : 0;
              const comprometido = valorPrevisto ? (l.realizado + l.aPagar) / valorPrevisto : 0;
              const estourou = valorPrevisto > 0 && l.realizado > valorPrevisto;
              return (
                <TableRow key={l.ministerioId ?? "geral"} className={cn(!comAlgo(l) && "text-muted-foreground")}>
                  <TableCell className="align-top">
                    <p className="font-medium">{l.nome}</p>
                    {l.orcamento?.observacao && <p className="text-xs text-muted-foreground">{l.orcamento.observacao}</p>}
                  </TableCell>
                  <TableCell className="text-right align-top tabular-nums">{valorPrevisto ? formatarMoeda(valorPrevisto) : "—"}</TableCell>
                  <TableCell className={cn("text-right align-top tabular-nums", estourou && "font-medium text-destructive")}>
                    {formatarMoeda(l.realizado)}
                  </TableCell>
                  <TableCell className="hidden text-right align-top tabular-nums md:table-cell">
                    {l.aPagar ? formatarMoeda(l.aPagar) : "—"}
                  </TableCell>
                  <TableCell className="align-top">
                    {valorPrevisto ? (
                      <div className="space-y-1">
                        <div
                          className="relative h-2.5 overflow-hidden rounded-full bg-muted"
                          role="meter"
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={Math.round(uso * 100)}
                          aria-label={`${Math.round(uso * 100)}% do orçamento gasto`}
                        >
                          {/* comprometido (gasto + a pagar) por trás, mais claro */}
                          <div
                            className="absolute inset-y-0 left-0 rounded-full bg-[var(--viz-despesa)] opacity-30"
                            style={{ width: `${Math.min(comprometido, 1) * 100}%` }}
                          />
                          <div
                            className={cn("absolute inset-y-0 left-0 rounded-full", estourou ? "bg-[var(--viz-negativo)]" : "bg-[var(--viz-despesa)]")}
                            style={{ width: `${Math.min(uso, 1) * 100}%` }}
                          />
                          {ritmo > 0 && ritmo < 1 && (
                            <div className="absolute inset-y-0 w-0.5 bg-foreground/60" style={{ left: `${ritmo * 100}%` }} />
                          )}
                        </div>
                        <p className={cn("text-xs tabular-nums", estourou ? "font-medium text-destructive" : "text-muted-foreground")}>
                          {Math.round(uso * 100)}%
                          {estourou
                            ? ` · passou ${formatarMoeda(l.realizado - valorPrevisto)}`
                            : ` · restam ${formatarMoeda(valorPrevisto - l.realizado)}`}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">{l.realizado ? "Sem orçamento definido" : "—"}</p>
                    )}
                  </TableCell>
                  <TableCell className="align-top">
                    <div className="flex justify-end">
                      <OrcamentoDialog
                        nome={l.nome}
                        gastoAnoPassado={l.anoPassado ? formatarMoeda(l.anoPassado) : null}
                        valores={{
                          ano,
                          ministerio_id: l.ministerioId,
                          valor: l.orcamento ? formatarMoedaInput(l.orcamento.valor.toFixed(2)) : "",
                          observacao: l.orcamento?.observacao ?? "",
                        }}
                      />
                      {l.orcamento && (
                        <ConfirmarExclusao
                          somenteIcone
                          rotulo="Remover"
                          titulo={`Remover o orçamento de ${l.nome}?`}
                          descricao="Os gastos continuam registrados; só o valor previsto é apagado."
                          acao={excluirOrcamento.bind(null, l.orcamento.id)}
                        />
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell>Total</TableCell>
              <TableCell className="text-right tabular-nums">{formatarMoeda(previsto)}</TableCell>
              <TableCell className="text-right tabular-nums">{formatarMoeda(realizado)}</TableCell>
              <TableCell className="hidden text-right tabular-nums md:table-cell">{formatarMoeda(aPagar)}</TableCell>
              <TableCell colSpan={2} />
            </TableRow>
          </TableFooter>
        </Table>
      </div>
    </>
  );
}
