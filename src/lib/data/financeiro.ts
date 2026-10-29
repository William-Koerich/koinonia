import "server-only";
import { COMPROVANTES_BUCKET } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";

/** Contas (banco/caixa) para seletores; as inativas só aparecem se `incluirInativas` */
export async function getCarteiras(incluirInativas = false) {
  const supabase = await createClient();
  let query = supabase
    .from("koinonia_financeiro_carteiras")
    .select("id, nome, tipo, padrao, ativa")
    .order("padrao", { ascending: false })
    .order("nome");
  if (!incluirInativas) query = query.eq("ativa", true);
  const { data, error } = await query;
  if (error) throw new Error(`Erro ao carregar as contas: ${error.message}`);
  return data;
}

/** Quantos comprovantes cada lançamento tem (para o ícone de clipe nas listas) */
export async function contarAnexos(coluna: "entrada_id" | "conta_id", ids: string[]) {
  const mapa = new Map<string, number>();
  if (!ids.length) return mapa;
  const supabase = await createClient();
  const { data } = await supabase.from("koinonia_financeiro_anexos").select(coluna).in(coluna, ids);
  for (const linha of data ?? []) {
    const id = (linha as Record<string, string | null>)[coluna];
    if (id) mapa.set(id, (mapa.get(id) ?? 0) + 1);
  }
  return mapa;
}

/** Antes de apagar um lançamento: tira os arquivos do bucket (as linhas saem em cascata) */
export async function removerArquivosDe(coluna: "entrada_id" | "conta_id", id: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("koinonia_financeiro_anexos").select("path").eq(coluna, id);
  if (data?.length) await supabase.storage.from(COMPROVANTES_BUCKET).remove(data.map((a) => a.path));
}

export type LinhaOrcamento = {
  ministerioId: string | null;
  nome: string;
  orcamento: { id: string; valor: number; observacao: string | null } | null;
  /** despesas pagas no ano */
  realizado: number;
  /** contas em aberto com vencimento no ano */
  aPagar: number;
  /** pago no ano anterior (referência) */
  anoPassado: number;
};

/**
 * Previsto x realizado por ministério num ano (regime de caixa: conta paga
 * entra no ano do pagamento). "Despesas gerais" = contas sem ministério.
 */
export async function getOrcamento(ano: number): Promise<LinhaOrcamento[]> {
  const supabase = await createClient();
  const [{ data: ministerios }, { data: orcamentos }, { data: pagas }, { data: abertas }] = await Promise.all([
    supabase.from("koinonia_ministerios").select("id, nome").order("nome"),
    supabase.from("koinonia_financeiro_orcamentos").select("id, ministerio_id, valor, observacao").eq("ano", ano),
    supabase
      .from("koinonia_financeiro_contas")
      .select("ministerio_id, valor_pago, pago_em")
      .eq("status", "paga")
      .gte("pago_em", `${ano - 1}-01-01`)
      .lte("pago_em", `${ano}-12-31`),
    supabase
      .from("koinonia_financeiro_contas")
      .select("ministerio_id, valor")
      .eq("status", "pendente")
      .gte("vencimento", `${ano}-01-01`)
      .lte("vencimento", `${ano}-12-31`),
  ]);

  const chave = (id: string | null) => id ?? "geral";
  const linhas = new Map<string, LinhaOrcamento>();
  const linha = (id: string | null, nome: string) => {
    const k = chave(id);
    if (!linhas.has(k)) linhas.set(k, { ministerioId: id, nome, orcamento: null, realizado: 0, aPagar: 0, anoPassado: 0 });
    return linhas.get(k)!;
  };
  linha(null, "Despesas gerais da igreja");
  const nomes = new Map((ministerios ?? []).map((m) => [m.id, m.nome]));
  for (const m of ministerios ?? []) linha(m.id, m.nome);

  for (const o of orcamentos ?? []) {
    linha(o.ministerio_id, nomes.get(o.ministerio_id ?? "") ?? "Despesas gerais da igreja").orcamento = {
      id: o.id,
      valor: Number(o.valor),
      observacao: o.observacao,
    };
  }
  for (const c of pagas ?? []) {
    const l = linha(c.ministerio_id, nomes.get(c.ministerio_id ?? "") ?? "Ministério removido");
    if (c.pago_em?.startsWith(String(ano))) l.realizado += Number(c.valor_pago);
    else l.anoPassado += Number(c.valor_pago);
  }
  for (const c of abertas ?? []) linha(c.ministerio_id, nomes.get(c.ministerio_id ?? "") ?? "Ministério removido").aPagar += Number(c.valor);

  return [...linhas.values()];
}

export type Relatorio = Awaited<ReturnType<typeof getRelatorio>>;

/** Dia anterior a "2026-01-01" → "2025-12-31" */
function diaAnterior(data: string) {
  const d = new Date(`${data}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Números do relatório de prestação de contas de um período (meses inteiros,
 * regime de caixa): saldos das contas no início e no fim, entradas e
 * despesas por categoria e por mês, contas em aberto e o orçamento do ano.
 */
export async function getRelatorio(inicio: string, fim: string, detalhado: boolean) {
  const supabase = await createClient();
  await supabase.rpc("koinonia_financeiro_gerar_contas", { p_ate: fim });

  const [carteiras, saldosInicio, saldosFim, entradas, pagas, abertas, ministerios] = await Promise.all([
    getCarteiras(true),
    supabase.rpc("koinonia_financeiro_saldos", { p_ate: diaAnterior(inicio) }),
    supabase.rpc("koinonia_financeiro_saldos", { p_ate: fim }),
    supabase.from("koinonia_financeiro_entradas").select("data, categoria, valor").gte("data", inicio).lte("data", fim),
    supabase
      .from("koinonia_financeiro_contas")
      .select("descricao, categoria, fornecedor, pago_em, valor_pago, ministerio_id")
      .eq("status", "paga")
      .gte("pago_em", inicio)
      .lte("pago_em", fim)
      .order("pago_em"),
    supabase
      .from("koinonia_financeiro_contas")
      .select("descricao, vencimento, valor")
      .eq("status", "pendente")
      .lte("vencimento", fim)
      .order("vencimento"),
    supabase.from("koinonia_ministerios").select("id, nome"),
  ]);
  for (const r of [saldosInicio, saldosFim, entradas, pagas, abertas]) if (r.error) throw new Error(r.error.message);

  const inicioPorConta = new Map((saldosInicio.data ?? []).map((s) => [s.carteira_id, Number(s.saldo)]));
  const fimPorConta = new Map((saldosFim.data ?? []).map((s) => [s.carteira_id, Number(s.saldo)]));
  // conta criada depois do período não aparece; a criada no meio começa do saldo inicial
  const contas = carteiras
    .map((c) => ({ nome: c.nome, inicio: inicioPorConta.get(c.id) ?? 0, fim: fimPorConta.get(c.id) ?? 0 }))
    .filter((c) => c.inicio !== 0 || c.fim !== 0);

  const somaPor = <T,>(lista: T[], chave: (x: T) => string, valor: (x: T) => number) => {
    const mapa = new Map<string, number>();
    for (const x of lista) mapa.set(chave(x), (mapa.get(chave(x)) ?? 0) + valor(x));
    return mapa;
  };
  const listaEntradas = entradas.data ?? [];
  const listaPagas = pagas.data ?? [];

  const nomeMinisterio = new Map((ministerios.data ?? []).map((m) => [m.id, m.nome]));
  return {
    inicio,
    fim,
    contas,
    totalEntradas: listaEntradas.reduce((t, e) => t + Number(e.valor), 0),
    totalDespesas: listaPagas.reduce((t, c) => t + Number(c.valor_pago), 0),
    entradasPorCategoria: somaPor(listaEntradas, (e) => e.categoria, (e) => Number(e.valor)),
    despesasPorCategoria: somaPor(listaPagas, (c) => c.categoria, (c) => Number(c.valor_pago ?? 0)),
    entradasPorMes: somaPor(listaEntradas, (e) => e.data.slice(0, 7), (e) => Number(e.valor)),
    despesasPorMes: somaPor(listaPagas, (c) => (c.pago_em ?? "").slice(0, 7), (c) => Number(c.valor_pago ?? 0)),
    abertas: (abertas.data ?? []).map((c) => ({ ...c, valor: Number(c.valor) })),
    despesas: detalhado
      ? listaPagas.map((c) => ({
          data: c.pago_em ?? "",
          descricao: c.descricao,
          categoria: c.categoria,
          fornecedor: c.fornecedor,
          ministerio: c.ministerio_id ? (nomeMinisterio.get(c.ministerio_id) ?? null) : null,
          valor: Number(c.valor_pago ?? 0),
        }))
      : null,
    orcamento: await getOrcamento(Number(fim.slice(0, 4))),
  };
}
