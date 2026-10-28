import { ArrowLeftIcon, DownloadIcon, PencilIcon, ScanLineIcon, UsersIcon } from "lucide-react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { EventoCard } from "@/components/site/evento-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireProfile } from "@/lib/auth";
import { siteConfig } from "@/config/site";
import { getPessoas } from "@/lib/data/app";
import { getContribuicao } from "@/lib/data/site";
import { formatarData, formatarDataHora, formatarHora, formatarMoeda, formatarTelefone } from "@/lib/format";
import { isAdminOrPastor, ROLES_FINANCEIRO } from "@/lib/permissions";
import { gerarPayloadPix } from "@/lib/pix";
import { createClient } from "@/lib/supabase/server";
import { AdicionarInscrito } from "./adicionar-inscrito";
import { InscricaoAcoes } from "./inscricao-acoes";
import { MinhaInscricao, type DadosPix, type Lotacao } from "./minha-inscricao";

export const metadata: Metadata = { title: "Evento" };

const STATUS = {
  pendente: { rotulo: "Pendente", variante: "outline" },
  confirmada: { rotulo: "Confirmada", variante: "default" },
  recusada: { rotulo: "Recusada", variante: "destructive" },
  espera: { rotulo: "Fila de espera", variante: "secondary" },
} as const;

const TIPO_CHAVE = { cnpj: "CNPJ", cpf: "CPF", email: "E-mail", telefone: "Telefone", aleatoria: "aleatória" } as const;

type PixEvento = {
  pix_chave: string | null;
  pix_tipo: keyof typeof TIPO_CHAVE | null;
  pix_recebedor: string | null;
};

/**
 * PIX da inscrição, com o valor do evento: a chave do próprio evento, se
 * houver; senão, a da igreja. Nome/cidade do recebedor (exigidos pelo QR Code)
 * caem nos dados da igreja e do site quando o evento não informa.
 */
async function dadosPix(valor: number, evento: PixEvento): Promise<DadosPix | null> {
  const igreja = await getContribuicao();
  const chave = evento.pix_chave ?? igreja?.chave_pix;
  const tipo = evento.pix_chave ? evento.pix_tipo : igreja?.tipo_chave;
  if (!chave || !tipo) return null;

  const recebedor = (evento.pix_chave && evento.pix_recebedor) || igreja?.pix_recebedor || siteConfig.nome;
  const cidade = igreja?.pix_cidade || siteConfig.endereco.cidade;
  const payload = gerarPayloadPix({ chave, tipo, recebedor, cidade, valor });
  const qrSvg = await QRCode.toString(payload, { type: "svg", margin: 0, errorCorrectionLevel: "M" });
  return { payload, qrSvg, chave, tipo: TIPO_CHAVE[tipo] };
}

/**
 * QR Code de check-in: um link para a tela de check-in do evento com o código
 * da inscrição. Lido pelo leitor do app ou pela câmera do celular de quem está
 * na porta (abre a tela já registrando a presença).
 */
async function qrCheckin(eventoId: string, codigo: string) {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const origem = host ? `${h.get("x-forwarded-proto") ?? "https"}://${host}` : siteConfig.url;
  const url = `${origem}/app/eventos/${eventoId}/checkin?codigo=${codigo}`;
  return QRCode.toString(url, { type: "svg", margin: 0, errorCorrectionLevel: "M" });
}

export default async function EventoPage({ params }: PageProps<"/app/eventos/[id]">) {
  const profile = await requireProfile();
  const { id } = await params;

  const supabase = await createClient();
  const [{ data: evento }, { data: minha }, { data: lotacao }] = await Promise.all([
    supabase
      .from("koinonia_eventos")
      .select(
        "id, titulo, descricao, inicio, fim, valor, vagas, publico, logradouro, numero, complemento, bairro, cidade, uf, responsavel_id, pix_chave, pix_tipo, pix_recebedor, responsavel:koinonia_perfis_basicos!koinonia_eventos_responsavel_id_fkey(nome_completo)",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("koinonia_evento_inscricoes")
      .select("status, pagamento_informado_em, created_at, checkin_em, codigo")
      .eq("evento_id", id)
      .eq("profile_id", profile.id)
      .maybeSingle(),
    supabase.rpc("koinonia_evento_lotacao", { p_evento_id: id }).maybeSingle(),
  ]);
  if (!evento) notFound();

  const valor = evento.valor === null ? null : Number(evento.valor);
  const gerencia = isAdminOrPastor(profile.role) || evento.responsavel_id === profile.id;
  const encerrado = new Date(evento.fim) < new Date();

  let bloqueio: string | null = null;
  if (encerrado) bloqueio = "As inscrições para este evento estão encerradas.";
  else if (evento.publico === "homens" && profile.genero !== "masculino") bloqueio = "Este evento é exclusivo para homens.";
  else if (evento.publico === "mulheres" && profile.genero !== "feminino") bloqueio = "Este evento é exclusivo para mulheres.";

  const pix = minha?.status === "pendente" && valor ? await dadosPix(valor, evento) : null;
  const qr = minha?.status === "confirmada" && !encerrado ? await qrCheckin(evento.id, minha.codigo) : null;

  return (
    <>
      <Link href="/app/eventos" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeftIcon className="size-4" /> Eventos
      </Link>
      <PageHeader titulo={evento.titulo}>
        {gerencia && (
          <Button asChild size="sm">
            <Link href={`/app/eventos/${evento.id}/checkin`}>
              <ScanLineIcon /> Check-in
            </Link>
          </Button>
        )}
        {gerencia && isAdminOrPastor(profile.role) && (
          <Button asChild variant="outline" size="sm">
            <Link href={`/app/eventos/${evento.id}/editar`}>
              <PencilIcon /> Editar
            </Link>
          </Button>
        )}
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-2">
        <EventoCard evento={evento} responsavel={evento.responsavel?.nome_completo} />
        <MinhaInscricao
          eventoId={evento.id}
          valor={valor}
          inscricao={minha}
          bloqueio={bloqueio}
          pix={pix}
          lotacao={(lotacao as Lotacao | null) ?? null}
          qrCheckin={qr}
        />
      </div>

      {gerencia && (
        <Inscritos
          eventoId={evento.id}
          valor={valor}
          vagas={evento.vagas}
          encerrado={encerrado}
          podeFinanceiro={ROLES_FINANCEIRO.includes(profile.role)}
        />
      )}
    </>
  );
}

/** Lista de inscritos para o responsável pelo evento, PASTOR e ADMIN */
async function Inscritos({
  eventoId,
  valor,
  vagas,
  encerrado,
  podeFinanceiro,
}: {
  eventoId: string;
  valor: number | null;
  vagas: number | null;
  encerrado: boolean;
  podeFinanceiro: boolean;
}) {
  const supabase = await createClient();
  const { data: inscricoes, error } = await supabase
    .from("koinonia_evento_inscricoes")
    .select(
      "id, status, observacao, pagamento_informado_em, created_at, checkin_em, profile_id, convidado_nome, convidado_celular, pessoa:koinonia_profiles!koinonia_evento_inscricoes_profile_id_fkey(nome_completo, celular)",
    )
    .eq("evento_id", eventoId)
    .order("created_at");
  if (error) throw new Error(error.message);

  const confirmadas = inscricoes.filter((i) => i.status === "confirmada").length;
  const pendentes = inscricoes.filter((i) => i.status === "pendente");
  const pagamentoInformado = pendentes.filter((i) => i.pagamento_informado_em).length;
  const fila = inscricoes.filter((i) => i.status === "espera"); // já em ordem de chegada
  const presentes = inscricoes.filter((i) => i.checkin_em).length;
  const ocupadas = confirmadas + pendentes.length;

  // pendentes que avisaram pagamento primeiro, depois as demais; a fila por último, na ordem
  const peso = (i: (typeof inscricoes)[number]) =>
    i.status === "espera" ? -1 : Number(i.status === "pendente" && !!i.pagamento_informado_em) * 2 + Number(i.status === "pendente");
  const ordenadas = [...inscricoes].sort((a, b) => peso(b) - peso(a));

  return (
    <section className="mt-10">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-heading text-xl font-semibold">Inscritos</h2>
        <div className="flex flex-wrap gap-2">
          {inscricoes.length > 0 && (
            <Button asChild variant="outline">
              <a href={`/app/eventos/${eventoId}/presenca`} download>
                <DownloadIcon /> Lista de presença
              </a>
            </Button>
          )}
          {!encerrado && (
            <AdicionarInscrito
              eventoId={eventoId}
              pago={valor !== null}
              podeFinanceiro={podeFinanceiro}
              pessoas={await getPessoas()}
              jaInscritos={inscricoes.flatMap((i) => (i.profile_id ? [i.profile_id] : []))}
            />
          )}
        </div>
      </div>

      <div className={`mb-4 grid grid-cols-2 gap-3 ${valor === null ? "lg:grid-cols-3" : "lg:grid-cols-5"}`}>
        {[
          { rotulo: vagas ? `Vagas ocupadas (de ${vagas})` : "Confirmadas", valor: vagas ? `${ocupadas}/${vagas}` : String(confirmadas) },
          ...(valor === null
            ? []
            : [{ rotulo: "Pendentes · avisaram que pagaram", valor: `${pendentes.length} · ${pagamentoInformado}` }]),
          { rotulo: "Na fila de espera", valor: String(fila.length) },
          { rotulo: "Presentes (check-in)", valor: `${presentes}/${confirmadas}` },
          ...(valor === null ? [] : [{ rotulo: "Arrecadado (confirmadas)", valor: formatarMoeda(confirmadas * valor) }]),
        ].map((item) => (
          <Card key={item.rotulo} className="py-4">
            <CardHeader className="px-4">
              <p className="text-xs text-muted-foreground">{item.rotulo}</p>
              <CardTitle className="text-2xl">{item.valor}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      {inscricoes.length === 0 ? (
        <EmptyState icone={UsersIcon} titulo="Ninguém inscrito ainda" />
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pessoa</TableHead>
                <TableHead>Situação</TableHead>
                <TableHead className="hidden md:table-cell">Inscrição</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ordenadas.map((i) => {
                const nome = i.pessoa?.nome_completo ?? i.convidado_nome ?? "Usuário";
                const celular = i.pessoa?.celular ?? i.convidado_celular;
                return (
                  <TableRow key={i.id}>
                    <TableCell className="align-top">
                      <p className="flex flex-wrap items-center gap-2 font-medium">
                        {nome}
                        {!i.profile_id && <Badge variant="secondary">Convidado</Badge>}
                      </p>
                      {celular && (
                        <a href={`https://wa.me/55${celular}`} className="text-xs text-muted-foreground hover:underline">
                          {formatarTelefone(celular)}
                        </a>
                      )}
                      {i.observacao && <p className="mt-1 max-w-xs text-xs text-muted-foreground italic">“{i.observacao}”</p>}
                    </TableCell>
                    <TableCell className="align-top">
                      <Badge variant={STATUS[i.status].variante}>
                        {STATUS[i.status].rotulo}
                        {i.status === "espera" && ` · ${fila.indexOf(i) + 1}º`}
                      </Badge>
                      {i.status === "pendente" && i.pagamento_informado_em && (
                        <p className="mt-1 text-xs font-medium text-amber-700">
                          Avisou que pagou · {formatarDataHora(i.pagamento_informado_em)}
                        </p>
                      )}
                      {i.checkin_em && (
                        <p className="mt-1 text-xs font-medium text-emerald-700">Presente · {formatarHora(i.checkin_em)}</p>
                      )}
                    </TableCell>
                    <TableCell className="hidden align-top text-sm text-muted-foreground md:table-cell">
                      {formatarData(i.created_at)}
                    </TableCell>
                    <TableCell className="align-top">
                      <InscricaoAcoes
                        eventoId={eventoId}
                        inscricaoId={i.id}
                        nome={nome}
                        status={i.status}
                        pago={valor !== null}
                        podeFinanceiro={podeFinanceiro}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}
