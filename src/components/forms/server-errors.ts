import type { FieldValues, Path, UseFormSetError } from "react-hook-form";

/** Mostra nos campos os erros de validação devolvidos pela Server Action */
export function aplicarErrosDoServidor<T extends FieldValues>(
  setError: UseFormSetError<T>,
  fieldErrors: Record<string, string[] | undefined> | undefined,
) {
  if (!fieldErrors) return;
  for (const [campo, mensagens] of Object.entries(fieldErrors)) {
    if (mensagens?.[0]) {
      setError(campo as Path<T>, { type: "server", message: mensagens[0] });
    }
  }
}
