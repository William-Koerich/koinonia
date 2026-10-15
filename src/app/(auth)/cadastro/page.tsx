import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";
import { CadastroForm } from "@/components/auth/cadastro-form";

export const metadata: Metadata = {
  title: "Criar conta",
  robots: { index: false },
};

export default function CadastroPage() {
  return (
    <AuthCard titulo="Criar conta" descricao="Preencha seus dados para acessar a área de membros.">
      <CadastroForm />
    </AuthCard>
  );
}
