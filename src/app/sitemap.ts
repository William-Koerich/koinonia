import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import { getProjetos } from "@/lib/data/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const paginas = ["", "/quem-somos", "/pastores", "/projetos", "/eventos", "/contribuicao", "/contato"];
  const projetos = await getProjetos();

  return [
    ...paginas.map((path) => ({
      url: `${siteConfig.url}${path}`,
      changeFrequency: path === "/eventos" ? ("weekly" as const) : ("monthly" as const),
      priority: path === "" ? 1 : 0.7,
    })),
    ...projetos.map((projeto) => ({
      url: `${siteConfig.url}/projetos/${projeto.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
  ];
}
