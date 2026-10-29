import { HistoryIcon, MinusCircleIcon, PencilIcon, PlusCircleIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth";
import { getMinisteriosOpcoes, getPessoas } from "@/lib/data/app";
import { getCarteiras } from "@/lib/data/financeiro";
import { ROLES_FINANCEIRO } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { mudancas, quando, resumo, TABELAS, type Tabela } from "./descrever";

export const metadata: Metadata = { title: "Histórico do financeiro" };

const POR_PAGINA = 50;
const UUID = /^[0-9a-f-]{36}$/i;

const ACAO = {
  criou: { verbo: "criou", icone: PlusCircleIcon, classe: "text-emerald-600" },
  alterou: { verbo: "alterou", icone: PencilIcon, classe: "text-sky-600" },
  excluiu: { verbo: "excluiu", icone: MinusCircleIcon, classe: "text-destructive" },
} as const;

/** Quem criou, alterou ou excluiu o quê no financeiro (registro gravado pelo banco, só leitura) */
export default async function HistoricoPage({ searchParams }: PageProps<"/app/financeiro/historico">) {
  await requireRole(...ROLES_FINANCEIRO);
  const params = await searchParams;
  const registro = typeof params.registro === "string" && UUID.test(params.registro) ? params.registro : null;
  const tabela = typeof params.tabela === "string" && params.tabela in TABELAS ? (params.tabela as Tabela) : null;
  const pagina = Math.max(1, Number(params.pagina) || 1);

  const supabase = await createClient();
  let query = supabase
    .from("koinonia_financeiro_auditoria")
    .select(
      "id, tabela, registro_id, acao, alterado_em, dados, autor:koinonia_perfis_basicos!koinonia_financeiro_auditoria_alterado_por_fkey(nome_completo)",
      { count: "exact" },
    )
    .order("alterado_em", { ascending: false })
    .order("id", { ascending: false })
    .range((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA - 1);
  if (registro) query = query.eq("registro_id", registro);
  if (tabela) query = query.eq("tabela", tabela);

  const [{ data: eventos, count, error }, carteiras, ministerios, pessoas] = await Promise.all([
    query,
    getCarteiras(true),
    getMinisteriosOpcoes(),
    getPessoas(),
  ]);
  if (error) throw new Error(error.message);

  const nomes = new Map<string, string>([
    ...carteiras.map((c) => [c.id, c.nome] as [string, string]),
    ...ministerios.map((m) => [m.id, m.nome] as [string, string]),
    ...pessoas.map((p) => [p.id, p.nome_completo] as [string, string]),
  ]);

  // como o registro está hoje (para descrever as alterações); excluídos usam os dados guardados
  const idsPorTabela = new Map<Tabela, string[]>();
  for (const e of eventos) {
    if (e.acao !== "alterou" || !(e.tabela in TABELAS)) continue;
    const t = e.tabela as Tabela;
    idsPorTabela.set(t, [...(idsPorTabela.get(t) ?? []), e.registro_id]);
  }
  const atuais = new Map<string, Record<string, unknown>>();
  await Promise.all(
    [...idsPorTabela].map(async ([t, ids]) => {
      const { data } = await supabase.from(t).select("*").in("id", [...new Set(ids)]);
      for (const r of (data ?? []) as Record<string, unknown>[]) atuais.set(String(r.id), r);
    }),
  );
  // criação guardada no histórico, se o registro foi excluído depois
  const criados = new Map(eventos.filter((e) => e.acao !== "alterou").map((e) => [e.registro_id, e.dados as Record<string, unknown>]));

  const total = count ?? 0;
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const link = (novo: { tabela?: Tabela | null; pagina?: number }) => {
    const p = new URLSearchParams();
    if (registro) p.set("registro", registro);
    const t = novo.tabela === undefined ? tabela : novo.tabela;
    if (t) p.set("tabela", t);
    if (novo.pagina && novo.pagina > 1) p.set("pagina", String(novo.pagina));
    const qs = p.toString();
    return qs ? `/app/financeiro/historico?${qs}` : "/app/financeiro/historico";
  };

  return (
    <>
      <PageHeader
        titulo="Histórico do financeiro"
        descricao="Tudo o que foi lançado, alterado ou excluído, com quem fez e quando. Ninguém consegue apagar este registro."
      />

      {registro ? (
        <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
          <Badge variant="secondary">Mostrando um lançamento</Badge>
          <Button asChild variant="link" size="sm" className="h-auto px-0">
            <Link href="/app/financeiro/historico">Ver tudo</Link>
          </Button>
        </div>
      ) : (
        <div className="mb-4 flex flex-wrap gap-2">
          <Button asChild size="sm" variant={!tabela ? "default" : "outline"}>
            <Link href={link({ tabela: null })}>Tudo</Link>
          </Button>
          {(Object.keys(TABELAS) as Tabela[]).map((t) => (
            <Button key={t} asChild size="sm" variant={tabela === t ? "default" : "outline"}>
              <Link href={link({ tabela: t })}>{TABELAS[t].rotulo}</Link>
            </Button>
          ))}
        </div>
      )}

      {eventos.length === 0 ? (
        <EmptyState icone={HistoryIcon} titulo="Nada registrado ainda" descricao="As alterações aparecem aqui a partir de agora." />
      ) : (
        <ol className="divide-y rounded-xl border">
          {eventos.map((e) => {
            const t = (e.tabela in TABELAS ? e.tabela : null) as Tabela | null;
            const acao = ACAO[e.acao as keyof typeof ACAO];
            const registroAtual = atuais.get(e.registro_id) ?? criados.get(e.registro_id);
            const titulo = t && registroAtual ? resumo(t, registroAtual, nomes) : null;
            const lista = t && e.acao === "alterou" ? mudancas(t, e.dados as Record<string, [unknown, unknown]>, nomes) : [];
            return (
              <li key={e.id} className="flex gap-3 px-4 py-3">
                <acao.icone className={cn("mt-0.5 size-4 shrink-0", acao.classe)} />
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-sm">
                    <strong className="font-medium">{e.autor?.nome_completo ?? "Sistema"}</strong> {acao.verbo}{" "}
                    {t ? `${TABELAS[t].artigo} ${TABELAS[t].rotulo.toLowerCase()}` : e.tabela}
                    {titulo && (
                      <>
                        {": "}
                        {registro ? (
                          <span className="font-medium">{titulo}</span>
                        ) : (
                          <Link href={`/app/financeiro/historico?registro=${e.registro_id}`} className="font-medium hover:underline">
                            {titulo}
                          </Link>
                        )}
                      </>
                    )}
                  </p>
                  {lista.length > 0 && (
                    <ul className="space-y-0.5 text-xs">
                      {lista.map((m) => (
                        <li key={m.campo} className="text-muted-foreground">
                          {m.campo}: <span className="line-through">{m.antes}</span> → <span className="text-foreground">{m.depois}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className="text-xs text-muted-foreground">{quando(e.alterado_em)}</p>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {paginas > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <Button asChild variant="outline" size="sm" className={cn(pagina <= 1 && "pointer-events-none opacity-50")}>
            <Link href={link({ pagina: pagina - 1 })}>Mais recentes</Link>
          </Button>
          <span className="text-muted-foreground">
            Página {pagina} de {paginas}
          </span>
          <Button asChild variant="outline" size="sm" className={cn(pagina >= paginas && "pointer-events-none opacity-50")}>
            <Link href={link({ pagina: pagina + 1 })}>Mais antigos</Link>
          </Button>
        </div>
      )}
    </>
  );
}
