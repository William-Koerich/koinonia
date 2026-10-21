import type { Role } from "./types";

// Espelha as regras da RLS para decidir o que mostrar na interface.
// A garantia de verdade é sempre o banco: isto só esconde o que não é permitido.

export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "Administrador",
  PASTOR: "Pastor",
  LIDER_MINISTERIO: "Líder de ministério",
  MEMBRO: "Membro",
};

export function isAdmin(role: Role): boolean {
  return role === "ADMIN";
}

export function isAdminOrPastor(role: Role): boolean {
  return role === "ADMIN" || role === "PASTOR";
}

/** Quem acessa o financeiro (espelha koinonia_pode_financeiro() no banco) */
export const ROLES_FINANCEIRO: Role[] = ["ADMIN", "PASTOR"];
