import { z } from "zod";
import { somenteDigitos } from "@/lib/format";

/** Texto opcional: string vazia vira null no banco */
export const textoOpcional = (max = 2000) =>
  z
    .string()
    .trim()
    .max(max, `Use no máximo ${max} caracteres.`)
    .transform((v) => v || null);

export const textoObrigatorio = (rotulo: string, max = 150) =>
  z
    .string()
    .trim()
    .min(1, `Informe ${rotulo}.`)
    .max(max, `Use no máximo ${max} caracteres.`);

/** UUID de um select/combobox; vazio = null */
export const idOpcional = z
  .string()
  .nullable()
  .transform((v) => v || null)
  .pipe(z.uuid().nullable());

export const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA",
  "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
] as const;

/** Campos de endereço comuns a eventos e GCs */
export const enderecoSchema = z.object({
  cep: z
    .string()
    .transform(somenteDigitos)
    .pipe(z.string().length(8, "Informe um CEP válido.")),
  logradouro: textoObrigatorio("o logradouro"),
  numero: textoObrigatorio("o número (ou s/n)", 20),
  complemento: textoOpcional(100),
  bairro: textoObrigatorio("o bairro", 100),
  cidade: textoObrigatorio("a cidade", 100),
  uf: z
    .string()
    .trim()
    .toUpperCase()
    .refine((v) => (UFS as readonly string[]).includes(v), "Selecione a UF."),
});

export type EnderecoInput = z.input<typeof enderecoSchema>;

export const ENDERECO_VAZIO: EnderecoInput = {
  cep: "",
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  uf: "",
};
