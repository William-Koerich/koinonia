"use client";

import { Loader2Icon, XIcon } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { PessoaCombobox, type PessoaOpcao } from "@/components/forms/pessoa-combobox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { atribuir, removerAtribuicao } from "../actions";

export type Funcao = { id: string; funcao: string; vagas: number };
export type Atribuicao = { id: string; funcao_id: string; profile_id: string; nome: string | null };

export function EscalaGrade({
  escalaId,
  funcoes,
  atribuicoes,
  pessoas,
  avisos,
  gerencia,
  meuId,
}: {
  escalaId: string;
  funcoes: Funcao[];
  atribuicoes: Atribuicao[];
  pessoas: PessoaOpcao[];
  /** profile_id → "já escalado: ..." em outras escalas do mesmo dia */
  avisos: Record<string, string>;
  gerencia: boolean;
  meuId: string;
}) {
  const jaNestaEscala = new Set(atribuicoes.map((a) => a.profile_id));
  const mapaAvisos = new Map(Object.entries(avisos));

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

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 rounded-lg bg-muted px-3 py-2 text-sm",
        souEu && "bg-primary text-primary-foreground",
      )}
    >
      <span className="truncate font-medium">
        {atribuicao.nome ?? "Usuário inativo"}
        {souEu && " (você)"}
      </span>
      {gerencia && (
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={remover}
          disabled={pending}
          aria-label={`Remover ${atribuicao.nome ?? "pessoa"}`}
          className={cn(souEu && "hover:bg-primary-foreground/20 hover:text-primary-foreground")}
        >
          {pending ? <Loader2Icon className="animate-spin" /> : <XIcon />}
        </Button>
      )}
    </div>
  );
}

function VagaLivre({
  escalaId,
  funcaoId,
  pessoas,
  jaNestaEscala,
  avisos,
}: {
  escalaId: string;
  funcaoId: string;
  pessoas: PessoaOpcao[];
  jaNestaEscala: Set<string>;
  avisos: Map<string, string>;
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
    />
  );
}
