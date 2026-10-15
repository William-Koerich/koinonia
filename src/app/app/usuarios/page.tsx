import { PlusIcon, UsersIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireRole } from "@/lib/auth";
import { getGcsOpcoes, getMinisteriosOpcoes } from "@/lib/data/app";
import { formatarCelular, somenteDigitos } from "@/lib/format";
import { ROLE_LABEL } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/types";
import { Filtros } from "./filtros";

export const metadata: Metadata = { title: "Usuários" };

export default async function UsuariosPage({ searchParams }: PageProps<"/app/usuarios">) {
  await requireRole("ADMIN", "PASTOR");
  const [gcs, ministerios] = await Promise.all([getGcsOpcoes(), getMinisteriosOpcoes()]);

  return (
    <>
      <PageHeader titulo="Usuários" descricao="Membros com acesso à área logada.">
        <Button asChild>
          <Link href="/app/usuarios/novo">
            <PlusIcon /> Novo usuário
          </Link>
        </Button>
      </PageHeader>
      <Filtros gcs={gcs} ministerios={ministerios} />
      <Suspense fallback={<TabelaSkeleton />}>
        <Tabela searchParams={searchParams} />
      </Suspense>
    </>
  );
}

const PAPEIS = Object.keys(ROLE_LABEL) as Role[];

function texto(valor: string | string[] | undefined): string {
  return typeof valor === "string" ? valor : "";
}

async function Tabela({ searchParams }: Pick<PageProps<"/app/usuarios">, "searchParams">) {
  const params = await searchParams;
  const q = texto(params.q).replace(/[,()%*\\]/g, " ").trim();
  const papel = texto(params.papel);
  const gc = texto(params.gc);
  const ministerio = texto(params.ministerio);
  const status = texto(params.status);

  const supabase = await createClient();
  let query = supabase
    .from("koinonia_profiles")
    .select(
      "id, nome_completo, email, celular, role, ativo, gc:koinonia_gcs!koinonia_profiles_gc_id_fkey(nome), ministerios:koinonia_ministerio_membros(is_lider, ministerio:koinonia_ministerios(nome))",
    )
    .order("nome_completo");

  if (q) {
    const digitos = somenteDigitos(q);
    query = query.or(
      [`nome_completo.ilike.%${q}%`, `email.ilike.%${q}%`, digitos.length >= 3 ? `celular.like.%${digitos}%` : null]
        .filter(Boolean)
        .join(","),
    );
  }
  if (PAPEIS.includes(papel as Role)) query = query.eq("role", papel as Role);
  if (gc === "sem") query = query.is("gc_id", null);
  else if (gc) query = query.eq("gc_id", gc);
  if (status === "ativos") query = query.eq("ativo", true);
  if (status === "inativos") query = query.eq("ativo", false);
  if (ministerio) {
    const { data: vinculos } = await supabase
      .from("koinonia_ministerio_membros")
      .select("profile_id")
      .eq("ministerio_id", ministerio);
    query = query.in("id", vinculos?.map((v) => v.profile_id) ?? []);
  }

  const { data: usuarios, error } = await query;
  if (error) throw new Error(error.message);

  if (usuarios.length === 0) {
    return <EmptyState icone={UsersIcon} titulo="Nenhum usuário encontrado" descricao="Ajuste a busca ou os filtros." />;
  }

  return (
    <>
      <p className="mb-2 text-sm text-muted-foreground">
        {usuarios.length} {usuarios.length === 1 ? "usuário" : "usuários"}
      </p>
      <div className="overflow-x-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead className="hidden md:table-cell">Celular</TableHead>
              <TableHead>Papel</TableHead>
              <TableHead className="hidden lg:table-cell">GC</TableHead>
              <TableHead className="hidden lg:table-cell">Ministérios</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {usuarios.map((u) => (
              <TableRow key={u.id} className={u.ativo ? undefined : "opacity-60"}>
                <TableCell>
                  <Link href={`/app/usuarios/${u.id}`} className="font-medium hover:underline">
                    {u.nome_completo}
                  </Link>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                  {!u.ativo && (
                    <Badge variant="destructive" className="mt-1">
                      Inativo
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="hidden md:table-cell">{formatarCelular(u.celular)}</TableCell>
                <TableCell>
                  <Badge variant={u.role === "MEMBRO" ? "secondary" : "default"}>{ROLE_LABEL[u.role]}</Badge>
                </TableCell>
                <TableCell className="hidden lg:table-cell">{u.gc?.nome ?? "—"}</TableCell>
                <TableCell className="hidden lg:table-cell">
                  <div className="flex flex-wrap gap-1">
                    {u.ministerios.length === 0
                      ? "—"
                      : u.ministerios.map((m) => (
                          <Badge key={m.ministerio?.nome} variant="outline">
                            {m.ministerio?.nome}
                            {m.is_lider && " · líder"}
                          </Badge>
                        ))}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

function TabelaSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 6 }, (_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}
