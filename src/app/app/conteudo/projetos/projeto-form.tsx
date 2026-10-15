"use client";

import Link from "next/link";
import { Controller, useWatch } from "react-hook-form";
import { GaleriaUpload } from "@/components/forms/galeria-upload";
import { SubmitButton } from "@/components/forms/submit-button";
import { useActionForm } from "@/components/forms/use-action-form";
import { Button } from "@/components/ui/button";
import { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { slugify } from "@/lib/format";
import { MAX_IMAGENS_PROJETO, projetoSchema, STATUS_PROJETO, type ProjetoInput } from "@/lib/validation/conteudo";
import { salvarProjeto } from "../actions";

export function ProjetoForm({ id, valores }: { id?: string; valores: ProjetoInput }) {
  const { form, pending, onSubmit } = useActionForm({
    schema: projetoSchema,
    defaultValues: valores,
    action: (v) => salvarProjeto(id ?? null, v),
  });
  const { errors, dirtyFields } = form.formState;
  const capa = useWatch({ control: form.control, name: "capa" });

  return (
    <form onSubmit={onSubmit} noValidate>
      <FieldGroup>
        <Field data-invalid={!!errors.titulo}>
          <FieldLabel htmlFor="titulo">Título</FieldLabel>
          <Input
            id="titulo"
            aria-invalid={!!errors.titulo}
            {...form.register("titulo", {
              // em projetos novos, o endereço acompanha o título até ser editado à mão
              onChange: (e) => {
                if (!id && !dirtyFields.slug) form.setValue("slug", slugify(e.target.value));
              },
            })}
          />
          <FieldError errors={[errors.titulo]} />
        </Field>

        <Field data-invalid={!!errors.slug}>
          <FieldLabel htmlFor="slug">Endereço da página</FieldLabel>
          <InputGroup>
            <InputGroupAddon>
              <InputGroupText>/projetos/</InputGroupText>
            </InputGroupAddon>
            <InputGroupInput id="slug" aria-invalid={!!errors.slug} {...form.register("slug")} />
          </InputGroup>
          {id && <FieldDescription>Mudar o endereço quebra links já compartilhados.</FieldDescription>}
          <FieldError errors={[errors.slug]} />
        </Field>

        <Field data-invalid={!!errors.imagens || !!errors.capa}>
          <FieldLabel>Imagens</FieldLabel>
          <Controller
            control={form.control}
            name="imagens"
            render={({ field }) => (
              <GaleriaUpload
                pasta="projetos"
                maximo={MAX_IMAGENS_PROJETO}
                imagens={field.value}
                capa={capa}
                onChange={(imagens, novaCapa) => {
                  field.onChange(imagens);
                  form.setValue("capa", novaCapa, { shouldDirty: true });
                }}
              />
            )}
          />
          <FieldDescription>
            Envie várias de uma vez e escolha a capa (aparece na listagem e ao compartilhar). Horizontais (16:9) ficam
            melhores. JPG, PNG ou WebP até 5 MB cada, no máximo {MAX_IMAGENS_PROJETO}.
          </FieldDescription>
          <FieldError errors={[errors.imagens, errors.capa]} />
        </Field>

        <Field data-invalid={!!errors.resumo}>
          <FieldLabel htmlFor="resumo">Resumo</FieldLabel>
          <Input id="resumo" placeholder="Uma frase para o card da listagem" {...form.register("resumo")} />
          <FieldError errors={[errors.resumo]} />
        </Field>

        <Field data-invalid={!!errors.descricao}>
          <FieldLabel htmlFor="descricao">Descrição</FieldLabel>
          <Textarea id="descricao" rows={8} aria-invalid={!!errors.descricao} {...form.register("descricao")} />
          <FieldError errors={[errors.descricao]} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field>
            <FieldLabel htmlFor="status">Status</FieldLabel>
            <Controller
              control={form.control}
              name="status"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="status" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_PROJETO.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
          <Field data-invalid={!!errors.ordem}>
            <FieldLabel htmlFor="ordem">Ordem</FieldLabel>
            <Input id="ordem" inputMode="numeric" {...form.register("ordem")} />
            <FieldError errors={[errors.ordem]} />
          </Field>
          <Controller
            control={form.control}
            name="publicado"
            render={({ field }) => (
              <Field orientation="horizontal" className="self-end pb-2">
                <FieldContent>
                  <FieldLabel htmlFor="publicado">Publicado</FieldLabel>
                </FieldContent>
                <Switch id="publicado" checked={field.value} onCheckedChange={field.onChange} />
              </Field>
            )}
          />
        </div>

        <div className="flex gap-2">
          <SubmitButton pending={pending}>Salvar</SubmitButton>
          <Button asChild variant="outline">
            <Link href="/app/conteudo/projetos">Cancelar</Link>
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
