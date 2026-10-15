import { z } from "zod";
import { somenteDigitos } from "@/lib/format";
import { textoObrigatorio, textoOpcional } from "./comum";

const ordemSchema = z
  .string()
  .refine((v) => /^\d{0,4}$/.test(v), "Use um número inteiro.")
  .transform((v) => (v === "" ? 0 : Number(v)));

const caminhoImagem = z
  .string()
  .nullable()
  .transform((v) => v || null);

export const pastorSchema = z.object({
  nome: textoObrigatorio("o nome"),
  cargo: textoObrigatorio("o cargo", 100),
  bio: textoOpcional(1000),
  foto_path: caminhoImagem,
  ordem: ordemSchema,
  ativo: z.boolean(),
});

export type PastorInput = z.input<typeof pastorSchema>;

export const STATUS_PROJETO = [
  { value: "planejado", label: "Planejado" },
  { value: "em_andamento", label: "Em andamento" },
  { value: "concluido", label: "Concluído" },
] as const;

export const projetoSchema = z.object({
  titulo: textoObrigatorio("o título"),
  slug: z
    .string()
    .trim()
    .min(1, "Informe o endereço da página.")
    .max(80, "Use no máximo 80 caracteres.")
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use só letras minúsculas, números e hífens (ex.: reforma-do-templo)."),
  resumo: textoOpcional(300),
  descricao: textoObrigatorio("a descrição", 10000),
  imagem_path: caminhoImagem,
  status: z.enum(["planejado", "em_andamento", "concluido"], { error: "Selecione o status." }),
  publicado: z.boolean(),
  ordem: ordemSchema,
});

export type ProjetoInput = z.input<typeof projetoSchema>;

export const TIPOS_CHAVE_PIX = [
  { value: "cnpj", label: "CNPJ" },
  { value: "cpf", label: "CPF" },
  { value: "email", label: "E-mail" },
  { value: "telefone", label: "Telefone" },
  { value: "aleatoria", label: "Chave aleatória" },
] as const;

export const contribuicaoSchema = z
  .object({
    chave_pix: textoOpcional(100),
    tipo_chave: z
      .enum(["", "cnpj", "cpf", "email", "telefone", "aleatoria"])
      .transform((v) => (v === "" ? null : v)),
    pix_recebedor: textoOpcional(25),
    pix_cidade: textoOpcional(15),
    banco: textoOpcional(100),
    agencia: textoOpcional(20),
    conta: textoOpcional(30),
    titular: textoOpcional(150),
    cnpj: z
      .string()
      .transform(somenteDigitos)
      .refine((v) => v === "" || v.length === 14, "Informe os 14 dígitos do CNPJ.")
      .transform((v) => v || null),
  })
  .refine((d) => !d.chave_pix || d.tipo_chave, { message: "Selecione o tipo da chave.", path: ["tipo_chave"] })
  .refine((d) => !d.chave_pix || (d.pix_recebedor && d.pix_cidade), {
    message: "Nome e cidade do recebedor são obrigatórios para gerar o QR Code.",
    path: ["pix_recebedor"],
  });

export type ContribuicaoInput = z.input<typeof contribuicaoSchema>;
