import { ArrowLeftIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/app/page-header";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { RegrasForm } from "./regras-form";

export const metadata: Metadata = { title: "Regras de notificação" };

export default async function RegrasPage() {
  await requireRole("ADMIN", "PASTOR");

  const supabase = await createClient();
  const { data: c, error } = await supabase.from("koinonia_notificacao_config").select("*").single();
  if (error) throw new Error(error.message);

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/app/notificacoes" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeftIcon className="size-4" /> Notificações
      </Link>
      <PageHeader titulo="Regras automáticas" descricao="Quando o Koinonia avisa as pessoas sozinho. Horários de Brasília." />
      <RegrasForm
        valores={{
          escala_ativo: c.escala_ativo,
          escala_dias_antes: String(c.escala_dias_antes),
          escala_horario: c.escala_horario.slice(0, 5),
          aviso_ativo: c.aviso_ativo,
          evento_ao_cadastrar: c.evento_ao_cadastrar,
          evento_dias_antes: c.evento_dias_antes,
          evento_horario: c.evento_horario.slice(0, 5),
          evento_na_hora: c.evento_na_hora,
          evento_minutos_antes: String(c.evento_minutos_antes) as "0" | "15" | "30" | "60" | "120",
        }}
      />
    </div>
  );
}
