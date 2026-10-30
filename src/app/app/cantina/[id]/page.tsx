import { ArrowLeftIcon, CheckCircle2Icon, HandCoinsIcon, HomeIcon, PlusIcon, UtensilsCrossedIcon, UtensilsIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ConfirmarExclusao } from "@/components/app/confirmar-exclusao";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { formatarDataLonga, formatarHora, formatarMoeda, formatarMoedaInput, hojeISO } from "@/lib/format";
import { ROLES_FINANCEIRO } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { FORMAS_CANTINA, type FormaCantina } from "@/lib/validation/cantina";
import { desfazerVenda, excluirItem, removerReserva } from "./actions";
import { ItemDialog } from "./item-dialog";
import { ReceberDialog, type ItemVenda } from "./receber-dialog";
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
  const [{ data: cantina }, { data: itens, error }, { data: disponibilidade }, { data: equipe }, { data: podeVender }] = await Promise.all([
    supabase
      .from("koinonia_cantina_escalas")
      .select("id, data, descricao, gc:koinonia_gcs(nome), ministerio:koinonia_ministerios(nome)")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("koinonia_cantina_itens").select("*").eq("cantina_id", id).order("ordem").order("created_at"),
    supabase.rpc("koinonia_cantina_disponibilidade", { p_cantina_id: id }),
    supabase.rpc("koinonia_is_equipe_cantina", { p_cantina_id: id }),
    supabase.rpc("koinonia_cantina_pode_vender", { p_cantina_id: id }),
  ]);
  if (!cantina) notFound();
  if (error) throw new Error(error.message);

  const itemIds = itens.map((i) => i.id);
  const { data: minhas } = itemIds.length
    ? await supabase
        .from("koinonia_cantina_reservas")
        .select("item_id, quantidade, modo, observacao, venda:koinonia_cantina_vendas(id)")
        .eq("profile_id", profile.id)
        .in("item_id", itemIds)
    : { data: [] };

  // ocupado = reservado + vendido no balcão
  const ocupado = new Map(disponibilidade?.map((d) => [d.item_id, Number(d.reservado) + Number(d.vendido)]));
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
            const total = ocupado.get(item.id) ?? 0;
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
                            descricao={total > 0 ? `Há ${total} unidade(s) reservada(s) ou vendida(s): as reservas também serão apagadas.` : "O item sai do cardápio."}
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
                    minha={minha && { quantidade: minha.quantidade, modo: minha.modo, observacao: minha.observacao, paga: !!minha.venda }}
                    restante={restante}
                    encerrado={encerrado}
                  />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {(equipe || ROLES_FINANCEIRO.includes(profile.role)) && itens.length > 0 && (
        <Reservas
          cantinaId={cantina.id}
          podeVender={!!podeVender}
          itens={itens.map((i) => {
            const preco = i.preco === null ? null : Number(i.preco);
            const restante = i.quantidade_disponivel === null ? null : Math.max(i.quantidade_disponivel - (ocupado.get(i.id) ?? 0), 0);
            return { id: i.id, nome: i.nome, preco, restante };
          })}
        />
      )}
    </>
  );
}

const ROTULO_FORMA = Object.fromEntries(FORMAS_CANTINA.map((f) => [f.value, f.label])) as Record<FormaCantina, string>;

/**
 * Painel da equipe (e da tesouraria): totais por item (para preparar), lista de
 * reservas (para entregar e receber), vendas no balcão e o caixa do dia.
 */
async function Reservas({ cantinaId, itens, podeVender }: { cantinaId: string; itens: ItemVenda[]; podeVender: boolean }) {
  const supabase = await createClient();
  const [{ data: reservas, error }, { data: vendas, error: erroVendas }] = await Promise.all([
    supabase
      .from("koinonia_cantina_reservas")
      .select(
        "id, item_id, quantidade, modo, observacao, created_at, pessoa:koinonia_perfis_basicos!koinonia_cantina_reservas_profile_id_fkey(nome_completo)",
      )
      .in(
        "item_id",
        itens.map((i) => i.id),
      ),
    supabase
      .from("koinonia_cantina_vendas")
      .select("id, item_id, reserva_id, quantidade, valor, forma, created_at")
      .eq("cantina_id", cantinaId)
      .order("created_at", { ascending: false }),
  ]);
  if (error) throw new Error(error.message);
  if (erroVendas) throw new Error(erroVendas.message);

  const itemPorId = new Map(itens.map((i) => [i.id, i]));
  const vendaDaReserva = new Map(vendas.filter((v) => v.reserva_id).map((v) => [v.reserva_id, v]));
  const balcao = vendas.filter((v) => !v.reserva_id);

  const resumo = itens.map((item) => {
    const doItem = reservas.filter((r) => r.item_id === item.id);
    const soma = (modo?: "levar" | "comer_aqui") =>
      doItem.filter((r) => !modo || r.modo === modo).reduce((t, r) => t + r.quantidade, 0);
    const vendidoBalcao = balcao.filter((v) => v.item_id === item.id).reduce((t, v) => t + v.quantidade, 0);
    return { ...item, total: soma(), aqui: soma("comer_aqui"), levar: soma("levar"), balcao: vendidoBalcao };
  });

  const recebido = FORMAS_CANTINA.map((f) => ({
    ...f,
    valor: vendas.filter((v) => v.forma === f.value).reduce((t, v) => t + Number(v.valor), 0),
  }));
  const totalRecebido = recebido.reduce((t, f) => t + f.valor, 0);
  const aReceber = reservas
    .filter((r) => !vendaDaReserva.has(r.id))
    .reduce((t, r) => t + (itemPorId.get(r.item_id)?.preco ?? 0) * r.quantidade, 0);

  const ordenadas = [...reservas].sort((a, b) =>
    (a.pessoa?.nome_completo ?? "").localeCompare(b.pessoa?.nome_completo ?? "", "pt-BR"),
  );

  const desfazer = (vendaId: string, descricao: string) =>
    podeVender && (
      <ConfirmarExclusao
        somenteIcone
        rotulo="Desfazer"
        titulo="Desfazer esta venda?"
        descricao={`${descricao}. O valor sai da entrada da cantina no financeiro.`}
        acao={desfazerVenda.bind(null, cantinaId, vendaId)}
      />
    );

  return (
    <section className="mt-10 space-y-8">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-heading text-xl font-semibold">Caixa</h2>
          {podeVender && (
            <ReceberDialog cantinaId={cantinaId} itens={itens}>
              <Button>
                <PlusIcon /> Venda no balcão
              </Button>
            </ReceberDialog>
          )}
        </div>
        <dl className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {[
            ...recebido.map((f) => ({ rotulo: f.label, valor: f.valor, destaque: false })),
            { rotulo: "Total recebido", valor: totalRecebido, destaque: true },
            { rotulo: "Reservas a receber", valor: aReceber, destaque: false },
          ].map((c) => (
            <div key={c.rotulo} className={cn("rounded-lg p-3", c.destaque ? "bg-primary/10" : "bg-muted/60")}>
              <dt className="text-xs text-muted-foreground">{c.rotulo}</dt>
              <dd className="mt-1 text-lg font-semibold tabular-nums">{formatarMoeda(c.valor)}</dd>
            </div>
          ))}
        </dl>
        <p className="text-xs text-muted-foreground">
          Cada venda entra sozinha no financeiro: uma entrada por forma de pagamento, com a data da cantina. Dinheiro vai para
          o caixa; PIX e cartão, para a conta principal.
          {!podeVender && " A equipe registra vendas até 7 dias depois da data; depois disso, só a tesouraria."}
        </p>
      </div>

      <div className="space-y-4">
        <h2 className="font-heading text-xl font-semibold">Para preparar</h2>
        <div className="overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead className="text-right">Comer na igreja</TableHead>
                <TableHead className="text-right">Levar</TableHead>
                <TableHead className="text-right">Reservado</TableHead>
                <TableHead className="text-right">Vendido no balcão</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {resumo.map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="font-medium">{i.nome}</TableCell>
                  <TableCell className="text-right tabular-nums">{i.aqui}</TableCell>
                  <TableCell className="text-right tabular-nums">{i.levar}</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">{i.total}</TableCell>
                  <TableCell className="text-right tabular-nums">{i.balcao}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="font-heading text-xl font-semibold">Reservas</h2>
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
                  <TableHead>Pagamento</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {ordenadas.map((r) => {
                  const Icone = MODO[r.modo].icone;
                  const nome = r.pessoa?.nome_completo ?? "Usuário";
                  const item = itemPorId.get(r.item_id);
                  const venda = vendaDaReserva.get(r.id);
                  const descricao = `${nome} · ${r.quantidade}× ${item?.nome ?? "item"}`;
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="align-top">
                        <p className="font-medium">{nome}</p>
                        {r.observacao && <p className="text-xs text-muted-foreground italic">“{r.observacao}”</p>}
                      </TableCell>
                      <TableCell className="align-top">{item?.nome}</TableCell>
                      <TableCell className="text-right align-top font-semibold tabular-nums">{r.quantidade}</TableCell>
                      <TableCell className="align-top">
                        <span className="inline-flex items-center gap-1.5 text-sm">
                          <Icone className="size-4 text-muted-foreground" /> {MODO[r.modo].rotulo}
                        </span>
                      </TableCell>
                      <TableCell className="align-top">
                        {venda ? (
                          <div className="flex items-center gap-1">
                            <span className="inline-flex items-center gap-1.5 text-sm">
                              <CheckCircle2Icon className="size-4 text-emerald-600" />
                              {formatarMoeda(Number(venda.valor))} · {ROTULO_FORMA[venda.forma as FormaCantina]}
                            </span>
                            {desfazer(venda.id, `Pagamento de ${descricao}`)}
                          </div>
                        ) : podeVender ? (
                          <ReceberDialog
                            cantinaId={cantinaId}
                            reserva={{
                              id: r.id,
                              descricao,
                              valorSugerido: item?.preco === null || !item ? null : item.preco * r.quantidade,
                            }}
                          >
                            <Button size="sm" variant="outline">
                              <HandCoinsIcon /> Receber
                            </Button>
                          </ReceberDialog>
                        ) : (
                          <span className="text-sm text-muted-foreground">A receber</span>
                        )}
                      </TableCell>
                      <TableCell className="align-top">
                        {!venda && (
                          <ConfirmarExclusao
                            somenteIcone
                            rotulo="Remover"
                            titulo={`Remover a reserva de ${nome}?`}
                            descricao="A reserva sai da lista e a quantidade volta a ficar disponível."
                            acao={removerReserva.bind(null, cantinaId, r.id)}
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <h2 className="font-heading text-xl font-semibold">Vendas no balcão</h2>
        {balcao.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma venda no balcão registrada.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hora</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Qtd.</TableHead>
                  <TableHead>Forma</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {balcao.map((v) => {
                  const nomeItem = itemPorId.get(v.item_id)?.nome ?? "Item";
                  return (
                    <TableRow key={v.id}>
                      <TableCell className="tabular-nums">{formatarHora(v.created_at)}</TableCell>
                      <TableCell className="font-medium">{nomeItem}</TableCell>
                      <TableCell className="text-right tabular-nums">{v.quantidade}</TableCell>
                      <TableCell>{ROTULO_FORMA[v.forma as FormaCantina]}</TableCell>
                      <TableCell className="text-right font-medium tabular-nums">{formatarMoeda(Number(v.valor))}</TableCell>
                      <TableCell>{desfazer(v.id, `${v.quantidade}× ${nomeItem} por ${formatarMoeda(Number(v.valor))}`)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </section>
  );
}
