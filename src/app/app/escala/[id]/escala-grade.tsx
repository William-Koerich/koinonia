"use client";

import { Loader2Icon, XIcon } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { PessoaCombobox, type PessoaOpcao } from "@/components/forms/pessoa-combobox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Enums } from "@/lib/types";
import { cn } from "@/lib/utils";
import { atribuir, removerAtribuicao } from "../actions";
import { StatusResposta } from "../_componentes/status-resposta";

export type Funcao = { id: string; funcao: string; vagas: number };
export type Atribuicao = {
  id: string;
  funcao_id: string;
  profile_id: string;
  nome: string | null;
  resposta: Enums<"koinonia_escala_resposta">;
  motivo: string | null;
};

export function EscalaGrade({
  escalaId,
  funcoes,
  atribuicoes,
  pessoas,
  avisos,
  alertas,
  gerencia,
  meuId,
}: {
  escalaId: string;
  funcoes: Funcao[];
  atribuicoes: Atribuicao[];
  pessoas: PessoaOpcao[];
  /** profile_id → "já escalado: ..." em outras escalas do mesmo dia */
  avisos: Record<string, string>;
  /** profile_id → "não pode neste dia" (indisponibilidade marcada pela pessoa) */
  alertas: Record<string, string>;
  gerencia: boolean;
  meuId: string;
}) {
  const jaNestaEscala = new Set(atribuicoes.map((a) => a.profile_id));
  const mapaAvisos = new Map(Object.entries(avisos));
  const mapaAlertas = new Map(Object.entries(alertas));

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {funcoes.map((funcao) => {
        const ocupantes = atribuicoes.filter((a) => a.funcao_id === funcao.id);
        const completa = ocupantes.length >= funcao.vagas;
        const vagasLivres = Math.max(funcao.vagas - ocupantes.length, 0);

        return (
          <Card key={funcao.id} className={cn(ocupantes.some((o) => o.profile_id === meuId) && "border-primary")}>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base">{funcao.funcao}</CardTitle>
                <Badge variant={completa ? "default" : "outline"}>
                  {ocupantes.length}/{funcao.vagas}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {ocupantes.map((o) => (
                <Ocupante key={o.id} escalaId={escalaId} atribuicao={o} gerencia={gerencia} souEu={o.profile_id === meuId} />
              ))}
              {Array.from({ length: vagasLivres }, (_, i) =>
                gerencia ? (
                  <VagaLivre
                    key={i}
                    escalaId={escalaId}
                    funcaoId={funcao.id}
                    pessoas={pessoas}
                    jaNestaEscala={jaNestaEscala}
                    avisos={mapaAvisos}
                    alertas={mapaAlertas}
                  />
                ) : (
                  <p key={i} className="rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground">
                    Vaga aberta
                  </p>
                ),
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function Ocupante({
  escalaId,
  atribuicao,
  gerencia,
  souEu,
}: {
  escalaId: string;
  atribuicao: Atribuicao;
  gerencia: boolean;
  souEu: boolean;
}) {
  const [pending, startTransition] = useTransition();

  function remover() {
    startTransition(async () => {
      const result = await removerAtribuicao(escalaId, atribuicao.id);
      if (result.ok) toast.success(result.message);
      else toast.error(result.error);
    });
  }

  const recusou = atribuicao.resposta === "recusado";

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 rounded-lg bg-muted px-3 py-2 text-sm",
        souEu && "bg-primary/10 ring-1 ring-primary/30",
        recusou && "bg-destructive/5",
      )}
    >
      <div className="min-w-0">
        <p className={cn("truncate font-medium", recusou && "text-muted-foreground line-through")}>
          {atribuicao.nome ?? "Usuário inativo"}
          {souEu && " (você)"}
        </p>
        {/* o motivo da recusa é visto só pela liderança */}
        {gerencia && atribuicao.motivo && <p className="text-xs text-muted-foreground">“{atribuicao.motivo}”</p>}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <StatusResposta resposta={atribuicao.resposta} className="bg-background" />
        {gerencia && (
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={remover}
            disabled={pending}
            aria-label={`Remover ${atribuicao.nome ?? "pessoa"}`}
          >
            {pending ? <Loader2Icon className="animate-spin" /> : <XIcon />}
          </Button>
        )}
      </div>
    </div>
  );
}

function VagaLivre({
  escalaId,
  funcaoId,
  pessoas,
  jaNestaEscala,
  avisos,
  alertas,
}: {
  escalaId: string;
  funcaoId: string;
  pessoas: PessoaOpcao[];
  jaNestaEscala: Set<string>;
  avisos: Map<string, string>;
  alertas: Map<string, string>;
}) {
  const [pending, startTransition] = useTransition();

  function escolher(profileId: string | null) {
    if (!profileId) return;
    startTransition(async () => {
      const result = await atribuir(escalaId, funcaoId, profileId);
      if (!result.ok) toast.error(result.error);
      else if (result.message?.startsWith("Escalado. Atenção")) toast.warning(result.message);
      else toast.success(result.message);
    });
  }

  if (pending) {
    return (
      <div className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm text-muted-foreground">
        <Loader2Icon className="size-4 animate-spin" /> Escalando...
      </div>
    );
  }

  return (
    <PessoaCombobox
      pessoas={pessoas}
      value={null}
      onChange={escolher}
      placeholder="Escolher pessoa"
      desabilitarIds={jaNestaEscala}
      avisos={avisos}
      alertas={alertas}
    />
  );
}
