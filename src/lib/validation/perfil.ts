import { z } from "zod";
import { hojeISO, somenteDigitos } from "@/lib/format";

export const GENEROS = [
  { value: "masculino", label: "Masculino" },
  { value: "feminino", label: "Feminino" },
] as const;

export const nomeCompletoSchema = z
  .string()
  .trim()
  .min(3, "Informe seu nome completo.")
  .max(150, "Nome muito longo.")
  .refine((v) => v.includes(" "), "Informe nome e sobrenome.");

/** Recebe com máscara "(99) 99999-9999", devolve só os dígitos */
export const celularSchema = z
  .string()
  .transform(somenteDigitos)
  .pipe(z.string().regex(/^\d{11}$/, "Informe um celular válido com DDD."));

export const dataNascimentoSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Informe sua data de nascimento.")
  .refine((v) => v >= "1900-01-01", "Data de nascimento inválida.")
  .refine((v) => v <= hojeISO(), "A data de nascimento não pode estar no futuro.");

export const generoSchema = z.enum(["masculino", "feminino"], {
  error: "Selecione o gênero.",
});

/** Campos do perfil (criação pelo admin e meu perfil) */
export const perfilSchema = z.object({
  nome_completo: nomeCompletoSchema,
  celular: celularSchema,
  data_nascimento: dataNascimentoSchema,
  genero: generoSchema,
});

export type PerfilInput = z.input<typeof perfilSchema>;

export const meuPerfilSchema = perfilSchema.extend({
  gc_id: z.uuid().nullable(),
});

export type MeuPerfilInput = z.input<typeof meuPerfilSchema>;
