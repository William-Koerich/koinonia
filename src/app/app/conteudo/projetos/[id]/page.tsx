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
  const { data: projeto } = await supabase
    .from("koinonia_projetos")
    .select("*, galeria:koinonia_projeto_imagens(path, ordem)")
    .eq("id", id)
    .maybeSingle();
  if (!projeto) notFound();

  const imagens = [...projeto.galeria].sort((a, b) => a.ordem - b.ordem).map((g) => g.path);
  // capa antiga fora da galeria (dado legado) cai na primeira imagem
  const capa = projeto.imagem_path && imagens.includes(projeto.imagem_path) ? projeto.imagem_path : (imagens[0] ?? null);

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
              imagens,
              capa,
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
