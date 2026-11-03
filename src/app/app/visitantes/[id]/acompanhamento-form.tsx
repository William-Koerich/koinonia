"use client";

import { Loader2Icon } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { PessoaCombobox, type PessoaOpcao } from "@/components/forms/pessoa-combobox";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SITUACOES_VISITANTE, type SituacaoVisitante } from "@/lib/validation/visitante";
import { definirAcompanhamento } from "../actions";

/** ADMIN/PASTOR escolhem quem acompanha o visitante e a situação dele */
export function AcompanhamentoForm({
  visitanteId,
  pessoas,
  responsavelId,
  situacao,
}: {
  visitanteId: string;
  pessoas: PessoaOpcao[];
  responsavelId: string | null;
  situacao: SituacaoVisitante;
}) {
  const [responsavel, setResponsavel] = useState(responsavelId);
  const [novaSituacao, setNovaSituacao] = useState(situacao);
  const [pending, startTransition] = useTransition();
  const mudou = responsavel !== responsavelId || novaSituacao !== situacao;

  function salvar() {
    startTransition(async () => {
      const result = await definirAcompanhamento(visitanteId, { responsavel_id: responsavel, situacao: novaSituacao });
      if (result.ok) toast.success(result.message);
      else toast.error(result.error);
    });
  }

  return (
    <div className="space-y-4">
      <Field>
        <FieldLabel htmlFor="responsavel">Quem acompanha</FieldLabel>
        <PessoaCombobox
          id="responsavel"
          pessoas={pessoas}
          value={responsavel}
          onChange={setResponsavel}
          placeholder="Escolha um membro"
          permitirLimpar
        />
        <FieldDescription>A pessoa recebe uma notificação e passa a ver este visitante para registrar os contatos.</FieldDescription>
      </Field>
      <Field>
        <FieldLabel htmlFor="situacao">Situação</FieldLabel>
        <Select value={novaSituacao} onValueChange={(v) => setNovaSituacao(v as SituacaoVisitante)}>
          <SelectTrigger id="situacao" className="w-full sm:w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SITUACOES_VISITANTE.filter((s) => s.value !== "membro").map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Button onClick={salvar} disabled={pending || !mudou}>
        {pending && <Loader2Icon className="animate-spin" />}
        Salvar acompanhamento
      </Button>
    </div>
  );
}
