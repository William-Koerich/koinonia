import "server-only";
import { after } from "next/server";
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Envio das notificações push. Roda com a chave secreta (ignora a RLS), então
 * só é chamado pelo cron (/api/notificacoes/disparar) ou por Server Actions
 * que já checaram a permissão.
 */

let configurado = false;

function configurar(): boolean {
  if (configurado) return true;
  const publica = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privada = process.env.VAPID_PRIVATE_KEY;
  if (!publica || !privada) return false;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? "https://igrejakoinoniablumenau.vercel.app", publica, privada);
  configurado = true;
  return true;
}

export type ResultadoDisparo = { geradas: number; enviadas: number; notificacoes: number; erro?: string };

/** Gera os lembretes automáticos que venceram e envia tudo o que está agendado até agora */
export async function dispararPendentes(): Promise<ResultadoDisparo> {
  if (!configurar()) return { geradas: 0, enviadas: 0, notificacoes: 0, erro: "Chaves VAPID não configuradas." };

  const supabase = createAdminClient();
  const { data: geradas, error: erroGerar } = await supabase.rpc("koinonia_notificacoes_gerar_automaticas");
  if (erroGerar) return { geradas: 0, enviadas: 0, notificacoes: 0, erro: erroGerar.message };

  const { data: fila, error: erroFila } = await supabase.rpc("koinonia_notificacoes_reservar", { p_limite: 50 });
  if (erroFila) return { geradas: geradas ?? 0, enviadas: 0, notificacoes: 0, erro: erroFila.message };

  let totalEnviadas = 0;
  for (const n of fila ?? []) {
    const { data: destinos } = await supabase.rpc("koinonia_notificacao_destinos", { p_notificacao_id: n.id });
    const payload = JSON.stringify({ titulo: n.titulo, mensagem: n.mensagem, url: n.url, tag: n.chave ?? n.id });

    const resultados = await Promise.allSettled(
      (destinos ?? []).map((d) =>
        webpush.sendNotification({ endpoint: d.endpoint, keys: { p256dh: d.p256dh, auth: d.auth } }, payload, {
          TTL: 60 * 60 * 24, // se o aparelho estiver desligado, entrega em até 24h
          urgency: "normal",
        }),
      ),
    );

    // aparelho desinstalou ou revogou a permissão: remove a inscrição
    const expiradas = (destinos ?? []).filter((_, i) => {
      const r = resultados[i];
      return r.status === "rejected" && [404, 410].includes((r.reason as { statusCode?: number }).statusCode ?? 0);
    });
    if (expiradas.length) {
      await supabase.from("koinonia_push_inscricoes").delete().in("id", expiradas.map((d) => d.inscricao_id));
    }

    const enviadas = resultados.filter((r) => r.status === "fulfilled").length;
    totalEnviadas += enviadas;
    await supabase
      .from("koinonia_notificacoes")
      .update({ status: "enviada", enviadas, falhas: resultados.length - enviadas, enviada_em: new Date().toISOString() })
      .eq("id", n.id);
  }

  return { geradas: geradas ?? 0, enviadas: totalEnviadas, notificacoes: fila?.length ?? 0 };
}

/** Notificação de teste para os aparelhos de uma pessoa (botão "Enviar teste") */
export async function enviarTeste(profileId: string): Promise<number> {
  if (!configurar()) throw new Error("Chaves VAPID não configuradas.");
  const supabase = createAdminClient();
  const { data: inscricoes } = await supabase
    .from("koinonia_push_inscricoes")
    .select("id, endpoint, p256dh, auth")
    .eq("profile_id", profileId);

  const payload = JSON.stringify({
    titulo: "Notificações ativadas",
    mensagem: "Pronto! Você vai receber os avisos da igreja por aqui.",
    url: "/app",
    tag: "teste",
  });
  const resultados = await Promise.allSettled(
    (inscricoes ?? []).map((i) => webpush.sendNotification({ endpoint: i.endpoint, keys: { p256dh: i.p256dh, auth: i.auth } }, payload)),
  );
  return resultados.filter((r) => r.status === "fulfilled").length;
}

type SupabaseUsuario = Awaited<ReturnType<typeof import("@/lib/supabase/server").createClient>>;
type RegraImediata = "aviso_ativo" | "evento_ao_cadastrar";

/**
 * Notificação imediata de um aviso ou evento recém-criado, se a regra estiver
 * ligada. Entra na fila com a sessão de quem publicou (RLS: ADMIN/PASTOR) e é
 * enviada logo depois da resposta. Falha aqui nunca impede o salvamento.
 */
export async function notificarCriacao(
  supabase: SupabaseUsuario,
  regra: RegraImediata,
  notificacao: {
    titulo: string;
    mensagem: string | null;
    url: string;
    origem: "aviso" | "evento";
    publico: "todos" | "homens" | "mulheres";
    chave: string;
  },
) {
  const { data: config } = await supabase.from("koinonia_notificacao_config").select(regra).single();
  if (!config?.[regra as keyof typeof config]) return;

  const { error } = await supabase.from("koinonia_notificacoes").insert({
    ...notificacao,
    titulo: notificacao.titulo.slice(0, 100),
    mensagem: notificacao.mensagem?.slice(0, 300) ?? null,
  });
  if (!error) after(dispararPendentes);
}
