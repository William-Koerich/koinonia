import { z } from "zod";
import { textoObrigatorio, textoOpcional } from "./comum";

export const ministerioSchema = z.object({
  nome: textoObrigatorio("o nome", 100).pipe(z.string().min(2, "Nome muito curto.")),
  descricao: textoOpcional(500),
});

export type MinisterioInput = z.input<typeof ministerioSchema>;
