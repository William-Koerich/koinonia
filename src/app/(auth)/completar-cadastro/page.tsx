import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AuthCard, FormSkeleton } from "@/components/auth/auth-card";
import { CompletarCadastroForm } from "@/components/auth/completar-cadastro-form";
import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Completar cadastro",
  robots: { index: false },
};

// Login válido no Supabase (compartilhado com outros apps), ainda sem perfil Koinonia
export default function CompletarCadastroPage() {
  return (
    <AuthCard
      titulo="Complete seu cadastro"
      descricao="Sua conta já existe. Falta preencher alguns dados para acessar a área de membros."
    >
      <Suspense fallback={<FormSkeleton campos={4} />}>
        <Conteudo />
      </Suspense>
    </AuthCard>
  );
}

async function Conteudo() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/entrar");
  if (await getProfile()) redirect("/app");

  const meta = data.user.user_metadata as { nome?: string; nome_completo?: string };
  return <CompletarCadastroForm nomeSugerido={meta.nome_completo ?? meta.nome ?? ""} />;
}
