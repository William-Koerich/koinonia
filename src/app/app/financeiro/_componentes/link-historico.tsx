import { HistoryIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

/** Atalho para o histórico de alterações de um lançamento */
export function LinkHistorico({ registroId }: { registroId: string }) {
  return (
    <Button asChild variant="ghost" size="icon" className="text-muted-foreground">
      <Link href={`/app/financeiro/historico?registro=${registroId}`} aria-label="Histórico de alterações" title="Histórico de alterações">
        <HistoryIcon />
      </Link>
    </Button>
  );
}
