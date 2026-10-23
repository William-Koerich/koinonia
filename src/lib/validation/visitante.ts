import { z } from "zod";
import { somenteDigitos } from "@/lib/format";
import { textoOpcional } from "./comum";

export const visitanteSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome.").max(150, "Use no máximo 150 caracteres."),
  celular: z
    .string()
    .transform(somenteDigitos)
    .refine((v) => v.length === 10 || v.length === 11, "Informe o celular com DDD."),
  data_visita: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a data da visita."),
  motivo: textoOpcional(500),
});

export type VisitanteInput = z.input<typeof visitanteSchema>;

export const visitanteVazio = (hoje: string): VisitanteInput => ({ nome: "", celular: "", data_visita: hoje, motivo: "" });
