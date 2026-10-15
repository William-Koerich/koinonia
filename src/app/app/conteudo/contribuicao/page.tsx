import { ExternalLinkIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { formatarCnpj } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { ContribuicaoForm } from "./contribuicao-form";

export const metadata: Metadata = { title: "Contribuição (site)" };

export default async function ContribuicaoConteudoPage() {
  await requireRole("ADMIN", "PASTOR");
  const supabase = await createClient();
  const { data: c } = await supabase.from("koinonia_configuracoes_contribuicao").select("*").maybeSingle();

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader titulo="Contribuição" descricao="O QR Code PIX do site é gerado a partir destes dados.">
        <Button asChild variant="outline">
          <Link href="/contribuicao" target="_blank">
            <ExternalLinkIcon /> Ver no site
          </Link>
        </Button>
      </PageHeader>
      <Card>
        <CardContent>
          <ContribuicaoForm
            valores={{
              chave_pix: c?.chave_pix ?? "",
              tipo_chave: c?.tipo_chave ?? "",
              pix_recebedor: c?.pix_recebedor ?? "",
              pix_cidade: c?.pix_cidade ?? "",
              banco: c?.banco ?? "",
              agencia: c?.agencia ?? "",
              conta: c?.conta ?? "",
              titular: c?.titular ?? "",
              cnpj: c?.cnpj ? formatarCnpj(c.cnpj) : "",
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
