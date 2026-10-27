import { CheckIcon, CircleDashedIcon, XIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Enums } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUS = {
  confirmado: { rotulo: "Confirmado", icone: CheckIcon, classe: "border-emerald-600/25 bg-emerald-500/10 text-emerald-700" },
  pendente: { rotulo: "Aguardando", icone: CircleDashedIcon, classe: "border-amber-600/25 bg-amber-500/10 text-amber-700" },
  recusado: { rotulo: "Não pode", icone: XIcon, classe: "border-destructive/25 bg-destructive/10 text-destructive" },
} as const;

export function StatusResposta({
  resposta,
  className,
}: {
  resposta: Enums<"koinonia_escala_resposta">;
  className?: string;
}) {
  const s = STATUS[resposta];
  return (
    <Badge variant="outline" className={cn(s.classe, className)}>
      <s.icone /> {s.rotulo}
    </Badge>
  );
}
