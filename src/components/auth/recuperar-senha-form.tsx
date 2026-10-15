"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { recuperarSenha } from "@/app/(auth)/actions";
import { aplicarErrosDoServidor } from "@/components/forms/server-errors";
import { SubmitButton } from "@/components/forms/submit-button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { recuperarSenhaSchema, type RecuperarSenhaInput } from "@/lib/validation/auth";

export function RecuperarSenhaForm() {
  const [pending, startTransition] = useTransition();
  const [enviado, setEnviado] = useState<string | null>(null);

  const form = useForm<RecuperarSenhaInput>({
    resolver: zodResolver(recuperarSenhaSchema),
    defaultValues: { email: "" },
  });
  const { errors } = form.formState;

  function onSubmit(values: RecuperarSenhaInput) {
    startTransition(async () => {
      const result = await recuperarSenha(values);
      if (!result.ok) {
        aplicarErrosDoServidor(form.setError, result.fieldErrors);
        toast.error(result.error);
        return;
      }
      setEnviado(result.message ?? "Verifique seu e-mail.");
    });
  }

  if (enviado) {
    return (
      <div className="space-y-4 text-center text-sm">
        <p className="text-muted-foreground">{enviado}</p>
        <Link href="/entrar" className="font-medium underline-offset-4 hover:underline">
          Voltar para o login
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        <Field data-invalid={!!errors.email}>
          <FieldLabel htmlFor="email">E-mail</FieldLabel>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            aria-invalid={!!errors.email}
            {...form.register("email")}
          />
          <FieldDescription>Enviaremos um link para você criar uma nova senha.</FieldDescription>
          <FieldError errors={[errors.email]} />
        </Field>
        <SubmitButton pending={pending} className="w-full">
          Enviar link
        </SubmitButton>
        <Link href="/entrar" className="text-center text-sm text-muted-foreground underline-offset-4 hover:underline">
          Voltar para o login
        </Link>
      </FieldGroup>
    </form>
  );
}
