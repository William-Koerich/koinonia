"use client";

import { FormProvider } from "react-hook-form";
import { completarCadastro } from "@/app/(auth)/actions";
import { PerfilFields } from "@/components/forms/perfil-fields";
import { SubmitButton } from "@/components/forms/submit-button";
import { useActionForm } from "@/components/forms/use-action-form";
import { FieldGroup } from "@/components/ui/field";
import { perfilSchema } from "@/lib/validation/perfil";

export function CompletarCadastroForm({ nomeSugerido }: { nomeSugerido: string }) {
  const { form, pending, onSubmit } = useActionForm({
    schema: perfilSchema,
    defaultValues: { nome_completo: nomeSugerido, celular: "", data_nascimento: "" },
    action: completarCadastro,
  });

  return (
    <FormProvider {...form}>
      <form onSubmit={onSubmit} noValidate>
        <FieldGroup>
          <PerfilFields />
          <SubmitButton pending={pending} className="w-full">
            Concluir cadastro
          </SubmitButton>
        </FieldGroup>
      </form>
    </FormProvider>
  );
}
