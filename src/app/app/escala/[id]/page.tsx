import { ArrowLeftIcon, BellRingIcon, CalendarDaysIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BotaoAcao } from "@/components/app/botao-acao";
import { ConfirmarExclusao } from "@/components/app/confirmar-exclusao";
import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { requireProfile } from "@/lib/auth";
import { getPessoas } from "@/lib/data/app";
import { getEventosOpcoes, getFuncoes, getTrocasAbertas, primeiroNome } from "@/lib/data/escala";
import { formatarDataLonga, hojeISO, paraInputDataHora } from "@/lib/format";
import { isAdminOrPastor } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { excluirEscala, lembrarPendentes } from "../actions";
import { Ensaio } from "../_componentes/ensaio";
import { MinhaResposta } from "../_componentes/minha-resposta";
import { TrocasPainel } from "../_componentes/trocas-painel";
import { EscalaDialog } from "../escala-dialog";
import { EscalaGrade } from "./escala-grade";

export const metadata: Metadata = { title: "Escala" };

export default async function EscalaPage({ params }: PageProps<"/app/escala/[id]">) {
  const profile = await requireProfile();
  const { id } = await params;
  const gerencia = isAdminOrPastor(profile.role);

  const supabase = await createClient();
  const { data: escala } = await supabase
    .from("koinonia_escalas")
    .select("id, data, descricao, evento_id, ensaio_em, ensaio_local, repertorio, evento:koinonia_eventos(titulo)")
    .eq("id", id)
    .maybeSingle();
  if (!escala) notFound();
  const futura = escala.data >= hojeISO();

  const [funcoes, { data: atribuicoes, error }, { data: mesmoDia }, { data: indisponiveis }, trocas] = await Promise.all([
    getFuncoes(),
    supabase
      .from("koinonia_escala_atribuicoes")
      .select(
        "id, funcao_id, profile_id, resposta, motivo_recusa, pessoa:koinonia_perfis_basicos!koinonia_escala_atribuicoes_profile_id_fkey(nome_completo)",
      )
      .eq("escala_id", id)
      .order("created_at"),
    // quem já está em outras escalas no mesmo dia, para avisar no seletor
    supabase
      .from("koinonia_escala_atribuicoes")
      .select("profile_id, funcao:koinonia_escala_funcoes(funcao), escala:koinonia_escalas!inner(descricao, data)")
      .eq("escala.data", escala.data)
      .neq("escala_id", id),
    // quem marcou que não pode neste dia (a RLS só mostra todos para a liderança)
    gerencia
      ? supabase
          .from("koinonia_escala_indisponibilidades")
          .select("profile_id, motivo")
          .lte("data_inicio", escala.data)
          .gte("data_fim", escala.data)
      : Promise.resolve({ data: [] }),
    getTrocasAbertas(id),
  ]);
  if (error) throw new Error(error.message);

  const avisos: Record<string, string> = {};
  for (const a of mesmoDia ?? []) {
    const texto = `${a.escala.descricao} — ${a.funcao?.funcao ?? ""}`;
    avisos[a.profile_id] = avisos[a.profile_id] ? `${avisos[a.profile_id]}; ${texto}` : `Já escalado neste dia: ${texto}`;
  }
  const alertas: Record<string, string> = {};
  for (const i of indisponiveis ?? []) {
    alertas[i.profile_id] = i.motivo ? `Não pode neste dia: ${i.motivo}` : "Marcou que não pode neste dia";
  }

  const minha = atribuicoes.find((a) => a.profile_id === profile.id);
  const minhaTroca = minha ? trocas.find((t) => t.atribuicao_id === minha.id && t.solicitante_id === profile.id) : undefined;
  const totalVagas = funcoes.reduce((soma, f) => soma + f.vagas, 0);
  const contagem = { confirmado: 0, pendente: 0, recusado: 0 };
  for (const a of atribuicoes) contagem[a.resposta]++;

  return (
    <>
      <Link href="/app/escala" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeftIcon className="size-4" /> Escalas
      </Link>
      <PageHeader titulo={escala.descricao} descricao={formatarDataLonga(escala.data)}>
        {gerencia && (
          <>
            <EscalaDialog
              eventos={await getEventosOpcoes()}
              escala={{
                id: escala.id,
                valores: {
                  data: escala.data,
                  descricao: escala.descricao,
                  evento_id: escala.evento_id,
                  ensaio_em: escala.ensaio_em ? paraInputDataHora(escala.ensaio_em) : "",
                  ensaio_local: escala.ensaio_local ?? "",
                  repertorio: escala.repertorio ?? "",
                },
              }}
            />
            <ConfirmarExclusao
              titulo="Excluir esta escala?"
              descricao="Todas as pessoas escaladas nela serão removidas. Esta ação não pode ser desfeita."
              acao={excluirEscala.bind(null, escala.id)}
            />
          </>
        )}
      </PageHeader>

      <div className="mb-6 flex flex-wrap items-center gap-2 text-sm">
        <Badge variant="outline">
          {atribuicoes.length}/{totalVagas} vagas preenchidas
        </Badge>
        {escala.evento && (
          <Badge variant="secondary">
            <CalendarDaysIcon /> {escala.evento.titulo}
          </Badge>
        )}
        {atribuicoes.length > 0 && (
          <>
            <Badge variant="outline" className="border-emerald-600/25 text-emerald-700">
              {contagem.confirmado} {contagem.confirmado === 1 ? "confirmado" : "confirmados"}
            </Badge>
            {contagem.pendente > 0 && (
              <Badge variant="outline" className="border-amber-600/25 text-amber-700">
                {contagem.pendente} sem resposta
              </Badge>
            )}
            {contagem.recusado > 0 && (
              <Badge variant="outline" className="border-destructive/25 text-destructive">
                {contagem.recusado} não {contagem.recusado === 1 ? "pode" : "podem"}
              </Badge>
            )}
          </>
        )}
        {gerencia && futura && contagem.pendente > 0 && (
          <BotaoAcao acao={lembrarPendentes.bind(null, escala.id)} variant="outline">
            <BellRingIcon /> Lembrar quem não respondeu
          </BotaoAcao>
        )}
      </div>

      {minha && futura && (
        <Card className="mb-6 border-primary/40 bg-primary/5">
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm">
              Você está escalado como{" "}
              <strong className="font-medium">{funcoes.find((f) => f.id === minha.funcao_id)?.funcao}</strong>
              {minha.resposta === "pendente" && ". Confirme se vai poder servir."}
            </p>
            <MinhaResposta
              atribuicaoId={minha.id}
              resposta={minha.resposta}
              troca={
                minhaTroca
                  ? { id: minhaTroca.id, status: minhaTroca.status, substituto: primeiroNome(minhaTroca.substituto?.nome_completo) }
                  : null
              }
            />
          </CardContent>
        </Card>
      )}

      <TrocasPainel
        trocas={trocas.filter((t) => t.solicitante_id !== profile.id)}
        meuId={profile.id}
        gerencia={gerencia}
        mostrarEscala={false}
      />

      <Ensaio ensaioEm={escala.ensaio_em} local={escala.ensaio_local} repertorio={escala.repertorio} />

      <EscalaGrade
        escalaId={escala.id}
        funcoes={funcoes}
        atribuicoes={atribuicoes.map((a) => ({
          id: a.id,
          funcao_id: a.funcao_id,
          profile_id: a.profile_id,
          nome: a.pessoa?.nome_completo ?? null,
          resposta: a.resposta,
          motivo: a.motivo_recusa,
        }))}
        pessoas={gerencia ? await getPessoas() : []}
        avisos={avisos}
        alertas={alertas}
        gerencia={gerencia}
        meuId={profile.id}
      />
    </>
  );
}
