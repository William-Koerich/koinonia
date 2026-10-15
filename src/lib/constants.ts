export const DIAS_SEMANA = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"] as const;

/** "Quarta · 20:00" a partir de dia_semana (0 = domingo) e horario ("20:00:00") */
export function descreverEncontro(dia: number | null, horario: string | null): string {
  return [dia !== null ? DIAS_SEMANA[dia] : null, horario?.slice(0, 5)].filter(Boolean).join(" · ");
}
