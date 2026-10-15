import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icone: Icone,
  titulo,
  descricao,
  children,
}: {
  icone?: LucideIcon;
  titulo: string;
  descricao?: string;
  /** Ação opcional (ex.: botão "Criar o primeiro") */
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed px-6 py-12 text-center">
      {Icone && <Icone className="size-8 text-muted-foreground" />}
      <p className="font-medium">{titulo}</p>
      {descricao && <p className="max-w-sm text-sm text-muted-foreground">{descricao}</p>}
      {children && <div className="mt-2">{children}</div>}
    </div>
  );
}
