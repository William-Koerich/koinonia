"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { redefinirSenha } from "@/app/(auth)/actions";
import { aplicarErrosDoServidor } from "@/components/forms/server-errors";
import { SubmitButton } from "@/components/forms/submit-button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { redefinirSenhaSchema, type RedefinirSenhaInput } from "@/lib/validation/auth";

export function RedefinirSenhaForm() {
  const [pending, startTransition] = useTransition();

  const form = useForm<RedefinirSenhaInput>({
    resolver: zodResolver(redefinirSenhaSchema),
    defaultValues: { senha: "", confirmarSenha: "" },
  });
  const { errors } = form.formState;

  function onSubmit(values: RedefinirSenhaInput) {
    startTransition(async () => {
      const result = await redefinirSenha(values);
      if (!result.ok) {
        aplicarErrosDoServidor(form.setError, result.fieldErrors);
        toast.error(result.error);
      }
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        <Field data-invalid={!!errors.senha}>
          <FieldLabel htmlFor="senha">Nova senha</FieldLabel>
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
          <FieldLabel htmlFor="confirmarSenha">Confirmar nova senha</FieldLabel>
          <Input
            id="confirmarSenha"
            type="password"
            autoComplete="new-password"
            aria-invalid={!!errors.confirmarSenha}
            {...form.register("confirmarSenha")}
          />
          <FieldError errors={[errors.confirmarSenha]} />
        </Field>
        <SubmitButton pending={pending} className="w-full">
          Salvar nova senha
        </SubmitButton>
      </FieldGroup>
    </form>
  );
}
