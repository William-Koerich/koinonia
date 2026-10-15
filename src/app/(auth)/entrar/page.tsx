import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthCard, FormSkeleton } from "@/components/auth/auth-card";
import { EntrarForm } from "@/components/auth/entrar-form";

export const metadata: Metadata = {
  title: "Entrar",
  robots: { index: false },
};

export default function EntrarPage() {
  return (
    <AuthCard titulo="Entrar" descricao="Acesse a área de membros.">
      {/* O formulário lê ?next= e ?erro= da URL */}
      <Suspense fallback={<FormSkeleton />}>
        <EntrarForm />
      </Suspense>
    </AuthCard>
  );
}
