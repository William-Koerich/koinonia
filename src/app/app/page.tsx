import { CakeIcon, CalendarDaysIcon, ClipboardListIcon, CoffeeIcon, HandIcon, TicketIcon, TriangleAlertIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireProfile } from "@/lib/auth";
import { formatarDataLonga, formatarHora, formatarValorEvento, hojeISO } from "@/lib/format";
import { isAdminOrPastor } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export const metadata: Metadata = { title: "Início" };

export default async function DashboardPage() {
  const profile = await requireProfile();
  const gerencia = isAdminOrPastor(profile.role);
  const perfilIncompleto = /^0+$/.test(profile.celular);

  return (
    <>
      <PageHeader titulo={`Olá, ${profile.nome_completo.split(" ")[0]}!`} descricao={formatarDataLonga(hojeISO())} />

      {perfilIncompleto && (
        <Card className="mb-6 border-amber-500/50 bg-amber-500/5">
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <TriangleAlertIcon className="size-5 shrink-0 text-amber-600" />
            <p className="flex-1 text-sm">Seu celular e sua data de nascimento ainda não foram preenchidos.</p>
            <Button asChild size="sm" variant="outline">
              <Link href="/app/perfil">Completar perfil</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <PedidosParaDecidir meuId={profile.id} />
      <InscricoesAConferir meuId={profile.id} />
      <MinhasInscricoes meuId={profile.id} />

      <div className="grid gap-6 lg:grid-cols-2">
        <MinhasEscalas profile={profile} />
        <ProximosEventos />
        {gerencia && <Aniversariantes />}
      </div>
    </>
  );
}

/** Pedidos para participar de ministérios que o usuário pode aprovar (RLS: líder do ministério, PASTOR, ADMIN) */
async function PedidosParaDecidir({ meuId }: { meuId: string }) {
  const supabase = await createClient();
  const { data: pedidos } = await supabase
    .from("koinonia_ministerio_solicitacoes")
    .select(
      "profile_id, ministerio:koinonia_ministerios(id, nome), pessoa:koinonia_perfis_basicos!koinonia_ministerio_solicitacoes_profile_id_fkey(nome_completo)",
    )
    .neq("profile_id", meuId)
    .order("created_at");
  if (!pedidos?.length) return null;

  return (
    <Card className="mb-6 border-amber-500/50 bg-amber-500/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HandIcon className="size-5 text-amber-600" />
          {pedidos.length === 1 ? "1 pedido para participar de ministério" : `${pedidos.length} pedidos para participar de ministérios`}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="divide-y">
          {pedidos.map((p) => (
            <li key={`${p.ministerio?.id}-${p.profile_id}`} className="flex items-center justify-between gap-3 py-2">
              <p className="min-w-0 truncate">
                <span className="font-medium">{p.pessoa?.nome_completo ?? "Usuário"}</span>
                <span className="text-muted-foreground"> quer participar de </span>
                <span className="font-medium">{p.ministerio?.nome}</span>
              </p>
              <Button asChild size="sm" variant="outline">
                <Link href={`/app/ministerios/${p.ministerio?.id}`}>Analisar</Link>
              </Button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

/** Inscrições pendentes nos eventos que o usuário gerencia (responsável, PASTOR, ADMIN) */
async function InscricoesAConferir({ meuId }: { meuId: string }) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("koinonia_evento_inscricoes")
    .select("evento_id, pagamento_informado_em, evento:koinonia_eventos!inner(titulo, fim)")
    .eq("status", "pendente")
    .neq("profile_id", meuId)
    .gte("evento.fim", new Date().toISOString());
  if (!data?.length) return null;

  // agrupa por evento
  const porEvento = new Map<string, { titulo: string; pendentes: number; pagos: number }>();
  for (const i of data) {
    const atual = porEvento.get(i.evento_id) ?? { titulo: i.evento.titulo, pendentes: 0, pagos: 0 };
    atual.pendentes++;
    if (i.pagamento_informado_em) atual.pagos++;
    porEvento.set(i.evento_id, atual);
  }

  return (
    <Card className="mb-6 border-amber-500/50 bg-amber-500/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TicketIcon className="size-5 text-amber-600" /> Inscrições aguardando confirmação
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="divide-y">
          {[...porEvento].map(([eventoId, e]) => (
            <li key={eventoId} className="flex items-center justify-between gap-3 py-2">
              <p className="min-w-0">
                <span className="font-medium">{e.titulo}</span>
                <span className="text-sm text-muted-foreground">
                  {" "}
                  · {e.pendentes} {e.pendentes === 1 ? "pendente" : "pendentes"}
                  {e.pagos > 0 && `, ${e.pagos} ${e.pagos === 1 ? "avisou" : "avisaram"} que pagou`}
                </span>
              </p>
              <Button asChild size="sm" variant="outline">
                <Link href={`/app/eventos/${eventoId}`}>Conferir</Link>
              </Button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

/** Próximos eventos em que o usuário está inscrito */
async function MinhasInscricoes({ meuId }: { meuId: string }) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("koinonia_evento_inscricoes")
    .select("evento_id, status, pagamento_informado_em, evento:koinonia_eventos!inner(titulo, inicio, fim)")
    .eq("profile_id", meuId)
    .gte("evento.fim", new Date().toISOString());
  if (!data?.length) return null;

  const ordenadas = [...data].sort((a, b) => a.evento.inicio.localeCompare(b.evento.inicio));
  const situacao = (i: (typeof data)[number]) =>
    i.status === "confirmada"
      ? { texto: "Confirmada", classe: "text-emerald-700" }
      : i.status === "recusada"
        ? { texto: "Recusada", classe: "text-destructive" }
        : i.pagamento_informado_em
          ? { texto: "Pagamento em conferência", classe: "text-amber-700" }
          : { texto: "Aguardando seu pagamento", classe: "text-amber-700" };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TicketIcon className="size-5 text-primary" /> Minhas inscrições
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="divide-y">
          {ordenadas.map((i) => {
            const s = situacao(i);
            return (
              <li key={i.evento_id}>
                <Link href={`/app/eventos/${i.evento_id}`} className="flex items-center justify-between gap-3 py-2 hover:underline">
                  <span className="min-w-0">
                    <span className="font-medium">{i.evento.titulo}</span>
                    <span className="text-sm text-muted-foreground first-letter:uppercase">
                      {" "}
                      · {formatarDataLonga(i.evento.inicio)}
                    </span>
                  </span>
                  <span className={`shrink-0 text-sm font-medium ${s.classe}`}>{s.texto}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

async function MinhasEscalas({ profile }: { profile: Profile }) {
  const hoje = hojeISO();
  const supabase = await createClient();

  const { data: meusMinisterios } = await supabase
    .from("koinonia_ministerio_membros")
    .select("ministerio_id")
    .eq("profile_id", profile.id);
  const ministeriosIds = meusMinisterios?.map((m) => m.ministerio_id) ?? [];

  // cantina do meu GC ou de algum dos meus ministérios
  const filtrosCantina = [
    profile.gc_id ? `gc_id.eq.${profile.gc_id}` : null,
    ministeriosIds.length ? `ministerio_id.in.(${ministeriosIds.join(",")})` : null,
  ].filter(Boolean);

  const [{ data: servico }, { data: cantina }] = await Promise.all([
    supabase
      .from("koinonia_escala_atribuicoes")
      .select("id, funcao:koinonia_escala_funcoes(funcao), escala:koinonia_escalas!inner(id, data, descricao)")
      .eq("profile_id", profile.id)
      .gte("escala.data", hoje),
    filtrosCantina.length
      ? supabase
          .from("koinonia_cantina_escalas")
          .select("id, data, descricao, gc:koinonia_gcs(nome), ministerio:koinonia_ministerios(nome)")
          .gte("data", hoje)
          .or(filtrosCantina.join(","))
          .order("data")
          .limit(5)
      : Promise.resolve({ data: [] }),
  ]);

  const proximoServico = [...(servico ?? [])].sort((a, b) => a.escala.data.localeCompare(b.escala.data)).slice(0, 5);
  const vazio = proximoServico.length === 0 && !cantina?.length;

  return (
    <Card className="lg:row-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardListIcon className="size-5 text-primary" /> Minhas escalas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {vazio && <p className="text-sm text-muted-foreground">Você não está em nenhuma escala nos próximos dias.</p>}

        {proximoServico.length > 0 && (
          <ul className="space-y-2">
            {proximoServico.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/app/escala/${a.escala.id}`}
                  className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 hover:bg-muted"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{a.escala.descricao}</p>
                    <p className="text-xs text-muted-foreground first-letter:uppercase">
                      {formatarDataLonga(a.escala.data)}
                    </p>
                  </div>
                  <Badge>{a.funcao?.funcao}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {!!cantina?.length && (
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-sm font-medium">
              <CoffeeIcon className="size-4" /> Cantina
            </p>
            <ul className="space-y-2">
              {cantina.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-sm first-letter:uppercase">{formatarDataLonga(c.data)}</p>
                    {c.descricao && <p className="text-xs text-muted-foreground">{c.descricao}</p>}
                  </div>
                  <div className="flex flex-wrap justify-end gap-1">
                    {c.gc && <Badge variant="secondary">GC {c.gc.nome}</Badge>}
                    {c.ministerio && <Badge variant="secondary">{c.ministerio.nome}</Badge>}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/app/escala">Ver escalas</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/app/cantina">Ver cantina</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

async function ProximosEventos() {
  const supabase = await createClient();
  const { data: eventos } = await supabase
    .from("koinonia_eventos")
    .select("id, titulo, inicio, valor, publico")
    .gte("fim", new Date().toISOString())
    .order("inicio")
    .limit(4);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarDaysIcon className="size-5 text-primary" /> Próximos eventos
        </CardTitle>
        <CardAction>
          <Button asChild variant="link" size="sm" className="px-0">
            <Link href="/app/eventos">Ver todos</Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {!eventos?.length ? (
          <p className="text-sm text-muted-foreground">Nenhum evento agendado.</p>
        ) : (
          <ul className="divide-y">
            {eventos.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate font-medium">{e.titulo}</p>
                  <p className="text-xs text-muted-foreground first-letter:uppercase">
                    {formatarDataLonga(e.inicio)}, {formatarHora(e.inicio)}
                  </p>
                </div>
                <Badge variant={e.valor === null ? "secondary" : "outline"}>{formatarValorEvento(e.valor)}</Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

/** Só ADMIN/PASTOR: a RLS libera a data de nascimento de todos apenas para eles */
async function Aniversariantes() {
  const hoje = hojeISO();
  const mes = hoje.slice(5, 7);
  const supabase = await createClient();
  const { data } = await supabase
    .from("koinonia_profiles")
    .select("id, nome_completo, data_nascimento, celular")
    .eq("ativo", true)
    .order("nome_completo");

  // filtro de mês em memória: o PostgREST não filtra por extract(month)
  const aniversariantes = (data ?? [])
    .filter((p) => p.data_nascimento.slice(5, 7) === mes && !/^0+$/.test(p.celular))
    .sort((a, b) => a.data_nascimento.slice(8).localeCompare(b.data_nascimento.slice(8)));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CakeIcon className="size-5 text-primary" /> Aniversariantes do mês
        </CardTitle>
      </CardHeader>
      <CardContent>
        {aniversariantes.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum aniversariante este mês.</p>
        ) : (
          <ul className="divide-y">
            {aniversariantes.map((p) => {
              const dia = p.data_nascimento.slice(8, 10);
              const ehHoje = dia === hoje.slice(8, 10);
              const jaPassou = dia < hoje.slice(8, 10);
              return (
                <li key={p.id} className={`flex items-center gap-3 py-2 ${jaPassou ? "opacity-50" : ""}`}>
                  <span className="w-8 text-center font-mono text-sm font-semibold">{dia}</span>
                  <span className="min-w-0 flex-1 truncate">{p.nome_completo}</span>
                  {ehHoje && <Badge>Hoje! 🎉</Badge>}
                  <a href={`https://wa.me/55${p.celular}`} className="text-xs text-muted-foreground hover:underline">
                    WhatsApp
                  </a>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
