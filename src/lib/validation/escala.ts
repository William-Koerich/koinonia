import { z } from "zod";
import { idOpcional, textoObrigatorio, textoOpcional } from "./comum";

const dataSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a data.");

export const escalaSchema = z.object({
  data: dataSchema,
  descricao: textoObrigatorio("a descrição").pipe(z.string().min(2, "Descrição muito curta.")),
  evento_id: idOpcional,
});

export type EscalaInput = z.input<typeof escalaSchema>;

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
