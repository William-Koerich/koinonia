"use client";

import { Loader2Icon } from "lucide-react";
import { useState } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatarCep, somenteDigitos } from "@/lib/format";
import { UFS, type EnderecoInput } from "@/lib/validation/comum";

type ViaCepResposta = {
  erro?: boolean;
  logradouro: string;
  bairro: string;
  localidade: string;
  uf: string;
};

/**
 * Campos de endereço. Ao completar o CEP, busca no ViaCEP e preenche
 * logradouro, bairro, cidade e UF. Usar dentro de um <FormProvider>.
 */
export function EnderecoFields() {
  const {
    register,
    control,
    setValue,
    setFocus,
    formState: { errors },
  } = useFormContext<EnderecoInput>();
  const [buscando, setBuscando] = useState(false);
  const [avisoCep, setAvisoCep] = useState<string | null>(null);

  async function buscarCep(cep: string) {
    setBuscando(true);
    setAvisoCep(null);
    try {
      const resposta = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const dados = (await resposta.json()) as ViaCepResposta;
      if (dados.erro) {
        setAvisoCep("CEP não encontrado. Preencha o endereço manualmente.");
        return;
      }
      const opcoes = { shouldValidate: true, shouldDirty: true };
      if (dados.logradouro) setValue("logradouro", dados.logradouro, opcoes);
      if (dados.bairro) setValue("bairro", dados.bairro, opcoes);
      setValue("cidade", dados.localidade, opcoes);
      setValue("uf", dados.uf, opcoes);
      setFocus(dados.logradouro ? "numero" : "logradouro");
    } catch {
      setAvisoCep("Não foi possível consultar o CEP. Preencha o endereço manualmente.");
    } finally {
      setBuscando(false);
    }
  }

  return (
    <div className="grid gap-4 sm:grid-cols-6">
      <Field data-invalid={!!errors.cep} className="sm:col-span-2">
        <FieldLabel htmlFor="cep">CEP</FieldLabel>
        <div className="relative">
          <Controller
            control={control}
            name="cep"
            render={({ field }) => (
              <Input
                id="cep"
                inputMode="numeric"
                autoComplete="postal-code"
                placeholder="00000-000"
                aria-invalid={!!errors.cep}
                {...field}
                value={formatarCep(field.value ?? "")}
                onChange={(e) => {
                  const valor = formatarCep(e.target.value);
                  field.onChange(valor);
                  const digitos = somenteDigitos(valor);
                  if (digitos.length === 8) void buscarCep(digitos);
                }}
              />
            )}
          />
          {buscando && (
            <Loader2Icon className="absolute top-1/2 right-2.5 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
        </div>
        {avisoCep && <FieldDescription>{avisoCep}</FieldDescription>}
        <FieldError errors={[errors.cep]} />
      </Field>

      <Field data-invalid={!!errors.logradouro} className="sm:col-span-4">
        <FieldLabel htmlFor="logradouro">Logradouro</FieldLabel>
        <Input id="logradouro" aria-invalid={!!errors.logradouro} {...register("logradouro")} />
        <FieldError errors={[errors.logradouro]} />
      </Field>

      <Field data-invalid={!!errors.numero} className="sm:col-span-2">
        <FieldLabel htmlFor="numero">Número</FieldLabel>
        <Input id="numero" aria-invalid={!!errors.numero} {...register("numero")} />
        <FieldError errors={[errors.numero]} />
      </Field>

      <Field data-invalid={!!errors.complemento} className="sm:col-span-4">
        <FieldLabel htmlFor="complemento">Complemento</FieldLabel>
        <Input id="complemento" placeholder="Opcional" {...register("complemento")} />
        <FieldError errors={[errors.complemento]} />
      </Field>

      <Field data-invalid={!!errors.bairro} className="sm:col-span-2">
        <FieldLabel htmlFor="bairro">Bairro</FieldLabel>
        <Input id="bairro" aria-invalid={!!errors.bairro} {...register("bairro")} />
        <FieldError errors={[errors.bairro]} />
      </Field>

      <Field data-invalid={!!errors.cidade} className="sm:col-span-3">
        <FieldLabel htmlFor="cidade">Cidade</FieldLabel>
        <Input id="cidade" aria-invalid={!!errors.cidade} {...register("cidade")} />
        <FieldError errors={[errors.cidade]} />
      </Field>

      <Field data-invalid={!!errors.uf} className="sm:col-span-1">
        <FieldLabel htmlFor="uf">UF</FieldLabel>
        <Controller
          control={control}
          name="uf"
          render={({ field }) => (
            <Select value={field.value ?? ""} onValueChange={field.onChange}>
              <SelectTrigger id="uf" className="w-full" aria-invalid={!!errors.uf}>
                <SelectValue placeholder="UF" />
              </SelectTrigger>
              <SelectContent>
                {UFS.map((uf) => (
                  <SelectItem key={uf} value={uf}>
                    {uf}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        <FieldError errors={[errors.uf]} />
      </Field>
    </div>
  );
}
