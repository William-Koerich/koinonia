import type { Enums } from "@/lib/types";

/** Conta (banco/caixa) como aparece nos seletores */
export type CarteiraOpcao = {
  id: string;
  nome: string;
  tipo: Enums<"koinonia_carteira_tipo">;
  padrao: boolean;
  ativa: boolean;
};

/** Conta sugerida num lançamento novo: para dinheiro, o caixa; senão, a padrão */
export function carteiraSugerida(carteiras: CarteiraOpcao[], forma?: string): string | null {
  const ativas = carteiras.filter((c) => c.ativa);
  if (forma === "dinheiro") {
    const caixa = ativas.find((c) => c.tipo === "caixa");
    if (caixa) return caixa.id;
  }
  return ativas.find((c) => c.padrao)?.id ?? ativas[0]?.id ?? null;
}
