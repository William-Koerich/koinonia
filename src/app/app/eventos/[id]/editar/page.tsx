import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { getPessoas } from "@/lib/data/app";
import { formatarMoedaInput, paraInputDataHora } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { EventoForm } from "../../evento-form";

export const metadata: Metadata = { title: "Editar evento" };

export default async function EditarEventoPage({ params }: PageProps<"/app/eventos/[id]/editar">) {
  await requireRole("ADMIN", "PASTOR");
  const { id } = await params;

  const supabase = await createClient();
  const [{ data: evento }, pessoas] = await Promise.all([
    supabase.from("koinonia_eventos").select("*").eq("id", id).maybeSingle(),
    getPessoas(),
  ]);
  if (!evento) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader titulo="Editar evento" descricao={evento.titulo} />
      <Card>
        <CardContent>
          <EventoForm
            id={evento.id}
            pessoas={pessoas}
            valores={{
              titulo: evento.titulo,
              descricao: evento.descricao ?? "",
              inicio: paraInputDataHora(evento.inicio),
              fim: paraInputDataHora(evento.fim),
              // numeric chega como number: 35 → "3500" centavos → "35,00"
              valor: evento.valor === null ? "" : formatarMoedaInput(Number(evento.valor).toFixed(2)),
              responsavel_id: evento.responsavel_id,
              publico: evento.publico,
              vagas: evento.vagas === null ? "" : String(evento.vagas),
              pix_chave: evento.pix_chave ?? "",
              pix_tipo: evento.pix_tipo ?? "",
              pix_recebedor: evento.pix_recebedor ?? "",
              cep: evento.cep,
              logradouro: evento.logradouro,
              numero: evento.numero,
              complemento: evento.complemento ?? "",
              bairro: evento.bairro,
              cidade: evento.cidade,
              uf: evento.uf,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
