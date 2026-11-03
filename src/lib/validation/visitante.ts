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

export const SITUACOES_VISITANTE = [
  { value: "novo", label: "Novo" },
  { value: "em_contato", label: "Em contato" },
  { value: "frequentando", label: "Frequentando" },
  // só pelo "Tornar membro" (cria o usuário e liga ao visitante)
  { value: "membro", label: "Membro" },
  { value: "sem_interesse", label: "Sem interesse" },
] as const;

export type SituacaoVisitante = (typeof SITUACOES_VISITANTE)[number]["value"];

export const rotuloSituacao = (v: SituacaoVisitante) => SITUACOES_VISITANTE.find((s) => s.value === v)?.label ?? v;

export const MEIOS_CONTATO = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "ligacao", label: "Ligação" },
  { value: "visita", label: "Visita" },
  { value: "pessoalmente", label: "Pessoalmente na igreja" },
  { value: "outro", label: "Outro" },
] as const;

/** Contato feito no acompanhamento, já com a situação depois dele */
export const contatoVisitanteSchema = z.object({
  feito_em: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a data."),
  meio: z.enum(["whatsapp", "ligacao", "visita", "pessoalmente", "outro"], { error: "Escolha como foi o contato." }),
  resultado: z.string().trim().min(2, "Conte como foi.").max(1000, "Use no máximo 1000 caracteres."),
  situacao: z.enum(["novo", "em_contato", "frequentando", "membro", "sem_interesse"]),
});

export type ContatoVisitanteInput = z.input<typeof contatoVisitanteSchema>;
