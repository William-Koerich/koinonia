import type { Metadata } from "next";
import { Foto } from "@/components/site/foto";
import { Reveal, Stagger, StaggerItem } from "@/components/site/fx/reveal";
import { PageHero, Section } from "@/components/site/section";
import { Rotulo } from "@/components/site/tela";
import { institucional } from "@/config/institucional";
import { imagens } from "@/lib/imagens";

export const metadata: Metadata = {
  title: "Quem Somos",
  description: "Nossa história, missão, visão, valores e declaração de fé.",
};

export default function QuemSomosPage() {
  return (
    <>
      <PageHero
        rotulo="Quem somos"
        titulo="Gente que vive em comunhão."
        descricao="Koinonia é a palavra grega para comunhão: vida, mesa e fé compartilhadas."
        imagem={imagens.manifestoComunhao}
      />

      <Section className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
        <Reveal>
          <Rotulo>Nossa história</Rotulo>
          <div className="space-y-5 text-lg leading-relaxed text-muted-foreground">
            {institucional.historia.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
        </Reveal>
        <Foto src={imagens.paginaBiblia} className="aspect-4/5 lg:aspect-auto lg:h-[70svh]" />
      </Section>

      <Section fundo="branco">
        <div className="grid gap-16 md:grid-cols-2">
          {[
            { titulo: "Missão", texto: institucional.missao },
            { titulo: "Visão", texto: institucional.visao },
          ].map((item, i) => (
            <Reveal key={item.titulo} delay={0.1 * i} className="border-t border-tinta pt-6">
              <Rotulo>{item.titulo}</Rotulo>
              <p className="font-display text-4xl leading-tight">{item.texto}</p>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section rotulo="Valores" titulo="O que nos move.">
        <Stagger className="grid gap-x-12 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {institucional.valores.map((v) => (
            <StaggerItem key={v.titulo}>
              <h3 className="font-display text-3xl">{v.titulo}</h3>
              <p className="mt-2 text-muted-foreground">{v.descricao}</p>
            </StaggerItem>
          ))}
        </Stagger>
      </Section>

      <Section fundo="branco" rotulo="Declaração de fé" titulo="O que cremos.">
        <Stagger className="grid gap-x-16 gap-y-8 md:grid-cols-2">
          {institucional.declaracaoDeFe.map((item) => (
            <StaggerItem key={item.titulo} className="border-t border-border pt-5">
              <h3 className="font-medium">{item.titulo}</h3>
              <p className="mt-2 text-muted-foreground">{item.texto}</p>
            </StaggerItem>
          ))}
        </Stagger>
      </Section>
    </>
  );
}
