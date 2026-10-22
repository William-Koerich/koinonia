"use client";

import { CalendarDaysIcon, ClipboardListIcon, MegaphoneIcon } from "lucide-react";
import { type Control, Controller, useWatch } from "react-hook-form";
import type { z } from "zod";
import { SubmitButton } from "@/components/forms/submit-button";
import { useActionForm } from "@/components/forms/use-action-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  configNotificacaoSchema,
  DIAS_ANTES_EVENTO,
  MINUTOS_ANTES,
  type ConfigNotificacaoInput,
} from "@/lib/validation/notificacao";
import { salvarConfigNotificacoes } from "../actions";

type ConfigNotificacaoSaida = z.output<typeof configNotificacaoSchema>;

type NomeInterruptor = "escala_ativo" | "aviso_ativo" | "evento_ao_cadastrar" | "evento_na_hora";

function Interruptor({
  control,
  nome,
  rotulo,
  descricao,
}: {
  control: Control<ConfigNotificacaoInput, unknown, ConfigNotificacaoSaida>;
  nome: NomeInterruptor;
  rotulo: string;
  descricao?: string;
}) {
  return (
    <Controller
      control={control}
      name={nome}
      render={({ field }) => (
        <Field orientation="horizontal">
          <FieldContent>
            <FieldLabel htmlFor={nome}>{rotulo}</FieldLabel>
            {descricao && <FieldDescription>{descricao}</FieldDescription>}
          </FieldContent>
          <Switch id={nome} checked={field.value} onCheckedChange={field.onChange} />
        </Field>
      )}
    />
  );
}

const rotuloDias = (d: number) => (d === 0 ? "No dia" : d === 1 ? "1 dia antes" : `${d} dias antes`);

export function RegrasForm({ valores }: { valores: ConfigNotificacaoInput }) {
  const { form, pending, onSubmit } = useActionForm({
    schema: configNotificacaoSchema,
    defaultValues: valores,
    action: salvarConfigNotificacoes,
  });
  const { errors } = form.formState;
  const [escalaAtivo, eventoNaHora, diasEvento] = useWatch({
    control: form.control,
    name: ["escala_ativo", "evento_na_hora", "evento_dias_antes"],
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      {/* escala */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardListIcon className="size-5 text-primary" /> Escala de serviço
          </CardTitle>
          <CardDescription>Lembra quem está escalado, uma vez por dia, até o dia da escala.</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Interruptor control={form.control} nome="escala_ativo" rotulo="Lembrar quem está na escala" />
            {escalaAtivo && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field data-invalid={!!errors.escala_dias_antes}>
                  <FieldLabel htmlFor="escala_dias_antes">Começar a lembrar</FieldLabel>
                  <div className="flex items-center gap-2">
                    <Input id="escala_dias_antes" inputMode="numeric" className="w-20" {...form.register("escala_dias_antes")} />
                    <span className="text-sm text-muted-foreground">dias antes</span>
                  </div>
                  <FieldDescription>Ex.: 6 = um lembrete por dia durante a semana. 0 = só no dia.</FieldDescription>
                  <FieldError errors={[errors.escala_dias_antes]} />
                </Field>
                <Field data-invalid={!!errors.escala_horario}>
                  <FieldLabel htmlFor="escala_horario">Horário do lembrete</FieldLabel>
                  <Input id="escala_horario" type="time" className="w-32" {...form.register("escala_horario")} />
                  <FieldError errors={[errors.escala_horario]} />
                </Field>
              </div>
            )}
          </FieldGroup>
        </CardContent>
      </Card>

      {/* avisos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MegaphoneIcon className="size-5 text-primary" /> Avisos
          </CardTitle>
          <CardDescription>Notifica todos os membros assim que um aviso é publicado.</CardDescription>
        </CardHeader>
        <CardContent>
          <Interruptor control={form.control} nome="aviso_ativo" rotulo="Notificar ao publicar um aviso" />
        </CardContent>
      </Card>

      {/* eventos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDaysIcon className="size-5 text-primary" /> Eventos
          </CardTitle>
          <CardDescription>Respeita o público do evento (homens, mulheres ou todos).</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Interruptor control={form.control} nome="evento_ao_cadastrar" rotulo="Notificar quando um evento novo é cadastrado" />

            <Field>
              <FieldLabel>Lembretes antes do evento</FieldLabel>
              <Controller
                control={form.control}
                name="evento_dias_antes"
                render={({ field }) => (
                  <div className="flex flex-wrap gap-2">
                    {DIAS_ANTES_EVENTO.map((d) => {
                      const marcado = field.value.includes(d);
                      return (
                        <button
                          key={d}
                          type="button"
                          aria-pressed={marcado}
                          onClick={() => field.onChange(marcado ? field.value.filter((v) => v !== d) : [...field.value, d])}
                          className={cn(
                            "rounded-full border px-3 py-1 text-sm transition-colors",
                            marcado ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
                          )}
                        >
                          {rotuloDias(d)}
                        </button>
                      );
                    })}
                  </div>
                )}
              />
              <FieldDescription>
                {diasEvento.length
                  ? `Marcados: ${[...diasEvento].sort((a, b) => b - a).map(rotuloDias).join(", ")}.`
                  : "Nenhum lembrete antes do evento."}
              </FieldDescription>
            </Field>

            <Field data-invalid={!!errors.evento_horario}>
              <FieldLabel htmlFor="evento_horario">Horário desses lembretes</FieldLabel>
              <Input id="evento_horario" type="time" className="w-32" {...form.register("evento_horario")} />
              <FieldError errors={[errors.evento_horario]} />
            </Field>

            <Interruptor control={form.control} nome="evento_na_hora" rotulo="Notificar quando o evento começa" />
            {eventoNaHora && (
              <Field>
                <FieldLabel htmlFor="evento_minutos_antes">Enviar</FieldLabel>
                <Controller
                  control={form.control}
                  name="evento_minutos_antes"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="evento_minutos_antes" className="w-full sm:w-64">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MINUTOS_ANTES.map((m) => (
                          <SelectItem key={m.value} value={m.value}>
                            {m.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>
            )}
          </FieldGroup>
        </CardContent>
      </Card>

      <SubmitButton pending={pending}>Salvar regras</SubmitButton>
    </form>
  );
}
