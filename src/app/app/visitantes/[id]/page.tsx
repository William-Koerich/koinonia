import { ArrowLeftIcon, MessageCircleIcon, UserCheckIcon, UserPlusIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ConfirmarExclusao } from "@/components/app/confirmar-exclusao";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireProfile } from "@/lib/auth";
import { getPessoas } from "@/lib/data/app";
import { formatarCelular, formatarData, hojeISO } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { MEIOS_CONTATO } from "@/lib/validation/visitante";
import { acessoVisitantes } from "@/lib/visitantes";
import { excluirContato } from "../actions";
import { linkWhatsApp } from "../whatsapp";
import { SituacaoBadge } from "../situacao-badge";
import { AcompanhamentoForm } from "./acompanhamento-form";
import { ContatoForm } from "./contato-form";

export const metadata: Metadata = { title: "Visitante" };

const UUID = /^[0-9a-f-]{36}$/i;

/** Acompanhamento de um visitante: quem cuida, situação, contatos feitos e "tornar membro" */
export default async function VisitantePage({ params }: PageProps<"/app/visitantes/[id]">) {
  const profile = await requireProfile();
  const acesso = await acessoVisitantes(profile);
  if (!acesso) redirect("/app");
  const total = acesso === "total";
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const supabase = await createClient();
  const [{ data: v }, { data: contatos, error }, pessoas] = await Promise.all([
    supabase
      .from("koinonia_visitantes")
      .select(
        "id, nome, celular, data_visita, motivo, situacao, responsavel_id, profile_id, responsavel:koinonia_perfis_basicos!koinonia_visitantes_responsavel_id_fkey(nome_completo), cadastrou:koinonia_perfis_basicos!koinonia_visitantes_created_by_fkey(nome_completo)",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("koinonia_visitante_contatos")
      .select("id, feito_em, meio, resultado, created_by, autor:koinonia_perfis_basicos!koinonia_visitante_contatos_created_by_fkey(nome_completo)")
      .eq("visitante_id", id)
      .order("feito_em", { ascending: false })
      .order("created_at", { ascending: false }),
    total ? getPessoas() : Promise.resolve([]),
  ]);
  if (!v) notFound();
  if (error) throw new Error(error.message);

  const hoje = hojeISO();
  const acompanha = total || v.responsavel_id === profile.id;
  const meio = new Map<string, string>(MEIOS_CONTATO.map((m) => [m.value, m.label]));

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/app/visitantes" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeftIcon className="size-4" /> Visitantes
      </Link>
      <PageHeader
        titulo={v.nome}
        descricao={[`Visitou em ${formatarData(v.data_visita)}`, v.cadastrou?.nome_completo && `cadastrado por ${v.cadastrou.nome_completo}`]
          .filter(Boolean)
          .join(" · ")}
      >
        <Button asChild variant="outline">
          <a href={linkWhatsApp(v.celular, v.nome)} target="_blank" rel="noopener noreferrer">
            <MessageCircleIcon /> {formatarCelular(v.celular)}
          </a>
        </Button>
      </PageHeader>

      <div className="space-y-6">
        {v.motivo && <p className="text-sm whitespace-pre-line text-muted-foreground">{v.motivo}</p>}

        <Card>
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center gap-2 text-base">
              Acompanhamento <SituacaoBadge situacao={v.situacao} />
            </CardTitle>
            <CardDescription>
              {v.responsavel?.nome_completo ? `Acompanhado por ${v.responsavel.nome_completo}.` : "Ninguém acompanhando ainda."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {v.profile_id ? (
              <p className="flex items-center gap-2 text-sm">
                <UserCheckIcon className="size-4 text-primary" />
                Já é membro.
                {total && (
                  <Link href={`/app/usuarios/${v.profile_id}`} className="font-medium underline">
                    Ver cadastro
                  </Link>
                )}
              </p>
            ) : (
              total && (
                <>
                  <AcompanhamentoForm visitanteId={v.id} pessoas={pessoas} responsavelId={v.responsavel_id} situacao={v.situacao} />
                  <div className="flex flex-wrap items-center gap-3 border-t pt-4">
                    <Button asChild variant="outline">
                      <Link href={`/app/usuarios/novo?visitante=${v.id}`}>
                        <UserPlusIcon /> Tornar membro
                      </Link>
                    </Button>
                    <p className="text-xs text-muted-foreground">Cria o acesso dele já com o nome e o celular daqui.</p>
                  </div>
                </>
              )
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contatos</CardTitle>
            <CardDescription>O que foi conversado com o visitante, do mais recente ao mais antigo.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {acompanha && <ContatoForm visitanteId={v.id} hoje={hoje} situacao={v.situacao} />}

            {contatos.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum contato registrado ainda.</p>
            ) : (
              <ol className="divide-y rounded-lg border">
                {contatos.map((c) => (
                  <li key={c.id} className="flex gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="text-xs text-muted-foreground">
                        {formatarData(c.feito_em)} · {meio.get(c.meio)}
                        {c.autor?.nome_completo && ` · ${c.autor.nome_completo}`}
                      </p>
                      <p className="text-sm whitespace-pre-line">{c.resultado}</p>
                    </div>
                    {(total || c.created_by === profile.id) && (
                      <ConfirmarExclusao
                        somenteIcone
                        titulo="Excluir este contato?"
                        descricao="O registro sai do histórico do visitante."
                        acao={excluirContato.bind(null, v.id, c.id)}
                      />
                    )}
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
