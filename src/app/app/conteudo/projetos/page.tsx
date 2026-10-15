import { ExternalLinkIcon, FolderKanbanIcon, PencilIcon, PlusIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ConfirmarExclusao } from "@/components/app/confirmar-exclusao";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { ProjetoStatus } from "@/components/site/projeto-status";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { excluirProjeto } from "../actions";

export const metadata: Metadata = { title: "Projetos (site)" };

export default async function ProjetosConteudoPage() {
  await requireRole("ADMIN", "PASTOR");
  const supabase = await createClient();
  const { data: projetos, error } = await supabase
    .from("koinonia_projetos")
    .select("id, slug, titulo, status, publicado")
    .order("ordem")
    .order("titulo");
  if (error) throw new Error(error.message);

  return (
    <>
      <PageHeader titulo="Projetos" descricao="Exibidos na página Projetos do site.">
        <Button asChild>
          <Link href="/app/conteudo/projetos/novo">
            <PlusIcon /> Novo projeto
          </Link>
        </Button>
      </PageHeader>

      {projetos.length === 0 ? (
        <EmptyState icone={FolderKanbanIcon} titulo="Nenhum projeto cadastrado" />
      ) : (
        <div className="grid gap-3">
          {projetos.map((p) => (
            <Card key={p.id} className="py-3">
              <CardContent className="flex flex-wrap items-center gap-3 px-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{p.titulo}</p>
                  <p className="truncate text-xs text-muted-foreground">/projetos/{p.slug}</p>
                </div>
                <ProjetoStatus status={p.status} />
                {!p.publicado && <Badge variant="secondary">Rascunho</Badge>}
                <div className="flex">
                  {p.publicado && (
                    <Button asChild variant="ghost" size="icon" aria-label="Ver no site">
                      <Link href={`/projetos/${p.slug}`} target="_blank">
                        <ExternalLinkIcon />
                      </Link>
                    </Button>
                  )}
                  <Button asChild variant="ghost" size="icon" aria-label={`Editar ${p.titulo}`}>
                    <Link href={`/app/conteudo/projetos/${p.id}`}>
                      <PencilIcon />
                    </Link>
                  </Button>
                  <ConfirmarExclusao
                    somenteIcone
                    titulo={`Excluir "${p.titulo}"?`}
                    descricao="O projeto e a imagem saem do site. Para só esconder, edite e desmarque “Publicado”."
                    acao={excluirProjeto.bind(null, p.id)}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
