import type { NextRequest } from "next/server";
import { getProfile } from "@/lib/auth";
import { formatarCelular, formatarDataHora, slugify } from "@/lib/format";
import { isAdminOrPastor } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";

const STATUS = { confirmada: "Confirmada", pendente: "Pendente", espera: "Fila de espera", recusada: "Recusada" } as const;

/** Campo CSV: aspas duplicadas e, se preciso, entre aspas (o Excel em pt-BR usa ";") */
function campo(valor: string) {
  return /[;"\n]/.test(valor) ? `"${valor.replace(/"/g, '""')}"` : valor;
}

/** Lista de presença do evento em CSV (abre no Excel/Planilhas) */
export async function GET(_req: NextRequest, ctx: RouteContext<"/app/eventos/[id]/presenca">) {
  const { id } = await ctx.params;
  const profile = await getProfile();
  if (!profile?.ativo) return new Response("Não autorizado", { status: 401 });

  const supabase = await createClient();
  const { data: evento } = await supabase.from("koinonia_eventos").select("titulo, responsavel_id").eq("id", id).maybeSingle();
  if (!evento) return new Response("Evento não encontrado", { status: 404 });
  if (!isAdminOrPastor(profile.role) && evento.responsavel_id !== profile.id) {
    return new Response("Sem permissão", { status: 403 });
  }

  const { data: inscricoes, error } = await supabase
    .from("koinonia_evento_inscricoes")
    .select(
      "status, checkin_em, created_at, convidado_nome, convidado_celular, pessoa:koinonia_profiles!koinonia_evento_inscricoes_profile_id_fkey(nome_completo, celular)",
    )
    .eq("evento_id", id)
    .order("created_at");
  if (error) return new Response("Erro ao gerar a lista", { status: 500 });

  const linhas = inscricoes
    .map((i) => ({
      nome: i.pessoa?.nome_completo ?? i.convidado_nome ?? "Usuário",
      celular: i.pessoa?.celular ?? i.convidado_celular,
      tipo: i.convidado_nome ? "Convidado" : "Membro",
      situacao: STATUS[i.status],
      presente: i.checkin_em ? "Sim" : "Não",
      chegada: i.checkin_em ? formatarDataHora(i.checkin_em) : "",
      inscricao: formatarDataHora(i.created_at),
    }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  const csv = [
    ["Nome", "Celular", "Tipo", "Inscrição", "Presente", "Chegada", "Inscrito em"],
    ...linhas.map((l) => [l.nome, l.celular ? formatarCelular(l.celular) : "", l.tipo, l.situacao, l.presente, l.chegada, l.inscricao]),
  ]
    .map((linha) => linha.map(campo).join(";"))
    .join("\r\n");

  // BOM para o Excel reconhecer os acentos
  return new Response(`﻿${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="presenca-${slugify(evento.titulo)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
