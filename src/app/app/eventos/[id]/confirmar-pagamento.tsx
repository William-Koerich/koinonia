"use client";

import { CheckIcon, Loader2Icon } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
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
import { Field, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Enums } from "@/lib/types";
import { FORMAS_PAGAMENTO } from "@/lib/validation/financeiro";
import { confirmarPagamento } from "./actions";

/** Tesouraria confirma o pagamento de uma inscrição, dizendo como recebeu */
export function ConfirmarPagamento({
  eventoId,
  inscricaoId,
  nome,
  valor,
}: {
  eventoId: string;
  inscricaoId: string;
  nome: string;
  /** "R$ 50,00", para mostrar no diálogo */
  valor?: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [forma, setForma] = useState<Enums<"koinonia_forma_pagamento">>("pix");
  const [pending, startTransition] = useTransition();

  function confirmar() {
    startTransition(async () => {
      const result = await confirmarPagamento(eventoId, inscricaoId, forma);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message);
      setAberto(false);
    });
  }

  return (
    <Dialog
      open={aberto}
      onOpenChange={(abrir) => {
        setAberto(abrir);
        if (abrir) setForma("pix");
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <CheckIcon /> Confirmar pagamento
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirmar pagamento de {nome}?</DialogTitle>
          <DialogDescription>
            A inscrição fica confirmada e {valor ? `${valor} entra` : "o valor do evento entra"} nas entradas do financeiro
            (categoria “Inscrição em evento”), com a data de hoje.
          </DialogDescription>
        </DialogHeader>
        <Field className="py-2">
          <FieldLabel htmlFor={`forma-${inscricaoId}`}>Como foi recebido</FieldLabel>
          <Select value={forma} onValueChange={(v) => setForma(v as typeof forma)}>
            <SelectTrigger id={`forma-${inscricaoId}`} className="w-full">
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
        </Field>
        <DialogFooter>
          <Button onClick={confirmar} disabled={pending}>
            {pending && <Loader2Icon className="animate-spin" />}
            Confirmar e lançar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
