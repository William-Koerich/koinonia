import type { Metadata } from "next";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { AVISO_VAZIO } from "@/lib/validation/aviso";
import { AvisoForm } from "../aviso-form";

export const metadata: Metadata = { title: "Novo aviso" };

export default async function NovoAvisoPage() {
  await requireRole("ADMIN", "PASTOR");

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader titulo="Novo aviso" />
      <Card>
        <CardContent>
          <AvisoForm valores={AVISO_VAZIO} />
        </CardContent>
      </Card>
    </div>
  );
}
