"use client";

import { ArrowLeftRightIcon, PencilIcon } from "lucide-react";
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
import type { CarteiraOpcao } from "@/lib/carteiras";
import { transferenciaSchema, type TransferenciaInput } from "@/lib/validation/financeiro";
import { salvarTransferencia } from "./actions";

/** Dinheiro que passou de uma conta para outra (ex.: depósito da oferta no banco) */
export function TransferenciaDialog({
  hoje,
  carteiras,
  transferencia,
}: {
  hoje: string;
  carteiras: CarteiraOpcao[];
  transferencia?: { id: string; valores: TransferenciaInput };
}) {
  const [aberto, setAberto] = useState(false);
  const caixa = carteiras.find((c) => c.tipo === "caixa");
  const banco = carteiras.find((c) => c.padrao && c.id !== caixa?.id) ?? carteiras.find((c) => c.id !== caixa?.id);
  const valoresIniciais: TransferenciaInput = transferencia?.valores ?? {
    data: hoje,
    origem_id: caixa?.id ?? "",
    destino_id: banco?.id ?? "",
    valor: "",
    descricao: "",
  };
  const { form, pending, onSubmit } = useActionForm({
    schema: transferenciaSchema,
    defaultValues: valoresIniciais,
    action: (v) => salvarTransferencia(transferencia?.id ?? null, v),
    onSuccess: () => setAberto(false),
  });
  const { errors } = form.formState;
  const ativas = carteiras.filter((c) => c.ativa || c.id === valoresIniciais.origem_id || c.id === valoresIniciais.destino_id);

  const seletor = (nome: "origem_id" | "destino_id", rotulo: string) => (
    <Field data-invalid={!!errors[nome]}>
      <FieldLabel htmlFor={nome}>{rotulo}</FieldLabel>
      <Controller
        control={form.control}
        name={nome}
        render={({ field }) => (
          <Select value={field.value} onValueChange={field.onChange}>
            <SelectTrigger id={nome} className="w-full" aria-invalid={!!errors[nome]}>
              <SelectValue placeholder="Escolha a conta" />
            </SelectTrigger>
            <SelectContent>
              {ativas.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
      <FieldError errors={[errors[nome]]} />
    </Field>
  );

  return (
    <Dialog
      open={aberto}
      onOpenChange={(abrir) => {
        setAberto(abrir);
        if (abrir) form.reset(valoresIniciais);
      }}
    >
      <DialogTrigger asChild>
        {transferencia ? (
          <Button variant="ghost" size="icon" aria-label="Editar transferência">
            <PencilIcon />
          </Button>
        ) : (
          <Button variant="outline" disabled={carteiras.filter((c) => c.ativa).length < 2}>
            <ArrowLeftRightIcon /> Transferência
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={onSubmit} noValidate>
          <DialogHeader>
            <DialogTitle>{transferencia ? "Editar transferência" : "Transferência entre contas"}</DialogTitle>
            <DialogDescription>
              Ex.: depósito da oferta em dinheiro no banco, ou saque para o caixa. Não é entrada nem despesa: só muda de lugar.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup className="py-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {seletor("origem_id", "Saiu de")}
              {seletor("destino_id", "Entrou em")}
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
              <Field data-invalid={!!errors.data}>
                <FieldLabel htmlFor="data">Data</FieldLabel>
                <Input id="data" type="date" aria-invalid={!!errors.data} {...form.register("data")} />
                <FieldError errors={[errors.data]} />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="descricao">Observação</FieldLabel>
              <Input id="descricao" placeholder="Opcional (ex.: depósito das ofertas de outubro)" {...form.register("descricao")} />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <SubmitButton pending={pending}>Salvar</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
