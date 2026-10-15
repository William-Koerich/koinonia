import "server-only";
import { getProfile } from "@/lib/auth";
import type { Profile, Role } from "@/lib/types";

export const SEM_PERMISSAO = "Você não tem permissão para esta ação.";

/**
 * Checagem de permissão no início das Server Actions. A RLS continua sendo a
 * garantia final; isto devolve uma mensagem amigável antes de ir ao banco.
 */
export async function autorizar(...roles: Role[]): Promise<Profile | null> {
  const profile = await getProfile();
  if (!profile?.ativo || !roles.includes(profile.role)) return null;
  return profile;
}
