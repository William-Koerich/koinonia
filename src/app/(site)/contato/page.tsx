import type { Metadata } from "next";
import Link from "next/link";
import { Reveal } from "@/components/site/fx/reveal";
import { PageHero, Section } from "@/components/site/section";
import { Rotulo } from "@/components/site/tela";
import { linkWhatsApp } from "@/components/site/whatsapp";
import { siteConfig } from "@/config/site";
import { formatarTelefone } from "@/lib/format";
import { imagens } from "@/lib/imagens";

export const metadata: Metadata = {
  title: "Contato",
  description: "Endereço, mapa, WhatsApp e redes sociais da igreja.",
};

export default function ContatoPage() {
  const { endereco, contato, redes } = siteConfig;
  // wa.me usa DDI + número; para exibir, tiramos o 55
  const whatsappExibicao = formatarTelefone(contato.whatsapp.replace(/^55/, ""));

  return (
    <>
      <PageHero
        rotulo="Contato"
        titulo="A casa é sua."
        descricao="Venha nos visitar ou fale com a gente pelo WhatsApp."
        imagem={imagens.paginaIgreja}
      />
      <Section className="grid gap-14 lg:grid-cols-[1fr_1.3fr] lg:gap-20">
        <Reveal className="space-y-12">
          <div>
            <Rotulo>Endereço</Rotulo>
            <address className="font-display text-3xl leading-snug not-italic">
              {endereco.logradouro}
              <br />
              {endereco.bairro}, {endereco.cidade}/{endereco.uf}
            </address>
            <p className="mt-2 text-muted-foreground">CEP {endereco.cep}</p>
          </div>
          <div>
            <Rotulo>Horários</Rotulo>
            {siteConfig.horariosCulto.map((h) => (
              <p key={h.dia} className="text-lg">
                {h.dia}, {h.horario} <span className="text-muted-foreground">— {h.descricao}</span>
              </p>
            ))}
          </div>
          <div>
            <Rotulo>Fale com a gente</Rotulo>
            <Link
              href={linkWhatsApp("Olá! Vim pelo site da igreja.")}
              className="inline-flex h-12 items-center rounded-full bg-tinta px-6 text-sm font-medium text-creme transition-opacity hover:opacity-90"
            >
              WhatsApp {whatsappExibicao}
            </Link>
            <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <li>
                <Link href={`mailto:${contato.email}`} className="border-b border-current pb-0.5">
                  {contato.email}
                </Link>
              </li>
              <li>
                <Link href={redes.instagram} className="border-b border-current pb-0.5">
                  Instagram {redes.instagramUsuario}
                </Link>
              </li>
            </ul>
          </div>
        </Reveal>
        <Reveal delay={0.1} className="min-h-96 overflow-hidden rounded-[2rem] bg-muted lg:min-h-[70svh]">
          <iframe
            src={siteConfig.mapaEmbedUrl}
            title={`Mapa: ${siteConfig.nome}`}
            className="size-full min-h-96 grayscale-30 lg:min-h-[70svh]"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </Reveal>
      </Section>
    </>
  );
}
