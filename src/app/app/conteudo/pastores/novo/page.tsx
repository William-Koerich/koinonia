import type { Metadata } from "next";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { PastorForm } from "../pastor-form";

export const metadata: Metadata = { title: "Novo pastor" };

export default async function NovoPastorPage() {
  await requireRole("ADMIN", "PASTOR");

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader titulo="Novo pastor" />
      <Card>
        <CardContent>
          <PastorForm valores={{ nome: "", cargo: "", bio: "", foto_path: null, ordem: "0", ativo: true }} />
        </CardContent>
      </Card>
    </div>
  );
}
