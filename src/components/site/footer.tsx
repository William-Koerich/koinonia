import Link from "next/link";
import { siteConfig } from "@/config/site";
import { navLinks } from "./nav-links";
import { linkWhatsApp } from "./whatsapp";

export function SiteFooter() {
  const { endereco, redes, contato } = siteConfig;

  return (
    <footer className="bg-tinta text-creme">
      <div className="mx-auto max-w-6xl px-5 pt-20 pb-10 sm:px-8">
        <p className="max-w-xl font-display text-4xl leading-tight sm:text-5xl">
          {siteConfig.tema}<span className="text-destaque">.</span>
        </p>

        <div className="mt-16 grid gap-10 text-sm sm:grid-cols-3">
          <div className="space-y-1 text-creme/70">
            <p className="mb-3 text-creme">Visite</p>
            <p>{endereco.logradouro}</p>
            <p>
              {endereco.bairro} — {endereco.cidade}/{endereco.uf}
            </p>
            {siteConfig.horariosCulto.map((h) => (
              <p key={h.dia}>
                {h.dia}, {h.horario}
              </p>
            ))}
          </div>
          <ul className="space-y-1 text-creme/70">
            <li className="mb-3 text-creme">Páginas</li>
            {navLinks.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="hover:text-creme">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          <ul className="space-y-1 text-creme/70">
            <li className="mb-3 text-creme">Contato</li>
            <li>
              <Link href={linkWhatsApp()} className="hover:text-creme">
                WhatsApp
              </Link>
            </li>
            <li>
              <Link href={`mailto:${contato.email}`} className="hover:text-creme">
                {contato.email}
              </Link>
            </li>
            <li>
              <Link href={redes.instagram} className="hover:text-creme">
                Instagram {redes.instagramUsuario}
              </Link>
            </li>
          </ul>
        </div>

        <div className="mt-16 flex flex-col gap-2 border-t border-creme/15 pt-6 text-xs text-creme/50 sm:flex-row sm:justify-between">
          <p>© {siteConfig.nome}</p>
          <Link href="#topo" className="hover:text-creme">
            Voltar ao topo ↑
          </Link>
        </div>
      </div>
    </footer>
  );
}
