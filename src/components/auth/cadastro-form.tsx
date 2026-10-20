"use client";

import Link from "next/link";
import { FormProvider } from "react-hook-form";
import { cadastrar } from "@/app/(auth)/actions";
import { PerfilFields } from "@/components/forms/perfil-fields";
import { SubmitButton } from "@/components/forms/submit-button";
import { useActionForm } from "@/components/forms/use-action-form";
import { Field, FieldError, FieldGroup, FieldLabel, FieldSeparator } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cadastroSchema } from "@/lib/validation/auth";

export function CadastroForm() {
  // sucesso: a action redireciona para /entrar
  const { form, pending, onSubmit } = useActionForm({
    schema: cadastroSchema,
    defaultValues: {
      nome_completo: "",
      celular: "",
      data_nascimento: "",
      email: "",
      senha: "",
      confirmarSenha: "",
    },
    action: cadastrar,
  });
  const { errors } = form.formState;

  return (
    <FormProvider {...form}>
      <form onSubmit={onSubmit} noValidate>
        <FieldGroup>
          <PerfilFields />
          <FieldSeparator>Acesso</FieldSeparator>
          <Field data-invalid={!!errors.email}>
            <FieldLabel htmlFor="email">E-mail</FieldLabel>
            <Input id="email" type="email" autoComplete="email" aria-invalid={!!errors.email} {...form.register("email")} />
            <FieldError errors={[errors.email]} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field data-invalid={!!errors.senha}>
              <FieldLabel htmlFor="senha">Senha</FieldLabel>
              <Input
                id="senha"
                type="password"
                autoComplete="new-password"
                aria-invalid={!!errors.senha}
                {...form.register("senha")}
              />
              <FieldError errors={[errors.senha]} />
            </Field>
            <Field data-invalid={!!errors.confirmarSenha}>
              <FieldLabel htmlFor="confirmarSenha">Confirmar senha</FieldLabel>
              <Input
                id="confirmarSenha"
                type="password"
                autoComplete="new-password"
                aria-invalid={!!errors.confirmarSenha}
                {...form.register("confirmarSenha")}
              />
              <FieldError errors={[errors.confirmarSenha]} />
            </Field>
          </div>
          <SubmitButton pending={pending} className="w-full">
            Criar conta
          </SubmitButton>
          <p className="text-center text-sm text-muted-foreground">
            Já tem conta?{" "}
            <Link href="/entrar" className="font-medium text-foreground underline-offset-4 hover:underline">
              Entrar
            </Link>
          </p>
        </FieldGroup>
      </form>
    </FormProvider>
  );
}
