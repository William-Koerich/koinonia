import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PastorForm } from "../pastor-form";

export const metadata: Metadata = { title: "Editar pastor" };

export default async function EditarPastorPage({ params }: PageProps<"/app/conteudo/pastores/[id]">) {
  await requireRole("ADMIN", "PASTOR");
  const { id } = await params;

  const supabase = await createClient();
  const { data: pastor } = await supabase.from("koinonia_pastores").select("*").eq("id", id).maybeSingle();
  if (!pastor) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader titulo={`Editar ${pastor.nome}`} />
      <Card>
        <CardContent>
          <PastorForm
            id={pastor.id}
            valores={{
              nome: pastor.nome,
              cargo: pastor.cargo,
              bio: pastor.bio ?? "",
              foto_path: pastor.foto_path,
              ordem: String(pastor.ordem),
              ativo: pastor.ativo,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
