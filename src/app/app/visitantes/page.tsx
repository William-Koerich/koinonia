import { MessageCircleIcon, UserRoundSearchIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ConfirmarExclusao } from "@/components/app/confirmar-exclusao";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { formatarCelular, formatarData, hojeISO } from "@/lib/format";
import { cn } from "@/lib/utils";
import { SITUACOES_VISITANTE, type SituacaoVisitante } from "@/lib/validation/visitante";
import { createClient } from "@/lib/supabase/server";
import { acessoVisitantes } from "@/lib/visitantes";
import { excluirVisitante } from "./actions";
import { Busca } from "./busca";
import { SituacaoBadge } from "./situacao-badge";
import { VisitanteDialog } from "./visitante-dialog";
import { linkWhatsApp } from "./whatsapp";

export const metadata: Metadata = { title: "Visitantes" };

export default async function VisitantesPage({ searchParams }: PageProps<"/app/visitantes">) {
  return (
    <Suspense fallback={<Skeleton className="h-64" />}>
      <Lista searchParams={searchParams} />
    </Suspense>
  );
}

async function Lista({ searchParams }: Pick<PageProps<"/app/visitantes">, "searchParams">) {
  const profile = await requireProfile();
  const acesso = await acessoVisitantes(profile);
  if (!acesso) redirect("/app");
  const porta = acesso === "porta";
  const acompanha = acesso === "acompanha";
  const params = await searchParams;
  // filtro: uma situação ou "sem responsável" (só para ADMIN/PASTOR)
  const filtro =
    acesso === "total" && (params.situacao === "sem_responsavel" || SITUACOES_VISITANTE.some((s) => s.value === params.situacao))
      ? (params.situacao as SituacaoVisitante | "sem_responsavel")
      : null;
  const q = typeof params.q === "string" ? params.q.replace(/[,()%*\\]/g, " ").trim() : "";
  const hoje = hojeISO();

  const supabase = await createClient();
  let query = supabase
    .from("koinonia_visitantes")
    .select(
      "id, nome, celular, data_visita, motivo, created_by, situacao, responsavel_id, responsavel:koinonia_perfis_basicos!koinonia_visitantes_responsavel_id_fkey(nome_completo)",
    )
    .order("data_visita", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(300);
  if (q) {
    const digitos = q.replace(/\D/g, "");
    query = query.or([`nome.ilike.%${q}%`, digitos.length >= 3 ? `celular.like.%${digitos}%` : null].filter(Boolean).join(","));
  }
  if (filtro === "sem_responsavel") query = query.is("responsavel_id", null).not("situacao", "in", "(membro,sem_interesse)");
  else if (filtro) query = query.eq("situacao", filtro);
  const { data: visitantes, error } = await query;
  if (error) throw new Error(error.message);

  const doMes = visitantes.filter((v) => v.data_visita.slice(0, 7) === hoje.slice(0, 7)).length;
  // a equipe da porta (a RLS já mostra só os de hoje) edita só o que ela mesma cadastrou
  const podeEditar = (v: { created_by: string | null }) => !porta || v.created_by === profile.id;
  const descricao = porta
    ? `Você está na Porta Principal hoje. ${visitantes.length} ${visitantes.length === 1 ? "visitante cadastrado" : "visitantes cadastrados"} hoje.`
    : acompanha
      ? "Visitantes que você acompanha. Abra cada um para registrar os contatos."
      : q || filtro
      ? `${visitantes.length} encontrado(s)`
      : `${doMes} ${doMes === 1 ? "visitante" : "visitantes"} neste mês`;

  return (
    <>
      <PageHeader titulo={porta ? "Visitantes de hoje" : acompanha ? "Meus visitantes" : "Visitantes"} descricao={descricao}>
        {!acompanha && <VisitanteDialog hoje={hoje} dataFixa={porta} />}
      </PageHeader>

      {acesso === "total" && (
        <>
          <Busca />
          <div className="mb-4 flex flex-wrap gap-2">
            {[
              { valor: null, rotulo: "Todos" },
              { valor: "sem_responsavel", rotulo: "Sem responsável" },
              ...SITUACOES_VISITANTE.map((s) => ({ valor: s.value, rotulo: s.label })),
            ].map((f) => (
              <Button key={f.rotulo} asChild size="sm" variant={filtro === f.valor ? "default" : "outline"}>
                <Link href={f.valor ? `/app/visitantes?situacao=${f.valor}` : "/app/visitantes"}>{f.rotulo}</Link>
              </Button>
            ))}
          </div>
        </>
      )}

      {visitantes.length === 0 ? (
        <EmptyState
          icone={UserRoundSearchIcon}
          titulo={q || filtro ? "Ninguém encontrado" : porta ? "Nenhum visitante cadastrado hoje" : "Nenhum visitante cadastrado"}
          descricao={q || filtro ? undefined : "Cadastre quem visitou a igreja para não perder o contato."}
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Visita</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead className="hidden md:table-cell">Acompanhamento</TableHead>
                <TableHead className="w-28" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {visitantes.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="align-top whitespace-nowrap tabular-nums">{formatarData(v.data_visita)}</TableCell>
                  <TableCell className="align-top">
                    {porta ? (
                      <p className="font-medium">{v.nome}</p>
                    ) : (
                      <Link href={`/app/visitantes/${v.id}`} className="font-medium hover:underline">
                        {v.nome}
                      </Link>
                    )}
                    <SituacaoBadge situacao={v.situacao} className="mt-1 md:hidden" />
                    {v.motivo && <p className="max-w-md text-xs whitespace-pre-line text-muted-foreground">{v.motivo}</p>}
                  </TableCell>
                  <TableCell className="align-top whitespace-nowrap tabular-nums">{formatarCelular(v.celular)}</TableCell>
                  <TableCell className="hidden align-top md:table-cell">
                    <SituacaoBadge situacao={v.situacao} />
                    <p className={cn("mt-1 text-xs", v.responsavel ? "text-muted-foreground" : "text-amber-700")}>
                      {v.responsavel?.nome_completo ?? (["membro", "sem_interesse"].includes(v.situacao) ? "" : "Sem responsável")}
                    </p>
                  </TableCell>
                  <TableCell className="align-top">
                    <div className="flex justify-end">
                      <Button asChild variant="ghost" size="icon" aria-label={`Chamar ${v.nome} no WhatsApp`}>
                        <a href={linkWhatsApp(v.celular, v.nome)} target="_blank" rel="noopener noreferrer">
                          <MessageCircleIcon />
                        </a>
                      </Button>
                      {!acompanha && podeEditar(v) && (
                        <>
                          <VisitanteDialog
                            hoje={hoje}
                            dataFixa={porta}
                            visitante={{
                              id: v.id,
                              valores: { nome: v.nome, celular: v.celular, data_visita: v.data_visita, motivo: v.motivo ?? "" },
                            }}
                          />
                          <ConfirmarExclusao
                            somenteIcone
                            titulo={`Excluir ${v.nome}?`}
                            descricao="O cadastro do visitante será apagado."
                            acao={excluirVisitante.bind(null, v.id)}
                          />
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}
