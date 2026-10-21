import { ArrowLeftIcon, RepeatIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ConfirmarExclusao } from "@/components/app/confirmar-exclusao";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { formatarData, formatarMoeda, formatarMoedaInput, hojeISO } from "@/lib/format";
import { ROLES_FINANCEIRO } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { rotuloDespesa, rotuloFrequencia } from "@/lib/validation/financeiro";
import { encerrarRecorrencia } from "../actions";
import { ContaDialog } from "../conta-dialog";
import { RecorrenciaDialog } from "./recorrencia-dialog";

export const metadata: Metadata = { title: "Contas recorrentes" };

export default async function RecorrentesPage() {
  await requireRole(...ROLES_FINANCEIRO);
  const hoje = hojeISO();

  const supabase = await createClient();
  const { data: recorrencias, error } = await supabase
    .from("koinonia_financeiro_recorrencias")
    .select("*, contas:koinonia_financeiro_contas(vencimento, status)")
    .order("ativa", { ascending: false })
    .order("descricao");
  if (error) throw new Error(error.message);

  return (
    <>
      <Link
        href="/app/financeiro/contas-a-pagar"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" /> Contas a pagar
      </Link>
      <PageHeader titulo="Contas recorrentes" descricao="Contas que se repetem. As próximas são lançadas automaticamente.">
        <ContaDialog vencimentoPadrao={hoje} />
      </PageHeader>

      {recorrencias.length === 0 ? (
        <EmptyState
          icone={RepeatIcon}
          titulo="Nenhuma conta recorrente"
          descricao="Em “Nova conta”, escolha em “Repetir” com que frequência ela se repete (ex.: todo mês)."
        />
      ) : (
        <div className="grid gap-3">
          {recorrencias.map((r) => {
            const pagas = r.contas.filter((c) => c.status === "paga").length;
            const proxima = r.contas
              .filter((c) => c.status === "pendente" && c.vencimento >= hoje)
              .map((c) => c.vencimento)
              .sort()[0];
            const termino = r.parcelas
              ? `${r.parcelas} vezes (${pagas} ${pagas === 1 ? "paga" : "pagas"})`
              : r.data_fim
                ? `até ${formatarData(r.data_fim)}`
                : "sem data para terminar";
            const resumo = `${rotuloFrequencia(r.frequencia)}, desde ${formatarData(r.data_inicio)}`;

            return (
              <Card key={r.id} className={cn("py-4", !r.ativa && "opacity-60")}>
                <CardContent className="flex flex-col gap-3 px-4 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{r.descricao}</p>
                      {!r.ativa && <Badge variant="secondary">Encerrada</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {[rotuloDespesa(r.categoria), r.fornecedor].filter(Boolean).join(" · ")}
                    </p>
                    <p className="mt-1 text-sm">
                      <RepeatIcon className="mr-1 inline size-3.5 text-muted-foreground" />
                      {resumo} · {termino}
                    </p>
                    {r.ativa && proxima && <p className="text-xs text-muted-foreground">Próximo vencimento: {formatarData(proxima)}</p>}
                  </div>
                  <p className="text-lg font-semibold tabular-nums">{formatarMoeda(Number(r.valor))}</p>
                  {r.ativa && (
                    <div className="flex">
                      <RecorrenciaDialog
                        id={r.id}
                        resumo={resumo}
                        valores={{
                          descricao: r.descricao,
                          categoria: r.categoria,
                          fornecedor: r.fornecedor ?? "",
                          valor: formatarMoedaInput(Number(r.valor).toFixed(2)),
                          observacao: r.observacao ?? "",
                          data_inicio: r.data_inicio,
                          termino: r.parcelas ? "parcelas" : r.data_fim ? "data" : "nunca",
                          data_fim: r.data_fim ?? "",
                          parcelas: r.parcelas ? String(r.parcelas) : "",
                        }}
                      />
                      <ConfirmarExclusao
                        somenteIcone
                        rotulo="Encerrar"
                        titulo={`Encerrar "${r.descricao}"?`}
                        descricao="Não serão lançadas novas contas e as que ainda iam vencer são removidas. As pagas e as já vencidas continuam no histórico."
                        acao={encerrarRecorrencia.bind(null, r.id)}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
