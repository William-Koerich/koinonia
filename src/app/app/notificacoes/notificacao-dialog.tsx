"use client";

import { SendIcon } from "lucide-react";
import { useState } from "react";
import { Controller, useWatch } from "react-hook-form";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { DESTINOS, NOTIFICACAO_VAZIA, notificacaoSchema, PUBLICOS_NOTIFICACAO } from "@/lib/validation/notificacao";
import { criarNotificacao } from "./actions";

type Opcao = { id: string; nome: string };

export function NotificacaoDialog({ ministerios, gcs }: { ministerios: Opcao[]; gcs: Opcao[] }) {
  const [aberto, setAberto] = useState(false);
  const { form, pending, onSubmit } = useActionForm({
    schema: notificacaoSchema,
    defaultValues: NOTIFICACAO_VAZIA,
    action: criarNotificacao,
    onSuccess: () => setAberto(false),
  });
  const { errors } = form.formState;
  const [publico, quando] = useWatch({ control: form.control, name: ["publico", "quando"] });
  const opcoesGrupo = publico === "gc" ? gcs : ministerios;

  return (
    <Dialog
      open={aberto}
      onOpenChange={(abrir) => {
        setAberto(abrir);
        if (abrir) form.reset(NOTIFICACAO_VAZIA);
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <SendIcon /> Nova notificação
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90svh] overflow-y-auto">
        <form onSubmit={onSubmit} noValidate>
          <DialogHeader>
            <DialogTitle>Nova notificação</DialogTitle>
            <DialogDescription>Chega no celular de quem ativou as notificações do Koinonia.</DialogDescription>
          </DialogHeader>

          <FieldGroup className="py-4">
            <Field data-invalid={!!errors.titulo}>
              <FieldLabel htmlFor="titulo">Título</FieldLabel>
              <Input id="titulo" maxLength={100} placeholder="Ex.: Culto às 9h neste domingo" aria-invalid={!!errors.titulo} {...form.register("titulo")} />
              <FieldError errors={[errors.titulo]} />
            </Field>
            <Field data-invalid={!!errors.mensagem}>
              <FieldLabel htmlFor="mensagem">Mensagem</FieldLabel>
              <Textarea id="mensagem" rows={3} maxLength={300} placeholder="Opcional" {...form.register("mensagem")} />
              <FieldError errors={[errors.mensagem]} />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="publico">Para quem</FieldLabel>
                <Controller
                  control={form.control}
                  name="publico"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={(v) => {
                        field.onChange(v);
                        form.setValue("publico_id", "");
                      }}
                    >
                      <SelectTrigger id="publico" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PUBLICOS_NOTIFICACAO.map((p) => (
                          <SelectItem key={p.value} value={p.value}>
                            {p.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="url">Ao tocar, abre</FieldLabel>
                <Controller
                  control={form.control}
                  name="url"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="url" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DESTINOS.map((d) => (
                          <SelectItem key={d.value} value={d.value}>
                            {d.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>
            </div>

            {(publico === "ministerio" || publico === "gc") && (
              <Field data-invalid={!!errors.publico_id}>
                <FieldLabel htmlFor="publico_id">{publico === "gc" ? "GC" : "Ministério"}</FieldLabel>
                <Controller
                  control={form.control}
                  name="publico_id"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="publico_id" className="w-full" aria-invalid={!!errors.publico_id}>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {opcoesGrupo.map((o) => (
                          <SelectItem key={o.id} value={o.id}>
                            {o.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <FieldError errors={[errors.publico_id]} />
              </Field>
            )}

            <Field>
              <FieldLabel>Quando</FieldLabel>
              <Controller
                control={form.control}
                name="quando"
                render={({ field }) => (
                  <Tabs value={field.value} onValueChange={field.onChange}>
                    <TabsList className="w-full">
                      <TabsTrigger value="agora">Enviar agora</TabsTrigger>
                      <TabsTrigger value="agendar">Agendar</TabsTrigger>
                    </TabsList>
                  </Tabs>
                )}
              />
            </Field>
            {quando === "agendar" && (
              <Field data-invalid={!!errors.agendada_para}>
                <FieldLabel htmlFor="agendada_para">Data e hora do envio</FieldLabel>
                <Input id="agendada_para" type="datetime-local" aria-invalid={!!errors.agendada_para} {...form.register("agendada_para")} />
                <FieldDescription>Horário de Brasília. Pode sair com até 5 minutos de diferença.</FieldDescription>
                <FieldError errors={[errors.agendada_para]} />
              </Field>
            )}
          </FieldGroup>

          <DialogFooter>
            <SubmitButton pending={pending}>{quando === "agendar" ? "Agendar" : "Enviar agora"}</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
