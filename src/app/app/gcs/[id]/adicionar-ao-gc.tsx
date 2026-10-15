"use client";

import { Loader2Icon, UserPlusIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { PessoaCombobox, type PessoaOpcao } from "@/components/forms/pessoa-combobox";
import { Button } from "@/components/ui/button";
import { adicionarAoGc } from "../actions";

export function AdicionarAoGc({
  gcId,
  pessoas,
  jaMembros,
}: {
  gcId: string;
  pessoas: PessoaOpcao[];
  jaMembros: string[];
}) {
  const [pessoaId, setPessoaId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function adicionar() {
    if (!pessoaId) return;
    startTransition(async () => {
      const result = await adicionarAoGc(gcId, pessoaId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message);
      setPessoaId(null);
    });
  }

  return (
    <div className="space-y-2 rounded-xl border p-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex-1">
          <PessoaCombobox
            pessoas={pessoas}
            value={pessoaId}
            onChange={setPessoaId}
            placeholder="Buscar pessoa para adicionar"
            desabilitarIds={new Set(jaMembros)}
          />
        </div>
        <Button onClick={adicionar} disabled={!pessoaId || pending}>
          {pending ? <Loader2Icon className="animate-spin" /> : <UserPlusIcon />}
          Adicionar
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">Cada pessoa participa de um GC: se ela estiver em outro, muda para este.</p>
    </div>
  );
}
