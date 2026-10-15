import { z } from "zod";
import { emailSchema, novaSenhaSchema } from "./auth";
import { idOpcional } from "./comum";
import { perfilSchema } from "./perfil";

/**
 * Papéis que podem ser escolhidos manualmente. LIDER_MINISTERIO não aparece:
 * é atribuído automaticamente a quem lidera um ministério (trigger no banco).
 */
export const PAPEIS_ATRIBUIVEIS = [
  { value: "MEMBRO", label: "Membro" },
  { value: "PASTOR", label: "Pastor" },
  { value: "ADMIN", label: "Administrador" },
] as const;

const papelSchema = z.enum(["MEMBRO", "PASTOR", "ADMIN"], { error: "Selecione o papel." });

export const usuarioEdicaoSchema = perfilSchema.extend({
  gc_id: idOpcional,
  ativo: z.boolean(),
  role: papelSchema,
});

export type UsuarioEdicaoInput = z.input<typeof usuarioEdicaoSchema>;

export const novoUsuarioSchema = perfilSchema.extend({
  email: emailSchema,
  senha: novaSenhaSchema,
  gc_id: idOpcional,
  role: papelSchema,
});

export type NovoUsuarioInput = z.input<typeof novoUsuarioSchema>;
