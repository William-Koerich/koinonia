"use client";

import { PencilIcon, PlusIcon } from "lucide-react";
import { useState } from "react";
import { Controller, FormProvider, useWatch } from "react-hook-form";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { contaSchema, contaVazia, FREQUENCIAS, type ContaInput } from "@/lib/validation/financeiro";
import { salvarConta } from "./actions";
import { CamposConta, CamposTermino, type MinisterioOpcao } from "./campos-conta";

/** Nova conta (avulsa ou recorrente) ou edição de uma conta */
export function ContaDialog({
  vencimentoPadrao,
  ministerios,
  conta,
}: {
  vencimentoPadrao: string;
  ministerios: MinisterioOpcao[];
  conta?: { id: string; valores: ContaInput; recorrente: boolean };
}) {
  const [aberto, setAberto] = useState(false);
  const valoresIniciais = conta?.valores ?? contaVazia(vencimentoPadrao);

  const { form, pending, onSubmit } = useActionForm({
    schema: contaSchema,
    defaultValues: valoresIniciais,
    action: (v) => salvarConta(conta?.id ?? null, v),
    onSuccess: () => setAberto(false),
  });
  const { errors } = form.formState;
  const repetir = useWatch({ control: form.control, name: "repetir" });

  return (
    <Dialog
      open={aberto}
      onOpenChange={(abrir) => {
        setAberto(abrir);
        if (abrir) form.reset(valoresIniciais);
      }}
    >
      <DialogTrigger asChild>
        {conta ? (
          <Button variant="ghost" size="icon" aria-label="Editar conta">
            <PencilIcon />
          </Button>
        ) : (
          <Button>
            <PlusIcon /> Nova conta
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90svh] overflow-y-auto">
        <FormProvider {...form}>
          <form onSubmit={onSubmit} noValidate>
            <DialogHeader>
              <DialogTitle>{conta ? "Editar conta" : "Nova conta a pagar"}</DialogTitle>
              <DialogDescription>
                {conta?.recorrente
                  ? "Altera só esta conta. Para mudar todas as próximas, edite a recorrência em “Contas recorrentes”."
                  : "Lance uma conta avulsa ou uma que se repete (aluguel, energia, parcelas...)."}
              </DialogDescription>
            </DialogHeader>

            <FieldGroup className="py-4">
              <CamposConta ministerios={ministerios} />

              <div className="grid gap-4 sm:grid-cols-2">
                <Field data-invalid={!!errors.vencimento}>
                  <FieldLabel htmlFor="vencimento">{repetir === "nao" ? "Vencimento" : "1º vencimento"}</FieldLabel>
                  <Input id="vencimento" type="date" aria-invalid={!!errors.vencimento} {...form.register("vencimento")} />
                  <FieldError errors={[errors.vencimento]} />
                </Field>
                {!conta && (
                  <Field>
                    <FieldLabel htmlFor="repetir">Repetir</FieldLabel>
                    <Controller
                      control={form.control}
                      name="repetir"
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger id="repetir" className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="nao">Não repete</SelectItem>
                            {FREQUENCIAS.map((f) => (
                              <SelectItem key={f.value} value={f.value}>
                                {f.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </Field>
                )}
              </div>

              {!conta && repetir !== "nao" && (
                <>
                  <CamposTermino />
                  <FieldDescription>
                    As próximas contas aparecem sozinhas em cada mês, com o mesmo valor (dá para ajustar uma a uma).
                  </FieldDescription>
                </>
              )}

              <Field data-invalid={!!errors.observacao}>
                <FieldLabel htmlFor="observacao">Observação</FieldLabel>
                <Input id="observacao" placeholder="Opcional (ex.: código de barras, contrato)" {...form.register("observacao")} />
                <FieldError errors={[errors.observacao]} />
              </Field>
            </FieldGroup>

            <DialogFooter>
              <SubmitButton pending={pending}>Salvar</SubmitButton>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
