import { Document, Page, StyleSheet, Text, View, type DocumentProps } from "@react-pdf/renderer";
import type { ReactElement } from "react";
import type { Relatorio } from "@/lib/data/financeiro";
import { formatarData, formatarDataHora, formatarMoeda } from "@/lib/format";
import { nomeDoMes, rotuloCategoria, rotuloDespesa, somarMes, type CategoriaDespesa, type CategoriaEntrada } from "@/lib/validation/financeiro";

/*
 * Relatório de prestação de contas (assembleia / conselho fiscal) em A4.
 * Usa a Helvetica embutida do PDF: cobre acentos do português, mas não
 * símbolos fora do Latin-1 (por isso "-" no lugar de "−" e nada de setas).
 */

const COR = { texto: "#1f1b17", suave: "#6b625a", linha: "#d9d2ca", fundo: "#f5f1ec", positivo: "#1f6f43", negativo: "#b42318" };

const s = StyleSheet.create({
  pagina: { paddingTop: 40, paddingBottom: 56, paddingHorizontal: 44, fontSize: 9.5, fontFamily: "Helvetica", color: COR.texto },
  cabecalho: { borderBottomWidth: 1.5, borderBottomColor: COR.texto, paddingBottom: 10, marginBottom: 16 },
  igreja: { fontSize: 16, fontFamily: "Helvetica-Bold" },
  subtitulo: { fontSize: 11, marginTop: 4 },
  meta: { fontSize: 8.5, color: COR.suave, marginTop: 3 },
  secao: { marginTop: 16 },
  tituloSecao: { fontSize: 11, fontFamily: "Helvetica-Bold", marginBottom: 6 },
  linha: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: COR.linha, paddingVertical: 4 },
  linhaCabecalho: { flexDirection: "row", backgroundColor: COR.fundo, paddingVertical: 4, fontFamily: "Helvetica-Bold" },
  linhaTotal: { flexDirection: "row", paddingVertical: 5, fontFamily: "Helvetica-Bold", borderTopWidth: 1, borderTopColor: COR.texto },
  celula: { flex: 1, paddingHorizontal: 4 },
  numero: { width: 92, paddingHorizontal: 4, textAlign: "right" },
  resumo: { flexDirection: "row", gap: 8 },
  bloco: { flex: 1, backgroundColor: COR.fundo, padding: 8, borderRadius: 3 },
  blocoRotulo: { fontSize: 8, color: COR.suave },
  blocoValor: { fontSize: 13, fontFamily: "Helvetica-Bold", marginTop: 3 },
  nota: { fontSize: 8, color: COR.suave, marginTop: 4 },
  assinaturas: { flexDirection: "row", gap: 24, marginTop: 48 },
  assinatura: { flex: 1, borderTopWidth: 0.8, borderTopColor: COR.texto, paddingTop: 4, fontSize: 8.5, textAlign: "center" },
  rodape: { position: "absolute", bottom: 24, left: 44, right: 44, flexDirection: "row", justifyContent: "space-between", fontSize: 7.5, color: COR.suave },
});

const moeda = (v: number) => formatarMoeda(v).replace("−", "-");

function Linha({
  rotulo,
  valores,
  estilo,
}: {
  rotulo: string;
  valores: (number | string)[];
  estilo?: (typeof s)[keyof typeof s];
}) {
  return (
    <View style={estilo ?? s.linha} wrap={false}>
      <Text style={s.celula}>{rotulo}</Text>
      {valores.map((v, i) => (
        <Text key={i} style={[s.numero, typeof v === "number" && v < 0 ? { color: COR.negativo } : {}]}>
          {typeof v === "number" ? moeda(v) : v}
        </Text>
      ))}
    </View>
  );
}

export function RelatorioPdf({
  dados,
  igreja,
  geradoPor,
}: {
  dados: Relatorio;
  igreja: { nome: string; cnpj: string | null; endereco: string };
  geradoPor: string;
}): ReactElement<DocumentProps> {
  const resultado = dados.totalEntradas - dados.totalDespesas;
  const mesInicio = dados.inicio.slice(0, 7);
  const mesFim = dados.fim.slice(0, 7);
  const periodo =
    mesInicio === mesFim ? nomeDoMes(mesInicio) : `${nomeDoMes(mesInicio)} a ${nomeDoMes(mesFim)}`;
  const meses: string[] = [];
  for (let m = mesInicio; m <= mesFim; m = somarMes(m, 1)) meses.push(m);
  const saldoInicio = dados.contas.reduce((t, c) => t + c.inicio, 0);
  const saldoFim = dados.contas.reduce((t, c) => t + c.fim, 0);
  const totalAbertas = dados.abertas.reduce((t, c) => t + c.valor, 0);
  const orcamento = dados.orcamento.filter((l) => l.orcamento || l.realizado > 0);
  const anoOrcamento = dados.fim.slice(0, 4);

  return (
    <Document title={`Relatório financeiro - ${periodo}`} author={igreja.nome} language="pt-BR">
      <Page size="A4" style={s.pagina}>
        <View style={s.cabecalho}>
          <Text style={s.igreja}>{igreja.nome}</Text>
          <Text style={s.subtitulo}>Relatório financeiro · {periodo}</Text>
          <Text style={s.meta}>
            {igreja.cnpj ? `CNPJ ${igreja.cnpj} · ` : ""}
            {igreja.endereco}
          </Text>
          <Text style={s.meta}>
            Período de {formatarData(dados.inicio)} a {formatarData(dados.fim)} · regime de caixa (valores efetivamente recebidos e pagos)
          </Text>
        </View>

        {/* resumo */}
        <View style={s.resumo}>
          <View style={s.bloco}>
            <Text style={s.blocoRotulo}>Entradas</Text>
            <Text style={[s.blocoValor, { color: COR.positivo }]}>{moeda(dados.totalEntradas)}</Text>
          </View>
          <View style={s.bloco}>
            <Text style={s.blocoRotulo}>Despesas pagas</Text>
            <Text style={s.blocoValor}>{moeda(dados.totalDespesas)}</Text>
          </View>
          <View style={s.bloco}>
            <Text style={s.blocoRotulo}>Resultado do período</Text>
            <Text style={[s.blocoValor, { color: resultado < 0 ? COR.negativo : COR.positivo }]}>{moeda(resultado)}</Text>
          </View>
          {dados.contas.length > 0 && (
            <View style={s.bloco}>
              <Text style={s.blocoRotulo}>Saldo em contas no fim</Text>
              <Text style={s.blocoValor}>{moeda(saldoFim)}</Text>
            </View>
          )}
        </View>

        {/* saldos por conta */}
        {dados.contas.length > 0 && (
          <View style={s.secao}>
            <Text style={s.tituloSecao}>Saldos das contas</Text>
            <Linha rotulo="Conta" valores={["Início", "Fim", "Variação"]} estilo={s.linhaCabecalho} />
            {dados.contas.map((c) => (
              <Linha key={c.nome} rotulo={c.nome} valores={[c.inicio, c.fim, c.fim - c.inicio]} />
            ))}
            <Linha rotulo="Total" valores={[saldoInicio, saldoFim, saldoFim - saldoInicio]} estilo={s.linhaTotal} />
            <Text style={s.nota}>
              Variação diferente do resultado indica lançamentos sem conta informada ou contas cadastradas durante o período.
            </Text>
          </View>
        )}

        {/* entradas e despesas por categoria */}
        <View style={s.secao}>
          <Text style={s.tituloSecao}>Entradas por categoria</Text>
          {[...dados.entradasPorCategoria]
            .sort((a, b) => b[1] - a[1])
            .map(([cat, valor]) => (
              <Linha key={cat} rotulo={rotuloCategoria(cat as CategoriaEntrada)} valores={[valor]} />
            ))}
          <Linha rotulo="Total de entradas" valores={[dados.totalEntradas]} estilo={s.linhaTotal} />
        </View>

        <View style={s.secao}>
          <Text style={s.tituloSecao}>Despesas por categoria</Text>
          {[...dados.despesasPorCategoria]
            .sort((a, b) => b[1] - a[1])
            .map(([cat, valor]) => (
              <Linha key={cat} rotulo={rotuloDespesa(cat as CategoriaDespesa)} valores={[valor]} />
            ))}
          <Linha rotulo="Total de despesas" valores={[dados.totalDespesas]} estilo={s.linhaTotal} />
        </View>

        {/* mês a mês */}
        {meses.length > 1 && (
          <View style={s.secao} wrap={false}>
            <Text style={s.tituloSecao}>Mês a mês</Text>
            <Linha rotulo="Mês" valores={["Entradas", "Despesas", "Resultado"]} estilo={s.linhaCabecalho} />
            {meses.map((m) => {
              const e = dados.entradasPorMes.get(m) ?? 0;
              const d = dados.despesasPorMes.get(m) ?? 0;
              return <Linha key={m} rotulo={nomeDoMes(m)} valores={[e, d, e - d]} />;
            })}
            <Linha rotulo="Total" valores={[dados.totalEntradas, dados.totalDespesas, resultado]} estilo={s.linhaTotal} />
          </View>
        )}

        {/* orçamento */}
        {orcamento.length > 0 && (
          <View style={s.secao}>
            <Text style={s.tituloSecao}>Orçamento {anoOrcamento} por ministério (previsto x realizado no ano)</Text>
            <Linha rotulo="Ministério" valores={["Previsto", "Realizado", "Uso"]} estilo={s.linhaCabecalho} />
            {orcamento.map((l) => (
              <Linha
                key={l.ministerioId ?? "geral"}
                rotulo={l.nome}
                valores={[
                  l.orcamento ? l.orcamento.valor : "-",
                  l.realizado,
                  l.orcamento ? `${Math.round((l.realizado / l.orcamento.valor) * 100)}%` : "-",
                ]}
              />
            ))}
            <Text style={s.nota}>Realizado de janeiro até a data deste relatório ({formatarData(dados.fim)}), mesmo que o período acima seja menor.</Text>
          </View>
        )}

        {/* compromissos */}
        <View style={s.secao}>
          <Text style={s.tituloSecao}>Contas em aberto até {formatarData(dados.fim)}</Text>
          {dados.abertas.length === 0 ? (
            <Text style={s.nota}>Nenhuma conta vencida ou a vencer em aberto no período.</Text>
          ) : (
            <>
              {dados.abertas.slice(0, 25).map((c, i) => (
                <Linha key={i} rotulo={`${formatarData(c.vencimento)}  ${c.descricao}`} valores={[c.valor]} />
              ))}
              {dados.abertas.length > 25 && <Text style={s.nota}>... e mais {dados.abertas.length - 25} contas.</Text>}
              <Linha rotulo="Total em aberto" valores={[totalAbertas]} estilo={s.linhaTotal} />
            </>
          )}
        </View>

        {/* detalhado */}
        {dados.despesas && dados.despesas.length > 0 && (
          <View style={s.secao} break>
            <Text style={s.tituloSecao}>Despesas pagas no período (detalhado)</Text>
            <View style={s.linhaCabecalho} fixed>
              <Text style={{ width: 58, paddingHorizontal: 4 }}>Data</Text>
              <Text style={s.celula}>Descrição</Text>
              <Text style={{ width: 110, paddingHorizontal: 4 }}>Categoria</Text>
              <Text style={s.numero}>Valor</Text>
            </View>
            {dados.despesas.map((d, i) => (
              <View key={i} style={s.linha} wrap={false}>
                <Text style={{ width: 58, paddingHorizontal: 4 }}>{formatarData(d.data)}</Text>
                <View style={s.celula}>
                  <Text>{d.descricao}</Text>
                  {(d.fornecedor || d.ministerio) && (
                    <Text style={{ fontSize: 7.5, color: COR.suave }}>{[d.fornecedor, d.ministerio].filter(Boolean).join(" · ")}</Text>
                  )}
                </View>
                <Text style={{ width: 110, paddingHorizontal: 4 }}>{rotuloDespesa(d.categoria as CategoriaDespesa)}</Text>
                <Text style={s.numero}>{moeda(d.valor)}</Text>
              </View>
            ))}
            <Linha rotulo="Total" valores={[dados.totalDespesas]} estilo={s.linhaTotal} />
          </View>
        )}

        <View style={s.assinaturas} wrap={false}>
          <Text style={s.assinatura}>Tesoureiro(a)</Text>
          <Text style={s.assinatura}>Pastor(a) presidente</Text>
          <Text style={s.assinatura}>Conselho fiscal</Text>
        </View>

        <View style={s.rodape} fixed>
          <Text>
            Gerado em {formatarDataHora(new Date())} por {geradoPor}
          </Text>
          <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
