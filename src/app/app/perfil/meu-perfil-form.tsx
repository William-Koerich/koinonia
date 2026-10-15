"use client";

import { Controller, FormProvider } from "react-hook-form";
import { GcSelect, type GcOpcao } from "@/components/forms/gc-select";
import { PerfilFields } from "@/components/forms/perfil-fields";
import { SubmitButton } from "@/components/forms/submit-button";
import { useActionForm } from "@/components/forms/use-action-form";
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldSeparator } from "@/components/ui/field";
import { meuPerfilSchema, type MeuPerfilInput } from "@/lib/validation/perfil";
import { atualizarMeuPerfil } from "./actions";

export function MeuPerfilForm({ valores, gcs }: { valores: MeuPerfilInput; gcs: GcOpcao[] }) {
  const { form, pending, onSubmit } = useActionForm({
    schema: meuPerfilSchema,
    defaultValues: valores,
    action: atualizarMeuPerfil,
  });

  return (
    <FormProvider {...form}>
      <form onSubmit={onSubmit} noValidate>
        <FieldGroup>
          <PerfilFields />
          <FieldSeparator>Grupo Caseiro</FieldSeparator>
          <Field>
            <FieldLabel htmlFor="gc_id">Meu GC</FieldLabel>
            <Controller
              control={form.control}
              name="gc_id"
              render={({ field }) => (
                <GcSelect id="gc_id" gcs={gcs} value={field.value} onChange={field.onChange} />
              )}
            />
            <FieldDescription>Você pode participar de um GC por vez e trocar quando quiser.</FieldDescription>
          </Field>
          <SubmitButton pending={pending} className="sm:w-fit">
            Salvar alterações
          </SubmitButton>
        </FieldGroup>
      </form>
    </FormProvider>
  );
}
