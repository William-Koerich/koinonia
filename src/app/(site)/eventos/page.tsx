import type { Metadata } from "next";
import { ListaEventos } from "@/components/site/evento-linha";
import { EmptyState, PageHero, Section } from "@/components/site/section";
import { getProximosEventos } from "@/lib/data/site";
import { imagens } from "@/lib/imagens";

export const metadata: Metadata = {
  title: "Eventos",
  description: "Próximos eventos, conferências e encontros da igreja.",
};

export default async function EventosPage() {
  const eventos = await getProximosEventos();

  return (
    <>
      <PageHero
        rotulo="Agenda"
        titulo="Próximos eventos."
        descricao="Celebrações, conferências e encontros. Você e sua família são bem-vindos."
        imagem={imagens.heroLouvor}
        posicao="center 70%"
      />
      <Section>
        {eventos.length === 0 ? (
          <EmptyState>Nenhum evento agendado no momento. Volte em breve!</EmptyState>
        ) : (
          <ListaEventos eventos={eventos} detalhada />
        )}
      </Section>
    </>
  );
}
