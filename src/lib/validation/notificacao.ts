import { z } from "zod";
import { deInputDataHora } from "@/lib/format";
import { textoObrigatorio, textoOpcional } from "./comum";

/** Para onde a notificação leva ao ser tocada */
export const DESTINOS = [
  { value: "/app", label: "Início" },
  { value: "/app/avisos", label: "Avisos" },
  { value: "/app/eventos", label: "Eventos" },
  { value: "/app/escala", label: "Escala" },
  { value: "/app/cantina", label: "Cantina" },
  { value: "/app/ministerios", label: "Ministérios" },
] as const;

export const PUBLICOS_NOTIFICACAO = [
  { value: "todos", label: "Todos os membros" },
  { value: "homens", label: "Só homens" },
  { value: "mulheres", label: "Só mulheres" },
  { value: "ministerio", label: "Um ministério" },
  { value: "gc", label: "Um GC" },
] as const;

export const ORIGENS = { manual: "Manual", aviso: "Aviso", evento: "Evento", escala: "Escala" } as const;

export const notificacaoSchema = z
  .object({
    titulo: textoObrigatorio("o título", 100),
    mensagem: textoOpcional(300),
    url: z.enum(["/app", "/app/avisos", "/app/eventos", "/app/escala", "/app/cantina", "/app/ministerios"]),
    publico: z.enum(["todos", "homens", "mulheres", "ministerio", "gc"]),
    publico_id: z.string(),
    quando: z.enum(["agora", "agendar"]),
    agendada_para: z.string(),
  })
  .superRefine((d, ctx) => {
    if ((d.publico === "ministerio" || d.publico === "gc") && !z.uuid().safeParse(d.publico_id).success) {
      ctx.addIssue({ code: "custom", message: d.publico === "gc" ? "Selecione o GC." : "Selecione o ministério.", path: ["publico_id"] });
    }
    if (d.quando === "agendar") {
      if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(d.agendada_para)) {
        ctx.addIssue({ code: "custom", message: "Informe a data e a hora.", path: ["agendada_para"] });
      } else if (new Date(deInputDataHora(d.agendada_para)).getTime() < Date.now() - 60_000) {
        ctx.addIssue({ code: "custom", message: "Escolha um horário no futuro.", path: ["agendada_para"] });
      }
    }
  })
  .transform(({ quando, agendada_para, publico_id, ...n }) => ({
    ...n,
    publico_id: n.publico === "ministerio" || n.publico === "gc" ? publico_id : null,
    agendada_para: quando === "agendar" ? deInputDataHora(agendada_para) : new Date().toISOString(),
    enviarAgora: quando === "agora",
  }));

export type NotificacaoInput = z.input<typeof notificacaoSchema>;

export const NOTIFICACAO_VAZIA: NotificacaoInput = {
  titulo: "",
  mensagem: "",
  url: "/app",
  publico: "todos",
  publico_id: "",
  quando: "agora",
  agendada_para: "",
};

// ---------------------------------------------------------------- regras automáticas

/** Opções de "dias antes" do evento (o banco aceita só estas) */
export const DIAS_ANTES_EVENTO = [60, 45, 30, 21, 15, 14, 10, 7, 6, 5, 4, 3, 2, 1, 0] as const;
export const MINUTOS_ANTES = [
  { value: "0", label: "Na hora em que começa" },
  { value: "15", label: "15 minutos antes" },
  { value: "30", label: "30 minutos antes" },
  { value: "60", label: "1 hora antes" },
  { value: "120", label: "2 horas antes" },
] as const;

const horario = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Informe o horário.");

export const configNotificacaoSchema = z.object({
  escala_ativo: z.boolean(),
  escala_dias_antes: z
    .string()
    .refine((v) => /^\d{1,2}$/.test(v) && Number(v) <= 30, "De 0 a 30 dias.")
    .transform(Number),
  escala_horario: horario,
  aviso_ativo: z.boolean(),
  evento_ao_cadastrar: z.boolean(),
  evento_dias_antes: z.array(z.number().refine((n) => (DIAS_ANTES_EVENTO as readonly number[]).includes(n))).max(15),
  evento_horario: horario,
  evento_na_hora: z.boolean(),
  evento_minutos_antes: z.enum(["0", "15", "30", "60", "120"]).transform(Number),
});

export type ConfigNotificacaoInput = z.input<typeof configNotificacaoSchema>;
