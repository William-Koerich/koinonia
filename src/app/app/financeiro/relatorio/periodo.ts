import { fimDoMes, mesValido } from "@/lib/validation/financeiro";

/** Período do relatório a partir da URL: meses "de" e "até" (padrão: janeiro até o mês atual) */
export function lerPeriodo(params: Record<string, string | string[] | undefined>, mesAtual: string) {
  let de = mesValido(params.de, `${mesAtual.slice(0, 4)}-01`);
  let ate = mesValido(params.ate, mesAtual);
  if (de > ate) [de, ate] = [ate, de];
  return { de, ate, inicio: `${de}-01`, fim: fimDoMes(ate), detalhado: params.detalhado === "1" };
}
