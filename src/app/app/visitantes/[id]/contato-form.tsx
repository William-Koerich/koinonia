"use client";

import { Controller } from "react-hook-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { useActionForm } from "@/components/forms/use-action-form";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  contatoVisitanteSchema,
  MEIOS_CONTATO,
  SITUACOES_VISITANTE,
  type ContatoVisitanteInput,
  type SituacaoVisitante,
} from "@/lib/validation/visitante";
import { registrarContato } from "../actions";

/** Registra um contato do acompanhamento e a situação do visitante depois dele */
export function ContatoForm({ visitanteId, hoje, situacao }: { visitanteId: string; hoje: string; situacao: SituacaoVisitante }) {
  const jaMembro = situacao === "membro";
  const vazio: ContatoVisitanteInput = {
    feito_em: hoje,
    meio: "whatsapp",
    resultado: "",
    // o primeiro contato tira o visitante de "novo"
    situacao: situacao === "novo" ? "em_contato" : situacao,
  };
  const { form, pending, onSubmit } = useActionForm({
    schema: contatoVisitanteSchema,
    defaultValues: vazio,
    action: (v) => registrarContato(visitanteId, v),
    onSuccess: () => form.reset(vazio),
  });
  const { errors } = form.formState;

  return (
    <form onSubmit={onSubmit} noValidate>
      <FieldGroup>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={!!errors.feito_em}>
            <FieldLabel htmlFor="feito_em">Quando</FieldLabel>
            <Input id="feito_em" type="date" max={hoje} aria-invalid={!!errors.feito_em} {...form.register("feito_em")} />
            <FieldError errors={[errors.feito_em]} />
          </Field>
          <Field data-invalid={!!errors.meio}>
            <FieldLabel htmlFor="meio">Como</FieldLabel>
            <Controller
              control={form.control}
              name="meio"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="meio" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MEIOS_CONTATO.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError errors={[errors.meio]} />
          </Field>
        </div>
        <Field data-invalid={!!errors.resultado}>
          <FieldLabel htmlFor="resultado">Como foi</FieldLabel>
          <Textarea
            id="resultado"
            rows={3}
            placeholder="Ex.: conversamos, quer conhecer um GC perto de casa; pediu oração pela família"
            aria-invalid={!!errors.resultado}
            {...form.register("resultado")}
          />
          <FieldError errors={[errors.resultado]} />
        </Field>
        {!jaMembro && (
          <Field>
            <FieldLabel htmlFor="situacao-contato">Situação depois do contato</FieldLabel>
            <Controller
              control={form.control}
              name="situacao"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="situacao-contato" className="w-full sm:w-64">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SITUACOES_VISITANTE.filter((s) => s.value !== "membro").map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
        )}
        <div>
          <SubmitButton pending={pending}>Registrar contato</SubmitButton>
        </div>
      </FieldGroup>
    </form>
  );
}
