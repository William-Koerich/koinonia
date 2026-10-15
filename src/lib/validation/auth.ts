import { z } from "zod";
import { perfilSchema } from "./perfil";

export const emailSchema = z.string().trim().toLowerCase().pipe(z.email("Informe um e-mail válido."));

export const novaSenhaSchema = z
  .string()
  .min(8, "A senha deve ter pelo menos 8 caracteres.")
  .max(72, "A senha deve ter no máximo 72 caracteres.");

export const entrarSchema = z.object({
  email: emailSchema,
  senha: z.string().min(1, "Informe sua senha."),
});

export type EntrarInput = z.input<typeof entrarSchema>;

export const cadastroSchema = perfilSchema
  .extend({
    email: emailSchema,
    senha: novaSenhaSchema,
    confirmarSenha: z.string(),
  })
  .refine((d) => d.senha === d.confirmarSenha, {
    message: "As senhas não conferem.",
    path: ["confirmarSenha"],
  });

export type CadastroInput = z.input<typeof cadastroSchema>;

export const recuperarSenhaSchema = z.object({
  email: emailSchema,
});

export type RecuperarSenhaInput = z.input<typeof recuperarSenhaSchema>;

export const redefinirSenhaSchema = z
  .object({
    senha: novaSenhaSchema,
    confirmarSenha: z.string(),
  })
  .refine((d) => d.senha === d.confirmarSenha, {
    message: "As senhas não conferem.",
    path: ["confirmarSenha"],
  });

export type RedefinirSenhaInput = z.input<typeof redefinirSenhaSchema>;

/** Só aceita caminhos internos, para não virar open redirect */
export function caminhoSeguro(next: unknown, padrao = "/app"): string {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//")
    ? next
    : padrao;
}
