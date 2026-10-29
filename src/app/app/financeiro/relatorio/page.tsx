import { FileDownIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireRole } from "@/lib/auth";
import { getRelatorio } from "@/lib/data/financeiro";
import { formatarMoeda, hojeISO } from "@/lib/format";
import { ROLES_FINANCEIRO } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { nomeDoMes, somarMes } from "@/lib/validation/financeiro";
import { lerPeriodo } from "./periodo";

export const metadata: Metadata = { title: "Relatório financeiro" };

/** Escolha do período e prévia dos números do relatório em PDF */
export default async function RelatorioPage({ searchParams }: PageProps<"/app/financeiro/relatorio">) {
  await requireRole(...ROLES_FINANCEIRO);
  const params = await searchParams;
  const mesAtual = hojeISO().slice(0, 7);
  const ano = Number(mesAtual.slice(0, 4));
  const periodo = lerPeriodo(params, mesAtual);
  const dados = await getRelatorio(periodo.inicio, periodo.fim, false);
  const resultado = dados.totalEntradas - dados.totalDespesas;
  const saldoFim = dados.contas.reduce((t, c) => t + c.fim, 0);

  const mesPassado = somarMes(mesAtual, -1);
  const trimestreFim = somarMes(mesAtual, -((Number(mesAtual.slice(5)) - 1) % 3) - 1);
  const atalhos = [
    { rotulo: `Mês passado (${nomeDoMes(mesPassado).split(" de ")[0]})`, de: mesPassado, ate: mesPassado },
    { rotulo: "Último trimestre fechado", de: somarMes(trimestreFim, -2), ate: trimestreFim },
    { rotulo: `${ano} até agora`, de: `${ano}-01`, ate: mesAtual },
    { rotulo: `Ano de ${ano - 1}`, de: `${ano - 1}-01`, ate: `${ano - 1}-12` },
  ];
  const pdf = (de: string, ate: string, detalhado = periodo.detalhado) =>
    `/app/financeiro/relatorio/pdf?de=${de}&ate=${ate}${detalhado ? "&detalhado=1" : ""}`;
  const rotuloPeriodo =
    periodo.de === periodo.ate ? nomeDoMes(periodo.de) : `${nomeDoMes(periodo.de)} a ${nomeDoMes(periodo.ate)}`;

  return (
    <>
      <PageHeader
        titulo="Relatório financeiro"
        descricao="Prestação de contas em PDF para a assembleia e o conselho fiscal: saldos, entradas, despesas, orçamento e contas em aberto."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Período</CardTitle>
            <CardDescription>Meses inteiros, pelo que foi efetivamente recebido e pago.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex flex-wrap gap-2">
              {atalhos.map((a) => (
                <Button
                  key={a.rotulo}
                  asChild
                  size="sm"
                  variant={a.de === periodo.de && a.ate === periodo.ate ? "default" : "outline"}
                >
                  <Link href={`/app/financeiro/relatorio?de=${a.de}&ate=${a.ate}${periodo.detalhado ? "&detalhado=1" : ""}`}>
                    {a.rotulo}
                  </Link>
                </Button>
              ))}
            </div>

            {/* formulário GET: muda a prévia; o PDF abre pelo botão abaixo */}
            <form className="space-y-4" action="/app/financeiro/relatorio">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="de">De</Label>
                  <Input id="de" name="de" type="month" defaultValue={periodo.de} max={mesAtual} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ate">Até</Label>
                  <Input id="ate" name="ate" type="month" defaultValue={periodo.ate} max={mesAtual} />
                </div>
              </div>
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" name="detalhado" value="1" defaultChecked={periodo.detalhado} className="mt-0.5 size-4 accent-primary" />
                <span>
                  Incluir a lista de despesas pagas
                  <span className="block text-xs text-muted-foreground">Uma linha por pagamento, para o conselho fiscal conferir.</span>
                </span>
              </label>
              <Button type="submit" variant="outline" size="sm">
                Atualizar prévia
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base first-letter:uppercase">{rotuloPeriodo}</CardTitle>
            <CardDescription>Prévia dos principais números do relatório.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <dl className="grid grid-cols-2 gap-3">
              {[
                { rotulo: "Entradas", valor: dados.totalEntradas },
                { rotulo: "Despesas pagas", valor: dados.totalDespesas },
                { rotulo: "Resultado", valor: resultado, sinal: true },
                ...(dados.contas.length ? [{ rotulo: "Saldo em contas no fim", valor: saldoFim, sinal: true }] : []),
              ].map((i) => (
                <div key={i.rotulo} className="rounded-lg bg-muted/60 p-3">
                  <dt className="text-xs text-muted-foreground">{i.rotulo}</dt>
                  <dd className={cn("mt-1 text-lg font-semibold tabular-nums", i.sinal && i.valor < 0 && "text-destructive")}>
                    {formatarMoeda(i.valor)}
                  </dd>
                </div>
              ))}
            </dl>
            {!dados.contas.length && (
              <p className="text-xs text-muted-foreground">
                Cadastre as contas em{" "}
                <Link href="/app/financeiro/contas-e-caixa" className="underline">
                  Contas e caixa
                </Link>{" "}
                para o relatório mostrar os saldos do início e do fim.
              </p>
            )}
            <Button asChild size="lg" className="w-full">
              <a href={pdf(periodo.de, periodo.ate)} target="_blank" rel="noopener">
                <FileDownIcon /> Gerar PDF
              </a>
            </Button>
            <p className="text-xs text-muted-foreground">
              O PDF traz espaço para as assinaturas do tesoureiro, do pastor e do conselho fiscal.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
