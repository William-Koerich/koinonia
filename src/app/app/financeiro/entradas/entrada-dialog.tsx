"use client";

import { PencilIcon, PlusIcon } from "lucide-react";
import { useState } from "react";
import { Controller, useWatch } from "react-hook-form";
import { MoedaInput } from "@/components/forms/moeda-input";
import { PessoaCombobox, type PessoaOpcao } from "@/components/forms/pessoa-combobox";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CATEGORIAS_ENTRADA_MANUAL,
  entradaSchema,
  entradaVazia,
  FORMAS_PAGAMENTO,
  type EntradaInput,
} from "@/lib/validation/financeiro";
import type { CarteiraOpcao } from "@/lib/carteiras";
import { carteiraSugerida } from "@/lib/carteiras";
import { CarteiraSelect } from "../_componentes/carteira-select";
import { salvarEntrada } from "./actions";

export function EntradaDialog({
  pessoas,
  carteiras,
  hoje,
  entrada,
}: {
  pessoas: PessoaOpcao[];
  carteiras: CarteiraOpcao[];
  hoje: string;
  entrada?: { id: string; valores: EntradaInput };
}) {
  const [aberto, setAberto] = useState(false);
  const valoresIniciais = entrada?.valores ?? { ...entradaVazia(hoje), carteira_id: carteiraSugerida(carteiras, "pix") };

  const { form, pending, onSubmit } = useActionForm({
    schema: entradaSchema,
    defaultValues: valoresIniciais,
    action: (v) => salvarEntrada(entrada?.id ?? null, v),
    onSuccess: () => setAberto(false),
  });
  const { errors } = form.formState;
  const contribuinte = useWatch({ control: form.control, name: "contribuinte" });

  return (
    <Dialog
      open={aberto}
      onOpenChange={(abrir) => {
        setAberto(abrir);
        if (abrir) form.reset(valoresIniciais);
      }}
    >
      <DialogTrigger asChild>
        {entrada ? (
          <Button variant="ghost" size="icon" aria-label="Editar entrada">
            <PencilIcon />
          </Button>
        ) : (
          <Button>
            <PlusIcon /> Nova entrada
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <form onSubmit={onSubmit} noValidate>
          <DialogHeader>
            <DialogTitle>{entrada ? "Editar entrada" : "Nova entrada"}</DialogTitle>
            <DialogDescription>Dízimos, ofertas, primícias, doações e outros valores recebidos pela igreja.</DialogDescription>
          </DialogHeader>

          <FieldGroup className="py-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field data-invalid={!!errors.categoria}>
                <FieldLabel htmlFor="categoria">Categoria</FieldLabel>
                <Controller
                  control={form.control}
                  name="categoria"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="categoria" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIAS_ENTRADA_MANUAL.map((c) => (
                          <SelectItem key={c.value} value={c.value}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <FieldError errors={[errors.categoria]} />
              </Field>
              <Field data-invalid={!!errors.valor}>
                <FieldLabel htmlFor="valor">Valor</FieldLabel>
                <Controller
                  control={form.control}
                  name="valor"
                  render={({ field }) => (
                    <MoedaInput
                      id="valor"
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      invalido={!!errors.valor}
                    />
                  )}
                />
                <FieldError errors={[errors.valor]} />
              </Field>
              <Field data-invalid={!!errors.data}>
                <FieldLabel htmlFor="data">Data</FieldLabel>
                <Input id="data" type="date" aria-invalid={!!errors.data} {...form.register("data")} />
                <FieldError errors={[errors.data]} />
              </Field>
              <Field data-invalid={!!errors.forma_pagamento}>
                <FieldLabel htmlFor="forma_pagamento">Recebido em</FieldLabel>
                <Controller
                  control={form.control}
                  name="forma_pagamento"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={(v) => {
                        field.onChange(v);
                        // lançamento novo: dinheiro sugere o caixa; o resto, a conta padrão
                        if (!entrada) form.setValue("carteira_id", carteiraSugerida(carteiras, v));
                      }}
                    >
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
            </div>

            <Field data-invalid={!!errors.carteira_id}>
              <FieldLabel htmlFor="carteira_id">Entrou na conta</FieldLabel>
              <Controller
                control={form.control}
                name="carteira_id"
                render={({ field }) => (
                  <CarteiraSelect id="carteira_id" carteiras={carteiras} value={field.value} onChange={field.onChange} />
                )}
              />
              <FieldError errors={[errors.carteira_id]} />
            </Field>

            <Field>
              <FieldLabel>Quem contribuiu</FieldLabel>
              <Controller
                control={form.control}
                name="contribuinte"
                render={({ field }) => (
                  <Tabs value={field.value} onValueChange={field.onChange}>
                    <TabsList className="w-full">
                      <TabsTrigger value="membro">Membro</TabsTrigger>
                      <TabsTrigger value="outro">Outra pessoa</TabsTrigger>
                      <TabsTrigger value="nenhum">Não identificado</TabsTrigger>
                    </TabsList>
                  </Tabs>
                )}
              />
            </Field>

            {contribuinte === "membro" && (
              <Field data-invalid={!!errors.profile_id}>
                <Controller
                  control={form.control}
                  name="profile_id"
                  render={({ field }) => (
                    <PessoaCombobox
                      id="profile_id"
                      pessoas={pessoas}
                      value={field.value || null}
                      onChange={(v) => field.onChange(v ?? "")}
                      placeholder="Selecione o membro"
                      invalido={!!errors.profile_id}
                    />
                  )}
                />
                <FieldError errors={[errors.profile_id]} />
              </Field>
            )}
            {contribuinte === "outro" && (
              <Field data-invalid={!!errors.contribuinte_nome}>
                <Input
                  id="contribuinte_nome"
                  placeholder="Nome de quem contribuiu (sem conta no site)"
                  aria-invalid={!!errors.contribuinte_nome}
                  {...form.register("contribuinte_nome")}
                />
                <FieldError errors={[errors.contribuinte_nome]} />
              </Field>
            )}

            <Field data-invalid={!!errors.descricao}>
              <FieldLabel htmlFor="descricao">Observação</FieldLabel>
              <Input id="descricao" placeholder="Opcional (ex.: oferta do culto de domingo)" {...form.register("descricao")} />
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
