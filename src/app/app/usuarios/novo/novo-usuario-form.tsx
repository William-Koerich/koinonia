"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, FormProvider } from "react-hook-form";
import { GcSelect, type GcOpcao } from "@/components/forms/gc-select";
import { PerfilFields } from "@/components/forms/perfil-fields";
import { SubmitButton } from "@/components/forms/submit-button";
import { useActionForm } from "@/components/forms/use-action-form";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldSeparator } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { novoUsuarioSchema } from "@/lib/validation/usuario";
import { criarUsuario } from "../actions";
import { PapelSelect } from "../papel-select";

export function NovoUsuarioForm({ gcs, podeDefinirPapel }: { gcs: GcOpcao[]; podeDefinirPapel: boolean }) {
  const router = useRouter();
  const { form, pending, onSubmit } = useActionForm({
    schema: novoUsuarioSchema,
    defaultValues: {
      nome_completo: "",
      celular: "",
      data_nascimento: "",
      email: "",
      senha: "",
      gc_id: null,
      role: "MEMBRO",
    },
    action: criarUsuario,
    onSuccess: () => router.push("/app/usuarios"),
  });
  const { errors } = form.formState;

  return (
    <FormProvider {...form}>
      <form onSubmit={onSubmit} noValidate>
        <FieldGroup>
          <PerfilFields />

          <Field>
            <FieldLabel htmlFor="gc_id">GC</FieldLabel>
            <Controller
              control={form.control}
              name="gc_id"
              render={({ field }) => <GcSelect id="gc_id" gcs={gcs} value={field.value} onChange={field.onChange} />}
            />
          </Field>

          <FieldSeparator>Acesso</FieldSeparator>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field data-invalid={!!errors.email}>
              <FieldLabel htmlFor="email">E-mail</FieldLabel>
              <Input id="email" type="email" autoComplete="off" aria-invalid={!!errors.email} {...form.register("email")} />
              <FieldError errors={[errors.email]} />
            </Field>
            <Field data-invalid={!!errors.senha}>
              <FieldLabel htmlFor="senha">Senha inicial</FieldLabel>
              <Input
                id="senha"
                type="text"
                autoComplete="new-password"
                aria-invalid={!!errors.senha}
                {...form.register("senha")}
              />
              <FieldError errors={[errors.senha]} />
            </Field>
          </div>
          <FieldDescription className="-mt-4">
            A pessoa pode trocar a senha em “Meu perfil”. Se o e-mail já tiver login em outro sistema da igreja, o
            acesso é liberado e a senha atual dela é mantida.
          </FieldDescription>

          <Field>
            <FieldLabel htmlFor="role">Papel</FieldLabel>
            <Controller
              control={form.control}
              name="role"
              render={({ field }) => (
                <PapelSelect id="role" value={field.value} onChange={field.onChange} disabled={!podeDefinirPapel} />
              )}
            />
            <FieldDescription>
              {podeDefinirPapel
                ? "Líder de ministério é definido automaticamente ao marcar a pessoa como líder de um ministério."
                : "Apenas administradores definem papéis. O usuário será criado como Membro."}
            </FieldDescription>
          </Field>

          <div className="flex gap-2">
            <SubmitButton pending={pending}>Criar usuário</SubmitButton>
            <Button asChild variant="outline">
              <Link href="/app/usuarios">Cancelar</Link>
            </Button>
          </div>
        </FieldGroup>
      </form>
    </FormProvider>
  );
}
