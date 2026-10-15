import { ArrowLeftIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Reveal } from "@/components/site/fx/reveal";
import { STATUS_PROJETO_LABEL } from "@/components/site/projeto-status";
import { PageHero } from "@/components/site/section";
import { Tela } from "@/components/site/tela";
import { getProjeto, getProjetos, urlDoStorage } from "@/lib/data/site";
import { imagens } from "@/lib/imagens";

export async function generateStaticParams() {
  const projetos = await getProjetos();
  // Com Cache Components a lista não pode ser vazia; o placeholder cai no notFound()
  return projetos.length ? projetos.map((p) => ({ slug: p.slug })) : [{ slug: "__vazio__" }];
}

export async function generateMetadata({ params }: PageProps<"/projetos/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const projeto = await getProjeto(slug);
  if (!projeto) return { title: "Projeto não encontrado" };

  const imagem = urlDoStorage(projeto.imagem_path);
  return {
    title: projeto.titulo,
    description: projeto.resumo ?? undefined,
    openGraph: {
      title: projeto.titulo,
      description: projeto.resumo ?? undefined,
      images: imagem ? [imagem] : undefined,
    },
  };
}

export default function ProjetoPage({ params }: PageProps<"/projetos/[slug]">) {
  return (
    // params é aguardado dentro do Suspense para slugs novos servirem o shell na hora
    <Suspense fallback={<Tela fundo="tinta"><span /></Tela>}>
      <ProjetoConteudo params={params} />
    </Suspense>
  );
}

async function ProjetoConteudo({ params }: Pick<PageProps<"/projetos/[slug]">, "params">) {
  const { slug } = await params;
  const projeto = await getProjeto(slug);
  if (!projeto) notFound();

  return (
    <>
      <PageHero
        rotulo={STATUS_PROJETO_LABEL[projeto.status]}
        titulo={projeto.titulo}
        descricao={projeto.resumo ?? undefined}
        imagem={urlDoStorage(projeto.imagem_path) ?? imagens.contribuaMaos}
      />
      <Tela conteudoClassName="max-w-3xl">
        <Reveal>
          <div className="space-y-6 text-lg leading-relaxed whitespace-pre-line">{projeto.descricao}</div>
          <Link
            href="/projetos"
            className="mt-14 inline-flex items-center gap-2 border-b border-current pb-1 text-sm font-medium"
          >
            <ArrowLeftIcon className="size-4" /> Todos os projetos
          </Link>
        </Reveal>
      </Tela>
    </>
  );
}
