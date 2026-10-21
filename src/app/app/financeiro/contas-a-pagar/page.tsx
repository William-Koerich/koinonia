import { RepeatIcon, ReceiptIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ConfirmarExclusao } from "@/components/app/confirmar-exclusao";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireRole } from "@/lib/auth";
import { formatarData, formatarMoeda, formatarMoedaInput, hojeISO } from "@/lib/format";
import { ROLES_FINANCEIRO } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { fimDoMes, mesValido, rotuloDespesa, rotuloForma, rotuloFrequencia, somarMes } from "@/lib/validation/financeiro";
import { MesNavegacao } from "../_componentes/mes-navegacao";
import { TotalCard } from "../_componentes/total-card";
import { desfazerPagamento, excluirConta, reativarConta } from "./actions";
import { BotaoAcao } from "./botao-acao";
import { ContaDialog } from "./conta-dialog";
import { PagarDialog } from "./pagar-dialog";

export const metadata: Metadata = { title: "Contas a pagar" };

const FILTROS = ["a-pagar", "pagas", "vencidas"] as const;
type Filtro = (typeof FILTROS)[number];

export default async function ContasAPagarPage({ searchParams }: PageProps<"/app/financeiro/contas-a-pagar">) {
  await requireRole(...ROLES_FINANCEIRO);

  return (
    <Suspense fallback={<Carregando />}>
      <Contas searchParams={searchParams} />
    </Suspense>
  );
}

async function Contas({ searchParams }: Pick<PageProps<"/app/financeiro/contas-a-pagar">, "searchParams">) {
  const params = await searchParams;
  const hoje = hojeISO();
  const mesAtual = hoje.slice(0, 7);
  const mes = mesValido(params.mes, mesAtual);
  const filtro = FILTROS.includes(params.filtro as Filtro) ? (params.filtro as Filtro) : null;

  const supabase = await createClient();
  // gera as contas recorrentes do mês visto (no mínimo até o mês que vem); idempotente
  const ate = fimDoMes(mes > somarMes(mesAtual, 1) ? mes : somarMes(mesAtual, 1));
  const { error: erroGerar } = await supabase.rpc("koinonia_financeiro_gerar_contas", { p_ate: ate });
  if (erroGerar) throw new Error(erroGerar.message);

  const colunas =
    "id, descricao, categoria, fornecedor, valor, vencimento, status, pago_em, valor_pago, forma_pagamento, observacao, recorrencia_id, ocorrencia, recorrencia:koinonia_financeiro_recorrencias(frequencia, parcelas)";
  const [{ data: doMes, error }, { data: vencidas, error: erroVencidas }] = await Promise.all([
    supabase
      .from("koinonia_financeiro_contas")
      .select(colunas)
      .gte("vencimento", `${mes}-01`)
      .lte("vencimento", fimDoMes(mes))
      .order("vencimento")
      .order("descricao"),
    // vencidas de qualquer mês, para não passar despercebido
    supabase
      .from("koinonia_financeiro_contas")
      .select(colunas)
      .eq("status", "pendente")
      .lt("vencimento", hoje)
      .order("vencimento")
      .order("descricao"),
  ]);
  if (error) throw new Error(error.message);
  if (erroVencidas) throw new Error(erroVencidas.message);

  const ativas = doMes.filter((c) => c.status !== "cancelada");
  const soma = (lista: { valor: number | string }[]) => lista.reduce((t, c) => t + Number(c.valor), 0);
  const pagas = ativas.filter((c) => c.status === "paga");
  const aPagar = ativas.filter((c) => c.status === "pendente");
  const totalPago = pagas.reduce((t, c) => t + Number(c.valor_pago ?? c.valor), 0);

  const lista =
    filtro === "vencidas" ? vencidas : filtro === "pagas" ? pagas : filtro === "a-pagar" ? aPagar : doMes;

  const link = (novo: { mes?: string; filtro?: Filtro | null }) => {
    const p = new URLSearchParams();
    const m = novo.mes ?? mes;
    if (m !== mesAtual) p.set("mes", m);
    const f = novo.filtro === undefined ? filtro : novo.filtro;
    if (f) p.set("filtro", f);
    const qs = p.toString();
    return qs ? `/app/financeiro/contas-a-pagar?${qs}` : "/app/financeiro/contas-a-pagar";
  };
  const alternar = (f: Filtro) => link({ filtro: filtro === f ? null : f });

  const vencimentoPadrao = mes === mesAtual ? hoje : `${mes}-01`;

  return (
    <>
      <PageHeader titulo="Contas a pagar" descricao="Despesas da igreja, avulsas e recorrentes.">
        <Button asChild variant="outline">
          <Link href="/app/financeiro/contas-a-pagar/recorrentes">
            <RepeatIcon /> Contas recorrentes
          </Link>
        </Button>
        <ContaDialog vencimentoPadrao={vencimentoPadrao} />
      </PageHeader>

      <MesNavegacao mes={mes} mesAtual={mesAtual} link={(m) => link({ mes: m })} />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <TotalCard
          rotulo="Total do mês"
          valor={soma(ativas)}
          detalhe={`${ativas.length} ${ativas.length === 1 ? "conta" : "contas"}`}
          href={link({ filtro: null })}
          ativo={!filtro}
          destaque
        />
        <TotalCard
          rotulo="A pagar no mês"
          valor={soma(aPagar)}
          detalhe={`${aPagar.length} em aberto`}
          href={alternar("a-pagar")}
          ativo={filtro === "a-pagar"}
        />
        <TotalCard
          rotulo="Pago no mês"
          valor={totalPago}
          detalhe={`${pagas.length} ${pagas.length === 1 ? "paga" : "pagas"}`}
          href={alternar("pagas")}
          ativo={filtro === "pagas"}
          tom="sucesso"
        />
        <TotalCard
          rotulo="Vencidas (todos os meses)"
          valor={soma(vencidas)}
          detalhe={vencidas.length ? `${vencidas.length} sem pagamento` : "Nenhuma"}
          href={alternar("vencidas")}
          ativo={filtro === "vencidas"}
          tom="alerta"
        />
      </div>

      {lista.length === 0 ? (
        <EmptyState
          icone={ReceiptIcon}
          titulo={filtro === "vencidas" ? "Nenhuma conta vencida" : "Nenhuma conta neste mês"}
          descricao={filtro ? undefined : "Use “Nova conta” para lançar uma despesa avulsa ou recorrente."}
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vencimento</TableHead>
                <TableHead>Conta</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Situação</TableHead>
                <TableHead className="w-32" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {lista.map((c) => {
                const vencida = c.status === "pendente" && c.vencimento < hoje;
                const venceHoje = c.status === "pendente" && c.vencimento === hoje;
                const cancelada = c.status === "cancelada";
                const repeticao = c.recorrencia
                  ? c.recorrencia.parcelas
                    ? `Parcela ${c.ocorrencia} de ${c.recorrencia.parcelas}`
                    : rotuloFrequencia(c.recorrencia.frequencia)
                  : null;
                return (
                  <TableRow key={c.id} className={cn(cancelada && "opacity-50")}>
                    <TableCell className="align-top whitespace-nowrap tabular-nums">
                      <span className={cn(vencida && "font-medium text-destructive")}>{formatarData(c.vencimento)}</span>
                    </TableCell>
                    <TableCell className="align-top">
                      <p className={cn("font-medium", cancelada && "line-through")}>{c.descricao}</p>
                      <p className="text-xs text-muted-foreground">
                        {[rotuloDespesa(c.categoria), c.fornecedor].filter(Boolean).join(" · ")}
                      </p>
                      {repeticao && (
                        <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <RepeatIcon className="size-3" /> {repeticao}
                        </p>
                      )}
                      {c.observacao && <p className="text-xs text-muted-foreground italic">{c.observacao}</p>}
                    </TableCell>
                    <TableCell className="text-right align-top font-medium whitespace-nowrap tabular-nums">
                      {formatarMoeda(Number(c.valor))}
                      {c.status === "paga" && c.valor_pago !== null && Number(c.valor_pago) !== Number(c.valor) && (
                        <p className="text-xs font-normal text-muted-foreground">pago {formatarMoeda(Number(c.valor_pago))}</p>
                      )}
                    </TableCell>
                    <TableCell className="align-top">
                      {c.status === "paga" ? (
                        <div>
                          <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">Paga</Badge>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {c.pago_em && formatarData(c.pago_em)}
                            {c.forma_pagamento && ` · ${rotuloForma(c.forma_pagamento)}`}
                          </p>
                        </div>
                      ) : cancelada ? (
                        <Badge variant="secondary">Cancelada</Badge>
                      ) : vencida ? (
                        <Badge variant="destructive">Vencida</Badge>
                      ) : venceHoje ? (
                        <Badge className="bg-amber-500 text-white hover:bg-amber-500">Vence hoje</Badge>
                      ) : (
                        <Badge variant="outline">A pagar</Badge>
                      )}
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="flex items-center justify-end gap-1">
                        {c.status === "pendente" && (
                          <PagarDialog
                            contaId={c.id}
                            descricao={`${c.descricao} — vence ${formatarData(c.vencimento)}`}
                            valores={{
                              pago_em: hoje,
                              valor_pago: formatarMoedaInput(Number(c.valor).toFixed(2)),
                              forma_pagamento: "pix",
                            }}
                          />
                        )}
                        {c.status === "paga" && (
                          <BotaoAcao acao={desfazerPagamento.bind(null, c.id)}>Desfazer</BotaoAcao>
                        )}
                        {cancelada && <BotaoAcao acao={reativarConta.bind(null, c.id)}>Reativar</BotaoAcao>}
                        {c.status === "pendente" && (
                          <ContaDialog
                            vencimentoPadrao={vencimentoPadrao}
                            conta={{
                              id: c.id,
                              recorrente: !!c.recorrencia_id,
                              valores: {
                                descricao: c.descricao,
                                categoria: c.categoria,
                                fornecedor: c.fornecedor ?? "",
                                valor: formatarMoedaInput(Number(c.valor).toFixed(2)),
                                vencimento: c.vencimento,
                                observacao: c.observacao ?? "",
                                repetir: "nao",
                                termino: "nunca",
                                data_fim: "",
                                parcelas: "",
                              },
                            }}
                          />
                        )}
                        {!cancelada && (
                          <ConfirmarExclusao
                            somenteIcone
                            rotulo={c.recorrencia_id ? "Cancelar" : "Excluir"}
                            titulo={c.recorrencia_id ? "Cancelar só esta conta?" : "Excluir esta conta?"}
                            descricao={
                              c.recorrencia_id
                                ? "Só esta ocorrência é cancelada; as próximas continuam. Para parar de vez, encerre a recorrência em “Contas recorrentes”."
                                : `${c.descricao} — ${formatarMoeda(Number(c.valor))}, vencimento ${formatarData(c.vencimento)}.`
                            }
                            acao={excluirConta.bind(null, c.id)}
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
                <TableCell colSpan={2}>
                  {lista.length} {lista.length === 1 ? "conta" : "contas"}
                </TableCell>
                <TableCell className="text-right font-semibold whitespace-nowrap tabular-nums">
                  {formatarMoeda(soma(lista.filter((c) => c.status !== "cancelada")))}
                </TableCell>
                <TableCell colSpan={2} />
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      )}
    </>
  );
}

function Carregando() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-64" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}
