import type { Metadata } from "next";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { getGcsOpcoes } from "@/lib/data/app";
import { NovoUsuarioForm } from "./novo-usuario-form";

export const metadata: Metadata = { title: "Novo usuário" };

export default async function NovoUsuarioPage() {
  const profile = await requireRole("ADMIN", "PASTOR");
  const gcs = await getGcsOpcoes();

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader titulo="Novo usuário" descricao="Crie o acesso de um membro à área logada." />
      <Card>
        <CardContent>
          <NovoUsuarioForm gcs={gcs} podeDefinirPapel={profile.role === "ADMIN"} />
        </CardContent>
      </Card>
    </div>
  );
}
