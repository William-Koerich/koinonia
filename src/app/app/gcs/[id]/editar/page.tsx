import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { getPessoas } from "@/lib/data/app";
import { createClient } from "@/lib/supabase/server";
import { GcForm } from "../../gc-form";

export const metadata: Metadata = { title: "Editar GC" };

export default async function EditarGcPage({ params }: PageProps<"/app/gcs/[id]/editar">) {
  await requireRole("ADMIN", "PASTOR");
  const { id } = await params;

  const supabase = await createClient();
  const [{ data: gc }, pessoas] = await Promise.all([
    supabase.from("koinonia_gcs").select("*").eq("id", id).maybeSingle(),
    getPessoas(),
  ]);
  if (!gc) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader titulo={`Editar ${gc.nome}`} />
      <Card>
        <CardContent>
          <GcForm
            id={gc.id}
            pessoas={pessoas}
            valores={{
              nome: gc.nome,
              dia_semana: gc.dia_semana === null ? "" : String(gc.dia_semana),
              horario: gc.horario?.slice(0, 5) ?? "",
              lider_id: gc.lider_id,
              cep: gc.cep,
              logradouro: gc.logradouro,
              numero: gc.numero,
              complemento: gc.complemento ?? "",
              bairro: gc.bairro,
              cidade: gc.cidade,
              uf: gc.uf,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
