import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { nomeDoMes, somarMes } from "@/lib/validation/financeiro";

/** ‹ Outubro de 2026 › — `link` monta a URL de cada mês mantendo os outros filtros */
export function MesNavegacao({
  mes,
  mesAtual,
  link,
}: {
  mes: string;
  mesAtual: string;
  link: (mes: string) => string;
}) {
  return (
    <div className="mb-4 flex items-center gap-2">
      <Button asChild variant="outline" size="icon" aria-label="Mês anterior">
        <Link href={link(somarMes(mes, -1))} scroll={false}>
          <ChevronLeftIcon />
        </Link>
      </Button>
      <p className="min-w-44 text-center font-heading text-lg font-semibold first-letter:uppercase">{nomeDoMes(mes)}</p>
      <Button asChild variant="outline" size="icon" aria-label="Próximo mês">
        <Link href={link(somarMes(mes, 1))} scroll={false}>
          <ChevronRightIcon />
        </Link>
      </Button>
      {mes !== mesAtual && (
        <Button asChild variant="ghost" size="sm">
          <Link href={link(mesAtual)} scroll={false}>
            Mês atual
          </Link>
        </Button>
      )}
    </div>
  );
}
