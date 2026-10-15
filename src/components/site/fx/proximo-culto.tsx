"use client";

import { useSyncExternalStore } from "react";
import { siteConfig } from "@/config/site";
import { DIAS_SEMANA } from "@/lib/constants";
import { TIME_ZONE } from "@/lib/format";

// Relógio que avisa a cada minuto; no servidor não há hora (evita diferença
// de hidratação), então o texto aparece só no navegador.
function assinar(aviso: () => void) {
  const id = setInterval(aviso, 30_000);
  return () => clearInterval(id);
}
const minutoAtual = () => Math.floor(Date.now() / 60_000);
const semHora = () => null;

const partes = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});
const DIAS_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DURACAO_CULTO = 120; // minutos em que o culto é considerado "acontecendo agora"
const SEMANA = 7 * 24 * 60;

/** Minutos desde domingo 00:00 no horário de Brasília */
function minutosNaSemana(minutoEpoch: number): number {
  const p = Object.fromEntries(partes.formatToParts(new Date(minutoEpoch * 60_000)).map((x) => [x.type, x.value]));
  return DIAS_EN.indexOf(p.weekday) * 1440 + Number(p.hour) * 60 + Number(p.minute);
}

function proximoCulto(minutoEpoch: number) {
  const agora = minutosNaSemana(minutoEpoch);
  let melhor: { culto: (typeof siteConfig.cultos)[number]; faltam: number } | null = null;
  for (const culto of siteConfig.cultos) {
    const [h, m] = culto.hora.split(":").map(Number);
    let faltam = (culto.dia * 1440 + h * 60 + m - agora + SEMANA) % SEMANA;
    if (faltam > SEMANA - DURACAO_CULTO) faltam -= SEMANA; // começou há pouco
    if (!melhor || faltam < melhor.faltam) melhor = { culto, faltam };
  }
  return melhor;
}

function quando(faltam: number): string {
  if (faltam <= 0) return "acontecendo agora";
  if (faltam < 60) return `em ${faltam} min`;
  if (faltam < 24 * 60) return `em ${Math.floor(faltam / 60)}h${String(faltam % 60).padStart(2, "0")}`;
  const dias = Math.round(faltam / 1440);
  return dias === 1 ? "amanhã" : `em ${dias} dias`;
}

/** "Próximo culto: domingo, 10h — em 2 dias" */
export function ProximoCulto({ className }: { className?: string }) {
  const minuto = useSyncExternalStore(assinar, minutoAtual, semHora);
  const proximo = minuto === null ? null : proximoCulto(minuto);

  return (
    <p className={className} aria-live="polite">
      {proximo ? (
        <>
          Próximo culto: {DIAS_SEMANA[proximo.culto.dia].toLowerCase()}, {proximo.culto.hora.replace(":00", "h")}
          <span className="opacity-70"> — {quando(proximo.faltam)}</span>
        </>
      ) : (
        // placeholder do mesmo tamanho para não "pular" ao hidratar
        <span className="invisible">Próximo culto</span>
      )}
    </p>
  );
}
