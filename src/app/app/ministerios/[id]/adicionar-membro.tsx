"use client";

import { Loader2Icon, UserPlusIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { PessoaCombobox, type PessoaOpcao } from "@/components/forms/pessoa-combobox";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { adicionarMembro } from "./actions";

export function AdicionarMembro({
  ministerioId,
  pessoas,
  jaMembros,
  podeDefinirLider,
}: {
  ministerioId: string;
  pessoas: PessoaOpcao[];
  jaMembros: string[];
  podeDefinirLider: boolean;
}) {
  const [pessoaId, setPessoaId] = useState<string | null>(null);
  const [comoLider, setComoLider] = useState(false);
  const [pending, startTransition] = useTransition();

  function adicionar() {
    if (!pessoaId) return;
    startTransition(async () => {
      const result = await adicionarMembro(ministerioId, pessoaId, comoLider);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message);
      setPessoaId(null);
      setComoLider(false);
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center">
      <div className="flex-1">
        <PessoaCombobox
          pessoas={pessoas}
          value={pessoaId}
          onChange={setPessoaId}
          placeholder="Buscar pessoa para adicionar"
          desabilitarIds={new Set(jaMembros)}
        />
      </div>
      {podeDefinirLider && (
        <div className="flex items-center gap-2">
          <Checkbox id="como-lider" checked={comoLider} onCheckedChange={(v) => setComoLider(v === true)} />
          <Label htmlFor="como-lider">Como líder</Label>
        </div>
      )}
      <Button onClick={adicionar} disabled={!pessoaId || pending}>
        {pending ? <Loader2Icon className="animate-spin" /> : <UserPlusIcon />}
        Adicionar
      </Button>
    </div>
  );
}
