import { PencilIcon, PlusIcon, UserRoundIcon } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ConfirmarExclusao } from "@/components/app/confirmar-exclusao";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { urlDoStorage } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import { excluirPastor } from "../actions";

export const metadata: Metadata = { title: "Pastores (site)" };

export default async function PastoresConteudoPage() {
  await requireRole("ADMIN", "PASTOR");
  const supabase = await createClient();
  const { data: pastores, error } = await supabase
    .from("koinonia_pastores")
    .select("id, nome, cargo, foto_path, ativo, ordem")
    .order("ordem")
    .order("nome");
  if (error) throw new Error(error.message);

  return (
    <>
      <PageHeader titulo="Pastores" descricao="Exibidos na página Pastores do site, na ordem definida.">
        <Button asChild>
          <Link href="/app/conteudo/pastores/novo">
            <PlusIcon /> Novo pastor
          </Link>
        </Button>
      </PageHeader>

      {pastores.length === 0 ? (
        <EmptyState icone={UserRoundIcon} titulo="Nenhum pastor cadastrado" />
      ) : (
        <div className="grid gap-3">
          {pastores.map((p) => {
            const foto = urlDoStorage(p.foto_path);
            return (
              <Card key={p.id} className="py-3">
                <CardContent className="flex items-center gap-4 px-3">
                  <div className="relative size-14 shrink-0 overflow-hidden rounded-full bg-muted">
                    {foto && <Image src={foto} alt="" fill sizes="56px" className="object-cover" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{p.nome}</p>
                    <p className="truncate text-sm text-muted-foreground">{p.cargo}</p>
                  </div>
                  {!p.ativo && <Badge variant="secondary">Oculto</Badge>}
                  <div className="flex">
                    <Button asChild variant="ghost" size="icon" aria-label={`Editar ${p.nome}`}>
                      <Link href={`/app/conteudo/pastores/${p.id}`}>
                        <PencilIcon />
                      </Link>
                    </Button>
                    <ConfirmarExclusao
                      somenteIcone
                      titulo={`Remover ${p.nome}?`}
                      descricao="O pastor e a foto saem do site. Para só esconder temporariamente, edite e desmarque “Exibir no site”."
                      acao={excluirPastor.bind(null, p.id)}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
