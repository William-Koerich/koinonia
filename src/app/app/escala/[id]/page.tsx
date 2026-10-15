import { ArrowLeftIcon, CalendarDaysIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ConfirmarExclusao } from "@/components/app/confirmar-exclusao";
import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { requireProfile } from "@/lib/auth";
import { getPessoas } from "@/lib/data/app";
import { getEventosOpcoes, getFuncoes } from "@/lib/data/escala";
import { formatarDataLonga } from "@/lib/format";
import { isAdminOrPastor } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { excluirEscala } from "../actions";
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
    .select("id, data, descricao, evento_id, evento:koinonia_eventos(titulo)")
    .eq("id", id)
    .maybeSingle();
  if (!escala) notFound();

  const [funcoes, { data: atribuicoes, error }, { data: mesmoDia }] = await Promise.all([
    getFuncoes(),
    supabase
      .from("koinonia_escala_atribuicoes")
      .select("id, funcao_id, profile_id, pessoa:koinonia_perfis_basicos!koinonia_escala_atribuicoes_profile_id_fkey(nome_completo)")
      .eq("escala_id", id)
      .order("created_at"),
    // quem já está em outras escalas no mesmo dia, para avisar no seletor
    supabase
      .from("koinonia_escala_atribuicoes")
      .select("profile_id, funcao:koinonia_escala_funcoes(funcao), escala:koinonia_escalas!inner(descricao, data)")
      .eq("escala.data", escala.data)
      .neq("escala_id", id),
  ]);
  if (error) throw new Error(error.message);

  const avisos: Record<string, string> = {};
  for (const a of mesmoDia ?? []) {
    const texto = `${a.escala.descricao} — ${a.funcao?.funcao ?? ""}`;
    avisos[a.profile_id] = avisos[a.profile_id] ? `${avisos[a.profile_id]}; ${texto}` : `Já escalado neste dia: ${texto}`;
  }

  const minhaFuncao = atribuicoes.find((a) => a.profile_id === profile.id);
  const totalVagas = funcoes.reduce((soma, f) => soma + f.vagas, 0);

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
                valores: { data: escala.data, descricao: escala.descricao, evento_id: escala.evento_id },
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
        {minhaFuncao && (
          <Badge>Você está escalado: {funcoes.find((f) => f.id === minhaFuncao.funcao_id)?.funcao}</Badge>
        )}
      </div>

      <EscalaGrade
        escalaId={escala.id}
        funcoes={funcoes}
        atribuicoes={atribuicoes.map((a) => ({
          id: a.id,
          funcao_id: a.funcao_id,
          profile_id: a.profile_id,
          nome: a.pessoa?.nome_completo ?? null,
        }))}
        pessoas={gerencia ? await getPessoas() : []}
        avisos={avisos}
        gerencia={gerencia}
        meuId={profile.id}
      />
    </>
  );
}
