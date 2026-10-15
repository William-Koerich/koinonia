"use client";

import { PencilIcon, PlusIcon } from "lucide-react";
import { useState } from "react";
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
import { ministerioSchema } from "@/lib/validation/ministerio";
import { salvarMinisterio } from "./actions";

export function MinisterioDialog({
  ministerio,
}: {
  ministerio?: { id: string; nome: string; descricao: string | null };
}) {
  const [aberto, setAberto] = useState(false);
  const valoresIniciais = { nome: ministerio?.nome ?? "", descricao: ministerio?.descricao ?? "" };

  const { form, pending, onSubmit } = useActionForm({
    schema: ministerioSchema,
    defaultValues: valoresIniciais,
    action: (valores) => salvarMinisterio(ministerio?.id ?? null, valores),
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
        {ministerio ? (
          <Button variant="ghost" size="icon" aria-label={`Editar ${ministerio.nome}`}>
            <PencilIcon />
          </Button>
        ) : (
          <Button>
            <PlusIcon /> Novo ministério
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={onSubmit} noValidate>
          <DialogHeader>
            <DialogTitle>{ministerio ? "Editar ministério" : "Novo ministério"}</DialogTitle>
            <DialogDescription>Os membros são vinculados na página do ministério.</DialogDescription>
          </DialogHeader>
          <FieldGroup className="py-4">
            <Field data-invalid={!!errors.nome}>
              <FieldLabel htmlFor="nome">Nome</FieldLabel>
              <Input id="nome" aria-invalid={!!errors.nome} {...form.register("nome")} />
              <FieldError errors={[errors.nome]} />
            </Field>
            <Field data-invalid={!!errors.descricao}>
              <FieldLabel htmlFor="descricao">Descrição</FieldLabel>
              <Textarea id="descricao" rows={3} placeholder="Opcional" {...form.register("descricao")} />
              <FieldError errors={[errors.descricao]} />
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
