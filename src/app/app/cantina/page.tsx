import { ChevronLeftIcon, ChevronRightIcon, CoffeeIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ConfirmarExclusao } from "@/components/app/confirmar-exclusao";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { requireProfile } from "@/lib/auth";
import { getGcsOpcoes, getMinisteriosOpcoes } from "@/lib/data/app";
import { hojeISO, LOCALE, TIME_ZONE } from "@/lib/format";
import { isAdminOrPastor } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { excluirCantina } from "./actions";
import { CantinaDialog } from "./cantina-dialog";

export const metadata: Metadata = { title: "Cantina" };

export default async function CantinaPage({ searchParams }: PageProps<"/app/cantina">) {
  const profile = await requireProfile();
  const gerencia = isAdminOrPastor(profile.role);
  const [gcs, ministerios] = gerencia ? await Promise.all([getGcsOpcoes(), getMinisteriosOpcoes()]) : [[], []];

  return (
    <>
      <PageHeader titulo="Cantina" descricao="Quem cuida da cantina em cada data.">
        {gerencia && <CantinaDialog gcs={gcs} ministerios={ministerios} />}
      </PageHeader>
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <Mes searchParams={searchParams} gerencia={gerencia} gcs={gcs} ministerios={ministerios} />
      </Suspense>
    </>
  );
}

/** "2026-10" ± n meses */
function somarMes(mes: string, n: number): string {
  const [ano, m] = mes.split("-").map(Number);
  const d = new Date(Date.UTC(ano, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

const nomeMes = new Intl.DateTimeFormat(LOCALE, { month: "long", year: "numeric", timeZone: "UTC" });
const diaSemana = new Intl.DateTimeFormat(LOCALE, { weekday: "short", timeZone: TIME_ZONE });

async function Mes({
  searchParams,
  gerencia,
  gcs,
  ministerios,
}: Pick<PageProps<"/app/cantina">, "searchParams"> & {
  gerencia: boolean;
  gcs: { id: string; nome: string }[];
  ministerios: { id: string; nome: string }[];
}) {
  const profile = await requireProfile();
  const hoje = hojeISO();
  const param = (await searchParams).mes;
  const mes = typeof param === "string" && /^\d{4}-\d{2}$/.test(param) ? param : hoje.slice(0, 7);
  const inicio = `${mes}-01`;
  const proximoInicio = `${somarMes(mes, 1)}-01`;

  const supabase = await createClient();
  const [{ data: datas, error }, { data: meusMinisterios }] = await Promise.all([
    supabase
      .from("koinonia_cantina_escalas")
      .select(
        "id, data, descricao, gc_id, ministerio_id, gc:koinonia_gcs(nome), ministerio:koinonia_ministerios(nome), itens:koinonia_cantina_itens(count)",
      )
      .gte("data", inicio)
      .lt("data", proximoInicio)
      .order("data"),
    supabase.from("koinonia_ministerio_membros").select("ministerio_id").eq("profile_id", profile.id),
  ]);
  if (error) throw new Error(error.message);
  const ministeriosIds = new Set(meusMinisterios?.map((m) => m.ministerio_id));

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-2">
        <Button asChild variant="outline" size="icon" aria-label="Mês anterior">
          <Link href={`/app/cantina?mes=${somarMes(mes, -1)}`}>
            <ChevronLeftIcon />
          </Link>
        </Button>
        <div className="text-center">
          <p className="font-heading text-lg font-semibold first-letter:uppercase">
            {nomeMes.format(new Date(`${inicio}T12:00:00Z`))}
          </p>
          {mes !== hoje.slice(0, 7) && (
            <Link href="/app/cantina" className="text-xs text-muted-foreground hover:underline">
              Voltar para o mês atual
            </Link>
          )}
        </div>
        <Button asChild variant="outline" size="icon" aria-label="Próximo mês">
          <Link href={`/app/cantina?mes=${somarMes(mes, 1)}`}>
            <ChevronRightIcon />
          </Link>
        </Button>
      </div>

      {datas.length === 0 ? (
        <EmptyState icone={CoffeeIcon} titulo="Nenhuma escala de cantina neste mês" />
      ) : (
        <div className="space-y-3">
          {datas.map((c) => {
            const minha =
              (c.gc_id && c.gc_id === profile.gc_id) || (c.ministerio_id && ministeriosIds.has(c.ministerio_id));
            const passada = c.data < hoje;
            const dia = new Date(`${c.data}T12:00:00Z`);
            return (
              <Card key={c.id} className={cn("py-3", minha && "border-primary", passada && "opacity-60")}>
                <CardContent className="flex items-center gap-4 px-4">
                  <div className="flex w-14 shrink-0 flex-col items-center rounded-lg bg-muted py-1.5">
                    <span className="text-xs text-muted-foreground uppercase">{diaSemana.format(dia).replace(".", "")}</span>
                    <span className="text-xl font-bold">{c.data.slice(8, 10)}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap gap-1.5">
                      {c.gc && <Badge variant="secondary">GC: {c.gc.nome}</Badge>}
                      {c.ministerio && <Badge variant="secondary">{c.ministerio.nome}</Badge>}
                      {minha && <Badge>Você está nesta escala</Badge>}
                    </div>
                    {c.descricao && <p className="mt-1 text-sm text-muted-foreground">{c.descricao}</p>}
                    <Link
                      href={`/app/cantina/${c.id}`}
                      className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                    >
                      {(c.itens[0]?.count ?? 0) > 0
                        ? `Ver cardápio (${c.itens[0].count} ${c.itens[0].count === 1 ? "item" : "itens"}) e reservar`
                        : minha && !passada
                          ? "Montar o cardápio"
                          : "Cardápio em breve"}
                      <ChevronRightIcon className="size-4" />
                    </Link>
                  </div>
                  {gerencia && (
                    <div className="flex">
                      <CantinaDialog
                        gcs={gcs}
                        ministerios={ministerios}
                        cantina={{
                          id: c.id,
                          valores: {
                            data: c.data,
                            descricao: c.descricao ?? "",
                            gc_id: c.gc_id,
                            ministerio_id: c.ministerio_id,
                          },
                        }}
                      />
                      <ConfirmarExclusao
                        somenteIcone
                        titulo="Excluir esta data da cantina?"
                        descricao="A escala da cantina deste dia será removida."
                        acao={excluirCantina.bind(null, c.id)}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
