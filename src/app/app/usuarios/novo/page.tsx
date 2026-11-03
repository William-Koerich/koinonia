import type { Metadata } from "next";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { getGcsOpcoes } from "@/lib/data/app";
import { createClient } from "@/lib/supabase/server";
import { NovoUsuarioForm } from "./novo-usuario-form";

export const metadata: Metadata = { title: "Novo usuário" };

export default async function NovoUsuarioPage({ searchParams }: PageProps<"/app/usuarios/novo">) {
  const profile = await requireRole("ADMIN", "PASTOR");
  const { visitante: visitanteId } = await searchParams;
  const supabase = await createClient();
  const [gcs, { data: visitante }] = await Promise.all([
    getGcsOpcoes(),
    // "Tornar membro": começa com os dados do visitante
    typeof visitanteId === "string" && /^[0-9a-f-]{36}$/i.test(visitanteId)
      ? supabase.from("koinonia_visitantes").select("id, nome, celular").eq("id", visitanteId).is("profile_id", null).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        titulo={visitante ? `Tornar ${visitante.nome.split(" ")[0]} membro` : "Novo usuário"}
        descricao={
          visitante
            ? "Nome e celular vieram do cadastro de visitante. Complete o resto e crie o acesso: o visitante fica marcado como membro."
            : "Crie o acesso de um membro à área logada."
        }
      />
      <Card>
        <CardContent>
          <NovoUsuarioForm
            gcs={gcs}
            podeDefinirPapel={profile.role === "ADMIN"}
            visitante={visitante ?? undefined}
          />
        </CardContent>
      </Card>
    </div>
  );
}
