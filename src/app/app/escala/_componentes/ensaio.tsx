import { ExternalLinkIcon, MapPinIcon, MusicIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatarDataLonga, formatarHora } from "@/lib/format";

const LINK = /https?:\/\/\S+/;

/** "Bondade de Deus – https://youtu.be/x" → texto + link */
function Musica({ linha, numero }: { linha: string; numero: number }) {
  const url = linha.match(LINK)?.[0];
  const texto = (url ? linha.replace(url, "") : linha).replace(/[\s–—:-]+$/, "").trim();
  return (
    <li className="flex items-center justify-between gap-3 py-1.5 text-sm">
      <span className="min-w-0">
        <span className="mr-2 text-muted-foreground tabular-nums">{numero}.</span>
        {texto || url}
      </span>
      {url && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center gap-1 text-xs text-primary hover:underline"
        >
          Abrir <ExternalLinkIcon className="size-3" />
        </a>
      )}
    </li>
  );
}

export function Ensaio({
  ensaioEm,
  local,
  repertorio,
}: {
  ensaioEm: string | null;
  local: string | null;
  repertorio: string | null;
}) {
  if (!ensaioEm && !local && !repertorio) return null;
  const musicas = repertorio?.split("\n").map((l) => l.trim()).filter(Boolean) ?? [];

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MusicIcon className="size-4 text-primary" /> Ensaio e repertório
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {(ensaioEm || local) && (
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
            {ensaioEm && (
              <p>
                <span className="inline-block first-letter:uppercase">{formatarDataLonga(ensaioEm)}</span>, às{" "}
                <strong className="font-medium">{formatarHora(ensaioEm)}</strong>
              </p>
            )}
            {local && (
              <p className="flex items-center gap-1 text-muted-foreground">
                <MapPinIcon className="size-3.5" /> {local}
              </p>
            )}
          </div>
        )}
        {musicas.length > 0 && (
          <ol className="divide-y rounded-lg border px-3">
            {musicas.map((m, i) => (
              <Musica key={i} linha={m} numero={i + 1} />
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
