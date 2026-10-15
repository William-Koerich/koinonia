"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition } from "react";
import { useForm, type DefaultValues, type FieldValues } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import type { ActionResult } from "@/lib/types";
import { aplicarErrosDoServidor } from "./server-errors";

/**
 * Formulário react-hook-form ligado a uma Server Action com o mesmo schema zod.
 *
 * O zod valida no client; a action recebe os valores *brutos* do formulário
 * (não os transformados) e valida de novo no servidor com o mesmo schema.
 * Erros de campo voltam para o formulário e as mensagens viram toast.
 */
export function useActionForm<TInput extends FieldValues, TOutput extends FieldValues>({
  schema,
  defaultValues,
  action,
  onSuccess,
}: {
  schema: z.ZodType<TOutput, TInput>;
  defaultValues: DefaultValues<TInput>;
  action: (input: TInput) => Promise<ActionResult>;
  onSuccess?: (result: Extract<ActionResult, { ok: true }>) => void;
}) {
  const [pending, startTransition] = useTransition();
  const form = useForm<TInput, unknown, TOutput>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const onSubmit = form.handleSubmit(() => {
    const valores = form.getValues();
    startTransition(async () => {
      const result = await action(valores);
      if (!result.ok) {
        aplicarErrosDoServidor(form.setError, result.fieldErrors);
        toast.error(result.error);
        return;
      }
      if (result.message) toast.success(result.message);
      onSuccess?.(result);
    });
  });

  return { form, pending, onSubmit };
}
