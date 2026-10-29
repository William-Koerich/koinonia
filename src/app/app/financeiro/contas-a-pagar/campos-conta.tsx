"use client";

import { Controller, useFormContext, useWatch } from "react-hook-form";
import { MoedaInput } from "@/components/forms/moeda-input";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CATEGORIAS_DESPESA } from "@/lib/validation/financeiro";

const GERAL = "geral";

export type MinisterioOpcao = { id: string; nome: string };

/** Campos comuns de conta e recorrência: descrição, categoria, fornecedor, valor, ministério */
export function CamposConta({ ministerios }: { ministerios: MinisterioOpcao[] }) {
  const form = useFormContext<{
    descricao: string;
    categoria: string;
    fornecedor: string;
    valor: string;
    ministerio_id: string | null;
  }>();
  const { errors } = form.formState;

  return (
    <>
      <Field data-invalid={!!errors.descricao}>
        <FieldLabel htmlFor="descricao">Descrição</FieldLabel>
        <Input id="descricao" placeholder="Ex.: Aluguel do templo" aria-invalid={!!errors.descricao} {...form.register("descricao")} />
        <FieldError errors={[errors.descricao]} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field data-invalid={!!errors.categoria}>
          <FieldLabel htmlFor="categoria">Categoria</FieldLabel>
          <Controller
            control={form.control}
            name="categoria"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="categoria" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIAS_DESPESA.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FieldError errors={[errors.categoria]} />
        </Field>
        <Field data-invalid={!!errors.valor}>
          <FieldLabel htmlFor="valor">Valor</FieldLabel>
          <Controller
            control={form.control}
            name="valor"
            render={({ field }) => (
              <MoedaInput id="valor" value={field.value} onChange={field.onChange} onBlur={field.onBlur} invalido={!!errors.valor} />
            )}
          />
          <FieldError errors={[errors.valor]} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field data-invalid={!!errors.fornecedor}>
          <FieldLabel htmlFor="fornecedor">Fornecedor / a quem pagar</FieldLabel>
          <Input id="fornecedor" placeholder="Opcional (ex.: Celesc)" {...form.register("fornecedor")} />
          <FieldError errors={[errors.fornecedor]} />
        </Field>
        <Field>
          <FieldLabel htmlFor="ministerio_id">Ministério (orçamento)</FieldLabel>
          <Controller
            control={form.control}
            name="ministerio_id"
            render={({ field }) => (
              <Select value={field.value ?? GERAL} onValueChange={(v) => field.onChange(v === GERAL ? null : v)}>
                <SelectTrigger id="ministerio_id" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={GERAL}>Despesa geral da igreja</SelectItem>
                  {ministerios.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>
      </div>
    </>
  );
}

/** Quando a recorrência termina: nunca, numa data ou depois de N vezes */
export function CamposTermino() {
  const form = useFormContext<{ termino: "nunca" | "data" | "parcelas"; data_fim: string; parcelas: string }>();
  const { errors } = form.formState;
  const termino = useWatch({ control: form.control, name: "termino" });

  return (
    <Field>
      <FieldLabel>Termina</FieldLabel>
      <Controller
        control={form.control}
        name="termino"
        render={({ field }) => (
          <Tabs value={field.value} onValueChange={field.onChange}>
            <TabsList className="w-full">
              <TabsTrigger value="nunca">Nunca</TabsTrigger>
              <TabsTrigger value="parcelas">Depois de N vezes</TabsTrigger>
              <TabsTrigger value="data">Numa data</TabsTrigger>
            </TabsList>
          </Tabs>
        )}
      />
      {termino === "parcelas" && (
        <Field data-invalid={!!errors.parcelas}>
          <Input
            id="parcelas"
            inputMode="numeric"
            placeholder="Quantas vezes? (ex.: 12)"
            aria-label="Quantidade de vezes"
            aria-invalid={!!errors.parcelas}
            {...form.register("parcelas")}
          />
          <FieldError errors={[errors.parcelas]} />
        </Field>
      )}
      {termino === "data" && (
        <Field data-invalid={!!errors.data_fim}>
          <Input id="data_fim" type="date" aria-label="Último vencimento" aria-invalid={!!errors.data_fim} {...form.register("data_fim")} />
          <FieldError errors={[errors.data_fim]} />
        </Field>
      )}
    </Field>
  );
}
