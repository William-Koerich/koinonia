import { ChevronLeftIcon, ChevronRightIcon, WalletIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ConfirmarExclusao } from "@/components/app/confirmar-exclusao";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireRole } from "@/lib/auth";
import { getPessoas } from "@/lib/data/app";
import { formatarData, formatarMoeda, formatarMoedaInput, hojeISO } from "@/lib/format";
import { ROLES_FINANCEIRO } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import {
  CATEGORIAS_ENTRADA,
  mesValido,
  rotuloCategoria,
  rotuloForma,
  type CategoriaEntrada,
} from "@/lib/validation/financeiro";
import { excluirEntrada } from "./actions";
import { EntradaDialog } from "./entrada-dialog";

export const metadata: Metadata = { title: "Financeiro" };

export default async function FinanceiroPage({ searchParams }: PageProps<"/app/financeiro">) {
  await requireRole(...ROLES_FINANCEIRO);

  return (
    <Suspense fallback={<Carregando />}>
      <Entradas searchParams={searchParams} />
    </Suspense>
  );
}

/** Soma meses a "2026-10" */
function somarMes(mes: string, delta: number): string {
  const [ano, m] = mes.split("-").map(Number);
  const d = new Date(Date.UTC(ano, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

const nomeMes = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });

async function Entradas({ searchParams }: Pick<PageProps<"/app/financeiro">, "searchParams">) {
  const params = await searchParams;
  const hoje = hojeISO();
  const mesAtual = hoje.slice(0, 7);
  const mes = mesValido(params.mes, mesAtual);
  const categoria = CATEGORIAS_ENTRADA.some((c) => c.value === params.categoria)
    ? (params.categoria as CategoriaEntrada)
    : null;

  const supabase = await createClient();
  const [{ data: entradas, error }, pessoas] = await Promise.all([
    supabase
      .from("koinonia_financeiro_entradas")
      .select(
        "id, data, categoria, valor, forma_pagamento, profile_id, contribuinte_nome, descricao, pessoa:koinonia_profiles!koinonia_financeiro_entradas_profile_id_fkey(nome_completo)",
      )
      .gte("data", `${mes}-01`)
      .lt("data", `${somarMes(mes, 1)}-01`)
      .order("data", { ascending: false })
      .order("created_at", { ascending: false }),
    getPessoas(),
  ]);
  if (error) throw new Error(error.message);

  const totalMes = entradas.reduce((t, e) => t + Number(e.valor), 0);
  const porCategoria = CATEGORIAS_ENTRADA.map((c) => ({
    ...c,
    total: entradas.filter((e) => e.categoria === c.value).reduce((t, e) => t + Number(e.valor), 0),
  }));
  const lista = categoria ? entradas.filter((e) => e.categoria === categoria) : entradas;
  const totalLista = lista.reduce((t, e) => t + Number(e.valor), 0);

  const link = (novo: { mes?: string; categoria?: string | null }) => {
    const p = new URLSearchParams();
    const m = novo.mes ?? mes;
    if (m !== mesAtual) p.set("mes", m);
    const c = novo.categoria === undefined ? categoria : novo.categoria;
    if (c) p.set("categoria", c);
    const qs = p.toString();
    return qs ? `/app/financeiro?${qs}` : "/app/financeiro";
  };

  // padrão do formulário: hoje, ou o 1º dia do mês que está sendo visto
  const dataPadrao = mes === mesAtual ? hoje : `${mes}-01`;

  return (
    <>
      <PageHeader titulo="Financeiro" descricao="Entradas da igreja: dízimos, ofertas, primícias e doações.">
        <EntradaDialog pessoas={pessoas} hoje={dataPadrao} />
      </PageHeader>

      {/* mês */}
      <div className="mb-4 flex items-center gap-2">
        <Button asChild variant="outline" size="icon" aria-label="Mês anterior">
          <Link href={link({ mes: somarMes(mes, -1) })} scroll={false}>
            <ChevronLeftIcon />
          </Link>
        </Button>
        <p className="min-w-44 text-center font-heading text-lg font-semibold first-letter:uppercase">
          {nomeMes.format(new Date(`${mes}-01T00:00:00Z`))}
        </p>
        <Button asChild variant="outline" size="icon" aria-label="Próximo mês">
          <Link href={link({ mes: somarMes(mes, 1) })} scroll={false}>
            <ChevronRightIcon />
          </Link>
        </Button>
        {mes !== mesAtual && (
          <Button asChild variant="ghost" size="sm">
            <Link href={link({ mes: mesAtual })} scroll={false}>
              Mês atual
            </Link>
          </Button>
        )}
      </div>

      {/* totais: clicar numa categoria filtra a lista */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <TotalCard rotulo="Total do mês" valor={totalMes} href={link({ categoria: null })} ativo={!categoria} destaque />
        {porCategoria.map((c) => (
          <TotalCard
            key={c.value}
            rotulo={c.label}
            valor={c.total}
            href={link({ categoria: categoria === c.value ? null : c.value })}
            ativo={categoria === c.value}
          />
        ))}
      </div>

      {lista.length === 0 ? (
        <EmptyState
          icone={WalletIcon}
          titulo={categoria ? `Nenhuma entrada de ${rotuloCategoria(categoria).toLowerCase()} neste mês` : "Nenhuma entrada neste mês"}
          descricao="Use “Nova entrada” para registrar o que a igreja recebeu."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Quem contribuiu</TableHead>
                <TableHead>Recebido em</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {lista.map((e) => {
                const quem = e.pessoa?.nome_completo ?? e.contribuinte_nome;
                return (
                  <TableRow key={e.id}>
                    <TableCell className="align-top whitespace-nowrap tabular-nums">{formatarData(e.data)}</TableCell>
                    <TableCell className="align-top">{rotuloCategoria(e.categoria)}</TableCell>
                    <TableCell className="align-top">
                      <p className={cn(!quem && "text-muted-foreground")}>{quem ?? "Não identificado"}</p>
                      {e.descricao && <p className="text-xs text-muted-foreground">{e.descricao}</p>}
                    </TableCell>
                    <TableCell className="align-top">{rotuloForma(e.forma_pagamento)}</TableCell>
                    <TableCell className="text-right align-top font-medium whitespace-nowrap tabular-nums">
                      {formatarMoeda(Number(e.valor))}
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="flex justify-end">
                        <EntradaDialog
                          pessoas={pessoas}
                          hoje={dataPadrao}
                          entrada={{
                            id: e.id,
                            valores: {
                              data: e.data,
                              categoria: e.categoria,
                              valor: formatarMoedaInput(Number(e.valor).toFixed(2)),
                              forma_pagamento: e.forma_pagamento,
                              contribuinte: e.profile_id ? "membro" : e.contribuinte_nome ? "outro" : "nenhum",
                              profile_id: e.profile_id ?? "",
                              contribuinte_nome: e.contribuinte_nome ?? "",
                              descricao: e.descricao ?? "",
                            },
                          }}
                        />
                        <ConfirmarExclusao
                          somenteIcone
                          titulo="Excluir esta entrada?"
                          descricao={`${rotuloCategoria(e.categoria)} de ${formatarMoeda(Number(e.valor))} em ${formatarData(e.data)}.`}
                          acao={excluirEntrada.bind(null, e.id)}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={4}>
                  {lista.length} {lista.length === 1 ? "entrada" : "entradas"}
                  {categoria && ` de ${rotuloCategoria(categoria).toLowerCase()}`}
                </TableCell>
                <TableCell className="text-right font-semibold whitespace-nowrap tabular-nums">{formatarMoeda(totalLista)}</TableCell>
                <TableCell />
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      )}
    </>
  );
}

function TotalCard({
  rotulo,
  valor,
  href,
  ativo,
  destaque,
}: {
  rotulo: string;
  valor: number;
  href: string;
  ativo: boolean;
  destaque?: boolean;
}) {
  return (
    <Link href={href} scroll={false} aria-current={ativo ? "true" : undefined} className="group">
      <Card className={cn("h-full py-4 transition-colors group-hover:bg-muted/50", ativo && "border-primary ring-1 ring-primary")}>
        <CardContent className="px-4">
          <p className="text-xs text-muted-foreground">{rotulo}</p>
          <p className={cn("mt-1 font-semibold tabular-nums", destaque ? "text-xl" : "text-lg")}>{formatarMoeda(valor)}</p>
        </CardContent>
      </Card>
    </Link>
  );
}

function Carregando() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-64" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}
