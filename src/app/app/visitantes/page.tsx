import { MessageCircleIcon, UserRoundSearchIcon } from "lucide-react";
import type { Metadata } from "next";
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
import { createClient } from "@/lib/supabase/server";
import { acessoVisitantes } from "@/lib/visitantes";
import { excluirVisitante } from "./actions";
import { Busca } from "./busca";
import { VisitanteDialog } from "./visitante-dialog";

export const metadata: Metadata = { title: "Visitantes" };

export default async function VisitantesPage({ searchParams }: PageProps<"/app/visitantes">) {
  return (
    <Suspense fallback={<Skeleton className="h-64" />}>
      <Lista searchParams={searchParams} />
    </Suspense>
  );
}

/** Link do WhatsApp com uma mensagem de boas-vindas já escrita */
function linkWhatsApp(celular: string, nome: string) {
  const texto = `Olá, ${nome.split(" ")[0]}! Aqui é da Igreja Koinonia. Foi muito bom ter você com a gente!`;
  return `https://wa.me/55${celular}?text=${encodeURIComponent(texto)}`;
}

async function Lista({ searchParams }: Pick<PageProps<"/app/visitantes">, "searchParams">) {
  const profile = await requireProfile();
  const acesso = await acessoVisitantes(profile);
  if (!acesso) redirect("/app");
  const porta = acesso === "porta";
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.replace(/[,()%*\\]/g, " ").trim() : "";
  const hoje = hojeISO();

  const supabase = await createClient();
  let query = supabase
    .from("koinonia_visitantes")
    .select("id, nome, celular, data_visita, motivo, created_by")
    .order("data_visita", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(300);
  if (q) {
    const digitos = q.replace(/\D/g, "");
    query = query.or([`nome.ilike.%${q}%`, digitos.length >= 3 ? `celular.like.%${digitos}%` : null].filter(Boolean).join(","));
  }
  const { data: visitantes, error } = await query;
  if (error) throw new Error(error.message);

  const doMes = visitantes.filter((v) => v.data_visita.slice(0, 7) === hoje.slice(0, 7)).length;
  // a equipe da porta (a RLS já mostra só os de hoje) edita só o que ela mesma cadastrou
  const podeEditar = (v: { created_by: string | null }) => !porta || v.created_by === profile.id;
  const descricao = porta
    ? `Você está na Porta Principal hoje. ${visitantes.length} ${visitantes.length === 1 ? "visitante cadastrado" : "visitantes cadastrados"} hoje.`
    : q
      ? `${visitantes.length} encontrado(s)`
      : `${doMes} ${doMes === 1 ? "visitante" : "visitantes"} neste mês`;

  return (
    <>
      <PageHeader titulo={porta ? "Visitantes de hoje" : "Visitantes"} descricao={descricao}>
        <VisitanteDialog hoje={hoje} dataFixa={porta} />
      </PageHeader>

      {!porta && <Busca />}

      {visitantes.length === 0 ? (
        <EmptyState
          icone={UserRoundSearchIcon}
          titulo={q ? "Ninguém encontrado" : porta ? "Nenhum visitante cadastrado hoje" : "Nenhum visitante cadastrado"}
          descricao={q ? undefined : "Cadastre quem visitou a igreja para não perder o contato."}
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Visita</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead className="w-28" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {visitantes.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="align-top whitespace-nowrap tabular-nums">{formatarData(v.data_visita)}</TableCell>
                  <TableCell className="align-top">
                    <p className="font-medium">{v.nome}</p>
                    {v.motivo && <p className="max-w-md text-xs whitespace-pre-line text-muted-foreground">{v.motivo}</p>}
                  </TableCell>
                  <TableCell className="align-top whitespace-nowrap tabular-nums">{formatarCelular(v.celular)}</TableCell>
                  <TableCell className="align-top">
                    <div className="flex justify-end">
                      <Button asChild variant="ghost" size="icon" aria-label={`Chamar ${v.nome} no WhatsApp`}>
                        <a href={linkWhatsApp(v.celular, v.nome)} target="_blank" rel="noopener noreferrer">
                          <MessageCircleIcon />
                        </a>
                      </Button>
                      {podeEditar(v) && (
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
