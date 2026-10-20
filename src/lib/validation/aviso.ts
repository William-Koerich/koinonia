import { z } from "zod";
import { textoObrigatorio, textoOpcional } from "./comum";

export const avisoSchema = z.object({
  titulo: textoObrigatorio("o título"),
  mensagem: textoOpcional(3000),
  imagem_path: z
    .string()
    .nullable()
    .transform((v) => v || null)
    .pipe(z.string().regex(/^avisos\/[0-9a-f-]{36}\.(jpg|png|webp)$/, "Imagem inválida.").nullable()),
  publico: z.boolean(),
  /** último dia em que o aviso aparece; vazio = até ser removido */
  exibir_ate: z
    .string()
    .refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), "Informe uma data válida.")
    .transform((v) => v || null),
});

export type AvisoInput = z.input<typeof avisoSchema>;

export const AVISO_VAZIO: AvisoInput = { titulo: "", mensagem: "", imagem_path: null, publico: true, exibir_ate: "" };
