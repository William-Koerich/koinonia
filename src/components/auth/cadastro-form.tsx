"use client";

import { MailCheckIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { FormProvider } from "react-hook-form";
import { cadastrar } from "@/app/(auth)/actions";
import { PerfilFields } from "@/components/forms/perfil-fields";
import { SubmitButton } from "@/components/forms/submit-button";
import { useActionForm } from "@/components/forms/use-action-form";
import { Field, FieldError, FieldGroup, FieldLabel, FieldSeparator } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cadastroSchema } from "@/lib/validation/auth";

export function CadastroForm() {
  const [confirmacaoEnviada, setConfirmacaoEnviada] = useState(false);

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
    // sem sessão na resposta = confirmação de e-mail ligada no Supabase
    onSuccess: () => setConfirmacaoEnviada(true),
  });
  const { errors } = form.formState;

  if (confirmacaoEnviada) {
    return (
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <MailCheckIcon className="size-10 text-primary" />
        <p className="font-medium">Confira seu e-mail</p>
        <p className="text-sm text-muted-foreground">
          Enviamos um link de confirmação para <strong>{form.getValues("email")}</strong>. Clique nele para ativar
          sua conta.
        </p>
      </div>
    );
  }

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
