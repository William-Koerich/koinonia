"use client";

import { CheckIcon, CopyIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function CopyButton({
  texto,
  label = "Copiar",
  mensagem = "Copiado!",
  className,
}: {
  texto: string;
  label?: string;
  mensagem?: string;
  className?: string;
}) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      toast.success(mensagem);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      toast.error("Não foi possível copiar. Selecione o texto e copie manualmente.");
    }
  }

  return (
    <Button type="button" variant="outline" onClick={copiar} className={className}>
      {copiado ? <CheckIcon /> : <CopyIcon />}
      {label}
    </Button>
  );
}
