"use client";

import { Loader2Icon } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/types";

/** Botão simples (sem confirmação) que chama uma Server Action e mostra o toast */
export function BotaoAcao({
  acao,
  children,
  variant = "ghost",
  size = "sm",
  className,
}: {
  acao: () => Promise<ActionResult>;
  children: React.ReactNode;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
  className?: string;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      size={size}
      variant={variant}
      className={className}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await acao();
          if (result.ok) toast.success(result.message);
          else toast.error(result.error);
        })
      }
    >
      {pending && <Loader2Icon className="animate-spin" />}
      {children}
    </Button>
  );
}
