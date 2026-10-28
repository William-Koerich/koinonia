import { TicketIcon, XIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { BotaoAcao } from "@/components/app/botao-acao";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { requireRole } from "@/lib/auth";
import { formatarData, formatarDataHora, formatarMoeda } from "@/lib/format";
import { ROLES_FINANCEIRO } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { decidirInscricao } from "../../eventos/[id]/actions";
import { ConfirmarPagamento } from "../../eventos/[id]/confirmar-pagamento";

export const metadata: Metadata = { title: "Pagamentos de eventos" };

const CAMPOS =
  "id, status, pagamento_informado_em, decidido_em, convidado_nome, evento:koinonia_eventos!inner(id, titulo, inicio, valor), pessoa:koinonia_perfis_basicos!koinonia_evento_inscricoes_profile_id_fkey(nome_completo)";

/** Inscrições pagas aguardando a tesouraria conferir o PIX (e as confirmadas há pouco) */
export default async function PagamentosEventosPage() {
  await requireRole(...ROLES_FINANCEIRO);

  const supabase = await createClient();
  const [{ data: pendentes, error }, { data: recentes }] = await Promise.all([
    supabase
      .from("koinonia_evento_inscricoes")
      .select(CAMPOS)
      .eq("status", "pendente")
      .not("evento.valor", "is", null)
      .order("created_at"),
    supabase
      .from("koinonia_evento_inscricoes")
      .select(CAMPOS)
      .eq("status", "confirmada")
      .not("evento.valor", "is", null)
      .not("decidido_em", "is", null)
      .order("decidido_em", { ascending: false })
      .limit(10),
  ]);
  if (error) throw new Error(error.message);

  // quem já avisou que pagou vem primeiro
  const ordenadas = [...pendentes].sort(
    (a, b) => Number(!!b.pagamento_informado_em) - Number(!!a.pagamento_informado_em),
  );
  const avisaram = pendentes.filter((p) => p.pagamento_informado_em).length;
  const nome = (i: (typeof pendentes)[number]) => i.pessoa?.nome_completo ?? i.convidado_nome ?? "Usuário inativo";

  return (
    <>
      <PageHeader
        titulo="Pagamentos de eventos"
        descricao={
          pendentes.length
            ? `${pendentes.length} ${pendentes.length === 1 ? "inscrição aguardando" : "inscrições aguardando"} pagamento · ${avisaram} já ${avisaram === 1 ? "avisou" : "avisaram"} que pagou.`
            : "Ao confirmar um pagamento, a inscrição é confirmada e o valor entra nas entradas do financeiro."
        }
      />

      {ordenadas.length === 0 ? (
        <EmptyState icone={TicketIcon} titulo="Nenhum pagamento para conferir" descricao="Quando alguém avisar que pagou, aparece aqui." />
      ) : (
        <ul className="divide-y rounded-xl border">
          {ordenadas.map((i) => (
            <li key={i.id} className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0 space-y-0.5">
                <p className="flex flex-wrap items-center gap-2 font-medium">
                  {nome(i)}
                  {i.convidado_nome && <Badge variant="secondary">Convidado</Badge>}
                </p>
                <p className="text-sm text-muted-foreground">
                  <Link href={`/app/eventos/${i.evento.id}`} className="hover:underline">
                    {i.evento.titulo}
                  </Link>{" "}
                  · {formatarData(i.evento.inicio)} ·{" "}
                  <span className="font-medium text-foreground">{formatarMoeda(Number(i.evento.valor))}</span>
                </p>
                {i.pagamento_informado_em ? (
                  <p className="text-xs font-medium text-amber-700">
                    Avisou que pagou · {formatarDataHora(i.pagamento_informado_em)}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">Ainda não avisou o pagamento</p>
                )}
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <ConfirmarPagamento
                  eventoId={i.evento.id}
                  inscricaoId={i.id}
                  nome={nome(i)}
                  valor={formatarMoeda(Number(i.evento.valor))}
                />
                <BotaoAcao acao={decidirInscricao.bind(null, i.evento.id, i.id, "recusada")} variant="outline">
                  <XIcon /> Recusar
                </BotaoAcao>
              </div>
            </li>
          ))}
        </ul>
      )}

      {!!recentes?.length && (
        <section className="mt-10">
          <h2 className="mb-4 font-heading text-lg font-semibold text-muted-foreground">Confirmados recentemente</h2>
          <ul className="divide-y rounded-xl border">
            {recentes.map((i) => (
              <li key={i.id} className="flex flex-col gap-2 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-medium">{nome(i)}</p>
                  <p className="text-muted-foreground">
                    {i.evento.titulo} · {formatarMoeda(Number(i.evento.valor))} · confirmado em{" "}
                    {formatarDataHora(i.decidido_em!)}
                  </p>
                </div>
                <BotaoAcao acao={decidirInscricao.bind(null, i.evento.id, i.id, "pendente")} variant="ghost">
                  Desfazer
                </BotaoAcao>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
