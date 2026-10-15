import { Badge } from "@/components/ui/badge";
import type { Enums } from "@/lib/types";

export const STATUS_PROJETO_LABEL: Record<Enums<"koinonia_projeto_status">, string> = {
  planejado: "Planejado",
  em_andamento: "Em andamento",
  concluido: "Concluído",
};

export function ProjetoStatus({ status }: { status: Enums<"koinonia_projeto_status"> }) {
  return (
    <Badge variant={status === "em_andamento" ? "default" : "secondary"}>
      {STATUS_PROJETO_LABEL[status]}
    </Badge>
  );
}
