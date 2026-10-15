import { z } from "zod";
import { enderecoSchema, ENDERECO_VAZIO, idOpcional, textoObrigatorio } from "./comum";

export const gcSchema = enderecoSchema.extend({
  nome: textoObrigatorio("o nome", 100).pipe(z.string().min(2, "Nome muito curto.")),
  // <select> trabalha com string: "" = não informado, "0".."6" = dia
  dia_semana: z
    .string()
    .refine((v) => v === "" || /^[0-6]$/.test(v), "Dia inválido.")
    .transform((v) => (v === "" ? null : Number(v))),
  horario: z
    .string()
    .refine((v) => v === "" || /^\d{2}:\d{2}(:\d{2})?$/.test(v), "Horário inválido.")
    .transform((v) => (v === "" ? null : v.slice(0, 5))),
  lider_id: idOpcional,
});

export type GcInput = z.input<typeof gcSchema>;

export const GC_VAZIO: GcInput = {
  ...ENDERECO_VAZIO,
  nome: "",
  dia_semana: "",
  horario: "",
  lider_id: null,
};
