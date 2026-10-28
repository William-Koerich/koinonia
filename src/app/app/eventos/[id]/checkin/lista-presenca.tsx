"use client";

import { SearchIcon } from "lucide-react";
import { useState } from "react";
import { BotaoAcao } from "@/components/app/botao-acao";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { formatarHora } from "@/lib/format";
import { marcarPresenca } from "../actions";

export type Presenca = {
  id: string;
  nome: string;
  convidado: boolean;
  status: "pendente" | "confirmada" | "recusada" | "espera";
  checkinEm: string | null;
};

const SEM_ACENTO = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Lista para marcar presença sem QR Code (convidados, celular sem bateria...) */
export function ListaPresenca({ eventoId, inscritos }: { eventoId: string; inscritos: Presenca[] }) {
  const [busca, setBusca] = useState("");
  const filtro = SEM_ACENTO(busca.trim());
  const visiveis = filtro ? inscritos.filter((i) => SEM_ACENTO(i.nome).includes(filtro)) : inscritos;

  return (
    <div className="space-y-3">
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Buscar pelo nome..."
          className="pl-8"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>
      {visiveis.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">Ninguém encontrado.</p>
      ) : (
        <ul className="divide-y rounded-xl border">
          {visiveis.map((i) => (
            <li key={i.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {i.nome}
                  {i.convidado && (
                    <Badge variant="secondary" className="ml-2">
                      Convidado
                    </Badge>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  {i.checkinEm
                    ? `Chegou às ${formatarHora(i.checkinEm)}`
                    : i.status === "confirmada"
                      ? "Ainda não chegou"
                      : i.status === "pendente"
                        ? "Pagamento não confirmado"
                        : "Na fila de espera"}
                </p>
              </div>
              {i.status === "confirmada" &&
                (i.checkinEm ? (
                  <BotaoAcao acao={marcarPresenca.bind(null, eventoId, i.id, false)} variant="ghost">
                    Desfazer
                  </BotaoAcao>
                ) : (
                  <BotaoAcao acao={marcarPresenca.bind(null, eventoId, i.id, true)} variant="outline">
                    Marcar presença
                  </BotaoAcao>
                ))}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
