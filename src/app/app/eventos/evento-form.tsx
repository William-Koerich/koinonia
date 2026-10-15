"use client";

import Link from "next/link";
import { Controller, FormProvider } from "react-hook-form";
import { EnderecoFields } from "@/components/forms/endereco-fields";
import { MoedaInput } from "@/components/forms/moeda-input";
import { PessoaCombobox, type PessoaOpcao } from "@/components/forms/pessoa-combobox";
import { SubmitButton } from "@/components/forms/submit-button";
import { useActionForm } from "@/components/forms/use-action-form";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldSeparator } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { eventoSchema, PUBLICOS, type EventoInput } from "@/lib/validation/evento";
import { salvarEvento } from "./actions";

export function EventoForm({
  id,
  valores,
  pessoas,
}: {
  id?: string;
  valores: EventoInput;
  pessoas: PessoaOpcao[];
}) {
  const { form, pending, onSubmit } = useActionForm({
    schema: eventoSchema,
    defaultValues: valores,
    action: (v) => salvarEvento(id ?? null, v),
  });
  const { errors } = form.formState;

  return (
    <FormProvider {...form}>
      <form onSubmit={onSubmit} noValidate>
        <FieldGroup>
          <Field data-invalid={!!errors.titulo}>
            <FieldLabel htmlFor="titulo">Título</FieldLabel>
            <Input id="titulo" aria-invalid={!!errors.titulo} {...form.register("titulo")} />
            <FieldError errors={[errors.titulo]} />
          </Field>

          <Field data-invalid={!!errors.descricao}>
            <FieldLabel htmlFor="descricao">Descrição</FieldLabel>
            <Textarea id="descricao" rows={3} placeholder="Opcional" {...form.register("descricao")} />
            <FieldError errors={[errors.descricao]} />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field data-invalid={!!errors.inicio}>
              <FieldLabel htmlFor="inicio">Início</FieldLabel>
              <Input id="inicio" type="datetime-local" aria-invalid={!!errors.inicio} {...form.register("inicio")} />
              <FieldError errors={[errors.inicio]} />
            </Field>
            <Field data-invalid={!!errors.fim}>
              <FieldLabel htmlFor="fim">Término</FieldLabel>
              <Input id="fim" type="datetime-local" aria-invalid={!!errors.fim} {...form.register("fim")} />
              <FieldError errors={[errors.fim]} />
            </Field>
          </div>
          <FieldDescription className="-mt-4">Horário de Brasília.</FieldDescription>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field data-invalid={!!errors.valor}>
              <FieldLabel htmlFor="valor">Valor</FieldLabel>
              <Controller
                control={form.control}
                name="valor"
                render={({ field }) => (
                  <MoedaInput
                    id="valor"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    placeholder="Gratuito"
                    invalido={!!errors.valor}
                  />
                )}
              />
              <FieldDescription>Deixe vazio para evento gratuito.</FieldDescription>
              <FieldError errors={[errors.valor]} />
            </Field>
            <Field data-invalid={!!errors.publico}>
              <FieldLabel htmlFor="publico">Público</FieldLabel>
              <Controller
                control={form.control}
                name="publico"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="publico" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PUBLICOS.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError errors={[errors.publico]} />
            </Field>
          </div>

          <Field data-invalid={!!errors.responsavel_id}>
            <FieldLabel htmlFor="responsavel_id">Responsável</FieldLabel>
            <Controller
              control={form.control}
              name="responsavel_id"
              render={({ field }) => (
                <PessoaCombobox
                  id="responsavel_id"
                  pessoas={pessoas}
                  value={field.value || null}
                  onChange={(v) => field.onChange(v ?? "")}
                  invalido={!!errors.responsavel_id}
                />
              )}
            />
            <FieldError errors={[errors.responsavel_id]} />
          </Field>

          <FieldSeparator>Local</FieldSeparator>
          <EnderecoFields />

          <div className="flex gap-2">
            <SubmitButton pending={pending}>Salvar</SubmitButton>
            <Button asChild variant="outline">
              <Link href="/app/eventos">Cancelar</Link>
            </Button>
          </div>
        </FieldGroup>
      </form>
    </FormProvider>
  );
}
