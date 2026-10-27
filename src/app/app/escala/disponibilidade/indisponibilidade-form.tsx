"use client";

import { SubmitButton } from "@/components/forms/submit-button";
import { useActionForm } from "@/components/forms/use-action-form";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { indisponibilidadeSchema, type IndisponibilidadeInput } from "@/lib/validation/escala";
import { marcarIndisponibilidade } from "./actions";

const VAZIO: IndisponibilidadeInput = { data_inicio: "", data_fim: "", motivo: "" };

export function IndisponibilidadeForm({ hoje }: { hoje: string }) {
  const { form, pending, onSubmit } = useActionForm({
    schema: indisponibilidadeSchema,
    defaultValues: VAZIO,
    action: marcarIndisponibilidade,
    onSuccess: () => form.reset(VAZIO),
  });
  const { errors } = form.formState;
  const inicio = form.watch("data_inicio");

  return (
    <form onSubmit={onSubmit} noValidate>
      <FieldGroup>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={!!errors.data_inicio}>
            <FieldLabel htmlFor="data_inicio">Não posso a partir de</FieldLabel>
            <Input id="data_inicio" type="date" min={hoje} aria-invalid={!!errors.data_inicio} {...form.register("data_inicio")} />
            <FieldError errors={[errors.data_inicio]} />
          </Field>
          <Field data-invalid={!!errors.data_fim}>
            <FieldLabel htmlFor="data_fim">Até</FieldLabel>
            <Input id="data_fim" type="date" min={inicio || hoje} aria-invalid={!!errors.data_fim} {...form.register("data_fim")} />
            <FieldDescription>Deixe em branco se for só um dia.</FieldDescription>
            <FieldError errors={[errors.data_fim]} />
          </Field>
        </div>
        <Field data-invalid={!!errors.motivo}>
          <FieldLabel htmlFor="motivo">Motivo</FieldLabel>
          <Input id="motivo" placeholder="Opcional (ex.: férias, viagem, plantão)" {...form.register("motivo")} />
          <FieldError errors={[errors.motivo]} />
        </Field>
        <div>
          <SubmitButton pending={pending}>Marcar indisponibilidade</SubmitButton>
        </div>
      </FieldGroup>
    </form>
  );
}
