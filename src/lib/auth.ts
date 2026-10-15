import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Profile, Role } from "@/lib/types";

/**
 * Camada de acesso à sessão (DAL). Lê cookies, então quem chama em Server
 * Components precisa estar atrás de um <Suspense>. `cache` evita repetir a
 * consulta quando layout e página pedem o perfil na mesma requisição.
 */

export const getUserId = cache(async (): Promise<string | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return data?.claims.sub ?? null;
});

export const getProfile = cache(async (): Promise<Profile | null> => {
  const userId = await getUserId();
  if (!userId) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("koinonia_profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  return data;
});

/**
 * Exige usuário logado, com perfil Koinonia e ativo; senão redireciona.
 * Sem perfil = conta de outro app no mesmo auth.users: completa o cadastro.
 */
export async function requireProfile(): Promise<Profile> {
  const userId = await getUserId();
  if (!userId) redirect("/entrar");

  const profile = await getProfile();
  if (!profile) redirect("/completar-cadastro");
  if (!profile.ativo) redirect("/conta-inativa");

  return profile;
}

/** Exige um dos papéis informados; senão volta para o dashboard. */
export async function requireRole(...roles: Role[]): Promise<Profile> {
  const profile = await requireProfile();
  if (!roles.includes(profile.role)) redirect("/app");
  return profile;
}
