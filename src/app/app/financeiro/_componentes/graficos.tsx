"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { formatarMoeda } from "@/lib/format";
import { cn } from "@/lib/utils";

/*
 * Gráficos do financeiro em SVG puro (sem biblioteca). Regras seguidas:
 * colunas finas (≤ 24px) com ponta arredondada de 4px e base reta, 2px de
 * folga entre colunas vizinhas, grade e eixos discretos, legenda sempre que
 * há duas séries, tooltip ao passar o mouse (área de toque = a faixa inteira
 * do mês) e textos sempre na cor de texto (a cor fica só nas marcas).
 */

export type MesSerie = { mes: string; rotulo: string; rotuloLongo: string; entradas: number; despesas: number };

const ALTURA = 240;
const MARGEM = { topo: 12, direita: 8, base: 28, esquerda: 64 };

const compacto = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  maximumFractionDigits: 1,
});

/** Largura do contêiner (o SVG é desenhado na largura real, sem distorcer o texto) */
function useLargura<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [largura, setLargura] = useState(640);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new ResizeObserver(([e]) => setLargura(Math.max(280, Math.floor(e.contentRect.width))));
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return [ref, largura] as const;
}

/** Marcas "redondas" para o eixo: 0, 2 mil, 4 mil... */
function escala(min: number, max: number, alvo = 4) {
  const amplitude = Math.max(max - min, 1);
  const bruto = amplitude / alvo;
  const potencia = 10 ** Math.floor(Math.log10(bruto));
  const passo = [1, 2, 2.5, 5, 10].map((m) => m * potencia).find((p) => p >= bruto) ?? bruto;
  const inicio = Math.floor(min / passo) * passo;
  const fim = Math.ceil(max / passo) * passo;
  const marcas: number[] = [];
  for (let v = inicio; v <= fim + passo / 2; v += passo) marcas.push(Math.round(v * 100) / 100);
  return { inicio, fim: Math.max(fim, inicio + passo), marcas };
}

/** Coluna com 4px arredondados na ponta (cima ou baixo) e base reta */
function coluna(x: number, w: number, yBase: number, yPonta: number) {
  const h = Math.abs(yBase - yPonta);
  if (h < 0.5) return "";
  const r = Math.min(4, w / 2, h);
  if (yPonta < yBase) {
    return `M${x},${yBase}V${yPonta + r}Q${x},${yPonta} ${x + r},${yPonta}H${x + w - r}Q${x + w},${yPonta} ${x + w},${yPonta + r}V${yBase}Z`;
  }
  return `M${x},${yBase}V${yPonta - r}Q${x},${yPonta} ${x + r},${yPonta}H${x + w - r}Q${x + w},${yPonta} ${x + w},${yPonta - r}V${yBase}Z`;
}

function Legenda({ itens }: { itens: { rotulo: string; cor: string }[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {itens.map((i) => (
        <li key={i.rotulo} className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm" style={{ background: i.cor }} aria-hidden />
          {i.rotulo}
        </li>
      ))}
    </ul>
  );
}

function Tooltip({ x, largura, children }: { x: number; largura: number; children: React.ReactNode }) {
  // centralizado na faixa do mês, sem sair do gráfico
  const w = 176;
  const esquerda = Math.min(Math.max(x - w / 2, 0), largura - w);
  return (
    <div
      className="pointer-events-none absolute top-0 z-10 rounded-lg border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md"
      style={{ left: esquerda, width: w }}
      role="status"
    >
      {children}
    </div>
  );
}

function LinhaTooltip({ cor, rotulo, valor, forte }: { cor?: string; rotulo: string; valor: number; forte?: boolean }) {
  return (
    <p className="flex items-center justify-between gap-2">
      <span className="flex items-center gap-1.5 text-muted-foreground">
        {cor && <span className="size-2 rounded-sm" style={{ background: cor }} aria-hidden />}
        {rotulo}
      </span>
      <span className={cn("tabular-nums", forte && "font-semibold")}>{formatarMoeda(valor)}</span>
    </p>
  );
}

/** Eixo Y com grade em linhas finas e rótulos compactos (R$ 2 mil) */
function EixoY({ marcas, y, largura }: { marcas: number[]; y: (v: number) => number; largura: number }) {
  return (
    <g>
      {marcas.map((m) => (
        <g key={m}>
          <line
            x1={MARGEM.esquerda}
            x2={largura - MARGEM.direita}
            y1={y(m)}
            y2={y(m)}
            stroke={m === 0 ? "var(--viz-eixo)" : "var(--viz-grade)"}
            strokeWidth={1}
            shapeRendering="crispEdges"
          />
          <text x={MARGEM.esquerda - 8} y={y(m)} dy="0.32em" textAnchor="end" className="fill-muted-foreground text-[11px] tabular-nums">
            {compacto.format(m)}
          </text>
        </g>
      ))}
    </g>
  );
}

function EixoX({ meses, x, banda }: { meses: MesSerie[]; x: (i: number) => number; banda: number }) {
  // em telas estreitas, um mês sim, um não (o último sempre aparece)
  const pular = banda < 36 ? 2 : 1;
  return (
    <g>
      {meses.map((m, i) =>
        (meses.length - 1 - i) % pular === 0 ? (
          <text key={m.mes} x={x(i) + banda / 2} y={ALTURA - 8} textAnchor="middle" className="fill-muted-foreground text-[11px]">
            {m.rotulo}
          </text>
        ) : null,
      )}
    </g>
  );
}

/** Entradas × despesas por mês (colunas agrupadas) */
export function GraficoEntradasDespesas({ meses }: { meses: MesSerie[] }) {
  const [ref, largura] = useLargura<HTMLDivElement>();
  const [ativo, setAtivo] = useState<number | null>(null);

  const max = Math.max(...meses.flatMap((m) => [m.entradas, m.despesas]), 0);
  const { inicio, fim, marcas } = escala(0, max);
  const areaH = ALTURA - MARGEM.topo - MARGEM.base;
  const y = (v: number) => MARGEM.topo + areaH - ((v - inicio) / (fim - inicio)) * areaH;
  const banda = (largura - MARGEM.esquerda - MARGEM.direita) / meses.length;
  const x = (i: number) => MARGEM.esquerda + i * banda;
  const w = Math.max(3, Math.min(24, (banda * 0.7 - 2) / 2));

  return (
    <div className="space-y-3">
      <Legenda
        itens={[
          { rotulo: "Entradas", cor: "var(--viz-entrada)" },
          { rotulo: "Despesas pagas", cor: "var(--viz-despesa)" },
        ]}
      />
      <div ref={ref} className="relative [contain:inline-size]" onMouseLeave={() => setAtivo(null)}>
        <svg width={largura} height={ALTURA} role="img" aria-label="Entradas e despesas pagas por mês">
          <EixoY marcas={marcas} y={y} largura={largura} />
          {meses.map((m, i) => {
            const centro = x(i) + banda / 2;
            return (
              <g key={m.mes}>
                {ativo === i && <rect x={x(i)} y={MARGEM.topo} width={banda} height={areaH} className="fill-muted" opacity={0.6} />}
                <path d={coluna(centro - w - 1, w, y(0), y(m.entradas))} fill="var(--viz-entrada)" />
                <path d={coluna(centro + 1, w, y(0), y(m.despesas))} fill="var(--viz-despesa)" />
                {/* área de toque: a faixa inteira do mês */}
                <rect
                  x={x(i)}
                  y={MARGEM.topo}
                  width={banda}
                  height={areaH}
                  fill="transparent"
                  onMouseEnter={() => setAtivo(i)}
                  onClick={() => setAtivo(i)}
                />
              </g>
            );
          })}
          <EixoX meses={meses} x={x} banda={banda} />
        </svg>
        {ativo !== null && (
          <Tooltip x={x(ativo) + banda / 2} largura={largura}>
            <p className="mb-1 font-medium first-letter:uppercase">{meses[ativo].rotuloLongo}</p>
            <LinhaTooltip cor="var(--viz-entrada)" rotulo="Entradas" valor={meses[ativo].entradas} />
            <LinhaTooltip cor="var(--viz-despesa)" rotulo="Despesas" valor={meses[ativo].despesas} />
            <div className="mt-1 border-t pt-1">
              <LinhaTooltip rotulo="Saldo" valor={meses[ativo].entradas - meses[ativo].despesas} forte />
            </div>
          </Tooltip>
        )}
      </div>
    </div>
  );
}

/** Saldo de cada mês: colunas para cima (positivo) ou para baixo (negativo) a partir do zero */
export function GraficoSaldo({ meses }: { meses: MesSerie[] }) {
  const [ref, largura] = useLargura<HTMLDivElement>();
  const [ativo, setAtivo] = useState<number | null>(null);

  const saldos = meses.map((m) => m.entradas - m.despesas);
  const { inicio, fim, marcas } = escala(Math.min(0, ...saldos), Math.max(0, ...saldos));
  const areaH = ALTURA - MARGEM.topo - MARGEM.base;
  const y = (v: number) => MARGEM.topo + areaH - ((v - inicio) / (fim - inicio)) * areaH;
  const banda = (largura - MARGEM.esquerda - MARGEM.direita) / meses.length;
  const x = (i: number) => MARGEM.esquerda + i * banda;
  const w = Math.max(4, Math.min(24, banda * 0.55));

  return (
    <div className="space-y-3">
      <Legenda
        itens={[
          { rotulo: "Sobrou (positivo)", cor: "var(--viz-entrada)" },
          { rotulo: "Faltou (negativo)", cor: "var(--viz-negativo)" },
        ]}
      />
      <div ref={ref} className="relative [contain:inline-size]" onMouseLeave={() => setAtivo(null)}>
        <svg width={largura} height={ALTURA} role="img" aria-label="Saldo de cada mês">
          <EixoY marcas={marcas} y={y} largura={largura} />
          {meses.map((m, i) => {
            const saldo = saldos[i];
            return (
              <g key={m.mes}>
                {ativo === i && <rect x={x(i)} y={MARGEM.topo} width={banda} height={areaH} className="fill-muted" opacity={0.6} />}
                <path
                  d={coluna(x(i) + (banda - w) / 2, w, y(0), y(saldo))}
                  fill={saldo >= 0 ? "var(--viz-entrada)" : "var(--viz-negativo)"}
                />
                <rect
                  x={x(i)}
                  y={MARGEM.topo}
                  width={banda}
                  height={areaH}
                  fill="transparent"
                  onMouseEnter={() => setAtivo(i)}
                  onClick={() => setAtivo(i)}
                />
              </g>
            );
          })}
          <EixoX meses={meses} x={x} banda={banda} />
        </svg>
        {ativo !== null && (
          <Tooltip x={x(ativo) + banda / 2} largura={largura}>
            <p className="mb-1 font-medium first-letter:uppercase">{meses[ativo].rotuloLongo}</p>
            <LinhaTooltip rotulo="Entradas" valor={meses[ativo].entradas} />
            <LinhaTooltip rotulo="Despesas" valor={meses[ativo].despesas} />
            <div className="mt-1 border-t pt-1">
              <LinhaTooltip
                cor={saldos[ativo] >= 0 ? "var(--viz-entrada)" : "var(--viz-negativo)"}
                rotulo="Saldo"
                valor={saldos[ativo]}
                forte
              />
            </div>
          </Tooltip>
        )}
      </div>
    </div>
  );
}

/** Ranking por categoria: barras horizontais finas com o valor na ponta */
export function BarrasCategoria({
  itens,
  cor,
  vazio,
}: {
  itens: { rotulo: string; valor: number }[];
  cor: string;
  vazio: string;
}) {
  const visiveis = itens.filter((i) => i.valor > 0).sort((a, b) => b.valor - a.valor);
  if (visiveis.length === 0) return <p className="py-8 text-center text-sm text-muted-foreground">{vazio}</p>;
  const max = visiveis[0].valor;
  const total = visiveis.reduce((t, i) => t + i.valor, 0);

  return (
    <ul className="space-y-3">
      {visiveis.map((i) => (
        <li key={i.rotulo} title={`${i.rotulo}: ${formatarMoeda(i.valor)} (${Math.round((i.valor / total) * 100)}%)`}>
          <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
            <span>{i.rotulo}</span>
            <span className="tabular-nums">
              {formatarMoeda(i.valor)}{" "}
              <span className="text-xs text-muted-foreground">{Math.round((i.valor / total) * 100)}%</span>
            </span>
          </div>
          <div className="h-2.5 w-full">
            <div className="h-full rounded-r-[4px]" style={{ width: `${Math.max((i.valor / max) * 100, 1)}%`, background: cor }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
