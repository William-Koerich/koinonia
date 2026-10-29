"use client";

import { useState } from "react";
import { BotaoAcao } from "@/components/app/botao-acao";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { CarteiraOpcao } from "@/lib/carteiras";
import { atribuirSemConta } from "./actions";

/** Atribui de uma vez os lançamentos antigos (sem conta) a uma conta */
export function AtribuirSemConta({ carteiras }: { carteiras: CarteiraOpcao[] }) {
  const [carteira, setCarteira] = useState(carteiras.find((c) => c.padrao)?.id ?? carteiras[0]?.id ?? "");
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={carteira} onValueChange={setCarteira}>
        <SelectTrigger className="w-56 bg-background" aria-label="Conta">
          <SelectValue placeholder="Escolha a conta" />
        </SelectTrigger>
        <SelectContent>
          {carteiras.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.nome}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <BotaoAcao acao={() => atribuirSemConta(carteira)} variant="default" size="default">
        Atribuir todos
      </BotaoAcao>
    </div>
  );
}
