import { ArrowRightIcon, WaypointsIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ConfirmarExclusao } from "@/components/app/confirmar-exclusao";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { requireProfile } from "@/lib/auth";
import { isAdminOrPastor } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { excluirMinisterio } from "./actions";
import { PedidoParticipacao } from "./[id]/pedido-participacao";
import { MinisterioDialog } from "./ministerio-dialog";

export const metadata: Metadata = { title: "Ministérios" };

export default async function MinisteriosPage() {
  const profile = await requireProfile();
  const gerencia = isAdminOrPastor(profile.role);

  const supabase = await createClient();
  const [{ data: ministerios, error }, { data: meusVinculos }, { data: pedidos }] = await Promise.all([
    supabase
      .from("koinonia_ministerios")
      .select("id, nome, descricao, membros:koinonia_ministerio_membros(count)")
      .order("nome"),
    supabase.from("koinonia_ministerio_membros").select("ministerio_id, is_lider").eq("profile_id", profile.id),
    // a RLS devolve os próprios pedidos e os dos ministérios que a pessoa pode decidir
    supabase.from("koinonia_ministerio_solicitacoes").select("ministerio_id, profile_id"),
  ]);
  if (error) throw new Error(error.message);
  const vinculo = new Map(meusVinculos?.map((v) => [v.ministerio_id, v.is_lider]));
  const meusPedidos = new Set(pedidos?.filter((p) => p.profile_id === profile.id).map((p) => p.ministerio_id));
  const pedidosParaDecidir = new Map<string, number>();
  for (const p of pedidos ?? []) {
    if (p.profile_id !== profile.id) {
      pedidosParaDecidir.set(p.ministerio_id, (pedidosParaDecidir.get(p.ministerio_id) ?? 0) + 1);
    }
  }

  return (
    <>
      <PageHeader titulo="Ministérios" descricao="Áreas de serviço da igreja.">
        {gerencia && <MinisterioDialog />}
      </PageHeader>

      {ministerios.length === 0 ? (
        <EmptyState icone={WaypointsIcon} titulo="Nenhum ministério cadastrado">
          {gerencia && <MinisterioDialog />}
        </EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ministerios.map((m) => (
            <Card key={m.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <CardTitle className="flex flex-wrap items-center gap-2">
                      <Link href={`/app/ministerios/${m.id}`} className="hover:underline">
                        {m.nome}
                      </Link>
                      {vinculo.get(m.id) === true && <Badge>Você lidera</Badge>}
                      {vinculo.get(m.id) === false && <Badge variant="secondary">Você participa</Badge>}
                      {!!pedidosParaDecidir.get(m.id) && (
                        <Badge className="bg-amber-500 text-white">
                          {pedidosParaDecidir.get(m.id)} {pedidosParaDecidir.get(m.id) === 1 ? "pedido" : "pedidos"}
                        </Badge>
                      )}
                    </CardTitle>
                    {/* A contagem só é completa para quem enxerga todos os vínculos */}
                    {gerencia && (
                      <CardDescription>
                        {m.membros[0]?.count ?? 0} {m.membros[0]?.count === 1 ? "membro" : "membros"}
                      </CardDescription>
                    )}
                  </div>
                  {gerencia && (
                    <div className="-mt-1 -mr-2 flex">
                      <MinisterioDialog ministerio={m} />
                      <ConfirmarExclusao
                        somenteIcone
                        titulo={`Excluir "${m.nome}"?`}
                        descricao="Os vínculos de membros com este ministério também serão removidos. Esta ação não pode ser desfeita."
                        acao={excluirMinisterio.bind(null, m.id)}
                      />
                    </div>
                  )}
                </div>
              </CardHeader>
              {m.descricao && (
                <CardContent className="text-sm text-muted-foreground">{m.descricao}</CardContent>
              )}
              <CardFooter className="mt-auto flex-wrap justify-between gap-2">
                {/* quem ainda não participa pode pedir direto do card */}
                {vinculo.has(m.id) ? (
                  <span />
                ) : (
                  <PedidoParticipacao ministerioId={m.id} meuId={profile.id} pendente={meusPedidos.has(m.id)} compacto />
                )}
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/app/ministerios/${m.id}`}>
                    Ver ministério <ArrowRightIcon />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
