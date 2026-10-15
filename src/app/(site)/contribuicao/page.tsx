import type { Metadata } from "next";
import { cacheLife } from "next/cache";
import QRCode from "qrcode";
import { CopyButton } from "@/components/site/copy-button";
import { Reveal } from "@/components/site/fx/reveal";
import { EmptyState, PageHero, Section } from "@/components/site/section";
import { Rotulo } from "@/components/site/tela";
import { getContribuicao } from "@/lib/data/site";
import { formatarCnpj } from "@/lib/format";
import { imagens } from "@/lib/imagens";
import { gerarPayloadPix } from "@/lib/pix";

export const metadata: Metadata = {
  title: "Contribuição",
  description: "Contribua com a igreja por PIX ou transferência bancária.",
};

const TIPO_CHAVE_LABEL = {
  cnpj: "CNPJ",
  cpf: "CPF",
  email: "E-mail",
  telefone: "Telefone",
  aleatoria: "Chave aleatória",
} as const;

async function qrCodeSvg(payload: string): Promise<string> {
  "use cache";
  cacheLife("max");
  return QRCode.toString(payload, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#2b2420" } });
}

export default async function ContribuicaoPage() {
  const dados = await getContribuicao();

  const payloadPix =
    dados?.chave_pix && dados.tipo_chave && dados.pix_recebedor && dados.pix_cidade
      ? gerarPayloadPix({
          chave: dados.chave_pix,
          tipo: dados.tipo_chave,
          recebedor: dados.pix_recebedor,
          cidade: dados.pix_cidade,
        })
      : null;
  const qr = payloadPix ? await qrCodeSvg(payloadPix) : null;
  const bancarios = dados
    ? [
        ["Banco", dados.banco],
        ["Agência", dados.agencia],
        ["Conta", dados.conta],
        ["Titular", dados.titular],
        ["CNPJ", dados.cnpj && formatarCnpj(dados.cnpj)],
      ].filter(([, valor]) => valor)
    : [];

  return (
    <>
      <PageHero
        rotulo="Contribuição"
        titulo="Servir também é dar."
        descricao="“Cada um dê conforme determinou em seu coração, não com pesar ou por obrigação, pois Deus ama quem dá com alegria.” — 2 Coríntios 9:7"
        imagem={imagens.contribuaMaos}
      />
      <Section>
        {!payloadPix && bancarios.length === 0 ? (
          <EmptyState>Os dados para contribuição serão publicados em breve.</EmptyState>
        ) : (
          <div className="grid gap-16 lg:grid-cols-2 lg:gap-24">
            {payloadPix && dados?.chave_pix && dados.tipo_chave && (
              <Reveal>
                <Rotulo>PIX</Rotulo>
                <div className="flex flex-col gap-8 sm:flex-row sm:items-start">
                  {qr && (
                    <div
                      className="w-44 shrink-0 rounded-2xl bg-white p-4 shadow-sm [&>svg]:h-auto [&>svg]:w-full"
                      role="img"
                      aria-label="QR Code PIX"
                      // SVG gerado pela biblioteca qrcode a partir do nosso payload
                      dangerouslySetInnerHTML={{ __html: qr }}
                    />
                  )}
                  <div className="min-w-0 space-y-5">
                    <div>
                      <p className="text-sm text-muted-foreground">{TIPO_CHAVE_LABEL[dados.tipo_chave]}</p>
                      <p className="mt-1 font-display text-3xl break-all">{dados.chave_pix}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <CopyButton texto={dados.chave_pix} label="Copiar chave" mensagem="Chave PIX copiada!" />
                      <CopyButton texto={payloadPix} label="PIX copia e cola" mensagem="Código PIX copiado!" />
                    </div>
                    <p className="text-sm text-muted-foreground">Aponte a câmera do app do seu banco para o QR Code.</p>
                  </div>
                </div>
              </Reveal>
            )}

            {bancarios.length > 0 && (
              <Reveal delay={0.1}>
                <Rotulo>Transferência</Rotulo>
                <dl className="divide-y divide-border border-y border-border">
                  {bancarios.map(([rotulo, valor]) => (
                    <div key={rotulo} className="flex justify-between gap-6 py-4">
                      <dt className="text-muted-foreground">{rotulo}</dt>
                      <dd className="text-right font-medium">{valor}</dd>
                    </div>
                  ))}
                </dl>
              </Reveal>
            )}
          </div>
        )}
      </Section>
    </>
  );
}
