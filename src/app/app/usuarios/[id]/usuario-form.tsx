"use client";

import Link from "next/link";
import { Controller, FormProvider } from "react-hook-form";
import { GcSelect, type GcOpcao } from "@/components/forms/gc-select";
import { PerfilFields } from "@/components/forms/perfil-fields";
import { SubmitButton } from "@/components/forms/submit-button";
import { useActionForm } from "@/components/forms/use-action-form";
import { Button } from "@/components/ui/button";
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel, FieldSeparator } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { usuarioEdicaoSchema, type UsuarioEdicaoInput } from "@/lib/validation/usuario";
import { atualizarUsuario } from "../actions";
import { PapelSelect } from "../papel-select";

export function UsuarioForm({
  id,
  valores,
  gcs,
  podeAlterarPapel,
  ehVoceMesmo,
  ehLider,
}: {
  id: string;
  valores: UsuarioEdicaoInput;
  gcs: GcOpcao[];
  podeAlterarPapel: boolean;
  ehVoceMesmo: boolean;
  ehLider: boolean;
}) {
  const { form, pending, onSubmit } = useActionForm({
    schema: usuarioEdicaoSchema,
    defaultValues: valores,
    action: (v) => atualizarUsuario(id, v),
  });

  return (
    <FormProvider {...form}>
      <form onSubmit={onSubmit} noValidate>
        <FieldGroup>
          <PerfilFields />

          <Field>
            <FieldLabel htmlFor="gc_id">GC</FieldLabel>
            <Controller
              control={form.control}
              name="gc_id"
              render={({ field }) => <GcSelect id="gc_id" gcs={gcs} value={field.value} onChange={field.onChange} />}
            />
          </Field>

          <FieldSeparator>Acesso</FieldSeparator>

          <Field>
            <FieldLabel htmlFor="role">Papel</FieldLabel>
            <Controller
              control={form.control}
              name="role"
              render={({ field }) => (
                <PapelSelect
                  id="role"
                  value={field.value}
                  onChange={field.onChange}
                  disabled={!podeAlterarPapel || ehVoceMesmo}
                />
              )}
            />
            <FieldDescription>
              {ehVoceMesmo
                ? "Você não pode alterar o seu próprio papel."
                : !podeAlterarPapel
                  ? "Apenas administradores alteram papéis."
                  : ehLider
                    ? "Lidera ministério: como Membro, aparece automaticamente como Líder de ministério."
                    : "Líder de ministério é definido automaticamente pela liderança em ministérios."}
            </FieldDescription>
          </Field>

          <Controller
            control={form.control}
            name="ativo"
            render={({ field }) => (
              <Field orientation="horizontal">
                <FieldContent>
                  <FieldLabel htmlFor="ativo">Acesso ativo</FieldLabel>
                  <FieldDescription>
                    {ehVoceMesmo
                      ? "Você não pode desativar o seu próprio usuário."
                      : "Usuário inativo não entra na área de membros e não pode ser escalado."}
                  </FieldDescription>
                </FieldContent>
                <Switch id="ativo" checked={field.value} onCheckedChange={field.onChange} disabled={ehVoceMesmo} />
              </Field>
            )}
          />

          <div className="flex gap-2">
            <SubmitButton pending={pending}>Salvar</SubmitButton>
            <Button asChild variant="outline">
              <Link href="/app/usuarios">Cancelar</Link>
            </Button>
          </div>
        </FieldGroup>
      </form>
    </FormProvider>
  );
}
