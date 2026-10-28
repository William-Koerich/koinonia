import { ArrowLeftIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireProfile } from "@/lib/auth";
import { formatarDataHora } from "@/lib/format";
import { isAdminOrPastor } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { LeitorQr } from "./leitor-qr";
import { ListaPresenca, type Presenca } from "./lista-presenca";

export const metadata: Metadata = { title: "Check-in" };

export default async function CheckinPage({ params, searchParams }: PageProps<"/app/eventos/[id]/checkin">) {
  const profile = await requireProfile();
  const { id } = await params;
  const { codigo } = await searchParams;

  const supabase = await createClient();
  const { data: evento } = await supabase
    .from("koinonia_eventos")
    .select("id, titulo, inicio, responsavel_id")
    .eq("id", id)
    .maybeSingle();
  if (!evento) notFound();
  // check-in é com o responsável pelo evento, pastores e administradores
  if (!isAdminOrPastor(profile.role) && evento.responsavel_id !== profile.id) redirect(`/app/eventos/${id}`);

  const { data: inscricoes, error } = await supabase
    .from("koinonia_evento_inscricoes")
    .select("id, status, checkin_em, convidado_nome, pessoa:koinonia_perfis_basicos!koinonia_evento_inscricoes_profile_id_fkey(nome_completo)")
    .eq("evento_id", id)
    .neq("status", "recusada");
  if (error) throw new Error(error.message);

  const inscritos: Presenca[] = inscricoes
    .map((i) => ({
      id: i.id,
      nome: i.pessoa?.nome_completo ?? i.convidado_nome ?? "Usuário inativo",
      convidado: !!i.convidado_nome,
      status: i.status,
      checkinEm: i.checkin_em,
    }))
    // confirmados que ainda não chegaram primeiro; depois os presentes; o resto no fim
    .sort((a, b) => {
      const peso = (p: Presenca) => (p.status !== "confirmada" ? 2 : p.checkinEm ? 1 : 0);
      return peso(a) - peso(b) || a.nome.localeCompare(b.nome, "pt-BR");
    });
  const confirmados = inscritos.filter((i) => i.status === "confirmada").length;
  const presentes = inscritos.filter((i) => i.checkinEm).length;

  return (
    <>
      <Link
        href={`/app/eventos/${id}`}
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" /> {evento.titulo}
      </Link>
      <PageHeader titulo="Check-in" descricao={`${evento.titulo} · ${formatarDataHora(evento.inicio)}`} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <Card className="py-4">
            <CardHeader className="px-4">
              <p className="text-xs text-muted-foreground">Presentes</p>
              <CardTitle className="text-3xl tabular-nums">
                {presentes}
                <span className="text-lg font-normal text-muted-foreground"> / {confirmados} confirmados</span>
              </CardTitle>
            </CardHeader>
          </Card>
          <LeitorQr eventoId={id} codigoInicial={typeof codigo === "string" ? codigo : null} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lista de presença</CardTitle>
          </CardHeader>
          <CardContent>
            <ListaPresenca eventoId={id} inscritos={inscritos} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
