"use client";

import { PencilIcon, UserPlusIcon } from "lucide-react";
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
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatarCelular } from "@/lib/format";
import { visitanteSchema, visitanteVazio, type VisitanteInput } from "@/lib/validation/visitante";
import { salvarVisitante } from "./actions";

export function VisitanteDialog({ hoje, visitante }: { hoje: string; visitante?: { id: string; valores: VisitanteInput } }) {
  const [aberto, setAberto] = useState(false);
  const valoresIniciais = visitante?.valores ?? visitanteVazio(hoje);

  const { form, pending, onSubmit } = useActionForm({
    schema: visitanteSchema,
    defaultValues: valoresIniciais,
    action: (v) => salvarVisitante(visitante?.id ?? null, v),
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
        {visitante ? (
          <Button variant="ghost" size="icon" aria-label="Editar visitante">
            <PencilIcon />
          </Button>
        ) : (
          <Button>
            <UserPlusIcon /> Novo visitante
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={onSubmit} noValidate>
          <DialogHeader>
            <DialogTitle>{visitante ? "Editar visitante" : "Novo visitante"}</DialogTitle>
            <DialogDescription>Quem visitou a igreja, para a gente poder fazer contato depois.</DialogDescription>
          </DialogHeader>
          <FieldGroup className="py-4">
            <Field data-invalid={!!errors.nome}>
              <FieldLabel htmlFor="nome">Nome</FieldLabel>
              <Input id="nome" autoComplete="off" aria-invalid={!!errors.nome} {...form.register("nome")} />
              <FieldError errors={[errors.nome]} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field data-invalid={!!errors.celular}>
                <FieldLabel htmlFor="celular">Celular / WhatsApp</FieldLabel>
                <Controller
                  control={form.control}
                  name="celular"
                  render={({ field }) => (
                    <Input
                      id="celular"
                      type="tel"
                      inputMode="numeric"
                      placeholder="(47) 99999-9999"
                      aria-invalid={!!errors.celular}
                      {...field}
                      value={formatarCelular(field.value)}
                      onChange={(e) => field.onChange(formatarCelular(e.target.value))}
                    />
                  )}
                />
                <FieldError errors={[errors.celular]} />
              </Field>
              <Field data-invalid={!!errors.data_visita}>
                <FieldLabel htmlFor="data_visita">Data da visita</FieldLabel>
                <Input id="data_visita" type="date" aria-invalid={!!errors.data_visita} {...form.register("data_visita")} />
                <FieldError errors={[errors.data_visita]} />
              </Field>
            </div>
            <Field data-invalid={!!errors.motivo}>
              <FieldLabel htmlFor="motivo">Motivo da visita</FieldLabel>
              <Textarea
                id="motivo"
                rows={3}
                placeholder="Opcional (ex.: convidado por um amigo, mudou para Blumenau, pedido de oração)"
                {...form.register("motivo")}
              />
              <FieldError errors={[errors.motivo]} />
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
