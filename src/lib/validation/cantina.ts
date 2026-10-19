import { z } from "zod";
import { lerMoeda } from "@/lib/format";
import { textoObrigatorio, textoOpcional } from "./comum";

export const MODOS_CANTINA = [
  { value: "comer_aqui", label: "Comer na igreja" },
  { value: "levar", label: "Levar para casa" },
] as const;

/** Item do cardápio (equipe da cantina) */
export const itemCantinaSchema = z.object({
  nome: textoObrigatorio("o nome do item", 100).pipe(z.string().min(2, "Nome muito curto.")),
  descricao: textoOpcional(300),
  // máscara "1.234,56"; vazio = sem preço definido
  preco: z.string().transform(lerMoeda),
  // vazio = sem limite
  quantidade_disponivel: z
    .string()
    .trim()
    .refine((v) => v === "" || /^\d{1,4}$/.test(v), "Use um número inteiro.")
    .transform((v) => (v === "" ? null : Number(v))),
});

export type ItemCantinaInput = z.input<typeof itemCantinaSchema>;

export const ITEM_CANTINA_VAZIO: ItemCantinaInput = { nome: "", descricao: "", preco: "", quantidade_disponivel: "" };

/** Reserva de um item (membro) */
export const reservaCantinaSchema = z.object({
  quantidade: z.number().int().min(1, "Reserve pelo menos 1.").max(50, "No máximo 50 por item."),
  modo: z.enum(["levar", "comer_aqui"], { error: "Escolha se vai levar ou comer na igreja." }),
  observacao: textoOpcional(300),
});

export type ReservaCantinaInput = z.input<typeof reservaCantinaSchema>;
