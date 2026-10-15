"use client";

import { Controller } from "react-hook-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { useActionForm } from "@/components/forms/use-action-form";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldSeparator } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatarCnpj } from "@/lib/format";
import { contribuicaoSchema, TIPOS_CHAVE_PIX, type ContribuicaoInput } from "@/lib/validation/conteudo";
import { salvarContribuicao } from "../actions";

/** CNPJ com máscara parcial enquanto digita */
function mascaraCnpj(valor: string): string {
  const d = valor.replace(/\D/g, "").slice(0, 14);
  return d.length === 14 ? formatarCnpj(d) : d;
}

export function ContribuicaoForm({ valores }: { valores: ContribuicaoInput }) {
  const { form, pending, onSubmit } = useActionForm({
    schema: contribuicaoSchema,
    defaultValues: valores,
    action: salvarContribuicao,
  });
  const { errors } = form.formState;

  return (
    <form onSubmit={onSubmit} noValidate>
      <FieldGroup>
        <FieldSeparator>PIX</FieldSeparator>
        <div className="grid gap-4 sm:grid-cols-[1fr_2fr]">
          <Field data-invalid={!!errors.tipo_chave}>
            <FieldLabel htmlFor="tipo_chave">Tipo da chave</FieldLabel>
            <Controller
              control={form.control}
              name="tipo_chave"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="tipo_chave" className="w-full" aria-invalid={!!errors.tipo_chave}>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_CHAVE_PIX.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError errors={[errors.tipo_chave]} />
          </Field>
          <Field data-invalid={!!errors.chave_pix}>
            <FieldLabel htmlFor="chave_pix">Chave PIX</FieldLabel>
            <Input id="chave_pix" aria-invalid={!!errors.chave_pix} {...form.register("chave_pix")} />
            <FieldError errors={[errors.chave_pix]} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={!!errors.pix_recebedor}>
            <FieldLabel htmlFor="pix_recebedor">Nome do recebedor</FieldLabel>
            <Input id="pix_recebedor" maxLength={25} aria-invalid={!!errors.pix_recebedor} {...form.register("pix_recebedor")} />
            <FieldDescription>Até 25 caracteres, como aparece no app do banco.</FieldDescription>
            <FieldError errors={[errors.pix_recebedor]} />
          </Field>
          <Field data-invalid={!!errors.pix_cidade}>
            <FieldLabel htmlFor="pix_cidade">Cidade do recebedor</FieldLabel>
            <Input id="pix_cidade" maxLength={15} aria-invalid={!!errors.pix_cidade} {...form.register("pix_cidade")} />
            <FieldDescription>Até 15 caracteres.</FieldDescription>
            <FieldError errors={[errors.pix_cidade]} />
          </Field>
        </div>

        <FieldSeparator>Dados bancários</FieldSeparator>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field data-invalid={!!errors.banco} className="sm:col-span-3">
            <FieldLabel htmlFor="banco">Banco</FieldLabel>
            <Input id="banco" placeholder="Ex.: Banco do Brasil (001)" {...form.register("banco")} />
            <FieldError errors={[errors.banco]} />
          </Field>
          <Field data-invalid={!!errors.agencia}>
            <FieldLabel htmlFor="agencia">Agência</FieldLabel>
            <Input id="agencia" {...form.register("agencia")} />
            <FieldError errors={[errors.agencia]} />
          </Field>
          <Field data-invalid={!!errors.conta} className="sm:col-span-2">
            <FieldLabel htmlFor="conta">Conta</FieldLabel>
            <Input id="conta" {...form.register("conta")} />
            <FieldError errors={[errors.conta]} />
          </Field>
          <Field data-invalid={!!errors.titular} className="sm:col-span-2">
            <FieldLabel htmlFor="titular">Titular</FieldLabel>
            <Input id="titular" {...form.register("titular")} />
            <FieldError errors={[errors.titular]} />
          </Field>
          <Field data-invalid={!!errors.cnpj}>
            <FieldLabel htmlFor="cnpj">CNPJ</FieldLabel>
            <Controller
              control={form.control}
              name="cnpj"
              render={({ field }) => (
                <Input
                  id="cnpj"
                  inputMode="numeric"
                  aria-invalid={!!errors.cnpj}
                  {...field}
                  value={mascaraCnpj(field.value)}
                  onChange={(e) => field.onChange(mascaraCnpj(e.target.value))}
                />
              )}
            />
            <FieldError errors={[errors.cnpj]} />
          </Field>
        </div>

        <SubmitButton pending={pending} className="sm:w-fit">
          Salvar
        </SubmitButton>
      </FieldGroup>
    </form>
  );
}
