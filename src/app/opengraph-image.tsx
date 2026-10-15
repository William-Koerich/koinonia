import { ImageResponse } from "next/og";
import { siteConfig } from "@/config/site";

export const alt = siteConfig.nome;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Imagem padrão de compartilhamento (WhatsApp, redes sociais) para todas as páginas
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 80,
          background: "#171717",
          color: "#fafafa",
        }}
      >
        <div style={{ fontSize: 80, fontWeight: 700 }}>{siteConfig.nome}</div>
        <div style={{ fontSize: 36, marginTop: 24, opacity: 0.8 }}>{siteConfig.descricao}</div>
      </div>
    ),
    size,
  );
}
