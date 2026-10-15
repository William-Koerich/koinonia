"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { aplicarErrosDoServidor } from "@/components/forms/server-errors";
import { SubmitButton } from "@/components/forms/submit-button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { redefinirSenhaSchema, type RedefinirSenhaInput } from "@/lib/validation/auth";
import { alterarSenha } from "./actions";

export function AlterarSenhaForm() {
  const [pending, startTransition] = useTransition();

  const form = useForm<RedefinirSenhaInput>({
    resolver: zodResolver(redefinirSenhaSchema),
    defaultValues: { senha: "", confirmarSenha: "" },
  });
  const { errors } = form.formState;

  function onSubmit(values: RedefinirSenhaInput) {
    startTransition(async () => {
      const result = await alterarSenha(values);
      if (!result.ok) {
        aplicarErrosDoServidor(form.setError, result.fieldErrors);
        toast.error(result.error);
        return;
      }
      form.reset();
      toast.success(result.message);
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={!!errors.senha}>
            <FieldLabel htmlFor="nova-senha">Nova senha</FieldLabel>
            <Input
              id="nova-senha"
              type="password"
              autoComplete="new-password"
              aria-invalid={!!errors.senha}
              {...form.register("senha")}
            />
            <FieldError errors={[errors.senha]} />
          </Field>
          <Field data-invalid={!!errors.confirmarSenha}>
            <FieldLabel htmlFor="confirmar-nova-senha">Confirmar nova senha</FieldLabel>
            <Input
              id="confirmar-nova-senha"
              type="password"
              autoComplete="new-password"
              aria-invalid={!!errors.confirmarSenha}
              {...form.register("confirmarSenha")}
            />
            <FieldError errors={[errors.confirmarSenha]} />
          </Field>
        </div>
        <SubmitButton pending={pending} className="sm:w-fit">
          Alterar senha
        </SubmitButton>
      </FieldGroup>
    </form>
  );
}
