import type { Metadata } from "next";
import Image from "next/image";
import { Stagger, StaggerItem } from "@/components/site/fx/reveal";
import { EmptyState, PageHero, Section } from "@/components/site/section";
import { getPastores, urlDoStorage } from "@/lib/data/site";
import { imagens } from "@/lib/imagens";

export const metadata: Metadata = {
  title: "Pastores",
  description: "Conheça os pastores da igreja.",
};

function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  return (partes[0][0] + (partes.length > 1 ? partes[partes.length - 1][0] : "")).toUpperCase();
}

export default async function PastoresPage() {
  const pastores = await getPastores();

  return (
    <>
      <PageHero
        rotulo="Pastores"
        titulo="Servos que cuidam."
        descricao="As pessoas que Deus levantou para ensinar, cuidar e servir a nossa comunidade."
        imagem={imagens.paginaGrupo}
      />
      <Section>
        {pastores.length === 0 ? (
          <EmptyState>Em breve.</EmptyState>
        ) : (
          <Stagger className="grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
            {pastores.map((pastor) => {
              const foto = urlDoStorage(pastor.foto_path);
              return (
                <StaggerItem key={pastor.id}>
                  <article className="group">
                    <div className="relative aspect-4/5 overflow-hidden rounded-[2rem] bg-muted">
                      {foto ? (
                        <Image
                          src={foto}
                          alt={pastor.nome}
                          fill
                          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                          className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center font-display text-7xl text-muted-foreground/50">
                          {iniciais(pastor.nome)}
                        </div>
                      )}
                    </div>
                    <p className="mt-5 text-xs tracking-[0.2em] text-destaque uppercase">{pastor.cargo}</p>
                    <h2 className="mt-1 font-display text-3xl">{pastor.nome}</h2>
                    {pastor.bio && <p className="mt-2 text-muted-foreground">{pastor.bio}</p>}
                  </article>
                </StaggerItem>
              );
            })}
          </Stagger>
        )}
      </Section>
    </>
  );
}
