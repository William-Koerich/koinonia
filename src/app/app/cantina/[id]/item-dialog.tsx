"use client";

import { PencilIcon, PlusIcon } from "lucide-react";
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
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ITEM_CANTINA_VAZIO, itemCantinaSchema, type ItemCantinaInput } from "@/lib/validation/cantina";
import { salvarItem } from "./actions";

export function ItemDialog({ cantinaId, item }: { cantinaId: string; item?: { id: string; valores: ItemCantinaInput } }) {
  const [aberto, setAberto] = useState(false);
  const valoresIniciais = item?.valores ?? ITEM_CANTINA_VAZIO;

  const { form, pending, onSubmit } = useActionForm({
    schema: itemCantinaSchema,
    defaultValues: valoresIniciais,
    action: (v) => salvarItem(cantinaId, item?.id ?? null, v),
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
        {item ? (
          <Button variant="ghost" size="icon" aria-label="Editar item">
            <PencilIcon />
          </Button>
        ) : (
          <Button size="sm">
            <PlusIcon /> Adicionar item
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={onSubmit} noValidate>
          <DialogHeader>
            <DialogTitle>{item ? "Editar item" : "Novo item do cardápio"}</DialogTitle>
            <DialogDescription>Os membros reservam a partir deste cardápio.</DialogDescription>
          </DialogHeader>
          <FieldGroup className="py-4">
            <Field data-invalid={!!errors.nome}>
              <FieldLabel htmlFor="nome">Item</FieldLabel>
              <Input id="nome" placeholder="Ex.: Cachorro-quente" aria-invalid={!!errors.nome} {...form.register("nome")} />
              <FieldError errors={[errors.nome]} />
            </Field>
            <Field data-invalid={!!errors.descricao}>
              <FieldLabel htmlFor="descricao">Descrição</FieldLabel>
              <Textarea id="descricao" rows={2} placeholder="Opcional (ex.: acompanha refrigerante)" {...form.register("descricao")} />
              <FieldError errors={[errors.descricao]} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field data-invalid={!!errors.preco}>
                <FieldLabel htmlFor="preco">Preço</FieldLabel>
                <Controller
                  control={form.control}
                  name="preco"
                  render={({ field }) => (
                    <MoedaInput id="preco" value={field.value} onChange={field.onChange} onBlur={field.onBlur} placeholder="Opcional" />
                  )}
                />
                <FieldError errors={[errors.preco]} />
              </Field>
              <Field data-invalid={!!errors.quantidade_disponivel}>
                <FieldLabel htmlFor="quantidade_disponivel">Quantidade disponível</FieldLabel>
                <Input
                  id="quantidade_disponivel"
                  inputMode="numeric"
                  placeholder="Sem limite"
                  aria-invalid={!!errors.quantidade_disponivel}
                  {...form.register("quantidade_disponivel")}
                />
                <FieldDescription>Ao acabar, o item aparece como esgotado.</FieldDescription>
                <FieldError errors={[errors.quantidade_disponivel]} />
              </Field>
            </div>
          </FieldGroup>
          <DialogFooter>
            <SubmitButton pending={pending}>Salvar</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
