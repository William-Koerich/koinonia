import { ArrowLeftIcon, CalendarOffIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ConfirmarExclusao } from "@/components/app/confirmar-exclusao";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireProfile } from "@/lib/auth";
import { formatarData, hojeISO } from "@/lib/format";
import { isAdminOrPastor } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { IndisponibilidadeForm } from "./indisponibilidade-form";
import { removerIndisponibilidade } from "./actions";

export const metadata: Metadata = { title: "Minha disponibilidade" };

function periodo(inicio: string, fim: string) {
  return inicio === fim ? formatarData(inicio) : `${formatarData(inicio)} a ${formatarData(fim)}`;
}

export default async function DisponibilidadePage() {
  const profile = await requireProfile();
  const gerencia = isAdminOrPastor(profile.role);
  const hoje = hojeISO();

  const supabase = await createClient();
  // a RLS mostra só as minhas; para ADMIN/PASTOR, as de todos
  const [{ data: indisponibilidades, error }, { data: escalado }] = await Promise.all([
    supabase
      .from("koinonia_escala_indisponibilidades")
      .select("id, profile_id, data_inicio, data_fim, motivo, pessoa:koinonia_perfis_basicos!koinonia_escala_indisponibilidades_profile_id_fkey(nome_completo)")
      .gte("data_fim", hoje)
      .order("data_inicio"),
    supabase
      .from("koinonia_escala_atribuicoes")
      .select("resposta, escala:koinonia_escalas!inner(id, data, descricao)")
      .eq("profile_id", profile.id)
      .neq("resposta", "recusado")
      .gte("escala.data", hoje),
  ]);
  if (error) throw new Error(error.message);

  const minhas = indisponibilidades.filter((i) => i.profile_id === profile.id);
  const equipe = indisponibilidades.filter((i) => i.profile_id !== profile.id);

  return (
    <>
      <Link href="/app/escala" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeftIcon className="size-4" /> Escalas
      </Link>
      <PageHeader
        titulo="Minha disponibilidade"
        descricao="Marque os dias em que você não pode servir. Quem monta a escala vê isso na hora de escolher as pessoas."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Não posso servir em...</CardTitle>
          </CardHeader>
          <CardContent>
            <IndisponibilidadeForm hoje={hoje} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Seus dias marcados</CardTitle>
            <CardDescription>Datas que já passaram somem sozinhas.</CardDescription>
          </CardHeader>
          <CardContent>
            {minhas.length === 0 ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarOffIcon className="size-4" /> Nenhum dia marcado. Você aparece como disponível.
              </p>
            ) : (
              <ul className="divide-y">
                {minhas.map((i) => {
                  const conflitos = (escalado ?? []).filter((a) => a.escala.data >= i.data_inicio && a.escala.data <= i.data_fim);
                  return (
                    <li key={i.id} className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                      <div className="min-w-0 text-sm">
                        <p className="font-medium tabular-nums">{periodo(i.data_inicio, i.data_fim)}</p>
                        {i.motivo && <p className="text-muted-foreground">{i.motivo}</p>}
                        {conflitos.map((c) => (
                          <p key={c.escala.id} className="text-xs text-destructive">
                            Você está escalado em{" "}
                            <Link href={`/app/escala/${c.escala.id}`} className="underline">
                              {c.escala.descricao} ({formatarData(c.escala.data)})
                            </Link>
                            . Responda “Não posso” ou peça troca.
                          </p>
                        ))}
                      </div>
                      <ConfirmarExclusao
                        somenteIcone
                        titulo="Remover este período?"
                        descricao="Você volta a aparecer como disponível nesses dias."
                        rotulo="Remover"
                        acao={removerIndisponibilidade.bind(null, i.id)}
                      />
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {gerencia && (
        <section className="mt-10">
          <h2 className="mb-4 font-heading text-lg font-semibold">Indisponibilidades da equipe</h2>
          {equipe.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ninguém marcou indisponibilidade nos próximos dias.</p>
          ) : (
            <ul className="divide-y rounded-xl border">
              {equipe.map((i) => (
                <li key={i.id} className="flex flex-col gap-0.5 px-4 py-2.5 text-sm sm:flex-row sm:items-center sm:justify-between">
                  <span className="font-medium">{i.pessoa?.nome_completo ?? "Usuário inativo"}</span>
                  <span className="text-muted-foreground">
                    <span className="tabular-nums">{periodo(i.data_inicio, i.data_fim)}</span>
                    {i.motivo && ` · ${i.motivo}`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </>
  );
}
