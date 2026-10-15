import type { Metadata } from "next";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { ProjetoForm } from "../projeto-form";

export const metadata: Metadata = { title: "Novo projeto" };

export default async function NovoProjetoPage() {
  await requireRole("ADMIN", "PASTOR");

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader titulo="Novo projeto" />
      <Card>
        <CardContent>
          <ProjetoForm
            valores={{
              titulo: "",
              slug: "",
              resumo: "",
              descricao: "",
              imagens: [],
              capa: null,
              status: "em_andamento",
              publicado: true,
              ordem: "0",
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
