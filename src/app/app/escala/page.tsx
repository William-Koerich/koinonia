import { ClipboardListIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireProfile } from "@/lib/auth";
import { getEventosOpcoes, getFuncoes } from "@/lib/data/escala";
import { formatarDataLonga, hojeISO } from "@/lib/format";
import { isAdminOrPastor } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { EscalaDialog } from "./escala-dialog";

export const metadata: Metadata = { title: "Escala" };

const CAMPOS =
  "id, data, descricao, atribuicoes:koinonia_escala_atribuicoes(profile_id, funcao:koinonia_escala_funcoes(funcao))";

export default async function EscalasPage() {
  const profile = await requireProfile();
  const gerencia = isAdminOrPastor(profile.role);
  const hoje = hojeISO();

  const supabase = await createClient();
  const [funcoes, proximas, anteriores] = await Promise.all([
    getFuncoes(),
    supabase.from("koinonia_escalas").select(CAMPOS).gte("data", hoje).order("data").order("descricao"),
    supabase.from("koinonia_escalas").select(CAMPOS).lt("data", hoje).order("data", { ascending: false }).limit(6),
  ]);
  if (proximas.error) throw new Error(proximas.error.message);
  const totalVagas = funcoes.reduce((soma, f) => soma + f.vagas, 0);

  function cartao(escala: NonNullable<typeof proximas.data>[number]) {
    const minha = escala.atribuicoes.find((a) => a.profile_id === profile.id);
    const preenchidas = escala.atribuicoes.length;
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
          </CardContent>
        </Card>
      </Link>
    );
  }

  return (
    <>
      <PageHeader titulo="Escala" descricao="Escalas de serviço nos cultos e eventos.">
        {gerencia && <EscalaDialog eventos={await getEventosOpcoes()} />}
      </PageHeader>

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
