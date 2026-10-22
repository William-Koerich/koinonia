import type { Metadata } from "next";
import { CartaoNotificacoes } from "@/components/app/notificacoes-push";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireProfile } from "@/lib/auth";
import { getGcsOpcoes } from "@/lib/data/app";
import { ROLE_LABEL } from "@/lib/permissions";
import { AlterarSenhaForm } from "./alterar-senha-form";
import { MeuPerfilForm } from "./meu-perfil-form";

export const metadata: Metadata = { title: "Meu perfil" };

export default async function MeuPerfilPage() {
  const profile = await requireProfile();
  const gcs = await getGcsOpcoes();

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        titulo="Meu perfil"
        descricao={`${profile.email} · ${ROLE_LABEL[profile.role]}`}
      />
      <Card>
        <CardContent>
          <MeuPerfilForm
            gcs={gcs}
            valores={{
              nome_completo: profile.nome_completo,
              celular: profile.celular,
              data_nascimento: profile.data_nascimento,
              genero: profile.genero,
              gc_id: profile.gc_id,
            }}
          />
        </CardContent>
      </Card>
      <div className="mt-6">
        <CartaoNotificacoes />
      </div>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Senha</CardTitle>
          <CardDescription>
            A senha vale também para outros sistemas que usam o mesmo login.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AlterarSenhaForm />
        </CardContent>
      </Card>
    </div>
  );
}
