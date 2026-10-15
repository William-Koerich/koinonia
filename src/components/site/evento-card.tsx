import { CalendarIcon, MapPinIcon, UserIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import type { EventoPublico } from "@/lib/data/site";
import { formatarDataLonga, formatarHora, formatarValorEvento } from "@/lib/format";
import type { Enums } from "@/lib/types";
import { cn } from "@/lib/utils";

export const PUBLICO_LABEL: Record<Enums<"koinonia_publico_evento">, string> = {
  homens: "Homens",
  mulheres: "Mulheres",
  todos: "Todos",
};

function quando(inicio: string, fim: string): string {
  const diaInicio = formatarDataLonga(inicio);
  const diaFim = formatarDataLonga(fim);
  return diaInicio === diaFim
    ? `${diaInicio}, ${formatarHora(inicio)} às ${formatarHora(fim)}`
    : `${diaInicio}, ${formatarHora(inicio)} até ${diaFim}, ${formatarHora(fim)}`;
}

export function EventoCard({
  evento,
  responsavel,
  children,
  className,
}: {
  evento: EventoPublico;
  /** Nome do responsável (só na área logada) */
  responsavel?: string | null;
  /** Ações no rodapé (ex.: editar/excluir) */
  children?: React.ReactNode;
  className?: string;
}) {
  const endereco = [
    `${evento.logradouro}, ${evento.numero}`,
    evento.complemento,
    `${evento.bairro} — ${evento.cidade}/${evento.uf}`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Card className={cn("h-full", className)}>
      <CardHeader>
        <div className="flex flex-wrap gap-2">
          <Badge variant={evento.valor === null ? "secondary" : "outline"}>
            {formatarValorEvento(evento.valor)}
          </Badge>
          <Badge variant="outline">{PUBLICO_LABEL[evento.publico]}</Badge>
        </div>
        <CardTitle className="text-lg">{evento.titulo}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="flex gap-2">
          <CalendarIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <span className="first-letter:uppercase">{quando(evento.inicio, evento.fim)}</span>
        </p>
        <p className="flex gap-2 text-muted-foreground">
          <MapPinIcon className="mt-0.5 size-4 shrink-0" />
          <span>{endereco}</span>
        </p>
        {responsavel && (
          <p className="flex gap-2 text-muted-foreground">
            <UserIcon className="mt-0.5 size-4 shrink-0" />
            <span>Responsável: {responsavel}</span>
          </p>
        )}
        {evento.descricao && <p className="text-muted-foreground">{evento.descricao}</p>}
      </CardContent>
      {children && <CardFooter className="mt-auto justify-end gap-1">{children}</CardFooter>}
    </Card>
  );
}
