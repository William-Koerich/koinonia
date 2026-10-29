import { AlertTriangleIcon, ArrowDownRightIcon, ArrowUpRightIcon, CalendarClockIcon, MinusIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireRole } from "@/lib/auth";
import { formatarData, formatarMoeda, hojeISO } from "@/lib/format";
import { ROLES_FINANCEIRO } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import {
  CATEGORIAS_DESPESA,
  CATEGORIAS_ENTRADA,
  fimDoMes,
  mesValido,
  nomeDoMes,
  somarMes,
} from "@/lib/validation/financeiro";
import { BarrasCategoria, GraficoEntradasDespesas, GraficoSaldo, type MesSerie } from "./_componentes/graficos";
import { MesNavegacao } from "./_componentes/mes-navegacao";

export const metadata: Metadata = { title: "Financeiro" };

export default async function FinanceiroPage({ searchParams }: PageProps<"/app/financeiro">) {
  await requireRole(...ROLES_FINANCEIRO);

  return (
    <Suspense fallback={<Carregando />}>
      <Painel searchParams={searchParams} />
    </Suspense>
  );
}

const mesCurto = new Intl.DateTimeFormat("pt-BR", { month: "short", timeZone: "UTC" });

/** "2026-10-15" → índice do mês na janela de 12 meses */
const mesDe = (data: string) => data.slice(0, 7);

async function Painel({ searchParams }: Pick<PageProps<"/app/financeiro">, "searchParams">) {
  const params = await searchParams;
  const hoje = hojeISO();
  const mesAtual = hoje.slice(0, 7);
  const mes = mesValido(params.mes, mesAtual);
  const mesPassado = somarMes(mes, -1);
  const primeiroMes = somarMes(mes, -11);
  const daquiA15 = new Date(`${hoje}T12:00:00Z`);
  daquiA15.setUTCDate(daquiA15.getUTCDate() + 15);
  const limiteProximas = daquiA15.toISOString().slice(0, 10);

  const supabase = await createClient();
  // as contas recorrentes precisam existir para entrar nos números
  const { error: erroGerar } = await supabase.rpc("koinonia_financeiro_gerar_contas", {
    p_ate: fimDoMes(mes > somarMes(mesAtual, 1) ? mes : somarMes(mesAtual, 1)),
  });
  if (erroGerar) throw new Error(erroGerar.message);

  const [entradasR, pagasR, doMesR, vencidasR, proximasR, carteirasR, saldosR] = await Promise.all([
    supabase.from("koinonia_financeiro_entradas").select("data, categoria, valor").gte("data", `${primeiroMes}-01`).lte("data", fimDoMes(mes)),
    // regime de caixa: a despesa conta no mês em que foi paga
    supabase
      .from("koinonia_financeiro_contas")
      .select("pago_em, valor_pago, categoria")
      .eq("status", "paga")
      .gte("pago_em", `${primeiroMes}-01`)
      .lte("pago_em", fimDoMes(mes)),
    supabase
      .from("koinonia_financeiro_contas")
      .select("valor, status")
      .neq("status", "cancelada")
      .gte("vencimento", `${mes}-01`)
      .lte("vencimento", fimDoMes(mes)),
    supabase.from("koinonia_financeiro_contas").select("valor").eq("status", "pendente").lt("vencimento", hoje),
    supabase
      .from("koinonia_financeiro_contas")
      .select("id, descricao, valor, vencimento")
      .eq("status", "pendente")
      .gte("vencimento", hoje)
      .lte("vencimento", limiteProximas)
      .order("vencimento")
      .limit(8),
    supabase.from("koinonia_financeiro_carteiras").select("id, nome").eq("ativa", true).order("padrao", { ascending: false }).order("nome"),
    supabase.rpc("koinonia_financeiro_saldos", { p_ate: hoje }),
  ]);
  for (const r of [entradasR, pagasR, doMesR, vencidasR, proximasR]) if (r.error) throw new Error(r.error.message);
  const entradas = entradasR.data ?? [];
  const pagas = pagasR.data ?? [];
  const doMes = doMesR.data ?? [];
  const vencidas = vencidasR.data ?? [];
  const proximas = proximasR.data ?? [];
  const saldoDe = new Map((saldosR.data ?? []).map((x) => [x.carteira_id, Number(x.saldo)]));
  const contasBancarias = (carteirasR.data ?? []).map((c) => ({ ...c, saldo: saldoDe.get(c.id) ?? 0 }));
  const saldoEmContas = contasBancarias.reduce((t, c) => t + c.saldo, 0);

  // série dos 12 meses
  const meses: MesSerie[] = Array.from({ length: 12 }, (_, i) => {
    const m = somarMes(primeiroMes, i);
    const data = new Date(`${m}-01T00:00:00Z`);
    return { mes: m, rotulo: mesCurto.format(data).replace(".", ""), rotuloLongo: nomeDoMes(m), entradas: 0, despesas: 0 };
  });
  const porMes = new Map(meses.map((m) => [m.mes, m]));
  for (const e of entradas) {
    const alvo = porMes.get(mesDe(e.data));
    if (alvo) alvo.entradas += Number(e.valor);
  }
  for (const c of pagas) {
    const alvo = c.pago_em ? porMes.get(mesDe(c.pago_em)) : undefined;
    if (alvo) alvo.despesas += Number(c.valor_pago);
  }

  const atual = porMes.get(mes)!;
  const anterior = porMes.get(mesPassado)!;
  const saldoAtual = atual.entradas - atual.despesas;
  const saldoAnterior = anterior.entradas - anterior.despesas;
  const ano = mes.slice(0, 4);
  const doAno = meses.filter((m) => m.mes.startsWith(ano));
  const saldoAno = doAno.reduce((t, m) => t + m.entradas - m.despesas, 0);

  const aPagarMes = doMes.filter((c) => c.status === "pendente");
  const somaValor = (l: { valor: number | string }[]) => l.reduce((t, c) => t + Number(c.valor), 0);

  const entradasPorCategoria = CATEGORIAS_ENTRADA.map((c) => ({
    rotulo: c.label,
    valor: entradas.filter((e) => mesDe(e.data) === mes && e.categoria === c.value).reduce((t, e) => t + Number(e.valor), 0),
  }));
  const despesasPorCategoria = CATEGORIAS_DESPESA.map((c) => ({
    rotulo: c.label,
    valor: pagas
      .filter((p) => p.pago_em && mesDe(p.pago_em) === mes && p.categoria === c.value)
      .reduce((t, p) => t + Number(p.valor_pago), 0),
  }));

  const link = (m: string) => (m === mesAtual ? "/app/financeiro" : `/app/financeiro?mes=${m}`);
  const nomeMes = nomeDoMes(mes).split(" de ")[0];
  const nomeMesPassado = nomeDoMes(mesPassado).split(" de ")[0];

  return (
    <>
      <PageHeader titulo="Financeiro" descricao="Visão geral: saldo, entradas, despesas e o que vem por aí.">
        <Button asChild variant="outline">
          <Link href="/app/financeiro/entradas">Entradas</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/app/financeiro/contas-a-pagar">Contas a pagar</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/app/financeiro/relatorio">Relatório (PDF)</Link>
        </Button>
      </PageHeader>

      <MesNavegacao mes={mes} mesAtual={mesAtual} link={link} />

      {/* destaque: saldo do mês + cartões */}
      <div className="mb-6 grid gap-4 lg:grid-cols-[1.2fr_2fr]">
        <Card>
          <CardContent className="flex h-full flex-col justify-center">
            <p className="text-sm text-muted-foreground first-letter:uppercase">Saldo de {nomeMes}</p>
            <p className={cn("mt-1 text-5xl font-semibold tracking-tight", saldoAtual < 0 && "text-destructive")}>
              {formatarMoeda(saldoAtual)}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {formatarMoeda(atual.entradas)} de entradas − {formatarMoeda(atual.despesas)} pagos
            </p>
            <Variacao atual={saldoAtual} anterior={saldoAnterior} subirEhBom rotulo={`vs. ${nomeMesPassado}`} className="mt-3" />
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Bloco
            rotulo={`Saldo de ${nomeMesPassado}`}
            valor={saldoAnterior}
            detalhe={`${formatarMoeda(anterior.entradas)} − ${formatarMoeda(anterior.despesas)}`}
            negativo={saldoAnterior < 0}
          />
          <Bloco rotulo={`Saldo em ${ano}`} valor={saldoAno} detalhe="De janeiro até este mês" negativo={saldoAno < 0} />
          <Bloco rotulo="Entradas do mês" valor={atual.entradas}>
            <Variacao atual={atual.entradas} anterior={anterior.entradas} subirEhBom rotulo="vs. mês passado" />
          </Bloco>
          <Bloco rotulo="Despesas pagas no mês" valor={atual.despesas}>
            <Variacao atual={atual.despesas} anterior={anterior.despesas} subirEhBom={false} rotulo="vs. mês passado" />
          </Bloco>
          <Bloco
            rotulo="Ainda a pagar no mês"
            valor={somaValor(aPagarMes)}
            detalhe={`${aPagarMes.length} ${aPagarMes.length === 1 ? "conta em aberto" : "contas em aberto"}`}
            href={`/app/financeiro/contas-a-pagar?${mes !== mesAtual ? `mes=${mes}&` : ""}filtro=a-pagar`}
          />
          <Bloco
            rotulo="Vencidas sem pagamento"
            valor={somaValor(vencidas)}
            detalhe={vencidas.length ? `${vencidas.length} ${vencidas.length === 1 ? "conta" : "contas"}` : "Nenhuma"}
            href="/app/financeiro/contas-a-pagar?filtro=vencidas"
            alerta={vencidas.length > 0}
          />
        </div>
      </div>

      {/* dinheiro disponível hoje em cada conta */}
      {contasBancarias.length > 0 ? (
        <Link href="/app/financeiro/contas-e-caixa" className="group mb-6 block">
          <Card className="py-4 transition-colors group-hover:bg-muted/50">
            <CardContent className="flex flex-col gap-3 px-4 md:flex-row md:items-center md:gap-8">
              <div className="shrink-0">
                <p className="text-xs text-muted-foreground">Saldo em contas hoje</p>
                <p className={cn("text-2xl font-semibold tabular-nums", saldoEmContas < 0 && "text-destructive")}>
                  {formatarMoeda(saldoEmContas)}
                </p>
              </div>
              <ul className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                {contasBancarias.map((c) => (
                  <li key={c.id}>
                    <span className="text-muted-foreground">{c.nome}:</span>{" "}
                    <span className={cn("font-medium tabular-nums", c.saldo < 0 && "text-destructive")}>{formatarMoeda(c.saldo)}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </Link>
      ) : (
        <p className="mb-6 rounded-xl border border-dashed px-4 py-3 text-sm text-muted-foreground">
          Para ver quanto há no banco e no caixa,{" "}
          <Link href="/app/financeiro/contas-e-caixa" className="text-primary underline-offset-4 hover:underline">
            cadastre as contas com o saldo inicial
          </Link>
          .
        </p>
      )}

      {/* gráficos dos 12 meses */}
      <div className="mb-6 grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Entradas e despesas</CardTitle>
            <CardDescription>
              Últimos 12 meses, até {nomeDoMes(mes)}. Passe o mouse (ou toque) num mês para ver os valores.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <GraficoEntradasDespesas meses={meses} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Saldo de cada mês</CardTitle>
            <CardDescription>Entradas menos despesas pagas. Para cima sobrou, para baixo faltou.</CardDescription>
          </CardHeader>
          <CardContent>
            <GraficoSaldo meses={meses} />
          </CardContent>
        </Card>
      </div>

      {/* categorias do mês + próximos vencimentos */}
      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Entradas por categoria</CardTitle>
            <CardDescription className="first-letter:uppercase">{nomeDoMes(mes)}</CardDescription>
          </CardHeader>
          <CardContent>
            <BarrasCategoria itens={entradasPorCategoria} cor="var(--viz-entrada)" vazio="Nenhuma entrada neste mês." />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Despesas por categoria</CardTitle>
            <CardDescription className="first-letter:uppercase">{nomeDoMes(mes)} · pagas</CardDescription>
          </CardHeader>
          <CardContent>
            <BarrasCategoria itens={despesasPorCategoria} cor="var(--viz-despesa)" vazio="Nenhuma despesa paga neste mês." />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarClockIcon className="size-4 text-muted-foreground" /> Próximos vencimentos
            </CardTitle>
            <CardDescription>Contas em aberto nos próximos 15 dias.</CardDescription>
          </CardHeader>
          <CardContent>
            {proximas.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Nada vencendo nos próximos 15 dias.</p>
            ) : (
              <ul className="divide-y">
                {proximas.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{c.descricao}</p>
                      <p className="text-xs text-muted-foreground">
                        {c.vencimento === hoje ? (
                          <Badge className="bg-amber-500 text-white hover:bg-amber-500">Vence hoje</Badge>
                        ) : (
                          formatarData(c.vencimento)
                        )}
                      </p>
                    </div>
                    <span className="shrink-0 tabular-nums">{formatarMoeda(Number(c.valor))}</span>
                  </li>
                ))}
              </ul>
            )}
            <Button asChild variant="link" className="mt-2 h-auto px-0">
              <Link href="/app/financeiro/contas-a-pagar">Ver contas a pagar</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* os mesmos números em tabela (acessibilidade e conferência) */}
      <details className="rounded-xl border px-4 py-3">
        <summary className="cursor-pointer text-sm font-medium">Ver os 12 meses em tabela</summary>
        <div className="mt-3 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mês</TableHead>
                <TableHead className="text-right">Entradas</TableHead>
                <TableHead className="text-right">Despesas pagas</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...meses].reverse().map((m) => {
                const saldo = m.entradas - m.despesas;
                return (
                  <TableRow key={m.mes}>
                    <TableCell className="first-letter:uppercase">{m.rotuloLongo}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatarMoeda(m.entradas)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatarMoeda(m.despesas)}</TableCell>
                    <TableCell className={cn("text-right font-medium tabular-nums", saldo < 0 && "text-destructive")}>
                      {formatarMoeda(saldo)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </details>
    </>
  );
}

function Bloco({
  rotulo,
  valor,
  detalhe,
  href,
  negativo,
  alerta,
  children,
}: {
  rotulo: string;
  valor: number;
  detalhe?: string;
  href?: string;
  negativo?: boolean;
  alerta?: boolean;
  children?: React.ReactNode;
}) {
  const card = (
    <Card className={cn("h-full py-4", href && "transition-colors group-hover:bg-muted/50", alerta && "border-destructive/50 bg-destructive/5")}>
      <CardContent className="px-4">
        <p className="flex items-center gap-1 text-xs text-muted-foreground first-letter:uppercase">
          {alerta && <AlertTriangleIcon className="size-3.5 text-destructive" />}
          {rotulo}
        </p>
        <p className={cn("mt-1 text-xl font-semibold", (negativo || alerta) && "text-destructive")}>{formatarMoeda(valor)}</p>
        {detalhe && <p className="mt-0.5 text-xs text-muted-foreground">{detalhe}</p>}
        {children && <div className="mt-1">{children}</div>}
      </CardContent>
    </Card>
  );
  return href ? (
    <Link href={href} className="group">
      {card}
    </Link>
  ) : (
    card
  );
}

/** ↗ 12% vs. mês passado — cor pelo sentido e por subir ser bom ou ruim (com ícone, nunca só cor) */
function Variacao({
  atual,
  anterior,
  subirEhBom,
  rotulo,
  className,
}: {
  atual: number;
  anterior: number;
  subirEhBom: boolean;
  rotulo: string;
  className?: string;
}) {
  const diferenca = atual - anterior;
  if (anterior === 0 && atual === 0) return null;
  const Icone = diferenca > 0 ? ArrowUpRightIcon : diferenca < 0 ? ArrowDownRightIcon : MinusIcon;
  const bom = diferenca === 0 ? null : diferenca > 0 === subirEhBom;
  const percentual = anterior !== 0 ? Math.round((diferenca / Math.abs(anterior)) * 100) : null;

  return (
    <p
      className={cn(
        "flex items-center gap-1 text-xs",
        bom === true && "text-emerald-700 dark:text-emerald-400",
        bom === false && "text-destructive",
        bom === null && "text-muted-foreground",
        className,
      )}
    >
      <Icone className="size-3.5" />
      <span className="font-medium tabular-nums">
        {diferenca > 0 ? "+" : diferenca < 0 ? "−" : ""}
        {formatarMoeda(Math.abs(diferenca))}
        {percentual !== null && ` (${Math.abs(percentual)}%)`}
      </span>
      <span className="text-muted-foreground">{rotulo}</span>
    </p>
  );
}

function Carregando() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-64" />
      <div className="grid gap-4 lg:grid-cols-[1.2fr_2fr]">
        <Skeleton className="h-48" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Skeleton className="h-80" />
        <Skeleton className="h-80" />
      </div>
    </div>
  );
}
