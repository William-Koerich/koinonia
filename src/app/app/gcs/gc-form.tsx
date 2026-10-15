"use client";

import Link from "next/link";
import { Controller, FormProvider } from "react-hook-form";
import { EnderecoFields } from "@/components/forms/endereco-fields";
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
import { DIAS_SEMANA } from "@/lib/constants";
import { gcSchema, type GcInput } from "@/lib/validation/gc";
import { salvarGc } from "./actions";

const SEM_DIA = "nenhum";

export function GcForm({ id, valores, pessoas }: { id?: string; valores: GcInput; pessoas: PessoaOpcao[] }) {
  const { form, pending, onSubmit } = useActionForm({
    schema: gcSchema,
    defaultValues: valores,
    action: (v) => salvarGc(id ?? null, v),
  });
  const { errors } = form.formState;

  return (
    <FormProvider {...form}>
      <form onSubmit={onSubmit} noValidate>
        <FieldGroup>
          <Field data-invalid={!!errors.nome}>
            <FieldLabel htmlFor="nome">Nome do GC</FieldLabel>
            <Input id="nome" aria-invalid={!!errors.nome} {...form.register("nome")} />
            <FieldError errors={[errors.nome]} />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field data-invalid={!!errors.dia_semana}>
              <FieldLabel htmlFor="dia_semana">Dia do encontro</FieldLabel>
              <Controller
                control={form.control}
                name="dia_semana"
                render={({ field }) => (
                  <Select
                    value={field.value === "" ? SEM_DIA : field.value}
                    onValueChange={(v) => field.onChange(v === SEM_DIA ? "" : v)}
                  >
                    <SelectTrigger id="dia_semana" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={SEM_DIA}>Não definido</SelectItem>
                      {DIAS_SEMANA.map((dia, i) => (
                        <SelectItem key={dia} value={String(i)}>
                          {dia}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError errors={[errors.dia_semana]} />
            </Field>
            <Field data-invalid={!!errors.horario}>
              <FieldLabel htmlFor="horario">Horário</FieldLabel>
              <Input id="horario" type="time" {...form.register("horario")} />
              <FieldError errors={[errors.horario]} />
            </Field>
          </div>

          <Field data-invalid={!!errors.lider_id}>
            <FieldLabel htmlFor="lider_id">Líder</FieldLabel>
            <Controller
              control={form.control}
              name="lider_id"
              render={({ field }) => (
                <PessoaCombobox
                  id="lider_id"
                  pessoas={pessoas}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Sem líder definido"
                  permitirLimpar
                />
              )}
            />
            <FieldDescription>Informativo: o líder do GC não ganha permissões extras.</FieldDescription>
            <FieldError errors={[errors.lider_id]} />
          </Field>

          <FieldSeparator>Endereço do encontro</FieldSeparator>
          <EnderecoFields />

          <div className="flex gap-2">
            <SubmitButton pending={pending}>Salvar</SubmitButton>
            <Button asChild variant="outline">
              <Link href="/app/gcs">Cancelar</Link>
            </Button>
          </div>
        </FieldGroup>
      </form>
    </FormProvider>
  );
}
