import { z } from "zod";
import { deInputDataHora } from "@/lib/format";
import { idOpcional, textoObrigatorio, textoOpcional } from "./comum";

const dataSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a data.");

/** <input type="datetime-local"> opcional; vazio = sem ensaio */
const dataHoraOpcional = z
  .string()
  .refine((v) => !v || /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v), "Informe a data e a hora.")
  .transform((v) => (v ? deInputDataHora(v) : null));

export const escalaSchema = z.object({
  data: dataSchema,
  descricao: textoObrigatorio("a descrição").pipe(z.string().min(2, "Descrição muito curta.")),
  evento_id: idOpcional,
  ensaio_em: dataHoraOpcional,
  ensaio_local: textoOpcional(150),
  repertorio: textoOpcional(4000),
});

export type EscalaInput = z.input<typeof escalaSchema>;

export const ESCALA_VAZIA: EscalaInput = {
  data: "",
  descricao: "",
  evento_id: null,
  ensaio_em: "",
  ensaio_local: "",
  repertorio: "",
};

export const indisponibilidadeSchema = z
  .object({
    data_inicio: dataSchema,
    // vazio = só o dia de início
    data_fim: z.string(),
    motivo: textoOpcional(200),
  })
  .transform((v) => ({ ...v, data_fim: v.data_fim || v.data_inicio }))
  .refine((v) => /^\d{4}-\d{2}-\d{2}$/.test(v.data_fim) && v.data_fim >= v.data_inicio, {
    message: "A data final precisa ser igual ou depois da inicial.",
    path: ["data_fim"],
  });

export type IndisponibilidadeInput = z.input<typeof indisponibilidadeSchema>;

/** Motivo de recusa ou de pedido de troca (opcional) */
export const motivoEscalaSchema = textoOpcional(300);

export const cantinaSchema = z
  .object({
    data: dataSchema,
    descricao: textoOpcional(150),
    gc_id: idOpcional,
    ministerio_id: idOpcional,
  })
  .refine((c) => c.gc_id || c.ministerio_id, {
    message: "Escolha um GC, um ministério ou os dois.",
    path: ["gc_id"],
  });

export type CantinaInput = z.input<typeof cantinaSchema>;
