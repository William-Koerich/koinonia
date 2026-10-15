import type { Metadata } from "next";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { getPessoas } from "@/lib/data/app";
import { EVENTO_VAZIO } from "@/lib/validation/evento";
import { EventoForm } from "../evento-form";

export const metadata: Metadata = { title: "Novo evento" };

export default async function NovoEventoPage() {
  await requireRole("ADMIN", "PASTOR");
  const pessoas = await getPessoas();

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader titulo="Novo evento" />
      <Card>
        <CardContent>
          <EventoForm valores={EVENTO_VAZIO} pessoas={pessoas} />
        </CardContent>
      </Card>
    </div>
  );
}
