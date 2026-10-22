import { BellIcon, ClockIcon, Settings2Icon, SmartphoneIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ConfirmarExclusao } from "@/components/app/confirmar-exclusao";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { getGcsOpcoes, getMinisteriosOpcoes } from "@/lib/data/app";
import { formatarDataHora } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { DESTINOS, ORIGENS, PUBLICOS_NOTIFICACAO } from "@/lib/validation/notificacao";
import { cancelarNotificacao } from "./actions";
import { NotificacaoDialog } from "./notificacao-dialog";

export const metadata: Metadata = { title: "Notificações" };

const rotuloDias = (d: number) => (d === 0 ? "no dia" : d === 1 ? "1 dia antes" : `${d} dias antes`);

export default async function NotificacoesPage() {
  await requireRole("ADMIN", "PASTOR");

  const supabase = await createClient();
  const [ministerios, gcs, { data: inscricoes }, { data: config }, { data: agendadas, error }, { data: historico, error: erroHist }] =
    await Promise.all([
      getMinisteriosOpcoes(),
      getGcsOpcoes(),
      supabase.from("koinonia_push_inscricoes").select("profile_id"),
      supabase.from("koinonia_notificacao_config").select("*").single(),
      supabase.from("koinonia_notificacoes").select("*").in("status", ["agendada", "enviando"]).order("agendada_para").limit(50),
      supabase
        .from("koinonia_notificacoes")
        .select("*")
        .in("status", ["enviada", "cancelada"])
        .order("agendada_para", { ascending: false })
        .limit(40),
    ]);
  if (error) throw new Error(error.message);
  if (erroHist) throw new Error(erroHist.message);

  const aparelhos = inscricoes?.length ?? 0;
  const pessoas = new Set(inscricoes?.map((i) => i.profile_id)).size;
  const nomeGrupo = new Map([...ministerios, ...gcs].map((g) => [g.id, g.nome]));

  const publicoDe = (n: { publico: string; publico_id: string | null }) =>
    n.publico === "perfil"
      ? "Pessoa escalada"
      : n.publico === "ministerio" || n.publico === "gc"
        ? `${n.publico === "gc" ? "GC" : "Ministério"} ${nomeGrupo.get(n.publico_id ?? "") ?? ""}`.trim()
        : PUBLICOS_NOTIFICACAO.find((p) => p.value === n.publico)?.label;
  const destinoDe = (url: string) => DESTINOS.find((d) => d.value === url)?.label;

  const regras = config
    ? [
        config.escala_ativo &&
          `Escala: um lembrete por dia às ${config.escala_horario.slice(0, 5)}, ${
            config.escala_dias_antes === 0 ? "só no dia" : `a partir de ${config.escala_dias_antes} dias antes`
          }`,
        config.aviso_ativo && "Avisos: na hora em que são publicados",
        config.evento_ao_cadastrar && "Eventos: quando um evento é cadastrado",
        config.evento_dias_antes.length &&
          `Eventos: ${config.evento_dias_antes.map(rotuloDias).join(", ")}, às ${config.evento_horario.slice(0, 5)}`,
        config.evento_na_hora &&
          `Eventos: ${config.evento_minutos_antes === 0 ? "quando começam" : `${config.evento_minutos_antes} min antes de começar`}`,
      ].filter(Boolean)
    : [];

  return (
    <>
      <PageHeader titulo="Notificações" descricao="Mensagens no celular de quem ativou as notificações do Koinonia.">
        <Button asChild variant="outline">
          <Link href="/app/notificacoes/regras">
            <Settings2Icon /> Regras automáticas
          </Link>
        </Button>
        <NotificacaoDialog ministerios={ministerios} gcs={gcs} />
      </PageHeader>

      <div className="mb-6 grid gap-4 md:grid-cols-[1fr_2fr]">
        <Card>
          <CardContent className="flex items-center gap-3">
            <SmartphoneIcon className="size-8 text-primary" />
            <div>
              <p className="text-2xl font-semibold">{pessoas}</p>
              <p className="text-sm text-muted-foreground">
                {pessoas === 1 ? "pessoa recebe" : "pessoas recebem"} notificações ({aparelhos}{" "}
                {aparelhos === 1 ? "aparelho" : "aparelhos"})
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Enviadas automaticamente</CardTitle>
            <CardDescription>
              {regras.length ? (
                <ul className="mt-1 list-disc space-y-0.5 pl-4">
                  {regras.map((r) => (
                    <li key={String(r)}>{r}</li>
                  ))}
                </ul>
              ) : (
                "Nenhuma regra automática ligada."
              )}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      <section className="mb-8">
        <h2 className="mb-3 flex items-center gap-2 font-heading text-lg font-semibold">
          <ClockIcon className="size-5 text-muted-foreground" /> Agendadas
        </h2>
        {!agendadas.length ? (
          <p className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
            Nenhuma notificação agendada. Lembretes automáticos entram aqui na hora de sair.
          </p>
        ) : (
          <ul className="divide-y rounded-xl border">
            {agendadas.map((n) => (
              <li key={n.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{n.titulo}</p>
                  {n.mensagem && <p className="text-sm text-muted-foreground">{n.mensagem}</p>}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatarDataHora(n.agendada_para)} · {publicoDe(n)} · abre {destinoDe(n.url) ?? n.url}
                  </p>
                </div>
                {n.status === "enviando" ? (
                  <Badge variant="secondary">Enviando...</Badge>
                ) : (
                  <ConfirmarExclusao
                    rotulo="Cancelar"
                    titulo="Cancelar esta notificação?"
                    descricao="Ela não será enviada."
                    acao={cancelarNotificacao.bind(null, n.id)}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 flex items-center gap-2 font-heading text-lg font-semibold">
          <BellIcon className="size-5 text-muted-foreground" /> Enviadas
        </h2>
        {!historico.length ? (
          <EmptyState icone={BellIcon} titulo="Nenhuma notificação enviada ainda" />
        ) : (
          <ul className="divide-y rounded-xl border">
            {historico.map((n) => (
              <li key={n.id} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {n.titulo}{" "}
                    <Badge variant="outline" className="ml-1 align-middle">
                      {ORIGENS[n.origem]}
                    </Badge>
                  </p>
                  {n.mensagem && <p className="truncate text-sm text-muted-foreground">{n.mensagem}</p>}
                  <p className="text-xs text-muted-foreground">
                    {formatarDataHora(n.enviada_em ?? n.agendada_para)} · {publicoDe(n)}
                  </p>
                </div>
                {n.status === "cancelada" ? (
                  <Badge variant="secondary">Cancelada</Badge>
                ) : (
                  <p className="shrink-0 text-sm text-muted-foreground">
                    {n.enviadas} {n.enviadas === 1 ? "aparelho" : "aparelhos"}
                    {n.falhas > 0 && ` · ${n.falhas} falharam`}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
