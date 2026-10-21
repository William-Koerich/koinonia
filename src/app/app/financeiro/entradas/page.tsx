import { WalletIcon } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { ConfirmarExclusao } from "@/components/app/confirmar-exclusao";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
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
  somarMes,
  type CategoriaEntrada,
} from "@/lib/validation/financeiro";
import { MesNavegacao } from "../_componentes/mes-navegacao";
import { TotalCard } from "../_componentes/total-card";
import { excluirEntrada } from "./actions";
import { EntradaDialog } from "./entrada-dialog";

export const metadata: Metadata = { title: "Entradas" };

export default async function EntradasPage({ searchParams }: PageProps<"/app/financeiro/entradas">) {
  await requireRole(...ROLES_FINANCEIRO);

  return (
    <Suspense fallback={<Carregando />}>
      <Entradas searchParams={searchParams} />
    </Suspense>
  );
}

async function Entradas({ searchParams }: Pick<PageProps<"/app/financeiro/entradas">, "searchParams">) {
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
    return qs ? `/app/financeiro/entradas?${qs}` : "/app/financeiro/entradas";
  };

  // padrão do formulário: hoje, ou o 1º dia do mês que está sendo visto
  const dataPadrao = mes === mesAtual ? hoje : `${mes}-01`;

  return (
    <>
      <PageHeader titulo="Entradas" descricao="O que a igreja recebeu: dízimos, ofertas, primícias e doações.">
        <EntradaDialog pessoas={pessoas} hoje={dataPadrao} />
      </PageHeader>

      <MesNavegacao mes={mes} mesAtual={mesAtual} link={(m) => link({ mes: m })} />

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
