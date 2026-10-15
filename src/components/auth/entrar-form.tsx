"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { entrar } from "@/app/(auth)/actions";
import { aplicarErrosDoServidor } from "@/components/forms/server-errors";
import { SubmitButton } from "@/components/forms/submit-button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { entrarSchema, type EntrarInput } from "@/lib/validation/auth";

export function EntrarForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? undefined;
  const erroLink = searchParams.get("erro") === "link";
  const [pending, startTransition] = useTransition();

  const form = useForm<EntrarInput>({
    resolver: zodResolver(entrarSchema),
    defaultValues: { email: "", senha: "" },
  });
  const { errors } = form.formState;

  useEffect(() => {
    if (erroLink) toast.error("O link é inválido ou expirou. Tente novamente.");
  }, [erroLink]);

  function onSubmit(values: EntrarInput) {
    startTransition(async () => {
      const result = await entrar(values, next);
      if (!result.ok) {
        aplicarErrosDoServidor(form.setError, result.fieldErrors);
        toast.error(result.error);
      }
    });
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
          <FieldError errors={[errors.email]} />
        </Field>
        <Field data-invalid={!!errors.senha}>
          <div className="flex items-center justify-between">
            <FieldLabel htmlFor="senha">Senha</FieldLabel>
            <Link href="/recuperar-senha" className="text-sm text-muted-foreground underline-offset-4 hover:underline">
              Esqueci minha senha
            </Link>
          </div>
          <Input
            id="senha"
            type="password"
            autoComplete="current-password"
            aria-invalid={!!errors.senha}
            {...form.register("senha")}
          />
          <FieldError errors={[errors.senha]} />
        </Field>
        <SubmitButton pending={pending} className="w-full">
          Entrar
        </SubmitButton>
        <p className="text-center text-sm text-muted-foreground">
          Ainda não tem conta?{" "}
          <Link href="/cadastro" className="font-medium text-foreground underline-offset-4 hover:underline">
            Cadastre-se
          </Link>
        </p>
      </FieldGroup>
    </form>
  );
}
