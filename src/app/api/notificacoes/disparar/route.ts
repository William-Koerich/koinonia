import { dispararPendentes } from "@/lib/notificacoes";

/**
 * Chamado a cada 5 minutos pelo pg_cron do Supabase (ver migration 1810).
 * Protegido pelo CRON_SECRET no cabeçalho Authorization.
 */
export async function POST(request: Request) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo || request.headers.get("authorization") !== `Bearer ${segredo}`) {
    return Response.json({ erro: "Não autorizado." }, { status: 401 });
  }

  const resultado = await dispararPendentes();
  return Response.json(resultado, { status: resultado.erro ? 500 : 200 });
}
