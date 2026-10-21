import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { formatarMoeda } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Cartão de total; com `href`, vira filtro (clicar de novo desmarca) */
export function TotalCard({
  rotulo,
  valor,
  detalhe,
  href,
  ativo,
  destaque,
  tom,
}: {
  rotulo: string;
  valor: number;
  detalhe?: string;
  href?: string;
  ativo?: boolean;
  destaque?: boolean;
  tom?: "alerta" | "sucesso";
}) {
  const card = (
    <Card
      className={cn(
        "h-full py-4 transition-colors",
        href && "group-hover:bg-muted/50",
        ativo && "border-primary ring-1 ring-primary",
        tom === "alerta" && valor > 0 && "border-destructive/50 bg-destructive/5",
      )}
    >
      <CardContent className="px-4">
        <p className="text-xs text-muted-foreground">{rotulo}</p>
        <p
          className={cn(
            "mt-1 font-semibold tabular-nums",
            destaque ? "text-xl" : "text-lg",
            tom === "alerta" && valor > 0 && "text-destructive",
            tom === "sucesso" && "text-emerald-700 dark:text-emerald-400",
          )}
        >
          {formatarMoeda(valor)}
        </p>
        {detalhe && <p className="text-xs text-muted-foreground">{detalhe}</p>}
      </CardContent>
    </Card>
  );
  if (!href) return card;
  return (
    <Link href={href} scroll={false} aria-current={ativo ? "true" : undefined} className="group">
      {card}
    </Link>
  );
}
