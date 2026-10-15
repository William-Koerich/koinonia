import { ArrowLeftIcon, CalendarClockIcon, MapPinIcon, PencilIcon, UserIcon, UsersRoundIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ConfirmarExclusao } from "@/components/app/confirmar-exclusao";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireProfile } from "@/lib/auth";
import { descreverEncontro } from "@/lib/constants";
import { getPessoas } from "@/lib/data/app";
import { formatarCelular } from "@/lib/format";
import { isAdminOrPastor } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { removerDoGc } from "../actions";
import { ParticiparButton } from "../participar-button";
import { AdicionarAoGc } from "./adicionar-ao-gc";

export const metadata: Metadata = { title: "GC" };

type Participante = { id: string; nome: string; celular?: string; ativo?: boolean };

export default async function GcPage({ params }: PageProps<"/app/gcs/[id]">) {
  const profile = await requireProfile();
  const { id } = await params;
  const gerencia = isAdminOrPastor(profile.role);

  const supabase = await createClient();
  const { data: gc } = await supabase
    .from("koinonia_gcs")
    .select("*, lider:koinonia_perfis_basicos!koinonia_gcs_lider_id_fkey(nome_completo)")
    .eq("id", id)
    .maybeSingle();
  if (!gc) notFound();

  // ADMIN/PASTOR veem contato e inativos; os demais, só os nomes (view pública)
  let participantes: Participante[];
  if (gerencia) {
    const { data } = await supabase
      .from("koinonia_profiles")
      .select("id, nome_completo, celular, ativo")
      .eq("gc_id", id)
      .order("nome_completo");
    participantes = (data ?? []).map((p) => ({ id: p.id, nome: p.nome_completo, celular: p.celular, ativo: p.ativo }));
  } else {
    const { data } = await supabase
      .from("koinonia_perfis_basicos")
      .select("id, nome_completo")
      .eq("gc_id", id)
      .order("nome_completo");
    participantes = (data ?? []).flatMap((p) => (p.id && p.nome_completo ? [{ id: p.id, nome: p.nome_completo }] : []));
  }

  const meuGc = profile.gc_id === gc.id;
  const encontro = descreverEncontro(gc.dia_semana, gc.horario);
  const endereco = [`${gc.logradouro}, ${gc.numero}`, gc.complemento, gc.bairro, `${gc.cidade}/${gc.uf}`]
    .filter(Boolean)
    .join(" · ");
  const mapa = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${gc.logradouro}, ${gc.numero}, ${gc.bairro}, ${gc.cidade} - ${gc.uf}, ${gc.cep}`,
  )}`;

  return (
    <>
      <Link href="/app/gcs" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeftIcon className="size-4" /> GCs
      </Link>
      <PageHeader titulo={gc.nome}>
        {meuGc && <Badge>Meu GC</Badge>}
        <ParticiparButton gcId={gc.id} participa={meuGc} />
        {gerencia && (
          <Button asChild variant="outline" size="sm">
            <Link href={`/app/gcs/${gc.id}/editar`}>
              <PencilIcon /> Editar
            </Link>
          </Button>
        )}
      </PageHeader>

      <Card className="mb-6">
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
          {encontro && (
            <p className="flex gap-2">
              <CalendarClockIcon className="size-4 shrink-0 text-muted-foreground" /> {encontro}
            </p>
          )}
          <p className="flex gap-2">
            <UserIcon className="size-4 shrink-0 text-muted-foreground" />
            {gc.lider?.nome_completo ? `Líder: ${gc.lider.nome_completo}` : "Sem líder definido"}
          </p>
          <p className="flex gap-2 sm:col-span-2">
            <MapPinIcon className="size-4 shrink-0 text-muted-foreground" />
            <a href={mapa} target="_blank" rel="noreferrer" className="hover:underline">
              {endereco}
            </a>
          </p>
        </CardContent>
      </Card>

      <h2 className="mb-3 font-heading text-lg font-semibold">
        Participantes <span className="text-muted-foreground">({participantes.length})</span>
      </h2>

      <div className="space-y-4">
        {gerencia && (
          <AdicionarAoGc gcId={gc.id} pessoas={await getPessoas()} jaMembros={participantes.map((p) => p.id)} />
        )}

        {participantes.length === 0 ? (
          <EmptyState icone={UsersRoundIcon} titulo="Ninguém neste GC ainda" />
        ) : (
          <ul className="divide-y rounded-xl border">
            {participantes.map((p) => (
              <li key={p.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 font-medium">
                    {p.nome}
                    {p.id === profile.id && <Badge variant="secondary">Você</Badge>}
                    {p.ativo === false && <Badge variant="destructive">Inativo</Badge>}
                  </p>
                  {p.celular && (
                    <a href={`https://wa.me/55${p.celular}`} className="text-xs text-muted-foreground hover:underline">
                      {formatarCelular(p.celular)}
                    </a>
                  )}
                </div>
                {gerencia && (
                  <ConfirmarExclusao
                    somenteIcone
                    rotulo="Remover"
                    titulo={`Remover ${p.nome} do GC?`}
                    descricao="A pessoa fica sem GC e pode escolher outro em “Meu perfil”."
                    acao={removerDoGc.bind(null, gc.id, p.id)}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
