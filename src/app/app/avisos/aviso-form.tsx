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
import { avisoSchema, type AvisoInput } from "@/lib/validation/aviso";
import { salvarAviso } from "./actions";

export function AvisoForm({ id, valores }: { id?: string; valores: AvisoInput }) {
  const { form, pending, onSubmit } = useActionForm({
    schema: avisoSchema,
    defaultValues: valores,
    action: (v) => salvarAviso(id ?? null, v),
  });
  const { errors } = form.formState;

  return (
    <form onSubmit={onSubmit} noValidate>
      <FieldGroup>
        <Field data-invalid={!!errors.titulo}>
          <FieldLabel htmlFor="titulo">Título</FieldLabel>
          <Input
            id="titulo"
            placeholder="Ex.: Domingo o culto será às 9h"
            aria-invalid={!!errors.titulo}
            {...form.register("titulo")}
          />
          <FieldError errors={[errors.titulo]} />
        </Field>

        <Field data-invalid={!!errors.mensagem}>
          <FieldLabel htmlFor="mensagem">Mensagem</FieldLabel>
          <Textarea
            id="mensagem"
            rows={5}
            placeholder="Opcional (ex.: por causa do 2º turno das eleições, o culto deste domingo será pela manhã)"
            {...form.register("mensagem")}
          />
          <FieldError errors={[errors.mensagem]} />
        </Field>

        <Field data-invalid={!!errors.imagem_path}>
          <FieldLabel>Imagem</FieldLabel>
          <Controller
            control={form.control}
            name="imagem_path"
            render={({ field }) => (
              <ImagemUpload pasta="avisos" proporcao="aspect-video" value={field.value} onChange={field.onChange} />
            )}
          />
          <FieldDescription>Opcional. JPG, PNG ou WebP até 5 MB.</FieldDescription>
          <FieldError errors={[errors.imagem_path]} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={!!errors.exibir_ate}>
            <FieldLabel htmlFor="exibir_ate">Mostrar até</FieldLabel>
            <Input id="exibir_ate" type="date" aria-invalid={!!errors.exibir_ate} {...form.register("exibir_ate")} />
            <FieldDescription>Depois desse dia o aviso some sozinho. Em branco, fica até você remover.</FieldDescription>
            <FieldError errors={[errors.exibir_ate]} />
          </Field>
          <Controller
            control={form.control}
            name="publico"
            render={({ field }) => (
              <Field orientation="horizontal" className="self-start sm:pt-6">
                <FieldContent>
                  <FieldLabel htmlFor="publico">Mostrar no site</FieldLabel>
                  <FieldDescription>Desligado, só os membros veem (na área logada).</FieldDescription>
                </FieldContent>
                <Switch id="publico" checked={field.value} onCheckedChange={field.onChange} />
              </Field>
            )}
          />
        </div>

        <div className="flex gap-2">
          <SubmitButton pending={pending}>Publicar</SubmitButton>
          <Button asChild variant="outline">
            <Link href="/app/avisos">Cancelar</Link>
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
