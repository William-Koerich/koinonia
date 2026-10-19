import { ArrowLeftIcon, HomeIcon, UtensilsCrossedIcon, UtensilsIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ConfirmarExclusao } from "@/components/app/confirmar-exclusao";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireProfile } from "@/lib/auth";
import { formatarDataLonga, formatarMoeda, formatarMoedaInput, hojeISO } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { excluirItem, removerReserva } from "./actions";
import { ItemDialog } from "./item-dialog";
import { ReservarItem } from "./reservar-item";

export const metadata: Metadata = { title: "Cardápio da cantina" };

const MODO = {
  comer_aqui: { rotulo: "Comer na igreja", icone: UtensilsIcon },
  levar: { rotulo: "Levar", icone: HomeIcon },
} as const;

export default async function CantinaDiaPage({ params }: PageProps<"/app/cantina/[id]">) {
  const profile = await requireProfile();
  const { id } = await params;

  const supabase = await createClient();
  const [{ data: cantina }, { data: itens, error }, { data: disponibilidade }, { data: equipe }] = await Promise.all([
    supabase
      .from("koinonia_cantina_escalas")
      .select("id, data, descricao, gc:koinonia_gcs(nome), ministerio:koinonia_ministerios(nome)")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("koinonia_cantina_itens").select("*").eq("cantina_id", id).order("ordem").order("created_at"),
    supabase.rpc("koinonia_cantina_disponibilidade", { p_cantina_id: id }),
    supabase.rpc("koinonia_is_equipe_cantina", { p_cantina_id: id }),
  ]);
  if (!cantina) notFound();
  if (error) throw new Error(error.message);

  const itemIds = itens.map((i) => i.id);
  const { data: minhas } = itemIds.length
    ? await supabase
        .from("koinonia_cantina_reservas")
        .select("item_id, quantidade, modo, observacao")
        .eq("profile_id", profile.id)
        .in("item_id", itemIds)
    : { data: [] };

  const reservado = new Map(disponibilidade?.map((d) => [d.item_id, Number(d.reservado)]));
  const minhaPorItem = new Map(minhas?.map((m) => [m.item_id, m]));
  const encerrado = cantina.data < hojeISO();
  const responsaveis = [cantina.gc && `GC ${cantina.gc.nome}`, cantina.ministerio?.nome].filter(Boolean).join(" + ");

  return (
    <>
      <Link href="/app/cantina" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeftIcon className="size-4" /> Cantina
      </Link>
      <PageHeader
        titulo={`Cantina — ${formatarDataLonga(cantina.data)}`}
        descricao={[responsaveis && `Equipe: ${responsaveis}`, cantina.descricao].filter(Boolean).join(" · ")}
      >
        {equipe && !encerrado && <ItemDialog cantinaId={cantina.id} />}
      </PageHeader>

      {encerrado && <p className="mb-4 text-sm text-muted-foreground">Esta cantina já passou: as reservas estão encerradas.</p>}

      {itens.length === 0 ? (
        <EmptyState
          icone={UtensilsCrossedIcon}
          titulo="Cardápio ainda não publicado"
          descricao={equipe ? "Adicione os itens para os membros poderem reservar." : "Volte mais perto da data para reservar."}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {itens.map((item) => {
            const total = reservado.get(item.id) ?? 0;
            const restante = item.quantidade_disponivel === null ? null : Math.max(item.quantidade_disponivel - total, 0);
            const minha = minhaPorItem.get(item.id) ?? null;
            return (
              <Card key={item.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <CardTitle className="text-lg">{item.nome}</CardTitle>
                      {item.descricao && <p className="mt-1 text-sm text-muted-foreground">{item.descricao}</p>}
                    </div>
                    <div className="flex shrink-0 items-start gap-1">
                      {item.preco !== null && <Badge variant="secondary">{formatarMoeda(Number(item.preco))}</Badge>}
                      {equipe && !encerrado && (
                        <>
                          <ItemDialog
                            cantinaId={cantina.id}
                            item={{
                              id: item.id,
                              valores: {
                                nome: item.nome,
                                descricao: item.descricao ?? "",
                                preco: item.preco === null ? "" : formatarMoedaInput(Number(item.preco).toFixed(2)),
                                quantidade_disponivel: item.quantidade_disponivel === null ? "" : String(item.quantidade_disponivel),
                              },
                            }}
                          />
                          <ConfirmarExclusao
                            somenteIcone
                            titulo={`Remover "${item.nome}" do cardápio?`}
                            descricao={total > 0 ? `Há ${total} unidade(s) reservada(s): essas reservas também serão apagadas.` : "O item sai do cardápio."}
                            acao={excluirItem.bind(null, cantina.id, item.id)}
                          />
                        </>
                      )}
                    </div>
                  </div>
                  {restante !== null && (
                    <p className="text-xs text-muted-foreground">
                      {restante > 0 ? `Restam ${restante} de ${item.quantidade_disponivel}` : "Esgotado"}
                    </p>
                  )}
                </CardHeader>
                <CardContent>
                  <ReservarItem
                    cantinaId={cantina.id}
                    itemId={item.id}
                    minha={minha}
                    restante={restante}
                    encerrado={encerrado}
                  />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {equipe && itens.length > 0 && (
        <Reservas cantinaId={cantina.id} itens={itens.map((i) => ({ id: i.id, nome: i.nome, preco: i.preco === null ? null : Number(i.preco) }))} />
      )}
    </>
  );
}

/** Painel da equipe: totais por item (para preparar) e lista de reservas (para entregar) */
async function Reservas({ cantinaId, itens }: { cantinaId: string; itens: { id: string; nome: string; preco: number | null }[] }) {
  const supabase = await createClient();
  const { data: reservas, error } = await supabase
    .from("koinonia_cantina_reservas")
    .select(
      "id, item_id, quantidade, modo, observacao, created_at, pessoa:koinonia_perfis_basicos!koinonia_cantina_reservas_profile_id_fkey(nome_completo)",
    )
    .in(
      "item_id",
      itens.map((i) => i.id),
    );
  if (error) throw new Error(error.message);

  const itemPorId = new Map(itens.map((i) => [i.id, i]));
  const resumo = itens.map((item) => {
    const doItem = reservas.filter((r) => r.item_id === item.id);
    const soma = (modo?: "levar" | "comer_aqui") =>
      doItem.filter((r) => !modo || r.modo === modo).reduce((t, r) => t + r.quantidade, 0);
    return { ...item, total: soma(), aqui: soma("comer_aqui"), levar: soma("levar") };
  });
  const valorTotal = resumo.reduce((t, i) => t + (i.preco ?? 0) * i.total, 0);

  const ordenadas = [...reservas].sort((a, b) =>
    (a.pessoa?.nome_completo ?? "").localeCompare(b.pessoa?.nome_completo ?? "", "pt-BR"),
  );

  return (
    <section className="mt-10 space-y-4">
      <h2 className="font-heading text-xl font-semibold">Reservas</h2>

      <div className="overflow-x-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead className="text-right">Comer na igreja</TableHead>
              <TableHead className="text-right">Levar</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {resumo.map((i) => (
              <TableRow key={i.id}>
                <TableCell className="font-medium">{i.nome}</TableCell>
                <TableCell className="text-right tabular-nums">{i.aqui}</TableCell>
                <TableCell className="text-right tabular-nums">{i.levar}</TableCell>
                <TableCell className="text-right font-semibold tabular-nums">{i.total}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {valorTotal > 0 && (
        <p className="text-sm text-muted-foreground">
          Valor previsto das reservas: <strong className="text-foreground">{formatarMoeda(valorTotal)}</strong>
        </p>
      )}

      {ordenadas.length === 0 ? (
        <EmptyState icone={UtensilsCrossedIcon} titulo="Nenhuma reserva ainda" />
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pessoa</TableHead>
                <TableHead>Item</TableHead>
                <TableHead className="text-right">Qtd.</TableHead>
                <TableHead>Como</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {ordenadas.map((r) => {
                const Icone = MODO[r.modo].icone;
                const nome = r.pessoa?.nome_completo ?? "Usuário";
                return (
                  <TableRow key={r.id}>
                    <TableCell className="align-top">
                      <p className="font-medium">{nome}</p>
                      {r.observacao && <p className="text-xs text-muted-foreground italic">“{r.observacao}”</p>}
                    </TableCell>
                    <TableCell className="align-top">{itemPorId.get(r.item_id)?.nome}</TableCell>
                    <TableCell className="text-right align-top font-semibold tabular-nums">{r.quantidade}</TableCell>
                    <TableCell className="align-top">
                      <span className="inline-flex items-center gap-1.5 text-sm">
                        <Icone className="size-4 text-muted-foreground" /> {MODO[r.modo].rotulo}
                      </span>
                    </TableCell>
                    <TableCell className="align-top">
                      <ConfirmarExclusao
                        somenteIcone
                        rotulo="Remover"
                        titulo={`Remover a reserva de ${nome}?`}
                        descricao="A reserva sai da lista e a quantidade volta a ficar disponível."
                        acao={removerReserva.bind(null, cantinaId, r.id)}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}
