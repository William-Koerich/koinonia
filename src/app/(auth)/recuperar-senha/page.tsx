import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";
import { RecuperarSenhaForm } from "@/components/auth/recuperar-senha-form";

export const metadata: Metadata = {
  title: "Recuperar senha",
  robots: { index: false },
};

export default function RecuperarSenhaPage() {
  return (
    <AuthCard titulo="Recuperar senha">
      <RecuperarSenhaForm />
    </AuthCard>
  );
}
