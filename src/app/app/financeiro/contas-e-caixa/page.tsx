import { ArrowRightIcon, BanknoteIcon, LandmarkIcon, PiggyBankIcon, TriangleAlertIcon } from "lucide-react";
import type { Metadata } from "next";
import { BotaoAcao } from "@/components/app/botao-acao";
import { ConfirmarExclusao } from "@/components/app/confirmar-exclusao";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { getCarteiras } from "@/lib/data/financeiro";
import { formatarData, formatarMoeda, formatarMoedaInput, hojeISO } from "@/lib/format";
import { ROLES_FINANCEIRO } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { rotuloTipoCarteira } from "@/lib/validation/financeiro";
import { LinkHistorico } from "../_componentes/link-historico";
import { alternarCarteira, excluirCarteira, excluirTransferencia } from "./actions";
import { AtribuirSemConta } from "./atribuir-sem-conta";
import { CarteiraDialog } from "./carteira-dialog";
import { TransferenciaDialog } from "./transferencia-dialog";

export const metadata: Metadata = { title: "Contas e caixa" };

const ICONE = { banco: LandmarkIcon, caixa: BanknoteIcon, aplicacao: PiggyBankIcon } as const;

/** Saldo de cada conta (banco, caixa, aplicação) e as transferências entre elas */
export default async function ContasECaixaPage() {
  await requireRole(...ROLES_FINANCEIRO);
  const hoje = hojeISO();

  const supabase = await createClient();
  const [{ data: carteiras, error }, { data: saldos }, { data: transferencias }, semContaE, semContaP, opcoes] =
    await Promise.all([
      supabase
        .from("koinonia_financeiro_carteiras")
        .select("*")
        .order("ativa", { ascending: false })
        .order("padrao", { ascending: false })
        .order("nome"),
      supabase.rpc("koinonia_financeiro_saldos", { p_ate: hoje }),
      supabase
        .from("koinonia_financeiro_transferencias")
        .select("id, data, origem_id, destino_id, valor, descricao")
        .order("data", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(30),
      supabase.from("koinonia_financeiro_entradas").select("id", { count: "exact", head: true }).is("carteira_id", null),
      supabase
        .from("koinonia_financeiro_contas")
        .select("id", { count: "exact", head: true })
        .is("carteira_id", null)
        .eq("status", "paga"),
      getCarteiras(true),
    ]);
  if (error) throw new Error(error.message);

  const saldoDe = new Map((saldos ?? []).map((s) => [s.carteira_id, s]));
  const nome = new Map(carteiras.map((c) => [c.id, c.nome]));
  const ativas = carteiras.filter((c) => c.ativa);
  const total = ativas.reduce((t, c) => t + Number(saldoDe.get(c.id)?.saldo ?? 0), 0);
  const semConta = (semContaE.count ?? 0) + (semContaP.count ?? 0);

  return (
    <>
      <PageHeader titulo="Contas e caixa" descricao="Quanto a igreja tem em cada conta bancária, no caixa e em aplicações.">
        <TransferenciaDialog hoje={hoje} carteiras={opcoes} />
        <CarteiraDialog hoje={hoje} />
      </PageHeader>

      {carteiras.length === 0 ? (
        <EmptyState
          icone={LandmarkIcon}
          titulo="Nenhuma conta cadastrada"
          descricao="Cadastre a conta do banco e o caixa com o saldo de hoje (ou do início do mês). A partir daí, cada entrada e pagamento informa a conta e o saldo se atualiza sozinho."
        />
      ) : (
        <>
          <Card className="mb-4">
            <CardContent className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Saldo total hoje</p>
                <p className={cn("text-4xl font-semibold tracking-tight tabular-nums", total < 0 && "text-destructive")}>
                  {formatarMoeda(total)}
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                Soma de {ativas.length} {ativas.length === 1 ? "conta ativa" : "contas ativas"}
              </p>
            </CardContent>
          </Card>

          {semConta > 0 && (
            <Card className="mb-4 border-amber-500/50 bg-amber-500/5">
              <CardContent className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <p className="flex items-start gap-2 text-sm">
                  <TriangleAlertIcon className="mt-0.5 size-4 shrink-0 text-amber-600" />
                  <span>
                    <strong className="font-medium">
                      {semConta} {semConta === 1 ? "lançamento sem conta" : "lançamentos sem conta"}
                    </strong>{" "}
                    (entradas e pagamentos de antes das contas existirem) não entram nos saldos. Atribua todos a uma conta, ou
                    edite um por um nas telas de Entradas e Contas a pagar.
                  </span>
                </p>
                <AtribuirSemConta carteiras={opcoes.filter((c) => c.ativa)} />
              </CardContent>
            </Card>
          )}

          <div className="mb-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {carteiras.map((c) => {
              const s = saldoDe.get(c.id);
              const saldo = Number(s?.saldo ?? c.saldo_inicial);
              const Icone = ICONE[c.tipo];
              return (
                <Card key={c.id} className={cn(!c.ativa && "opacity-60")}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Icone className="size-4 text-muted-foreground" /> {c.nome}
                      </CardTitle>
                      <div className="flex flex-wrap justify-end gap-1">
                        {c.padrao && <Badge>Principal</Badge>}
                        {!c.ativa && <Badge variant="secondary">Desativada</Badge>}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {rotuloTipoCarteira(c.tipo)}
                      {c.observacao && ` · ${c.observacao}`}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className={cn("text-3xl font-semibold tabular-nums", saldo < 0 && "text-destructive")}>{formatarMoeda(saldo)}</p>
                    <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                      <dt className="text-muted-foreground">Saldo inicial ({formatarData(c.saldo_inicial_em)})</dt>
                      <dd className="text-right tabular-nums">{formatarMoeda(Number(c.saldo_inicial))}</dd>
                      <dt className="text-muted-foreground">Entrou desde então</dt>
                      <dd className="text-right text-emerald-700 tabular-nums">+ {formatarMoeda(Number(s?.entradas ?? 0))}</dd>
                      <dt className="text-muted-foreground">Saiu desde então</dt>
                      <dd className="text-right text-destructive tabular-nums">− {formatarMoeda(Number(s?.saidas ?? 0))}</dd>
                    </dl>
                    <div className="flex flex-wrap items-center justify-end gap-1 border-t pt-2">
                      <LinkHistorico registroId={c.id} />
                      <CarteiraDialog
                        hoje={hoje}
                        carteira={{
                          id: c.id,
                          valores: {
                            nome: c.nome,
                            tipo: c.tipo,
                            saldo_inicial: formatarMoedaInput(Math.abs(Number(c.saldo_inicial)).toFixed(2)),
                            saldo_inicial_em: c.saldo_inicial_em,
                            padrao: c.padrao,
                            observacao: c.observacao ?? "",
                          },
                        }}
                      />
                      <BotaoAcao acao={alternarCarteira.bind(null, c.id, !c.ativa)}>{c.ativa ? "Desativar" : "Reativar"}</BotaoAcao>
                      <ConfirmarExclusao
                        somenteIcone
                        titulo={`Excluir "${c.nome}"?`}
                        descricao="Só dá para excluir uma conta sem lançamentos. Se ela já foi usada, desative-a."
                        acao={excluirCarteira.bind(null, c.id)}
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <section>
            <h2 className="mb-4 font-heading text-lg font-semibold">Transferências recentes</h2>
            {!transferencias?.length ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma transferência. Use “Transferência” quando depositar a oferta em dinheiro no banco, por exemplo.
              </p>
            ) : (
              <ul className="divide-y rounded-xl border">
                {transferencias.map((t) => (
                  <li key={t.id} className="flex flex-col gap-2 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-1.5 font-medium">
                        {nome.get(t.origem_id)} <ArrowRightIcon className="size-3.5 text-muted-foreground" /> {nome.get(t.destino_id)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatarData(t.data)}
                        {t.descricao && ` · ${t.descricao}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="mr-2 font-medium tabular-nums">{formatarMoeda(Number(t.valor))}</span>
                      <TransferenciaDialog
                        hoje={hoje}
                        carteiras={opcoes}
                        transferencia={{
                          id: t.id,
                          valores: {
                            data: t.data,
                            origem_id: t.origem_id,
                            destino_id: t.destino_id,
                            valor: formatarMoedaInput(Number(t.valor).toFixed(2)),
                            descricao: t.descricao ?? "",
                          },
                        }}
                      />
                      <ConfirmarExclusao
                        somenteIcone
                        titulo="Excluir esta transferência?"
                        descricao={`${formatarMoeda(Number(t.valor))} de ${nome.get(t.origem_id)} para ${nome.get(t.destino_id)} em ${formatarData(t.data)}.`}
                        acao={excluirTransferencia.bind(null, t.id)}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </>
  );
}
