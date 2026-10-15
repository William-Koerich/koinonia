import { ArrowLeftIcon, HandIcon, UsersIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireProfile } from "@/lib/auth";
import { getPessoas } from "@/lib/data/app";
import { formatarCelular, formatarData } from "@/lib/format";
import { isAdminOrPastor } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { AdicionarMembro } from "./adicionar-membro";
import { MembroAcoes } from "./membro-acoes";
import { DecisaoPedido, PedidoParticipacao } from "./pedido-participacao";

export const metadata: Metadata = { title: "Ministério" };

export default async function MinisterioPage({ params }: PageProps<"/app/ministerios/[id]">) {
  const profile = await requireProfile();
  const { id } = await params;

  const supabase = await createClient();
  const [{ data: ministerio }, { data: membros, error }, { data: pedidos }] = await Promise.all([
    supabase.from("koinonia_ministerios").select("id, nome, descricao").eq("id", id).maybeSingle(),
    // a RLS devolve todos os vínculos para ADMIN/PASTOR e para o líder deste
    // ministério; para os demais, só o próprio vínculo
    supabase
      .from("koinonia_ministerio_membros")
      .select(
        "profile_id, is_lider, perfil:koinonia_profiles!koinonia_ministerio_membros_profile_id_fkey(nome_completo, celular, ativo)",
      )
      .eq("ministerio_id", id),
    // pedidos para participar: mesma lógica (todos para quem decide, o próprio para os demais)
    supabase
      .from("koinonia_ministerio_solicitacoes")
      .select(
        "profile_id, created_at, pessoa:koinonia_perfis_basicos!koinonia_ministerio_solicitacoes_profile_id_fkey(nome_completo)",
      )
      .eq("ministerio_id", id)
      .order("created_at"),
  ]);
  if (!ministerio) notFound();
  if (error) throw new Error(error.message);

  const gerencia = isAdminOrPastor(profile.role);
  const meuVinculo = membros.find((m) => m.profile_id === profile.id);
  const lidera = !!meuVinculo?.is_lider;
  const veMembros = gerencia || lidera;
  const meuPedido = pedidos?.some((p) => p.profile_id === profile.id) ?? false;
  const pedidosPendentes = veMembros ? (pedidos ?? []) : [];

  const ordenados = [...membros].sort(
    (a, b) =>
      Number(b.is_lider) - Number(a.is_lider) ||
      (a.perfil?.nome_completo ?? "").localeCompare(b.perfil?.nome_completo ?? "", "pt-BR"),
  );

  return (
    <>
      <Link
        href="/app/ministerios"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" /> Ministérios
      </Link>
      <PageHeader titulo={ministerio.nome} descricao={ministerio.descricao ?? undefined}>
        {lidera && <Badge>Você lidera</Badge>}
        {meuVinculo && !lidera && <Badge variant="secondary">Você participa</Badge>}
      </PageHeader>

      {!veMembros ? (
        <EmptyState
          icone={UsersIcon}
          titulo={meuVinculo ? "Você faz parte deste ministério" : "Você ainda não faz parte deste ministério"}
          descricao={
            meuVinculo
              ? "A lista de membros é visível para os líderes do ministério, pastores e administradores."
              : "Peça para participar: os líderes do ministério recebem o pedido e aprovam."
          }
        >
          {!meuVinculo && <PedidoParticipacao ministerioId={ministerio.id} meuId={profile.id} pendente={meuPedido} />}
        </EmptyState>
      ) : (
        <div className="space-y-4">
          {pedidosPendentes.length > 0 && (
            <section className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-4">
              <h2 className="mb-3 flex items-center gap-2 font-medium">
                <HandIcon className="size-4 text-amber-600" />
                {pedidosPendentes.length === 1
                  ? "1 pedido para participar"
                  : `${pedidosPendentes.length} pedidos para participar`}
              </h2>
              <ul className="divide-y">
                {pedidosPendentes.map((p) => (
                  <li key={p.profile_id} className="flex flex-wrap items-center justify-between gap-3 py-2">
                    <div>
                      <p className="font-medium">{p.pessoa?.nome_completo ?? "Usuário inativo"}</p>
                      <p className="text-xs text-muted-foreground">Pediu em {formatarData(p.created_at)}</p>
                    </div>
                    <DecisaoPedido ministerioId={ministerio.id} profileId={p.profile_id} />
                  </li>
                ))}
              </ul>
            </section>
          )}

          <AdicionarMembro
            ministerioId={ministerio.id}
            pessoas={await getPessoas()}
            jaMembros={membros.map((m) => m.profile_id)}
            podeDefinirLider={gerencia}
          />

          {ordenados.length === 0 ? (
            <EmptyState icone={UsersIcon} titulo="Nenhum membro ainda" descricao="Adicione pessoas acima." />
          ) : (
            <div className="overflow-x-auto rounded-xl border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead className="hidden sm:table-cell">Celular</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ordenados.map((m) => {
                    const nome = m.perfil?.nome_completo ?? "—";
                    return (
                      <TableRow key={m.profile_id}>
                        <TableCell>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium">{nome}</span>
                            {m.is_lider && <Badge>Líder</Badge>}
                            {m.perfil && !m.perfil.ativo && <Badge variant="destructive">Inativo</Badge>}
                          </div>
                          {m.perfil && (
                            <a
                              href={`https://wa.me/55${m.perfil.celular}`}
                              className="text-xs text-muted-foreground hover:underline sm:hidden"
                            >
                              {formatarCelular(m.perfil.celular)}
                            </a>
                          )}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {m.perfil && (
                            <a href={`https://wa.me/55${m.perfil.celular}`} className="hover:underline">
                              {formatarCelular(m.perfil.celular)}
                            </a>
                          )}
                        </TableCell>
                        <TableCell>
                          <MembroAcoes
                            ministerioId={ministerio.id}
                            profileId={m.profile_id}
                            nome={nome}
                            isLider={m.is_lider}
                            podeDefinirLider={gerencia}
                            // o líder remove só membros comuns (e não a si mesmo)
                            podeRemover={gerencia || !m.is_lider}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}
    </>
  );
}
