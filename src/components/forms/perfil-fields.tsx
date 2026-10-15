"use client";

import { Controller, useFormContext } from "react-hook-form";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatarCelular } from "@/lib/format";
import { GENEROS, type PerfilInput } from "@/lib/validation/perfil";

/** Nome, celular, nascimento e gênero. Usar dentro de um <FormProvider>. */
export function PerfilFields() {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<PerfilInput>();

  return (
    <>
      <Field data-invalid={!!errors.nome_completo}>
        <FieldLabel htmlFor="nome_completo">Nome completo</FieldLabel>
        <Input
          id="nome_completo"
          autoComplete="name"
          aria-invalid={!!errors.nome_completo}
          {...register("nome_completo")}
        />
        <FieldError errors={[errors.nome_completo]} />
      </Field>

      <Field data-invalid={!!errors.celular}>
        <FieldLabel htmlFor="celular">Celular</FieldLabel>
        <Controller
          control={control}
          name="celular"
          render={({ field }) => (
            <Input
              id="celular"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              placeholder="(99) 99999-9999"
              aria-invalid={!!errors.celular}
              {...field}
              value={formatarCelular(field.value ?? "")}
              onChange={(e) => field.onChange(formatarCelular(e.target.value))}
            />
          )}
        />
        <FieldError errors={[errors.celular]} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field data-invalid={!!errors.data_nascimento}>
          <FieldLabel htmlFor="data_nascimento">Data de nascimento</FieldLabel>
          <Input
            id="data_nascimento"
            type="date"
            autoComplete="bday"
            aria-invalid={!!errors.data_nascimento}
            {...register("data_nascimento")}
          />
          <FieldError errors={[errors.data_nascimento]} />
        </Field>

        <Field data-invalid={!!errors.genero}>
          <FieldLabel htmlFor="genero">Gênero</FieldLabel>
          <Controller
            control={control}
            name="genero"
            render={({ field }) => (
              <Select value={field.value ?? ""} onValueChange={field.onChange}>
                <SelectTrigger id="genero" className="w-full" aria-invalid={!!errors.genero}>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {GENEROS.map((g) => (
                    <SelectItem key={g.value} value={g.value}>
                      {g.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FieldError errors={[errors.genero]} />
        </Field>
      </div>
    </>
  );
}
