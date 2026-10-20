import { MegaphoneIcon } from "lucide-react";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { urlDoStorage } from "@/lib/storage";
import { cn } from "@/lib/utils";

export type AvisoResumo = {
  id: string;
  titulo: string;
  mensagem: string | null;
  imagem_path: string | null;
};

/** Aviso na área logada: imagem (se houver), título e mensagem */
export function AvisoCard({
  aviso,
  className,
  children,
}: {
  aviso: AvisoResumo;
  className?: string;
  /** rodapé opcional (ex.: situação e ações de quem gerencia) */
  children?: React.ReactNode;
}) {
  const imagem = urlDoStorage(aviso.imagem_path);
  return (
    <Card className={cn("overflow-hidden pt-0", !imagem && "pt-6", className)}>
      {imagem && (
        <div className="relative aspect-video bg-muted">
          <Image src={imagem} alt="" fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" />
        </div>
      )}
      <CardContent className="space-y-2">
        <h3 className="flex items-start gap-2 font-heading text-lg leading-snug font-semibold">
          <MegaphoneIcon className="mt-1 size-4 shrink-0 text-primary" />
          {aviso.titulo}
        </h3>
        {aviso.mensagem && <p className="text-sm whitespace-pre-line text-muted-foreground">{aviso.mensagem}</p>}
        {children}
      </CardContent>
    </Card>
  );
}
