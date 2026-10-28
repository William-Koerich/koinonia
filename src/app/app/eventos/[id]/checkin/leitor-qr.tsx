"use client";

import jsQR from "jsqr";
import { CameraIcon, CameraOffIcon, CheckCircle2Icon, CircleAlertIcon, Loader2Icon, RepeatIcon, XCircleIcon } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { checkinPorCodigo, type ResultadoCheckin } from "../actions";

type Leitura = { tipo: ResultadoCheckin["situacao"] | "erro"; titulo: string; detalhe: string };

const ESTILO = {
  ok: { icone: CheckCircle2Icon, classe: "border-emerald-500/50 bg-emerald-500/10 text-emerald-800" },
  repetido: { icone: RepeatIcon, classe: "border-amber-500/50 bg-amber-500/10 text-amber-800" },
  nao_confirmada: { icone: CircleAlertIcon, classe: "border-amber-500/50 bg-amber-500/10 text-amber-800" },
  erro: { icone: XCircleIcon, classe: "border-destructive/50 bg-destructive/10 text-destructive" },
} as const;

const DETALHE_STATUS = {
  pendente: "Pagamento ainda não confirmado pela tesouraria.",
  espera: "Esta pessoa está na fila de espera, sem vaga.",
  recusada: "Inscrição recusada.",
  confirmada: "",
} as const;

/**
 * Leitor de QR Code pela câmera (getUserMedia + jsQR, funciona também no
 * iPhone). Cada código lido registra a presença na hora; o mesmo código é
 * ignorado por alguns segundos para não repetir enquanto está na frente da câmera.
 */
export function LeitorQr({ eventoId, codigoInicial }: { eventoId: string; codigoInicial: string | null }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const ultimoRef = useRef<{ texto: string; em: number } | null>(null);
  const ocupadoRef = useRef(false);
  const [ligada, setLigada] = useState(false);
  const [erroCamera, setErroCamera] = useState<string | null>(null);
  const [leitura, setLeitura] = useState<Leitura | null>(null);
  const [pending, startTransition] = useTransition();

  function registrar(texto: string) {
    ocupadoRef.current = true;
    startTransition(async () => {
      const result = await checkinPorCodigo(eventoId, texto);
      if (!result.ok) {
        setLeitura({ tipo: "erro", titulo: "Não foi possível registrar", detalhe: result.error });
        navigator.vibrate?.([80, 60, 80]);
      } else {
        const r = result.data!;
        setLeitura({
          tipo: r.situacao,
          titulo: r.nome,
          detalhe:
            r.situacao === "ok"
              ? "Presença registrada. Bem-vindo(a)!"
              : r.situacao === "repetido"
                ? (result.message ?? "Já tinha feito check-in.")
                : DETALHE_STATUS[r.status],
        });
        navigator.vibrate?.(r.situacao === "ok" ? 120 : [80, 60, 80]);
      }
      ocupadoRef.current = false;
    });
  }

  // aberto pela câmera do celular (link do QR com ?codigo=): registra direto
  const inicialRef = useRef(false);
  useEffect(() => {
    if (codigoInicial && !inicialRef.current) {
      inicialRef.current = true;
      registrar(codigoInicial);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codigoInicial]);

  function desligar() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setLigada(false);
  }

  async function ligar() {
    setErroCamera(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      setLigada(true);
    } catch (e) {
      const nome = (e as DOMException).name;
      setErroCamera(
        nome === "NotAllowedError"
          ? "Permita o acesso à câmera nas configurações do navegador para ler os QR Codes."
          : "Não foi possível abrir a câmera deste aparelho. Use a lista abaixo para marcar a presença.",
      );
    }
  }

  // liga o vídeo e lê quadros enquanto a câmera estiver ligada
  useEffect(() => {
    if (!ligada) return;
    const video = videoRef.current!;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    video.srcObject = streamRef.current;
    video.play().catch(() => {});

    const intervalo = window.setInterval(() => {
      if (ocupadoRef.current || video.readyState < 2) return;
      // reduz o quadro: mais rápido e suficiente para um QR Code na tela do celular
      const escala = Math.min(1, 640 / video.videoWidth);
      canvas.width = Math.round(video.videoWidth * escala);
      canvas.height = Math.round(video.videoHeight * escala);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imagem = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const qr = jsQR(imagem.data, imagem.width, imagem.height, { inversionAttempts: "dontInvert" });
      if (!qr?.data) return;

      const agora = Date.now();
      const ultimo = ultimoRef.current;
      if (ultimo && ultimo.texto === qr.data && agora - ultimo.em < 4000) return;
      ultimoRef.current = { texto: qr.data, em: agora };
      registrar(qr.data);
    }, 250);

    return () => window.clearInterval(intervalo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ligada]);

  useEffect(() => desligar, []);

  const estilo = leitura ? ESTILO[leitura.tipo] : null;

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-xl border bg-black">
        <video
          ref={videoRef}
          playsInline
          muted
          className={cn("aspect-[4/3] w-full object-cover", !ligada && "hidden")}
        />
        {ligada && (
          // moldura para orientar onde posicionar o QR Code
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="size-56 rounded-2xl border-4 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
          </div>
        )}
        {!ligada && (
          <div className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-3 p-6 text-center text-white">
            <CameraIcon className="size-10 opacity-70" />
            <p className="max-w-xs text-sm opacity-80">
              Aponte a câmera para o QR Code do ingresso. A presença é registrada na hora.
            </p>
            <Button onClick={ligar} variant="secondary">
              <CameraIcon /> Abrir câmera
            </Button>
          </div>
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {ligada && (
        <Button variant="outline" size="sm" onClick={desligar}>
          <CameraOffIcon /> Fechar câmera
        </Button>
      )}
      {erroCamera && <p className="text-sm text-destructive">{erroCamera}</p>}

      <div aria-live="polite">
        {pending ? (
          <div className="flex items-center gap-3 rounded-xl border p-4 text-sm text-muted-foreground">
            <Loader2Icon className="size-5 animate-spin" /> Conferindo...
          </div>
        ) : (
          leitura &&
          estilo && (
            <div className={cn("flex items-start gap-3 rounded-xl border p-4", estilo.classe)}>
              <estilo.icone className="mt-0.5 size-7 shrink-0" />
              <div>
                <p className="text-lg font-semibold">{leitura.titulo}</p>
                <p className="text-sm">{leitura.detalhe}</p>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
