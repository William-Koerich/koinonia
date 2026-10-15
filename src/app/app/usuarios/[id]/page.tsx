import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { getGcsOpcoes } from "@/lib/data/app";
import { ROLE_LABEL } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { UsuarioForm } from "./usuario-form";

export const metadata: Metadata = { title: "Editar usuário" };

export default async function EditarUsuarioPage({ params }: PageProps<"/app/usuarios/[id]">) {
  const editor = await requireRole("ADMIN", "PASTOR");
  const { id } = await params;

  const supabase = await createClient();
  const [{ data: usuario }, gcs] = await Promise.all([
    supabase
      .from("koinonia_profiles")
      .select("*, ministerios:koinonia_ministerio_membros(is_lider, ministerio:koinonia_ministerios(id, nome))")
      .eq("id", id)
      .maybeSingle(),
    getGcsOpcoes(),
  ]);
  if (!usuario) notFound();

  const ehLider = usuario.ministerios.some((m) => m.is_lider);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader titulo={usuario.nome_completo} descricao={`${usuario.email} · ${ROLE_LABEL[usuario.role]}`} />

      {usuario.ministerios.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {usuario.ministerios.map((m) =>
            m.ministerio ? (
              <Badge key={m.ministerio.id} variant={m.is_lider ? "default" : "secondary"}>
                {m.ministerio.nome}
                {m.is_lider && " · líder"}
              </Badge>
            ) : null,
          )}
        </div>
      )}

      <Card>
        <CardContent>
          <UsuarioForm
            id={usuario.id}
            gcs={gcs}
            podeAlterarPapel={editor.role === "ADMIN"}
            ehVoceMesmo={editor.id === usuario.id}
            ehLider={ehLider}
            valores={{
              nome_completo: usuario.nome_completo,
              celular: usuario.celular,
              data_nascimento: usuario.data_nascimento,
              genero: usuario.genero,
              gc_id: usuario.gc_id,
              ativo: usuario.ativo,
              role: usuario.role === "LIDER_MINISTERIO" ? "MEMBRO" : usuario.role,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
