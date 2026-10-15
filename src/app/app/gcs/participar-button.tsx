"use client";

import { Loader2Icon } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { escolherGc } from "./actions";

export function ParticiparButton({ gcId, participa }: { gcId: string; participa: boolean }) {
  const [pending, startTransition] = useTransition();

  function alternar() {
    startTransition(async () => {
      const result = await escolherGc(participa ? null : gcId);
      if (result.ok) toast.success(result.message);
      else toast.error(result.error);
    });
  }

  return (
    <Button size="sm" variant={participa ? "outline" : "default"} onClick={alternar} disabled={pending}>
      {pending && <Loader2Icon className="animate-spin" />}
      {participa ? "Sair do GC" : "Participar"}
    </Button>
  );
}
