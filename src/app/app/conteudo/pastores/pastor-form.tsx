"use client";

import Link from "next/link";
import { Controller } from "react-hook-form";
import { ImagemUpload } from "@/components/forms/imagem-upload";
import { SubmitButton } from "@/components/forms/submit-button";
import { useActionForm } from "@/components/forms/use-action-form";
import { Button } from "@/components/ui/button";
import { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { pastorSchema, type PastorInput } from "@/lib/validation/conteudo";
import { salvarPastor } from "../actions";

export function PastorForm({ id, valores }: { id?: string; valores: PastorInput }) {
  const { form, pending, onSubmit } = useActionForm({
    schema: pastorSchema,
    defaultValues: valores,
    action: (v) => salvarPastor(id ?? null, v),
  });
  const { errors } = form.formState;

  return (
    <form onSubmit={onSubmit} noValidate>
      <FieldGroup>
        <Field>
          <FieldLabel>Foto</FieldLabel>
          <Controller
            control={form.control}
            name="foto_path"
            render={({ field }) => <ImagemUpload pasta="pastores" value={field.value} onChange={field.onChange} />}
          />
          <FieldDescription>Quadrada, de preferência. JPG, PNG ou WebP até 5 MB.</FieldDescription>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={!!errors.nome}>
            <FieldLabel htmlFor="nome">Nome</FieldLabel>
            <Input id="nome" aria-invalid={!!errors.nome} {...form.register("nome")} />
            <FieldError errors={[errors.nome]} />
          </Field>
          <Field data-invalid={!!errors.cargo}>
            <FieldLabel htmlFor="cargo">Cargo</FieldLabel>
            <Input id="cargo" placeholder="Ex.: Pastor Presidente" aria-invalid={!!errors.cargo} {...form.register("cargo")} />
            <FieldError errors={[errors.cargo]} />
          </Field>
        </div>

        <Field data-invalid={!!errors.bio}>
          <FieldLabel htmlFor="bio">Bio curta</FieldLabel>
          <Textarea id="bio" rows={4} {...form.register("bio")} />
          <FieldError errors={[errors.bio]} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={!!errors.ordem}>
            <FieldLabel htmlFor="ordem">Ordem de exibição</FieldLabel>
            <Input id="ordem" inputMode="numeric" {...form.register("ordem")} />
            <FieldDescription>Menor aparece primeiro.</FieldDescription>
            <FieldError errors={[errors.ordem]} />
          </Field>
          <Controller
            control={form.control}
            name="ativo"
            render={({ field }) => (
              <Field orientation="horizontal" className="self-center">
                <FieldContent>
                  <FieldLabel htmlFor="ativo">Exibir no site</FieldLabel>
                </FieldContent>
                <Switch id="ativo" checked={field.value} onCheckedChange={field.onChange} />
              </Field>
            )}
          />
        </div>

        <div className="flex gap-2">
          <SubmitButton pending={pending}>Salvar</SubmitButton>
          <Button asChild variant="outline">
            <Link href="/app/conteudo/pastores">Cancelar</Link>
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
