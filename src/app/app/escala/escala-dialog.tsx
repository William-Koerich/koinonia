"use client";

import { PencilIcon, PlusIcon } from "lucide-react";
import { useState } from "react";
import { Controller } from "react-hook-form";
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
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatarData } from "@/lib/format";
import { escalaSchema, type EscalaInput } from "@/lib/validation/escala";
import { salvarEscala } from "./actions";

const SEM_EVENTO = "nenhum";

export type EventoOpcao = { id: string; titulo: string; inicio: string };

export function EscalaDialog({
  escala,
  eventos,
}: {
  escala?: { id: string; valores: EscalaInput };
  eventos: EventoOpcao[];
}) {
  const [aberto, setAberto] = useState(false);
  const valoresIniciais: EscalaInput = escala?.valores ?? { data: "", descricao: "", evento_id: null };

  const { form, pending, onSubmit } = useActionForm({
    schema: escalaSchema,
    defaultValues: valoresIniciais,
    action: (v) => salvarEscala(escala?.id ?? null, v),
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
        {escala ? (
          <Button variant="outline" size="sm">
            <PencilIcon /> Editar
          </Button>
        ) : (
          <Button>
            <PlusIcon /> Nova escala
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={onSubmit} noValidate>
          <DialogHeader>
            <DialogTitle>{escala ? "Editar escala" : "Nova escala"}</DialogTitle>
            <DialogDescription>Depois de criar, escolha as pessoas de cada função.</DialogDescription>
          </DialogHeader>
          <FieldGroup className="py-4">
            <div className="grid gap-4 sm:grid-cols-[auto_1fr]">
              <Field data-invalid={!!errors.data}>
                <FieldLabel htmlFor="data">Data</FieldLabel>
                <Input id="data" type="date" aria-invalid={!!errors.data} {...form.register("data")} />
                <FieldError errors={[errors.data]} />
              </Field>
              <Field data-invalid={!!errors.descricao}>
                <FieldLabel htmlFor="descricao">Descrição</FieldLabel>
                <Input
                  id="descricao"
                  placeholder="Ex.: Culto de Domingo 19h"
                  aria-invalid={!!errors.descricao}
                  {...form.register("descricao")}
                />
                <FieldError errors={[errors.descricao]} />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="evento_id">Evento</FieldLabel>
              <Controller
                control={form.control}
                name="evento_id"
                render={({ field }) => (
                  <Select
                    value={field.value ?? SEM_EVENTO}
                    onValueChange={(v) => field.onChange(v === SEM_EVENTO ? null : v)}
                  >
                    <SelectTrigger id="evento_id" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={SEM_EVENTO}>Nenhum (culto regular)</SelectItem>
                      {eventos.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {formatarData(e.inicio)} — {e.titulo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldDescription>Opcional: vincule a um evento especial.</FieldDescription>
            </Field>
          </FieldGroup>
          <DialogFooter>
            <SubmitButton pending={pending}>{escala ? "Salvar" : "Criar e escalar pessoas"}</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
