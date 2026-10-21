"use client";

import { PencilIcon } from "lucide-react";
import { useState } from "react";
import { FormProvider } from "react-hook-form";
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
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { recorrenciaSchema, type RecorrenciaInput } from "@/lib/validation/financeiro";
import { salvarRecorrencia } from "../actions";
import { CamposConta, CamposTermino } from "../campos-conta";

export function RecorrenciaDialog({ id, resumo, valores }: { id: string; resumo: string; valores: RecorrenciaInput }) {
  const [aberto, setAberto] = useState(false);
  const { form, pending, onSubmit } = useActionForm({
    schema: recorrenciaSchema,
    defaultValues: valores,
    action: (v) => salvarRecorrencia(id, v),
    onSuccess: () => setAberto(false),
  });
  const { errors } = form.formState;

  return (
    <Dialog
      open={aberto}
      onOpenChange={(abrir) => {
        setAberto(abrir);
        if (abrir) form.reset(valores);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Editar recorrência">
          <PencilIcon />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90svh] overflow-y-auto">
        <FormProvider {...form}>
          <form onSubmit={onSubmit} noValidate>
            <DialogHeader>
              <DialogTitle>Editar recorrência</DialogTitle>
              <DialogDescription>
                {resumo}. As mudanças valem para as próximas contas em aberto; as pagas e as já vencidas não mudam.
              </DialogDescription>
            </DialogHeader>
            <FieldGroup className="py-4">
              <CamposConta />
              <CamposTermino />
              <Field data-invalid={!!errors.observacao}>
                <FieldLabel htmlFor="observacao">Observação</FieldLabel>
                <Input id="observacao" placeholder="Opcional" {...form.register("observacao")} />
                <FieldError errors={[errors.observacao]} />
              </Field>
            </FieldGroup>
            <DialogFooter>
              <SubmitButton pending={pending}>Salvar</SubmitButton>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
