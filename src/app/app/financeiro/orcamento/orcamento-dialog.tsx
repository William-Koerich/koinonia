"use client";

import { PencilIcon, PlusIcon } from "lucide-react";
import { useState } from "react";
import { Controller } from "react-hook-form";
import { MoedaInput } from "@/components/forms/moeda-input";
import { SubmitButton } from "@/components/forms/submit-button";
import { useActionForm } from "@/components/forms/use-action-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { orcamentoSchema, type OrcamentoInput } from "@/lib/validation/financeiro";
import { salvarOrcamento } from "./actions";

/** Valor previsto no ano para um ministério (ou para as despesas gerais) */
export function OrcamentoDialog({
  nome,
  valores,
  gastoAnoPassado,
}: {
  nome: string;
  valores: OrcamentoInput;
  /** referência para ajudar a definir o valor */
  gastoAnoPassado: string | null;
}) {
  const [aberto, setAberto] = useState(false);
  const { form, pending, onSubmit } = useActionForm({
    schema: orcamentoSchema,
    defaultValues: valores,
    action: salvarOrcamento,
    onSuccess: () => setAberto(false),
  });
  const { errors } = form.formState;
  const novo = !valores.valor;

  return (
    <Dialog
      open={aberto}
      onOpenChange={(abrir) => {
        setAberto(abrir);
        if (abrir) form.reset(valores);
      }}
    >
      <DialogTrigger asChild>
        {novo ? (
          <Button variant="outline" size="sm">
            <PlusIcon /> Definir
          </Button>
        ) : (
          <Button variant="ghost" size="icon" aria-label={`Editar orçamento de ${nome}`}>
            <PencilIcon />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={onSubmit} noValidate>
          <DialogHeader>
            <DialogTitle>Orçamento {valores.ano}</DialogTitle>
            <DialogDescription>{nome}</DialogDescription>
          </DialogHeader>
          <FieldGroup className="py-4">
            <Field data-invalid={!!errors.valor}>
              <FieldLabel htmlFor="valor">Previsto para o ano</FieldLabel>
              <Controller
                control={form.control}
                name="valor"
                render={({ field }) => (
                  <MoedaInput id="valor" value={field.value} onChange={field.onChange} onBlur={field.onBlur} invalido={!!errors.valor} />
                )}
              />
              {gastoAnoPassado && <FieldDescription>Gasto no ano anterior: {gastoAnoPassado}.</FieldDescription>}
              <FieldError errors={[errors.valor]} />
            </Field>
            <Field>
              <FieldLabel htmlFor="observacao">Observação</FieldLabel>
              <Input id="observacao" placeholder="Opcional (ex.: inclui o congresso de jovens)" {...form.register("observacao")} />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <SubmitButton pending={pending}>Salvar</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
