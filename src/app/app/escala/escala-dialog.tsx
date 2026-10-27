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
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatarData } from "@/lib/format";
import { ESCALA_VAZIA, escalaSchema, type EscalaInput } from "@/lib/validation/escala";
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
  const valoresIniciais: EscalaInput = escala?.valores ?? ESCALA_VAZIA;

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
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
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

            <Separator />
            <div className="space-y-1">
              <p className="text-sm font-medium">Ensaio</p>
              <p className="text-sm text-muted-foreground">Opcional. Aparece para todos os escalados.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field data-invalid={!!errors.ensaio_em}>
                <FieldLabel htmlFor="ensaio_em">Data e hora</FieldLabel>
                <Input
                  id="ensaio_em"
                  type="datetime-local"
                  aria-invalid={!!errors.ensaio_em}
                  {...form.register("ensaio_em")}
                />
                <FieldError errors={[errors.ensaio_em]} />
              </Field>
              <Field data-invalid={!!errors.ensaio_local}>
                <FieldLabel htmlFor="ensaio_local">Local</FieldLabel>
                <Input id="ensaio_local" placeholder="Ex.: Templo" {...form.register("ensaio_local")} />
                <FieldError errors={[errors.ensaio_local]} />
              </Field>
            </div>
            <Field data-invalid={!!errors.repertorio}>
              <FieldLabel htmlFor="repertorio">Repertório</FieldLabel>
              <Textarea
                id="repertorio"
                rows={5}
                placeholder={"Uma música por linha. Pode colar o link (YouTube, cifra):\nBondade de Deus – https://youtu.be/...\nGrande é o Senhor (tom G)"}
                {...form.register("repertorio")}
              />
              <FieldError errors={[errors.repertorio]} />
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
