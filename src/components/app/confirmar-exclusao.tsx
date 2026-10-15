"use client";

import { Loader2Icon, Trash2Icon } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/types";

/** Botão de excluir com confirmação; chama a Server Action e mostra o toast */
export function ConfirmarExclusao({
  titulo,
  descricao,
  acao,
  rotulo = "Excluir",
  somenteIcone = false,
  aoConcluir,
}: {
  titulo: string;
  descricao: string;
  acao: () => Promise<ActionResult>;
  rotulo?: string;
  somenteIcone?: boolean;
  aoConcluir?: () => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [pending, startTransition] = useTransition();

  function confirmar() {
    startTransition(async () => {
      const result = await acao();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message ?? "Excluído.");
      setAberto(false);
      aoConcluir?.();
    });
  }

  return (
    <AlertDialog open={aberto} onOpenChange={setAberto}>
      <AlertDialogTrigger asChild>
        {somenteIcone ? (
          <Button variant="ghost" size="icon" aria-label={rotulo} className="text-destructive">
            <Trash2Icon />
          </Button>
        ) : (
          <Button variant="outline" className="text-destructive">
            <Trash2Icon /> {rotulo}
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{titulo}</AlertDialogTitle>
          <AlertDialogDescription>{descricao}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
          {/* Button comum (não AlertDialogAction) para o diálogo só fechar após o sucesso */}
          <Button variant="destructive" onClick={confirmar} disabled={pending}>
            {pending && <Loader2Icon className="animate-spin" />}
            {rotulo}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
