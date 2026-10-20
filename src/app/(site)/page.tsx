import { ArrowDownIcon, ArrowRightIcon, MegaphoneIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { ListaEventos } from "@/components/site/evento-linha";
import { Foto } from "@/components/site/foto";
import { ProximoCulto } from "@/components/site/fx/proximo-culto";
import { Reveal } from "@/components/site/fx/reveal";
import { TextReveal } from "@/components/site/fx/text-reveal";
import { Rotulo, Tela } from "@/components/site/tela";
import { linkWhatsApp } from "@/components/site/whatsapp";
import { siteConfig } from "@/config/site";
import { getAvisos, getProximosEventos, urlDoStorage } from "@/lib/data/site";
import { imagens } from "@/lib/imagens";

export default async function HomePage() {
  const [eventos, avisos] = await Promise.all([getProximosEventos(3), getAvisos()]);

  return (
    <>
      <Abertura aviso={avisos[0]} />
      {avisos.length > 0 && <Avisos avisos={avisos} />}
      <Versiculo />
      <QuemSomos />
      <Cultos />
      <Gcs />
      <Eventos eventos={eventos} />
      <Contribua />
    </>
  );
}

function LinkSeta({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="group inline-flex items-center gap-2 border-b border-current pb-1 text-sm font-medium">
      {children}
      <ArrowRightIcon className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
    </Link>
  );
}

/* ---------------------------------------------------------------- abertura */

type Aviso = Awaited<ReturnType<typeof getAvisos>>[number];

function Abertura({ aviso }: { aviso?: Aviso }) {
  // o tema vira duas linhas: "Quem serve" / "vê Deus." (a segunda em itálico)
  const [inicio, fim] = siteConfig.tema.split(" vê ");

  return (
    <Tela imagem={imagens.eventosAdoracao} posicao="center 40%" prioridade className="justify-end" conteudoClassName="pb-16 sm:pb-20">
      {/* o aviso mais recente aparece logo na primeira tela */}
      {aviso && (
        <Reveal className="mb-10">
          <Link
            href="#avisos"
            className="group inline-flex max-w-full items-center gap-3 rounded-full bg-creme/95 py-2 pr-4 pl-2 text-sm text-tinta shadow-sm transition-colors hover:bg-white"
          >
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-destaque px-3 py-1 text-xs font-medium text-white">
              <MegaphoneIcon className="size-3.5" /> Aviso
            </span>
            <span className="truncate font-medium">{aviso.titulo}</span>
            <ArrowDownIcon className="size-4 shrink-0 transition-transform group-hover:translate-y-0.5" />
          </Link>
        </Reveal>
      )}
      <Reveal>
        <p className="mb-6 text-xs font-medium tracking-[0.25em] text-white/80 uppercase">{siteConfig.nome}</p>
      </Reveal>
      <TextReveal
        as="h1"
        delay={0.15}
        className="font-display text-[clamp(3.5rem,11vw,9rem)] leading-[0.9]"
        trechos={[{ texto: inicio }, { texto: `vê ${fim}.`, className: "italic", quebra: true }]}
      />
      <div className="mt-10 flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
        <Reveal delay={0.6}>
          <ProximoCulto className="text-white/85" />
        </Reveal>
        <Reveal delay={0.7} className="flex flex-wrap items-center gap-3">
          <Link
            href="/contato"
            className="inline-flex h-12 items-center rounded-full bg-creme px-6 text-sm font-medium text-tinta transition-colors hover:bg-white"
          >
            Planeje sua visita
          </Link>
          <Link
            href="#horarios"
            className="inline-flex h-12 items-center gap-2 rounded-full border border-white/40 px-6 text-sm transition-colors hover:bg-white/10"
          >
            Horários <ArrowDownIcon className="size-4" />
          </Link>
        </Reveal>
      </div>
    </Tela>
  );
}

/* ------------------------------------------------------------------ avisos */

function Avisos({ avisos }: { avisos: Aviso[] }) {
  return (
    <Tela id="avisos" fundo="branco">
      <Reveal className="mb-12">
        <Rotulo>Avisos</Rotulo>
        <h2 className="font-display text-5xl leading-[1.05] sm:text-6xl">Fique por dentro.</h2>
      </Reveal>
      <div className={avisos.length > 1 ? "grid items-start gap-6 md:grid-cols-2" : "max-w-3xl"}>
        {avisos.map((a, i) => {
          const imagem = urlDoStorage(a.imagem_path);
          return (
            <Reveal key={a.id} delay={0.08 * Math.min(i, 3)}>
              <article className="overflow-hidden rounded-[2rem] border border-border bg-creme">
                {imagem && (
                  <div className="relative aspect-video bg-muted">
                    <Image src={imagem} alt="" fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" />
                  </div>
                )}
                <div className="p-7 sm:p-9">
                  <h3 className="font-display text-3xl leading-tight sm:text-4xl">{a.titulo}</h3>
                  {a.mensagem && (
                    <p className="mt-4 text-lg leading-relaxed whitespace-pre-line text-muted-foreground">{a.mensagem}</p>
                  )}
                </div>
              </article>
            </Reveal>
          );
        })}
      </div>
    </Tela>
  );
}

/* --------------------------------------------------------------- versículo */

function Versiculo() {
  return (
    <Tela conteudoClassName="text-center">
      <Reveal>
        <p className="mx-auto max-w-4xl font-display text-[clamp(2.25rem,5vw,4rem)] leading-[1.15]">
          “{siteConfig.versiculo.texto}”
        </p>
      </Reveal>
      <Reveal delay={0.15}>
        <p className="mt-8 text-sm tracking-[0.2em] text-destaque uppercase">{siteConfig.versiculo.referencia}</p>
      </Reveal>
      <Reveal delay={0.25}>
        <p className="mx-auto mt-12 max-w-xl text-lg leading-relaxed text-muted-foreground">
          Acreditamos que é servindo — em casa, na igreja e na cidade — que a gente conhece Deus de perto. Por isso,
          aqui cada pessoa tem um lugar para pertencer e um jeito de servir.
        </p>
      </Reveal>
    </Tela>
  );
}

/* -------------------------------------------------------------- quem somos */

function QuemSomos() {
  return (
    <Tela fundo="branco" conteudoClassName="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
      <Reveal>
        <Rotulo>Quem somos</Rotulo>
        <h2 className="font-display text-5xl leading-[1.05] sm:text-6xl">
          Uma igreja <em>família</em>, presente em cada bairro.
        </h2>
        <p className="mt-6 max-w-md text-lg leading-relaxed text-muted-foreground">
          Koinonia quer dizer comunhão. Somos pessoas comuns que caminham juntas, se cuidam e servem a cidade com o
          que têm.
        </p>
        <div className="mt-10">
          <LinkSeta href="/quem-somos">Conheça nossa história</LinkSeta>
        </div>
      </Reveal>
      <Foto src={imagens.manifestoComunhao} className="aspect-4/5 lg:aspect-auto lg:h-[70svh]" />
    </Tela>
  );
}

/* ------------------------------------------------------------------ cultos */

function Cultos() {
  const { endereco } = siteConfig;
  return (
    <Tela id="horarios">
      <Reveal className="max-w-2xl">
        <Rotulo>Cultos</Rotulo>
        <h2 className="font-display text-5xl leading-[1.05] sm:text-6xl">Celebre com a gente.</h2>
      </Reveal>

      <div className={siteConfig.horariosCulto.length > 1 ? "mt-16 grid gap-12 sm:grid-cols-2" : "mt-16 max-w-xl"}>
        {siteConfig.horariosCulto.map((h, i) => (
          <Reveal key={h.dia} delay={0.1 * i} className="border-t border-tinta pt-6">
            <p className="text-sm tracking-[0.2em] text-muted-foreground uppercase">{h.dia}</p>
            <p className="mt-4 font-display text-6xl sm:text-7xl">{h.horario}</p>
            <p className="mt-2 text-lg text-muted-foreground">{h.descricao}</p>
          </Reveal>
        ))}
      </div>

      <Reveal delay={0.2} className="mt-16 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted-foreground">
          {endereco.logradouro} — {endereco.bairro}, {endereco.cidade}/{endereco.uf}
        </p>
        <LinkSeta href="/contato">Como chegar</LinkSeta>
      </Reveal>
    </Tela>
  );
}

/* --------------------------------------------------------------------- GCs */

function Gcs() {
  return (
    <Tela fundo="branco" conteudoClassName="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
      <Foto src={imagens.gcsBibliaCafe} className="order-last aspect-4/5 lg:order-first lg:aspect-auto lg:h-[70svh]" />
      <Reveal>
        <Rotulo>Grupos Caseiros</Rotulo>
        <h2 className="font-display text-5xl leading-[1.05] sm:text-6xl">
          A igreja também acontece <em>nas casas</em>.
        </h2>
        <p className="mt-6 max-w-md text-lg leading-relaxed text-muted-foreground">
          Durante a semana, pequenos grupos se reúnem pelos bairros para ler a Bíblia, orar e compartilhar a vida.
        </p>
        <div className="mt-10">
          <LinkSeta href={linkWhatsApp("Olá! Quero participar de um GC.")}>Quero participar de um GC</LinkSeta>
        </div>
      </Reveal>
    </Tela>
  );
}

/* ----------------------------------------------------------------- eventos */

function Eventos({ eventos }: { eventos: Awaited<ReturnType<typeof getProximosEventos>> }) {
  return (
    <Tela>
      <Reveal className="mb-12 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Rotulo>Agenda</Rotulo>
          <h2 className="font-display text-5xl leading-[1.05] sm:text-6xl">Próximos eventos.</h2>
        </div>
        <LinkSeta href="/eventos">Ver todos</LinkSeta>
      </Reveal>
      {eventos.length === 0 ? (
        <p className="border-y border-border py-16 text-center text-muted-foreground">
          Nenhum evento agendado no momento.
        </p>
      ) : (
        <ListaEventos eventos={eventos} />
      )}
    </Tela>
  );
}

/* --------------------------------------------------------------- contribua */

function Contribua() {
  return (
    <Tela imagem={imagens.contribuaMaos} conteudoClassName="text-center">
      <Reveal>
        <h2 className="mx-auto max-w-3xl font-display text-[clamp(2.75rem,7vw,5.5rem)] leading-[1]">
          Sirva também com sua <em>generosidade</em>.
        </h2>
      </Reveal>
      <Reveal delay={0.15}>
        <p className="mx-auto mt-6 max-w-lg text-lg text-white/85">
          Sua oferta sustenta a obra, os projetos sociais e a missão da igreja na cidade.
        </p>
      </Reveal>
      <Reveal delay={0.25} className="mt-10">
        <Link
          href="/contribuicao"
          className="inline-flex h-12 items-center rounded-full bg-creme px-7 text-sm font-medium text-tinta transition-colors hover:bg-white"
        >
          Como contribuir
        </Link>
      </Reveal>
    </Tela>
  );
}
