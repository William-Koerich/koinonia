import { renderToBuffer } from "@react-pdf/renderer";
import type { NextRequest } from "next/server";
import { siteConfig } from "@/config/site";
import { getProfile } from "@/lib/auth";
import { getRelatorio } from "@/lib/data/financeiro";
import { getContribuicao } from "@/lib/data/site";
import { formatarCnpj, hojeISO } from "@/lib/format";
import { ROLES_FINANCEIRO } from "@/lib/permissions";
import { lerPeriodo } from "../periodo";
import { RelatorioPdf } from "../relatorio-pdf";

/** PDF do relatório financeiro do período (?de=AAAA-MM&ate=AAAA-MM&detalhado=1) */
export async function GET(req: NextRequest) {
  const profile = await getProfile();
  if (!profile?.ativo || !ROLES_FINANCEIRO.includes(profile.role)) return new Response("Sem permissão", { status: 403 });

  const periodo = lerPeriodo(Object.fromEntries(req.nextUrl.searchParams), hojeISO().slice(0, 7));
  const [dados, contribuicao] = await Promise.all([
    getRelatorio(periodo.inicio, periodo.fim, periodo.detalhado),
    getContribuicao(),
  ]);
  const e = siteConfig.endereco;

  const pdf = await renderToBuffer(
    RelatorioPdf({
      dados,
      igreja: {
        nome: siteConfig.nome,
        cnpj: contribuicao?.cnpj ? formatarCnpj(contribuicao.cnpj) : null,
        endereco: `${e.logradouro}, ${e.bairro} - ${e.cidade}/${e.uf}`,
      },
      geradoPor: profile.nome_completo,
    }),
  );

  const nome = periodo.de === periodo.ate ? periodo.de : `${periodo.de}_a_${periodo.ate}`;
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="relatorio-financeiro-${nome}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
