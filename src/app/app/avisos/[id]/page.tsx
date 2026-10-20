import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AvisoForm } from "../aviso-form";

export const metadata: Metadata = { title: "Editar aviso" };

export default async function EditarAvisoPage({ params }: PageProps<"/app/avisos/[id]">) {
  await requireRole("ADMIN", "PASTOR");
  const { id } = await params;

  const supabase = await createClient();
  const { data: aviso } = await supabase.from("koinonia_avisos").select("*").eq("id", id).maybeSingle();
  if (!aviso) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader titulo="Editar aviso" />
      <Card>
        <CardContent>
          <AvisoForm
            id={aviso.id}
            valores={{
              titulo: aviso.titulo,
              mensagem: aviso.mensagem ?? "",
              imagem_path: aviso.imagem_path,
              publico: aviso.publico,
              exibir_ate: aviso.exibir_ate ?? "",
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
