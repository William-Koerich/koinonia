import { CalendarClockIcon, MapPinIcon, PencilIcon, PlusIcon, UserIcon, UsersRoundIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ConfirmarExclusao } from "@/components/app/confirmar-exclusao";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { requireProfile } from "@/lib/auth";
import { descreverEncontro } from "@/lib/constants";
import { isAdminOrPastor } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { excluirGc } from "./actions";
import { ParticiparButton } from "./participar-button";

export const metadata: Metadata = { title: "GCs" };

export default async function GcsPage() {
  const profile = await requireProfile();
  const gerencia = isAdminOrPastor(profile.role);

  const supabase = await createClient();
  const [{ data: gcs, error }, { data: membros }] = await Promise.all([
    supabase
      .from("koinonia_gcs")
      .select("*, lider:koinonia_perfis_basicos!koinonia_gcs_lider_id_fkey(nome_completo)")
      .order("nome"),
    // a view mostra o GC de cada pessoa ativa a qualquer usuário logado
    supabase.from("koinonia_perfis_basicos").select("gc_id").not("gc_id", "is", null),
  ]);
  if (error) throw new Error(error.message);

  const totalPorGc = new Map<string, number>();
  for (const m of membros ?? []) {
    if (m.gc_id) totalPorGc.set(m.gc_id, (totalPorGc.get(m.gc_id) ?? 0) + 1);
  }

  return (
    <>
      <PageHeader titulo="Grupos Caseiros" descricao="Encontre um GC perto de você e participe.">
        {gerencia && (
          <Button asChild>
            <Link href="/app/gcs/novo">
              <PlusIcon /> Novo GC
            </Link>
          </Button>
        )}
      </PageHeader>

      {gcs.length === 0 ? (
        <EmptyState icone={UsersRoundIcon} titulo="Nenhum GC cadastrado" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {gcs.map((gc) => {
            const meuGc = profile.gc_id === gc.id;
            const total = totalPorGc.get(gc.id) ?? 0;
            const encontro = descreverEncontro(gc.dia_semana, gc.horario);
            return (
              <Card key={gc.id} className={meuGc ? "border-primary" : undefined}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle>
                      <Link href={`/app/gcs/${gc.id}`} className="hover:underline">
                        {gc.nome}
                      </Link>
                    </CardTitle>
                    {meuGc && <Badge>Meu GC</Badge>}
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {encontro && (
                    <p className="flex gap-2">
                      <CalendarClockIcon className="size-4 shrink-0 text-muted-foreground" /> {encontro}
                    </p>
                  )}
                  <p className="flex gap-2 text-muted-foreground">
                    <MapPinIcon className="size-4 shrink-0" />
                    {gc.bairro} — {gc.cidade}/{gc.uf}
                  </p>
                  <p className="flex gap-2 text-muted-foreground">
                    <UserIcon className="size-4 shrink-0" />
                    {gc.lider?.nome_completo ? `Líder: ${gc.lider.nome_completo}` : "Sem líder definido"}
                  </p>
                  <p className="flex gap-2 text-muted-foreground">
                    <UsersRoundIcon className="size-4 shrink-0" />
                    {total} {total === 1 ? "participante" : "participantes"}
                  </p>
                </CardContent>
                <CardFooter className="justify-between gap-2">
                  <ParticiparButton gcId={gc.id} participa={meuGc} />
                  {gerencia && (
                    <div className="flex">
                      <Button asChild variant="ghost" size="icon" aria-label={`Editar ${gc.nome}`}>
                        <Link href={`/app/gcs/${gc.id}/editar`}>
                          <PencilIcon />
                        </Link>
                      </Button>
                      <ConfirmarExclusao
                        somenteIcone
                        titulo={`Excluir "${gc.nome}"?`}
                        descricao="Os participantes deste GC ficarão sem GC. Esta ação não pode ser desfeita."
                        acao={excluirGc.bind(null, gc.id)}
                      />
                    </div>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
