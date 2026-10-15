import { siteConfig } from "@/config/site";

export function linkWhatsApp(mensagem?: string): string {
  const base = `https://wa.me/${siteConfig.contato.whatsapp}`;
  return mensagem ? `${base}?text=${encodeURIComponent(mensagem)}` : base;
}
