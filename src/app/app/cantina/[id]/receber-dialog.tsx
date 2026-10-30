"use client";

import { BanknoteIcon, CreditCardIcon, Loader2Icon, MinusIcon, PlusIcon, QrCodeIcon } from "lucide-react";
import { useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";
import { MoedaInput } from "@/components/forms/moeda-input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatarMoeda, formatarMoedaInput } from "@/lib/format";
import { cn } from "@/lib/utils";
import { FORMAS_CANTINA, type FormaCantina } from "@/lib/validation/cantina";
import { pagarReserva, registrarVenda } from "./actions";

export type ItemVenda = { id: string; nome: string; preco: number | null; restante: number | null };

const ICONE_FORMA = { pix: QrCodeIcon, dinheiro: BanknoteIcon, cartao: CreditCardIcon };

const valorInput = (v: number | null) => (v === null ? "" : formatarMoedaInput(v.toFixed(2)));

/**
 * Recebimento na cantina: paga uma reserva (item e quantidade já definidos) ou
 * registra uma venda no balcão (escolhe item e quantidade). O valor vem do
 * preço e pode ser ajustado (ex.: desconto, item sem preço).
 */
export function ReceberDialog({
  cantinaId,
  reserva,
  itens,
  children,
}: {
  cantinaId: string;
  reserva?: { id: string; descricao: string; valorSugerido: number | null };
  /** venda no balcão: itens do cardápio */
  itens?: ItemVenda[];
  children: ReactNode;
}) {
  const [aberto, setAberto] = useState(false);
  const [itemId, setItemId] = useState("");
  const [quantidade, setQuantidade] = useState(1);
  const [forma, setForma] = useState<FormaCantina | null>(null);
  const [valor, setValor] = useState("");
  const [pending, startTransition] = useTransition();

  const item = itens?.find((i) => i.id === itemId);
  const maximo = Math.min(200, item?.restante ?? 200);

  function abrir(abrindo: boolean) {
    setAberto(abrindo);
    if (!abrindo) return;
    setItemId("");
    setQuantidade(1);
    setForma(null);
    setValor(valorInput(reserva?.valorSugerido ?? null));
  }

  // muda item/quantidade: recalcula pelo preço
  function escolher(novoItem: string, novaQtd: number) {
    setItemId(novoItem);
    setQuantidade(novaQtd);
    const preco = itens?.find((i) => i.id === novoItem)?.preco ?? null;
    setValor(valorInput(preco === null ? null : preco * novaQtd));
  }

  function confirmar() {
    if (!forma) {
      toast.error("Escolha como foi pago.");
      return;
    }
    startTransition(async () => {
      const result = reserva
        ? await pagarReserva(cantinaId, reserva.id, forma, valor)
        : await registrarVenda(cantinaId, { item_id: itemId, quantidade, forma, valor });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message);
      setAberto(false);
    });
  }

  return (
    <Dialog open={aberto} onOpenChange={abrir}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{reserva ? "Receber pagamento" : "Venda no balcão"}</DialogTitle>
          <DialogDescription>
            {reserva ? `${reserva.descricao}. ` : ""}O valor entra sozinho nas entradas do financeiro, somado às outras vendas
            desta cantina.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {itens && (
            <div className="flex flex-wrap items-end gap-3">
              <Field className="min-w-48 flex-1">
                <FieldLabel htmlFor="venda-item">Item</FieldLabel>
                <Select value={itemId} onValueChange={(v) => escolher(v, 1)}>
                  <SelectTrigger id="venda-item" className="w-full">
                    <SelectValue placeholder="Escolha o item" />
                  </SelectTrigger>
                  <SelectContent>
                    {itens.map((i) => (
                      <SelectItem key={i.id} value={i.id} disabled={i.restante === 0}>
                        {i.nome}
                        {i.preco !== null && ` · ${formatarMoeda(i.preco)}`}
                        {i.restante === 0 && " · esgotado"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <div className="flex items-center rounded-lg border">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Diminuir"
                  disabled={!item || quantidade <= 1}
                  onClick={() => escolher(itemId, quantidade - 1)}
                >
                  <MinusIcon />
                </Button>
                <span className="w-8 text-center font-medium tabular-nums" aria-live="polite">
                  {quantidade}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Aumentar"
                  disabled={!item || quantidade >= maximo}
                  onClick={() => escolher(itemId, quantidade + 1)}
                >
                  <PlusIcon />
                </Button>
              </div>
            </div>
          )}

          <Field>
            <FieldLabel>Como foi pago</FieldLabel>
            <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Como foi pago">
              {FORMAS_CANTINA.map((f) => {
                const Icone = ICONE_FORMA[f.value];
                return (
                  <button
                    key={f.value}
                    type="button"
                    role="radio"
                    aria-checked={forma === f.value}
                    onClick={() => setForma(f.value)}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-lg border px-3 py-2.5 text-sm transition-colors",
                      forma === f.value ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
                    )}
                  >
                    <Icone className="size-5" /> {f.label}
                  </button>
                );
              })}
            </div>
          </Field>

          <Field>
            <FieldLabel htmlFor="venda-valor">Valor recebido</FieldLabel>
            <MoedaInput id="venda-valor" value={valor} onChange={setValor} placeholder="0,00" />
            {itens && item?.preco === null && <FieldDescription>Este item não tem preço: informe o valor.</FieldDescription>}
          </Field>
        </div>

        <DialogFooter>
          <Button onClick={confirmar} disabled={pending || (!!itens && !item)}>
            {pending && <Loader2Icon className="animate-spin" />}
            Registrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
