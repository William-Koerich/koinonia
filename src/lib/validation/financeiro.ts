import { z } from "zod";
import { lerMoeda } from "@/lib/format";
import { textoOpcional } from "./comum";

export const CATEGORIAS_ENTRADA = [
  { value: "dizimo", label: "Dízimo" },
  { value: "oferta", label: "Oferta" },
  { value: "primicias", label: "Primícias" },
  { value: "doacao", label: "Doação" },
  // lançada automaticamente quando a tesouraria confirma o pagamento de uma inscrição
  { value: "evento", label: "Inscrição em evento" },
  { value: "outra", label: "Outra" },
] as const;

export const FORMAS_PAGAMENTO = [
  { value: "pix", label: "PIX" },
  { value: "dinheiro", label: "Dinheiro" },
  { value: "cartao", label: "Cartão" },
  { value: "transferencia", label: "Transferência" },
  { value: "outra", label: "Outra" },
] as const;

export type CategoriaEntrada = (typeof CATEGORIAS_ENTRADA)[number]["value"];
export type FormaPagamento = (typeof FORMAS_PAGAMENTO)[number]["value"];

export const rotuloCategoria = (v: CategoriaEntrada) => CATEGORIAS_ENTRADA.find((c) => c.value === v)?.label ?? v;
export const rotuloForma = (v: FormaPagamento) => FORMAS_PAGAMENTO.find((f) => f.value === v)?.label ?? v;

/**
 * Lançamento de entrada. Quem contribuiu: um membro com conta, um nome livre
 * (quem não tem conta) ou ninguém (ex.: oferta recolhida no culto).
 */
export const entradaSchema = z
  .object({
    data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a data."),
    categoria: z.enum(["dizimo", "oferta", "primicias", "doacao", "evento", "outra"], { error: "Selecione a categoria." }),
    valor: z
      .string()
      .transform(lerMoeda)
      .refine((v) => v !== null && v > 0, "Informe o valor.")
      .transform((v) => v as number),
    forma_pagamento: z.enum(["pix", "dinheiro", "cartao", "transferencia", "outra"], {
      error: "Selecione a forma de recebimento.",
    }),
    contribuinte: z.enum(["nenhum", "membro", "outro"]),
    profile_id: z.string(),
    contribuinte_nome: z.string().trim().max(150, "Nome muito longo."),
    descricao: textoOpcional(500),
  })
  .superRefine((d, ctx) => {
    if (d.contribuinte === "membro" && !z.uuid().safeParse(d.profile_id).success) {
      ctx.addIssue({ code: "custom", message: "Selecione o membro.", path: ["profile_id"] });
    }
    if (d.contribuinte === "outro" && d.contribuinte_nome.length < 2) {
      ctx.addIssue({ code: "custom", message: "Informe o nome de quem contribuiu.", path: ["contribuinte_nome"] });
    }
  })
  // formato da tabela: só um dos dois campos de contribuinte fica preenchido
  .transform(({ contribuinte, profile_id, contribuinte_nome, ...resto }) => ({
    ...resto,
    profile_id: contribuinte === "membro" ? profile_id : null,
    contribuinte_nome: contribuinte === "outro" ? contribuinte_nome : null,
  }));

export type EntradaInput = z.input<typeof entradaSchema>;

export const entradaVazia = (data: string): EntradaInput => ({
  data,
  categoria: "dizimo",
  valor: "",
  forma_pagamento: "pix",
  contribuinte: "membro",
  profile_id: "",
  contribuinte_nome: "",
  descricao: "",
});

/** Soma meses a "2026-10" */
export function somarMes(mes: string, delta: number): string {
  const [ano, m] = mes.split("-").map(Number);
  const d = new Date(Date.UTC(ano, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Último dia do mês "2026-02" → "2026-02-28" */
export function fimDoMes(mes: string): string {
  const [ano, m] = mes.split("-").map(Number);
  return new Date(Date.UTC(ano, m, 0)).toISOString().slice(0, 10);
}

const formatoMes = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });

/** "outubro de 2026" */
export function nomeDoMes(mes: string): string {
  return formatoMes.format(new Date(`${mes}-01T00:00:00Z`));
}

/** "2026-10" válido, senão o mês atual */
export function mesValido(valor: unknown, padrao: string): string {
  return typeof valor === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(valor) ? valor : padrao;
}

// ---------------------------------------------------------------- contas a pagar

export const CATEGORIAS_DESPESA = [
  { value: "aluguel", label: "Aluguel" },
  { value: "energia", label: "Energia" },
  { value: "agua", label: "Água" },
  { value: "internet_telefone", label: "Internet e telefone" },
  { value: "salarios", label: "Salários e prebendas" },
  { value: "manutencao", label: "Manutenção" },
  { value: "materiais", label: "Materiais" },
  { value: "impostos_taxas", label: "Impostos e taxas" },
  { value: "missoes", label: "Missões" },
  { value: "eventos", label: "Eventos" },
  { value: "outra", label: "Outra" },
] as const;

export const FREQUENCIAS = [
  { value: "semanal", label: "Toda semana" },
  { value: "quinzenal", label: "A cada 15 dias" },
  { value: "mensal", label: "Todo mês" },
  { value: "bimestral", label: "A cada 2 meses" },
  { value: "trimestral", label: "A cada 3 meses" },
  { value: "semestral", label: "A cada 6 meses" },
  { value: "anual", label: "Todo ano" },
] as const;

export type CategoriaDespesa = (typeof CATEGORIAS_DESPESA)[number]["value"];
export type Frequencia = (typeof FREQUENCIAS)[number]["value"];

export const rotuloDespesa = (v: CategoriaDespesa) => CATEGORIAS_DESPESA.find((c) => c.value === v)?.label ?? v;
export const rotuloFrequencia = (v: Frequencia) => FREQUENCIAS.find((f) => f.value === v)?.label ?? v;

const valorObrigatorio = z
  .string()
  .transform(lerMoeda)
  .refine((v) => v !== null && v > 0, "Informe o valor.")
  .transform((v) => v as number);

const dataObrigatoria = (rotulo: string) => z.string().regex(/^\d{4}-\d{2}-\d{2}$/, `Informe ${rotulo}.`);

const categoriaDespesa = z.enum(
  ["aluguel", "energia", "agua", "internet_telefone", "salarios", "manutencao", "materiais", "impostos_taxas", "missoes", "eventos", "outra"],
  { error: "Selecione a categoria." },
);

const camposConta = {
  descricao: z.string().trim().min(1, "Informe a descrição.").max(150, "Use no máximo 150 caracteres."),
  categoria: categoriaDespesa,
  fornecedor: textoOpcional(150),
  valor: valorObrigatorio,
  observacao: textoOpcional(500),
};

/** Como a recorrência termina: nunca, numa data ou depois de N vezes */
const camposTermino = {
  termino: z.enum(["nunca", "data", "parcelas"]),
  data_fim: z.string(),
  parcelas: z.string(),
};

type Termino = { termino: "nunca" | "data" | "parcelas"; data_fim: string; parcelas: string };

function validarTermino(d: Termino, inicio: string | null, ctx: z.RefinementCtx) {
  if (d.termino === "data") {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d.data_fim)) {
      ctx.addIssue({ code: "custom", message: "Informe a data do último vencimento.", path: ["data_fim"] });
    } else if (inicio && d.data_fim < inicio) {
      ctx.addIssue({ code: "custom", message: "Precisa ser depois do 1º vencimento.", path: ["data_fim"] });
    }
  }
  if (d.termino === "parcelas") {
    const n = Number(d.parcelas);
    if (!/^\d+$/.test(d.parcelas) || n < 2 || n > 360) {
      ctx.addIssue({ code: "custom", message: "Informe de 2 a 360 vezes.", path: ["parcelas"] });
    }
  }
}

const terminoParaBanco = (d: Termino) => ({
  data_fim: d.termino === "data" ? d.data_fim : null,
  parcelas: d.termino === "parcelas" ? Number(d.parcelas) : null,
});

/**
 * Nova conta (avulsa ou recorrente) ou edição de uma conta. Na edição,
 * `repetir` fica "nao": mudar a recorrência é na tela de contas recorrentes.
 */
export const contaSchema = z
  .object({
    ...camposConta,
    vencimento: dataObrigatoria("o vencimento"),
    repetir: z.enum(["nao", "semanal", "quinzenal", "mensal", "bimestral", "trimestral", "semestral", "anual"]),
    ...camposTermino,
  })
  .superRefine((d, ctx) => {
    if (d.repetir !== "nao") validarTermino(d, d.vencimento, ctx);
  })
  .transform(({ repetir, termino, data_fim, parcelas, ...conta }) => ({
    conta,
    recorrencia:
      repetir === "nao"
        ? null
        : { frequencia: repetir, data_inicio: conta.vencimento, ...terminoParaBanco({ termino, data_fim, parcelas }) },
  }));

export type ContaInput = z.input<typeof contaSchema>;

export const contaVazia = (vencimento: string): ContaInput => ({
  descricao: "",
  categoria: "outra",
  fornecedor: "",
  valor: "",
  vencimento,
  observacao: "",
  repetir: "nao",
  termino: "nunca",
  data_fim: "",
  parcelas: "",
});

/** Edição de uma recorrência: valores e término (a frequência e o início não mudam) */
export const recorrenciaSchema = z
  .object({ ...camposConta, ...camposTermino, data_inicio: z.string() })
  .superRefine((d, ctx) => validarTermino(d, d.data_inicio, ctx))
  .transform(({ descricao, categoria, fornecedor, valor, observacao, ...termino }) => ({
    descricao,
    categoria,
    fornecedor,
    valor,
    observacao,
    ...terminoParaBanco(termino),
  }));

export type RecorrenciaInput = z.input<typeof recorrenciaSchema>;

export const pagamentoSchema = z.object({
  pago_em: dataObrigatoria("a data do pagamento"),
  valor_pago: valorObrigatorio,
  forma_pagamento: z.enum(["pix", "dinheiro", "cartao", "transferencia", "outra"], {
    error: "Selecione a forma de pagamento.",
  }),
});

export type PagamentoInput = z.input<typeof pagamentoSchema>;
