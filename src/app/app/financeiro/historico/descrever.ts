import { formatarData, formatarDataHora, formatarMoeda } from "@/lib/format";
import {
  CATEGORIAS_DESPESA,
  CATEGORIAS_ENTRADA,
  FORMAS_PAGAMENTO,
  FREQUENCIAS,
  TIPOS_CARTEIRA,
} from "@/lib/validation/financeiro";

/** Nomes para traduzir ids em texto (contas, ministérios, pessoas) */
export type Nomes = Map<string, string>;

export const TABELAS = {
  koinonia_financeiro_entradas: { rotulo: "Entrada", artigo: "a" },
  koinonia_financeiro_contas: { rotulo: "Conta a pagar", artigo: "a" },
  koinonia_financeiro_recorrencias: { rotulo: "Conta recorrente", artigo: "a" },
  koinonia_financeiro_carteiras: { rotulo: "Conta (banco/caixa)", artigo: "a" },
  koinonia_financeiro_transferencias: { rotulo: "Transferência", artigo: "a" },
  koinonia_financeiro_orcamentos: { rotulo: "Orçamento", artigo: "o" },
  koinonia_financeiro_anexos: { rotulo: "Comprovante", artigo: "o" },
} as const;

export type Tabela = keyof typeof TABELAS;

const CAMPOS: Record<string, string> = {
  data: "Data",
  categoria: "Categoria",
  valor: "Valor",
  forma_pagamento: "Forma",
  profile_id: "Membro",
  contribuinte_nome: "Contribuinte",
  descricao: "Descrição",
  carteira_id: "Conta",
  status: "Situação",
  pago_em: "Pago em",
  valor_pago: "Valor pago",
  vencimento: "Vencimento",
  fornecedor: "Fornecedor",
  observacao: "Observação",
  ministerio_id: "Ministério",
  nome: "Nome",
  tipo: "Tipo",
  saldo_inicial: "Saldo inicial",
  saldo_inicial_em: "Data do saldo inicial",
  padrao: "Conta principal",
  ativa: "Ativa",
  origem_id: "Saiu de",
  destino_id: "Entrou em",
  ano: "Ano",
  frequencia: "Frequência",
  data_inicio: "1º vencimento",
  data_fim: "Último vencimento",
  parcelas: "Parcelas",
};

// campos internos que não interessam no histórico
const OCULTOS = new Set(["id", "created_by", "inscricao_id", "ocorrencia", "recorrencia_id", "path", "entrada_id", "conta_id", "tamanho"]);

const DINHEIRO = new Set(["valor", "valor_pago", "saldo_inicial"]);
const DATAS = new Set(["data", "pago_em", "vencimento", "saldo_inicial_em", "data_inicio", "data_fim"]);
const IDS = new Set(["profile_id", "carteira_id", "ministerio_id", "origem_id", "destino_id"]);
const ROTULOS: Record<string, readonly { value: string; label: string }[]> = {
  forma_pagamento: FORMAS_PAGAMENTO,
  frequencia: FREQUENCIAS,
  tipo: TIPOS_CARTEIRA,
  status: [
    { value: "pendente", label: "A pagar" },
    { value: "paga", label: "Paga" },
    { value: "cancelada", label: "Cancelada" },
  ],
};

function valorLegivel(campo: string, valor: unknown, tabela: Tabela, nomes: Nomes): string {
  if (valor === null || valor === undefined || valor === "") return "—";
  if (typeof valor === "boolean") return valor ? "Sim" : "Não";
  if (DINHEIRO.has(campo)) return formatarMoeda(Number(valor));
  if (DATAS.has(campo)) return formatarData(String(valor));
  if (IDS.has(campo)) return nomes.get(String(valor)) ?? "(removido)";
  if (campo === "categoria") {
    const lista = tabela === "koinonia_financeiro_entradas" ? CATEGORIAS_ENTRADA : CATEGORIAS_DESPESA;
    return lista.find((c) => c.value === valor)?.label ?? String(valor);
  }
  const lista = ROTULOS[campo];
  if (lista) return lista.find((o) => o.value === valor)?.label ?? String(valor);
  return String(valor);
}

export type Mudanca = { campo: string; antes: string; depois: string };

/** {valor: [50, 60]} → [{campo: "Valor", antes: "R$ 50,00", depois: "R$ 60,00"}] */
export function mudancas(tabela: Tabela, dados: Record<string, [unknown, unknown]>, nomes: Nomes): Mudanca[] {
  return Object.entries(dados)
    .filter(([campo]) => !OCULTOS.has(campo) && CAMPOS[campo])
    .map(([campo, [antes, depois]]) => ({
      campo: CAMPOS[campo],
      antes: valorLegivel(campo, antes, tabela, nomes),
      depois: valorLegivel(campo, depois, tabela, nomes),
    }));
}

/** Resumo de um registro inteiro ("Dízimo · R$ 100,00 · 05/10/2026") */
export function resumo(tabela: Tabela, r: Record<string, unknown>, nomes: Nomes): string {
  const v = (campo: string) => valorLegivel(campo, r[campo], tabela, nomes);
  switch (tabela) {
    case "koinonia_financeiro_entradas":
      return [v("categoria"), v("valor"), v("data"), r.profile_id ? v("profile_id") : r.contribuinte_nome as string]
        .filter((x) => x && x !== "—")
        .join(" · ");
    case "koinonia_financeiro_contas":
    case "koinonia_financeiro_recorrencias":
      return [r.descricao as string, v("valor"), r.vencimento ? `vence ${v("vencimento")}` : null].filter(Boolean).join(" · ");
    case "koinonia_financeiro_carteiras":
      return `${r.nome as string} (${v("tipo")})`;
    case "koinonia_financeiro_transferencias":
      return `${v("valor")} · ${v("origem_id")} → ${v("destino_id")} · ${v("data")}`;
    case "koinonia_financeiro_orcamentos":
      return `${r.ano} · ${r.ministerio_id ? v("ministerio_id") : "Despesas gerais"} · ${v("valor")}`;
    case "koinonia_financeiro_anexos":
      return String(r.nome ?? "arquivo");
  }
}

export const quando = formatarDataHora;
