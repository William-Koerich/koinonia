import { FolderKanbanIcon, HandHeartIcon, UserRoundIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";

export const metadata: Metadata = { title: "Conteúdo do site" };

const SECOES = [
  { href: "/app/conteudo/pastores", titulo: "Pastores", descricao: "Fotos, nomes, cargos e bios da página Pastores.", icone: UserRoundIcon },
  { href: "/app/conteudo/projetos", titulo: "Projetos", descricao: "Projetos exibidos no site, com imagem e status.", icone: FolderKanbanIcon },
  { href: "/app/conteudo/contribuicao", titulo: "Contribuição", descricao: "Chave PIX, QR Code e dados bancários.", icone: HandHeartIcon },
];

export default async function ConteudoPage() {
  await requireRole("ADMIN", "PASTOR");

  return (
    <>
      <PageHeader titulo="Conteúdo do site" descricao="O que você alterar aqui aparece no site público na hora." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SECOES.map((s) => (
          <Link key={s.href} href={s.href} className="group">
            <Card className="h-full transition-shadow group-hover:shadow-md">
              <CardHeader>
                <s.icone className="mb-2 size-6 text-primary" />
                <CardTitle className="group-hover:underline">{s.titulo}</CardTitle>
                <CardDescription>{s.descricao}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
