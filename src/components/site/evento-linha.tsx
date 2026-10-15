import { PUBLICO_LABEL } from "@/components/site/evento-card";
import type { EventoPublico } from "@/lib/data/site";
import { formatarHora, formatarValorEvento, LOCALE, TIME_ZONE } from "@/lib/format";
import { Stagger, StaggerItem } from "./fx/reveal";

const dia = new Intl.DateTimeFormat(LOCALE, { day: "2-digit", timeZone: TIME_ZONE });
const mes = new Intl.DateTimeFormat(LOCALE, { month: "short", timeZone: TIME_ZONE });
const semana = new Intl.DateTimeFormat(LOCALE, { weekday: "long", timeZone: TIME_ZONE });

/** Lista editorial de eventos: data grande, título, detalhes discretos */
export function ListaEventos({ eventos, detalhada = false }: { eventos: EventoPublico[]; detalhada?: boolean }) {
  return (
    <Stagger className="border-t border-border">
      {eventos.map((e) => {
        const inicio = new Date(e.inicio);
        return (
          <StaggerItem key={e.id}>
            <article className="grid grid-cols-[4.5rem_1fr] gap-5 border-b border-border py-8 sm:grid-cols-[6rem_1fr_auto] sm:items-center sm:gap-8">
              <div>
                <p className="font-display text-5xl leading-none sm:text-6xl">{dia.format(inicio)}</p>
                <p className="mt-1 text-xs tracking-[0.2em] text-muted-foreground uppercase">
                  {mes.format(inicio).replace(".", "")}
                </p>
              </div>
              <div className="min-w-0">
                <h3 className="font-display text-3xl leading-tight">{e.titulo}</h3>
                <p className="mt-1 text-sm text-muted-foreground first-letter:uppercase">
                  {semana.format(inicio)}, {formatarHora(e.inicio)} · {e.logradouro}, {e.numero} — {e.bairro}
                </p>
                {detalhada && e.descricao && <p className="mt-3 max-w-2xl text-muted-foreground">{e.descricao}</p>}
              </div>
              <p className="col-start-2 text-sm sm:col-start-auto sm:text-right">
                <span className={e.valor === null ? "text-destaque" : undefined}>{formatarValorEvento(e.valor)}</span>
                <span className="text-muted-foreground"> · {PUBLICO_LABEL[e.publico]}</span>
              </p>
            </article>
          </StaggerItem>
        );
      })}
    </Stagger>
  );
}
