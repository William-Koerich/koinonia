import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ProjetoForm } from "../projeto-form";

export const metadata: Metadata = { title: "Editar projeto" };

export default async function EditarProjetoPage({ params }: PageProps<"/app/conteudo/projetos/[id]">) {
  await requireRole("ADMIN", "PASTOR");
  const { id } = await params;

  const supabase = await createClient();
  const { data: projeto } = await supabase.from("koinonia_projetos").select("*").eq("id", id).maybeSingle();
  if (!projeto) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader titulo="Editar projeto" descricao={projeto.titulo} />
      <Card>
        <CardContent>
          <ProjetoForm
            id={projeto.id}
            valores={{
              titulo: projeto.titulo,
              slug: projeto.slug,
              resumo: projeto.resumo ?? "",
              descricao: projeto.descricao,
              imagem_path: projeto.imagem_path,
              status: projeto.status,
              publicado: projeto.publicado,
              ordem: String(projeto.ordem),
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
