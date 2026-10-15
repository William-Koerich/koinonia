import type { Metadata } from "next";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { getPessoas } from "@/lib/data/app";
import { GC_VAZIO } from "@/lib/validation/gc";
import { GcForm } from "../gc-form";

export const metadata: Metadata = { title: "Novo GC" };

export default async function NovoGcPage() {
  await requireRole("ADMIN", "PASTOR");
  const pessoas = await getPessoas();

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader titulo="Novo GC" />
      <Card>
        <CardContent>
          <GcForm valores={GC_VAZIO} pessoas={pessoas} />
        </CardContent>
      </Card>
    </div>
  );
}
