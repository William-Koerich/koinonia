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
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cantinaSchema, type CantinaInput } from "@/lib/validation/escala";
import { salvarCantina } from "./actions";

const NENHUM = "nenhum";

type Opcao = { id: string; nome: string };

function OpcaoSelect({
  id,
  value,
  onChange,
  opcoes,
  vazio,
  invalido,
}: {
  id: string;
  value: string | null;
  onChange: (v: string | null) => void;
  opcoes: Opcao[];
  vazio: string;
  invalido?: boolean;
}) {
  return (
    <Select value={value ?? NENHUM} onValueChange={(v) => onChange(v === NENHUM ? null : v)}>
      <SelectTrigger id={id} className="w-full" aria-invalid={invalido}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NENHUM}>{vazio}</SelectItem>
        {opcoes.map((o) => (
          <SelectItem key={o.id} value={o.id}>
            {o.nome}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function CantinaDialog({
  cantina,
  gcs,
  ministerios,
}: {
  cantina?: { id: string; valores: CantinaInput };
  gcs: Opcao[];
  ministerios: Opcao[];
}) {
  const [aberto, setAberto] = useState(false);
  const valoresIniciais: CantinaInput = cantina?.valores ?? {
    data: "",
    descricao: "",
    gc_id: null,
    ministerio_id: null,
  };

  const { form, pending, onSubmit } = useActionForm({
    schema: cantinaSchema,
    defaultValues: valoresIniciais,
    action: (v) => salvarCantina(cantina?.id ?? null, v),
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
        {cantina ? (
          <Button variant="ghost" size="icon" aria-label="Editar">
            <PencilIcon />
          </Button>
        ) : (
          <Button>
            <PlusIcon /> Nova data
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={onSubmit} noValidate>
          <DialogHeader>
            <DialogTitle>{cantina ? "Editar cantina" : "Escala da cantina"}</DialogTitle>
            <DialogDescription>Escolha quem cuida da cantina: um GC, um ministério ou os dois juntos.</DialogDescription>
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
                <Input id="descricao" placeholder="Opcional (ex.: após o culto)" {...form.register("descricao")} />
                <FieldError errors={[errors.descricao]} />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field data-invalid={!!errors.gc_id}>
                <FieldLabel htmlFor="gc_id">GC</FieldLabel>
                <Controller
                  control={form.control}
                  name="gc_id"
                  render={({ field }) => (
                    <OpcaoSelect
                      id="gc_id"
                      value={field.value}
                      onChange={field.onChange}
                      opcoes={gcs}
                      vazio="Nenhum GC"
                      invalido={!!errors.gc_id}
                    />
                  )}
                />
                <FieldError errors={[errors.gc_id]} />
              </Field>
              <Field>
                <FieldLabel htmlFor="ministerio_id">Ministério</FieldLabel>
                <Controller
                  control={form.control}
                  name="ministerio_id"
                  render={({ field }) => (
                    <OpcaoSelect
                      id="ministerio_id"
                      value={field.value}
                      onChange={field.onChange}
                      opcoes={ministerios}
                      vazio="Nenhum ministério"
                    />
                  )}
                />
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
