"use client";

import { PencilIcon, PlusIcon } from "lucide-react";
import { useState } from "react";
import { Controller } from "react-hook-form";
import { MoedaInput } from "@/components/forms/moeda-input";
import { SubmitButton } from "@/components/forms/submit-button";
import { useActionForm } from "@/components/forms/use-action-form";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { carteiraSchema, carteiraVazia, TIPOS_CARTEIRA, type CarteiraInput } from "@/lib/validation/financeiro";
import { salvarCarteira } from "./actions";

export function CarteiraDialog({ hoje, carteira }: { hoje: string; carteira?: { id: string; valores: CarteiraInput } }) {
  const [aberto, setAberto] = useState(false);
  const valoresIniciais = carteira?.valores ?? carteiraVazia(hoje);
  const { form, pending, onSubmit } = useActionForm({
    schema: carteiraSchema,
    defaultValues: valoresIniciais,
    action: (v) => salvarCarteira(carteira?.id ?? null, v),
    onSuccess: () => setAberto(false),
  });
  const { errors } = form.formState;

  return (
    <Dialog
      open={aberto}
      onOpenChange={(abrir) => {
        setAberto(abrir);
        if (abrir) form.reset(valoresIniciais);
      }}
    >
      <DialogTrigger asChild>
        {carteira ? (
          <Button variant="ghost" size="icon" aria-label="Editar conta">
            <PencilIcon />
          </Button>
        ) : (
          <Button>
            <PlusIcon /> Nova conta
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={onSubmit} noValidate>
          <DialogHeader>
            <DialogTitle>{carteira ? "Editar conta" : "Nova conta"}</DialogTitle>
            <DialogDescription>Conta bancária, caixa (dinheiro em espécie) ou aplicação.</DialogDescription>
          </DialogHeader>
          <FieldGroup className="py-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field data-invalid={!!errors.nome}>
                <FieldLabel htmlFor="nome">Nome</FieldLabel>
                <Input id="nome" placeholder="Ex.: Sicoob, Caixa da tesouraria" aria-invalid={!!errors.nome} {...form.register("nome")} />
                <FieldError errors={[errors.nome]} />
              </Field>
              <Field data-invalid={!!errors.tipo}>
                <FieldLabel htmlFor="tipo">Tipo</FieldLabel>
                <Controller
                  control={form.control}
                  name="tipo"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="tipo" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIPOS_CARTEIRA.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>
              <Field data-invalid={!!errors.saldo_inicial}>
                <FieldLabel htmlFor="saldo_inicial">Saldo inicial</FieldLabel>
                <Controller
                  control={form.control}
                  name="saldo_inicial"
                  render={({ field }) => (
                    <MoedaInput id="saldo_inicial" value={field.value} onChange={field.onChange} onBlur={field.onBlur} />
                  )}
                />
                <FieldError errors={[errors.saldo_inicial]} />
              </Field>
              <Field data-invalid={!!errors.saldo_inicial_em}>
                <FieldLabel htmlFor="saldo_inicial_em">No início do dia</FieldLabel>
                <Input id="saldo_inicial_em" type="date" aria-invalid={!!errors.saldo_inicial_em} {...form.register("saldo_inicial_em")} />
                <FieldError errors={[errors.saldo_inicial_em]} />
              </Field>
            </div>
            <FieldDescription className="-mt-3">
              Quanto havia na conta nessa data (veja no extrato). Lançamentos a partir dela somam ou descontam do saldo.
            </FieldDescription>
            <Field data-invalid={!!errors.observacao}>
              <FieldLabel htmlFor="observacao">Observação</FieldLabel>
              <Input id="observacao" placeholder="Opcional (ex.: agência 1234, conta 56789-0)" {...form.register("observacao")} />
            </Field>
            <Controller
              control={form.control}
              name="padrao"
              render={({ field }) => (
                <div className="flex items-start gap-2">
                  <Checkbox id="padrao" checked={field.value} onCheckedChange={(v) => field.onChange(v === true)} />
                  <div>
                    <Label htmlFor="padrao">Conta principal</Label>
                    <FieldDescription>
                      Sugerida nos lançamentos e usada nas entradas automáticas (pagamentos de inscrição por PIX).
                    </FieldDescription>
                  </div>
                </div>
              )}
            />
          </FieldGroup>
          <DialogFooter>
            <SubmitButton pending={pending}>Salvar</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
