import { z } from "zod";
import { somenteDigitos } from "@/lib/format";
import { textoOpcional } from "./comum";

/**
 * Inscrição feita pelo responsável do evento: um membro que já tem conta ou
 * um convidado sem conta. `pago` = pagamento já recebido (entra confirmada).
 */
export const novoInscritoSchema = z
  .object({
    tipo: z.enum(["membro", "convidado"]),
    profile_id: z.string(),
    convidado_nome: z.string().trim().max(150, "Nome muito longo."),
    convidado_celular: z
      .string()
      .transform(somenteDigitos)
      .refine((v) => v === "" || v.length === 10 || v.length === 11, "Informe um telefone válido com DDD."),
    observacao: textoOpcional(500),
    pago: z.boolean(),
  })
  .superRefine((d, ctx) => {
    if (d.tipo === "membro" && !z.uuid().safeParse(d.profile_id).success) {
      ctx.addIssue({ code: "custom", message: "Selecione a pessoa.", path: ["profile_id"] });
    }
    if (d.tipo === "convidado" && d.convidado_nome.length < 2) {
      ctx.addIssue({ code: "custom", message: "Informe o nome do convidado.", path: ["convidado_nome"] });
    }
  });

export type NovoInscritoInput = z.input<typeof novoInscritoSchema>;

export const NOVO_INSCRITO_VAZIO: NovoInscritoInput = {
  tipo: "convidado",
  profile_id: "",
  convidado_nome: "",
  convidado_celular: "",
  observacao: "",
  pago: false,
};
