import { CalendarOffIcon, ClipboardListIcon, MusicIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireProfile } from "@/lib/auth";
import { getEventosOpcoes, getFuncoes, getTrocasAbertas, primeiroNome } from "@/lib/data/escala";
import { formatarDataHora, formatarDataLonga, hojeISO } from "@/lib/format";
import { isAdminOrPastor } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { MinhaResposta } from "./_componentes/minha-resposta";
import { TrocasPainel } from "./_componentes/trocas-painel";
import { EscalaDialog } from "./escala-dialog";

export const metadata: Metadata = { title: "Escala" };

const CAMPOS =
  "id, data, descricao, ensaio_em, atribuicoes:koinonia_escala_atribuicoes(id, profile_id, resposta, funcao:koinonia_escala_funcoes(funcao))";

export default async function EscalasPage() {
  const profile = await requireProfile();
  const gerencia = isAdminOrPastor(profile.role);
  const hoje = hojeISO();

  const supabase = await createClient();
  const [funcoes, proximas, anteriores, trocas] = await Promise.all([
    getFuncoes(),
    supabase.from("koinonia_escalas").select(CAMPOS).gte("data", hoje).order("data").order("descricao"),
    supabase.from("koinonia_escalas").select(CAMPOS).lt("data", hoje).order("data", { ascending: false }).limit(6),
    getTrocasAbertas(),
  ]);
  if (proximas.error) throw new Error(proximas.error.message);
  const totalVagas = funcoes.reduce((soma, f) => soma + f.vagas, 0);

  // minhas próximas escalas, com a resposta e o pedido de troca em andamento
  const minhas = proximas.data.flatMap((escala) => {
    const a = escala.atribuicoes.find((x) => x.profile_id === profile.id);
    return a ? [{ escala, atribuicao: a, troca: trocas.find((t) => t.atribuicao_id === a.id && t.solicitante_id === profile.id) }] : [];
  });

  function cartao(escala: NonNullable<typeof proximas.data>[number]) {
    const minha = escala.atribuicoes.find((a) => a.profile_id === profile.id);
    const preenchidas = escala.atribuicoes.length;
    const pendentes = escala.atribuicoes.filter((a) => a.resposta === "pendente").length;
    const recusas = escala.atribuicoes.filter((a) => a.resposta === "recusado").length;
    const futura = escala.data >= hoje;
    return (
      <Link key={escala.id} href={`/app/escala/${escala.id}`} className="group">
        <Card className={cn("h-full transition-shadow group-hover:shadow-md", minha && "border-primary")}>
          <CardHeader>
            <p className="text-sm text-muted-foreground first-letter:uppercase">{formatarDataLonga(escala.data)}</p>
            <CardTitle className="group-hover:underline">{escala.descricao}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Badge variant={preenchidas >= totalVagas ? "default" : "outline"}>
              {preenchidas}/{totalVagas} vagas
            </Badge>
            {minha && <Badge>Você: {minha.funcao?.funcao}</Badge>}
            {gerencia && futura && pendentes > 0 && (
              <Badge variant="outline" className="border-amber-600/25 text-amber-700">
                {pendentes} sem resposta
              </Badge>
            )}
            {gerencia && futura && recusas > 0 && (
              <Badge variant="outline" className="border-destructive/25 text-destructive">
                {recusas} não {recusas === 1 ? "pode" : "podem"}
              </Badge>
            )}
            {escala.ensaio_em && futura && (
              <Badge variant="secondary">
                <MusicIcon /> Ensaio {formatarDataHora(escala.ensaio_em)}
              </Badge>
            )}
          </CardContent>
        </Card>
      </Link>
    );
  }

  return (
    <>
      <PageHeader titulo="Escala" descricao="Escalas de serviço nos cultos e eventos.">
        <Button asChild variant="outline">
          <Link href="/app/escala/disponibilidade">
            <CalendarOffIcon /> Minha disponibilidade
          </Link>
        </Button>
        {gerencia && <EscalaDialog eventos={await getEventosOpcoes()} />}
      </PageHeader>

      {/* os meus pedidos aparecem junto da minha escala, logo abaixo */}
      <TrocasPainel trocas={trocas.filter((t) => t.solicitante_id !== profile.id)} meuId={profile.id} gerencia={gerencia} />

      {minhas.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-4 font-heading text-lg font-semibold">Suas próximas escalas</h2>
          <ul className="divide-y rounded-xl border">
            {minhas.map(({ escala, atribuicao, troca }) => (
              <li key={atribuicao.id} className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <Link href={`/app/escala/${escala.id}`} className="font-medium hover:underline">
                    {escala.descricao}
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    <span className="inline-block first-letter:uppercase">{formatarDataLonga(escala.data)}</span> ·{" "}
                    {atribuicao.funcao?.funcao}
                  </p>
                </div>
                <MinhaResposta
                  atribuicaoId={atribuicao.id}
                  resposta={atribuicao.resposta}
                  troca={troca ? { id: troca.id, status: troca.status, substituto: primeiroNome(troca.substituto?.nome_completo) } : null}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      <h2 className={cn("mb-4 font-heading text-lg font-semibold", minhas.length === 0 && "sr-only")}>Próximas escalas</h2>
      {proximas.data.length === 0 ? (
        <EmptyState icone={ClipboardListIcon} titulo="Nenhuma escala agendada" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{proximas.data.map(cartao)}</div>
      )}

      {!!anteriores.data?.length && (
        <section className="mt-10">
          <h2 className="mb-4 font-heading text-lg font-semibold text-muted-foreground">Escalas anteriores</h2>
          <div className="grid gap-4 opacity-75 sm:grid-cols-2 lg:grid-cols-3">{anteriores.data.map(cartao)}</div>
        </section>
      )}
    </>
  );
}
