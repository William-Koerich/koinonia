import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/app", "/auth", "/entrar", "/recuperar-senha", "/redefinir-senha", "/cadastro", "/completar-cadastro", "/conta-inativa"],
    },
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
