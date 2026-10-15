import { ArrowRightIcon } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Stagger, StaggerItem } from "@/components/site/fx/reveal";
import { STATUS_PROJETO_LABEL } from "@/components/site/projeto-status";
import { EmptyState, PageHero, Section } from "@/components/site/section";
import { getProjetos, urlDoStorage } from "@/lib/data/site";
import { imagens } from "@/lib/imagens";

export const metadata: Metadata = {
  title: "Projetos",
  description: "Projetos sociais e de expansão da igreja.",
};

export default async function ProjetosPage() {
  const projetos = await getProjetos();

  return (
    <>
      <PageHero
        rotulo="Projetos"
        titulo="Servir a cidade."
        descricao="Como a igreja cuida do próximo e investe no futuro."
        imagem={imagens.contribuaMaos}
      />
      <Section>
        {projetos.length === 0 ? (
          <EmptyState>Nenhum projeto publicado ainda.</EmptyState>
        ) : (
          <Stagger className="grid gap-x-8 gap-y-14 sm:grid-cols-2">
            {projetos.map((projeto) => {
              const imagem = urlDoStorage(projeto.imagem_path);
              return (
                <StaggerItem key={projeto.id}>
                  <Link href={`/projetos/${projeto.slug}`} className="group block">
                    <div className="relative aspect-3/2 overflow-hidden rounded-[2rem] bg-muted">
                      {imagem && (
                        <Image
                          src={imagem}
                          alt=""
                          fill
                          sizes="(min-width: 640px) 50vw, 100vw"
                          className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                        />
                      )}
                    </div>
                    <p className="mt-5 text-xs tracking-[0.2em] text-destaque uppercase">
                      {STATUS_PROJETO_LABEL[projeto.status]}
                    </p>
                    <h2 className="mt-1 flex items-center gap-3 font-display text-3xl">
                      {projeto.titulo}
                      <ArrowRightIcon className="size-5 opacity-0 transition-all duration-300 group-hover:translate-x-1 group-hover:opacity-100" />
                    </h2>
                    {projeto.resumo && <p className="mt-2 text-muted-foreground">{projeto.resumo}</p>}
                  </Link>
                </StaggerItem>
              );
            })}
          </Stagger>
        )}
      </Section>
    </>
  );
}
