import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthCard, FormSkeleton } from "@/components/auth/auth-card";
import { RedefinirSenhaForm } from "@/components/auth/redefinir-senha-form";
import { getUserId } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Nova senha",
  robots: { index: false },
};

export default function RedefinirSenhaPage() {
  return (
    <AuthCard titulo="Criar nova senha">
      <Suspense fallback={<FormSkeleton />}>
        <Conteudo />
      </Suspense>
    </AuthCard>
  );
}

/** Chega-se aqui pelo link do e-mail, que já abre a sessão em /auth/callback */
async function Conteudo() {
  if (!(await getUserId())) {
    return (
      <div className="space-y-4 text-center text-sm">
        <p className="text-muted-foreground">O link expirou ou já foi usado.</p>
        <Link href="/recuperar-senha" className="font-medium underline-offset-4 hover:underline">
          Solicitar um novo link
        </Link>
      </div>
    );
  }
  return <RedefinirSenhaForm />;
}
