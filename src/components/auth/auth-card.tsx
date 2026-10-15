import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function AuthCard({
  titulo,
  descricao,
  children,
}: {
  titulo: string;
  descricao?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{titulo}</CardTitle>
        {descricao && <CardDescription>{descricao}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

/** Placeholder enquanto o formulário (que lê a URL) carrega */
export function FormSkeleton({ campos = 2 }: { campos?: number }) {
  return (
    <div className="space-y-4" aria-hidden>
      {Array.from({ length: campos }, (_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-4 w-24 animate-pulse rounded bg-muted" />
          <div className="h-9 animate-pulse rounded-lg bg-muted" />
        </div>
      ))}
      <div className="h-9 animate-pulse rounded-lg bg-muted" />
    </div>
  );
}
