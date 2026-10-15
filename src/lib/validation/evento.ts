import { z } from "zod";
import { deInputDataHora, lerMoeda } from "@/lib/format";
import { enderecoSchema, ENDERECO_VAZIO, textoObrigatorio, textoOpcional } from "./comum";

export const PUBLICOS = [
  { value: "todos", label: "Todos" },
  { value: "homens", label: "Homens" },
  { value: "mulheres", label: "Mulheres" },
] as const;

const dataHora = (rotulo: string) =>
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, `Informe ${rotulo}.`)
    .transform(deInputDataHora);

export const eventoSchema = enderecoSchema
  .extend({
    titulo: textoObrigatorio("o título").pipe(z.string().min(3, "Título muito curto.")),
    descricao: textoOpcional(2000),
    inicio: dataHora("a data e hora de início"),
    fim: dataHora("a data e hora de término"),
    // máscara "1.234,56"; vazio = evento gratuito (null)
    valor: z
      .string()
      .transform(lerMoeda)
      .refine((v) => v === null || v > 0, "O valor deve ser maior que zero (deixe vazio se for gratuito)."),
    responsavel_id: z.uuid("Selecione o responsável."),
    publico: z.enum(["todos", "homens", "mulheres"], { error: "Selecione o público." }),
  })
  .refine((e) => new Date(e.fim) > new Date(e.inicio), {
    message: "O término deve ser depois do início.",
    path: ["fim"],
  });

export type EventoInput = z.input<typeof eventoSchema>;

export const EVENTO_VAZIO: EventoInput = {
  ...ENDERECO_VAZIO,
  titulo: "",
  descricao: "",
  inicio: "",
  fim: "",
  valor: "",
  responsavel_id: "",
  publico: "todos",
};
