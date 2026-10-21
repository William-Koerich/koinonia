import { z } from "zod";
import { lerMoeda } from "@/lib/format";
import { textoOpcional } from "./comum";

export const CATEGORIAS_ENTRADA = [
  { value: "dizimo", label: "Dízimo" },
  { value: "oferta", label: "Oferta" },
  { value: "primicias", label: "Primícias" },
  { value: "doacao", label: "Doação" },
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
    categoria: z.enum(["dizimo", "oferta", "primicias", "doacao", "outra"], { error: "Selecione a categoria." }),
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

/** "2026-10" válido, senão o mês atual */
export function mesValido(valor: unknown, padrao: string): string {
  return typeof valor === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(valor) ? valor : padrao;
}
