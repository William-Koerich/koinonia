"use client";

import { CheckIcon } from "lucide-react";
import { useState } from "react";
import { Controller } from "react-hook-form";
import { MoedaInput } from "@/components/forms/moeda-input";
import { SubmitButton } from "@/components/forms/submit-button";
import { useActionForm } from "@/components/forms/use-action-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FORMAS_PAGAMENTO, pagamentoSchema, type PagamentoInput } from "@/lib/validation/financeiro";
import { pagarConta } from "./actions";

/** Registra o pagamento: data, valor pago (pode ter juros/desconto) e forma */
export function PagarDialog({ contaId, descricao, valores }: { contaId: string; descricao: string; valores: PagamentoInput }) {
  const [aberto, setAberto] = useState(false);
  const { form, pending, onSubmit } = useActionForm({
    schema: pagamentoSchema,
    defaultValues: valores,
    action: (v) => pagarConta(contaId, v),
    onSuccess: () => setAberto(false),
  });
  const { errors } = form.formState;

  return (
    <Dialog
      open={aberto}
      onOpenChange={(abrir) => {
        setAberto(abrir);
        if (abrir) form.reset(valores);
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <CheckIcon /> Pagar
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={onSubmit} noValidate>
          <DialogHeader>
            <DialogTitle>Registrar pagamento</DialogTitle>
            <DialogDescription>{descricao}</DialogDescription>
          </DialogHeader>
          <FieldGroup className="py-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field data-invalid={!!errors.pago_em}>
                <FieldLabel htmlFor="pago_em">Pago em</FieldLabel>
                <Input id="pago_em" type="date" aria-invalid={!!errors.pago_em} {...form.register("pago_em")} />
                <FieldError errors={[errors.pago_em]} />
              </Field>
              <Field data-invalid={!!errors.valor_pago}>
                <FieldLabel htmlFor="valor_pago">Valor pago</FieldLabel>
                <Controller
                  control={form.control}
                  name="valor_pago"
                  render={({ field }) => (
                    <MoedaInput
                      id="valor_pago"
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      invalido={!!errors.valor_pago}
                    />
                  )}
                />
                <FieldError errors={[errors.valor_pago]} />
              </Field>
            </div>
            <Field data-invalid={!!errors.forma_pagamento}>
              <FieldLabel htmlFor="forma_pagamento">Pago com</FieldLabel>
              <Controller
                control={form.control}
                name="forma_pagamento"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="forma_pagamento" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FORMAS_PAGAMENTO.map((f) => (
                        <SelectItem key={f.value} value={f.value}>
                          {f.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError errors={[errors.forma_pagamento]} />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <SubmitButton pending={pending}>Confirmar pagamento</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
