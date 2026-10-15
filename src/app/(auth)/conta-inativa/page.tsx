import type { Metadata } from "next";
import { sair } from "@/app/(auth)/actions";
import { AuthCard } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Conta inativa",
  robots: { index: false },
};

export default function ContaInativaPage() {
  return (
    <AuthCard
      titulo="Conta inativa"
      descricao="Seu acesso à área de membros está desativado. Fale com a secretaria ou com um pastor da igreja."
    >
      <form action={sair}>
        <Button type="submit" variant="outline" className="w-full">
          Sair
        </Button>
      </form>
    </AuthCard>
  );
}
