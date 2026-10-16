"use client";

import { UserPlusIcon } from "lucide-react";
import { useState } from "react";
import { Controller, useWatch } from "react-hook-form";
import { PessoaCombobox, type PessoaOpcao } from "@/components/forms/pessoa-combobox";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { formatarCelular } from "@/lib/format";
import { NOVO_INSCRITO_VAZIO, novoInscritoSchema } from "@/lib/validation/inscricao";
import { adicionarInscrito } from "./actions";

/** Responsável pelo evento inscreve um convidado (sem conta) ou um membro */
export function AdicionarInscrito({
  eventoId,
  pago,
  pessoas,
  jaInscritos,
}: {
  eventoId: string;
  /** evento tem valor (mostra "pagamento já recebido") */
  pago: boolean;
  pessoas: PessoaOpcao[];
  jaInscritos: string[];
}) {
  const [aberto, setAberto] = useState(false);
  const { form, pending, onSubmit } = useActionForm({
    schema: novoInscritoSchema,
    defaultValues: NOVO_INSCRITO_VAZIO,
    action: (v) => adicionarInscrito(eventoId, v),
    onSuccess: () => {
      setAberto(false);
      form.reset(NOVO_INSCRITO_VAZIO);
    },
  });
  const { errors } = form.formState;
  const tipo = useWatch({ control: form.control, name: "tipo" });

  return (
    <Dialog
      open={aberto}
      onOpenChange={(abrir) => {
        setAberto(abrir);
        if (abrir) form.reset(NOVO_INSCRITO_VAZIO);
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <UserPlusIcon /> Adicionar pessoa
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={onSubmit} noValidate>
          <DialogHeader>
            <DialogTitle>Adicionar inscrito</DialogTitle>
            <DialogDescription>Inscreva um convidado que não tem conta no site ou um membro.</DialogDescription>
          </DialogHeader>

          <FieldGroup className="py-4">
            <Controller
              control={form.control}
              name="tipo"
              render={({ field }) => (
                <Tabs value={field.value} onValueChange={(v) => field.onChange(v)}>
                  <TabsList className="w-full">
                    <TabsTrigger value="convidado">Convidado (sem conta)</TabsTrigger>
                    <TabsTrigger value="membro">Membro com conta</TabsTrigger>
                  </TabsList>
                </Tabs>
              )}
            />

            {tipo === "convidado" ? (
              <>
                <Field data-invalid={!!errors.convidado_nome}>
                  <FieldLabel htmlFor="convidado_nome">Nome</FieldLabel>
                  <Input id="convidado_nome" aria-invalid={!!errors.convidado_nome} {...form.register("convidado_nome")} />
                  <FieldError errors={[errors.convidado_nome]} />
                </Field>
                <Field data-invalid={!!errors.convidado_celular}>
                  <FieldLabel htmlFor="convidado_celular">Celular / WhatsApp</FieldLabel>
                  <Controller
                    control={form.control}
                    name="convidado_celular"
                    render={({ field }) => (
                      <Input
                        id="convidado_celular"
                        type="tel"
                        inputMode="numeric"
                        placeholder="Opcional"
                        aria-invalid={!!errors.convidado_celular}
                        {...field}
                        value={formatarCelular(field.value)}
                        onChange={(e) => field.onChange(formatarCelular(e.target.value))}
                      />
                    )}
                  />
                  <FieldError errors={[errors.convidado_celular]} />
                </Field>
              </>
            ) : (
              <Field data-invalid={!!errors.profile_id}>
                <FieldLabel htmlFor="profile_id">Pessoa</FieldLabel>
                <Controller
                  control={form.control}
                  name="profile_id"
                  render={({ field }) => (
                    <PessoaCombobox
                      id="profile_id"
                      pessoas={pessoas}
                      value={field.value || null}
                      onChange={(v) => field.onChange(v ?? "")}
                      desabilitarIds={new Set(jaInscritos)}
                      invalido={!!errors.profile_id}
                    />
                  )}
                />
                <FieldError errors={[errors.profile_id]} />
              </Field>
            )}

            <Field>
              <FieldLabel htmlFor="observacao_inscrito">Observação</FieldLabel>
              <Textarea id="observacao_inscrito" rows={2} placeholder="Opcional" {...form.register("observacao")} />
            </Field>

            {pago && (
              <Controller
                control={form.control}
                name="pago"
                render={({ field }) => (
                  <div className="flex items-start gap-2">
                    <Checkbox id="pago" checked={field.value} onCheckedChange={(v) => field.onChange(v === true)} />
                    <div>
                      <Label htmlFor="pago">Pagamento já recebido</Label>
                      <FieldDescription>A inscrição entra confirmada. Sem marcar, fica pendente.</FieldDescription>
                    </div>
                  </div>
                )}
              />
            )}
          </FieldGroup>

          <DialogFooter>
            <SubmitButton pending={pending}>Adicionar</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
