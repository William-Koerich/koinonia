import { CalendarDaysIcon, PencilIcon, PlusIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ConfirmarExclusao } from "@/components/app/confirmar-exclusao";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { EventoCard } from "@/components/site/evento-card";
import { Button } from "@/components/ui/button";
import { requireProfile } from "@/lib/auth";
import { isAdminOrPastor } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { excluirEvento } from "./actions";

export const metadata: Metadata = { title: "Eventos" };

const CAMPOS =
  "id, titulo, descricao, inicio, fim, valor, publico, logradouro, numero, complemento, bairro, cidade, uf, responsavel:koinonia_perfis_basicos!koinonia_eventos_responsavel_id_fkey(nome_completo)";

export default async function EventosPage() {
  const profile = await requireProfile();
  const gerencia = isAdminOrPastor(profile.role);
  const agora = new Date().toISOString();

  const supabase = await createClient();
  const [proximos, anteriores] = await Promise.all([
    supabase.from("koinonia_eventos").select(CAMPOS).gte("fim", agora).order("inicio"),
    supabase.from("koinonia_eventos").select(CAMPOS).lt("fim", agora).order("inicio", { ascending: false }).limit(6),
  ]);
  if (proximos.error) throw new Error(proximos.error.message);

  function acoes(evento: { id: string; titulo: string }) {
    if (!gerencia) return null;
    return (
      <>
        <Button asChild variant="ghost" size="icon" aria-label={`Editar ${evento.titulo}`}>
          <Link href={`/app/eventos/${evento.id}/editar`}>
            <PencilIcon />
          </Link>
        </Button>
        <ConfirmarExclusao
          somenteIcone
          titulo={`Excluir "${evento.titulo}"?`}
          descricao="O evento sai do site e da área de membros. Escalas ligadas a ele perdem o vínculo, mas não são apagadas."
          acao={excluirEvento.bind(null, evento.id)}
        />
      </>
    );
  }

  return (
    <>
      <PageHeader titulo="Eventos">
        {gerencia && (
          <Button asChild>
            <Link href="/app/eventos/novo">
              <PlusIcon /> Novo evento
            </Link>
          </Button>
        )}
      </PageHeader>

      {proximos.data.length === 0 ? (
        <EmptyState icone={CalendarDaysIcon} titulo="Nenhum evento agendado" />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {proximos.data.map((evento) => (
            <EventoCard key={evento.id} evento={evento} responsavel={evento.responsavel?.nome_completo}>
              {acoes(evento)}
            </EventoCard>
          ))}
        </div>
      )}

      {!!anteriores.data?.length && (
        <section className="mt-10">
          <h2 className="mb-4 font-heading text-lg font-semibold text-muted-foreground">Eventos anteriores</h2>
          <div className="grid gap-4 opacity-75 md:grid-cols-2 xl:grid-cols-3">
            {anteriores.data.map((evento) => (
              <EventoCard key={evento.id} evento={evento} responsavel={evento.responsavel?.nome_completo}>
                {acoes(evento)}
              </EventoCard>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
