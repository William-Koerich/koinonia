import { MegaphoneIcon, PencilIcon, PlusIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AvisoCard } from "@/components/app/aviso-card";
import { ConfirmarExclusao } from "@/components/app/confirmar-exclusao";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireProfile } from "@/lib/auth";
import { formatarData, hojeISO } from "@/lib/format";
import { isAdminOrPastor } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { excluirAviso } from "./actions";

export const metadata: Metadata = { title: "Avisos" };

export default async function AvisosPage() {
  const profile = await requireProfile();
  const gerencia = isAdminOrPastor(profile.role);

  // a RLS já limita: membros recebem só os vigentes; ADMIN/PASTOR, todos
  const supabase = await createClient();
  const { data: avisos, error } = await supabase
    .from("koinonia_avisos")
    .select("id, titulo, mensagem, imagem_path, publico, exibir_ate, created_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  const hoje = hojeISO();
  const vencido = (a: (typeof avisos)[number]) => a.exibir_ate !== null && a.exibir_ate < hoje;
  // vigentes primeiro, depois os vencidos (só ADMIN/PASTOR os recebem)
  const ordenados = [...avisos].sort((a, b) => Number(vencido(a)) - Number(vencido(b)));

  return (
    <>
      <PageHeader titulo="Avisos" descricao="Comunicados da igreja: mudanças de horário, recados e novidades.">
        {gerencia && (
          <Button asChild>
            <Link href="/app/avisos/novo">
              <PlusIcon /> Novo aviso
            </Link>
          </Button>
        )}
      </PageHeader>

      {ordenados.length === 0 ? (
        <EmptyState
          icone={MegaphoneIcon}
          titulo="Nenhum aviso no momento"
          descricao={gerencia ? "Publique um aviso para comunicar a igreja." : undefined}
        />
      ) : (
        <div className="grid items-start gap-4 md:grid-cols-2">
          {ordenados.map((a) => (
            <AvisoCard key={a.id} aviso={a} className={vencido(a) ? "opacity-60" : undefined}>
              {gerencia && (
                <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
                  <div className="flex flex-wrap gap-1.5">
                    {vencido(a) ? (
                      <Badge variant="secondary">Encerrado</Badge>
                    ) : (
                      <Badge variant="outline">{a.exibir_ate ? `Até ${formatarData(a.exibir_ate)}` : "Sem data de fim"}</Badge>
                    )}
                    <Badge variant="outline">{a.publico ? "Site + membros" : "Só membros"}</Badge>
                  </div>
                  <div className="flex">
                    <Button asChild variant="ghost" size="icon" aria-label="Editar aviso">
                      <Link href={`/app/avisos/${a.id}`}>
                        <PencilIcon />
                      </Link>
                    </Button>
                    <ConfirmarExclusao
                      somenteIcone
                      titulo={`Remover o aviso "${a.titulo}"?`}
                      descricao="O aviso sai do site e da área dos membros."
                      acao={excluirAviso.bind(null, a.id)}
                    />
                  </div>
                </div>
              )}
            </AvisoCard>
          ))}
        </div>
      )}
    </>
  );
}
