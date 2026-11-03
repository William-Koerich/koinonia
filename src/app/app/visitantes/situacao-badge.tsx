import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { rotuloSituacao, type SituacaoVisitante } from "@/lib/validation/visitante";

const CLASSE: Record<SituacaoVisitante, string> = {
  novo: "border-amber-600/25 bg-amber-500/10 text-amber-700",
  em_contato: "border-sky-600/25 bg-sky-500/10 text-sky-700",
  frequentando: "border-emerald-600/25 bg-emerald-500/10 text-emerald-700",
  membro: "border-primary/25 bg-primary/10 text-primary",
  sem_interesse: "text-muted-foreground",
};

export function SituacaoBadge({ situacao, className }: { situacao: SituacaoVisitante; className?: string }) {
  return (
    <Badge variant="outline" className={cn(CLASSE[situacao], className)}>
      {rotuloSituacao(situacao)}
    </Badge>
  );
}
