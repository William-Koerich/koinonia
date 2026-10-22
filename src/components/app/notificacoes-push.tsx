"use client";

import { BellIcon, BellOffIcon, Loader2Icon, ShareIcon, SquarePlusIcon, XIcon } from "lucide-react";
import { useEffect, useState, useSyncExternalStore, useTransition } from "react";
import { toast } from "sonner";
import { ativarNotificacoes, desativarNotificacoes, testarNotificacao } from "@/app/app/push-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/*
 * Notificações push no aparelho. O service worker (/public/sw.js) é registrado
 * em toda a área logada; o usuário ativa as notificações por aqui (o navegador
 * só pede permissão a partir de um toque). No iPhone, só funciona com o app
 * adicionado à tela de início (iOS 16.4+).
 */

type Estado = "carregando" | "sem-suporte" | "instalar-ios" | "bloqueado" | "desativado" | "ativado";

function base64ParaBytes(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const bruto = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(bruto, (c) => c.charCodeAt(0));
}

const ehIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent);
const instalado = () =>
  window.matchMedia("(display-mode: standalone)").matches || ("standalone" in navigator && navigator.standalone === true);

/** Registra o service worker (uma vez, ao abrir a área logada) */
export function RegistrarServiceWorker() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {});
    }
  }, []);
  return null;
}

function useNotificacoes() {
  const [estado, setEstado] = useState<Estado>("carregando");
  const [inscricao, setInscricao] = useState<PushSubscription | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancelado = false;
    async function verificar() {
      const suporta = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
      let proximo: Estado;
      let sub: PushSubscription | null = null;
      if (!suporta) proximo = ehIOS() && !instalado() ? "instalar-ios" : "sem-suporte";
      else if (Notification.permission === "denied") proximo = "bloqueado";
      else {
        const registro = await navigator.serviceWorker.ready;
        sub = await registro.pushManager.getSubscription();
        proximo = sub ? "ativado" : "desativado";
      }
      if (!cancelado) {
        setInscricao(sub);
        setEstado(proximo);
      }
    }
    void verificar();
    return () => {
      cancelado = true;
    };
  }, []);

  function ativar() {
    startTransition(async () => {
      const chave = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!chave) {
        toast.error("As notificações ainda não estão configuradas no servidor.");
        return;
      }
      const permissao = await Notification.requestPermission();
      if (permissao !== "granted") {
        setEstado(permissao === "denied" ? "bloqueado" : "desativado");
        return;
      }
      try {
        const registro = await navigator.serviceWorker.ready;
        const sub =
          (await registro.pushManager.getSubscription()) ??
          (await registro.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64ParaBytes(chave) }));
        const result = await ativarNotificacoes(sub.toJSON(), navigator.userAgent);
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        setInscricao(sub);
        setEstado("ativado");
        toast.success(result.message);
      } catch {
        toast.error("Não foi possível ativar neste aparelho.");
      }
    });
  }

  function desativar() {
    startTransition(async () => {
      if (inscricao) {
        await desativarNotificacoes(inscricao.endpoint);
        await inscricao.unsubscribe().catch(() => {});
      }
      setInscricao(null);
      setEstado("desativado");
      toast.success("Notificações desativadas neste aparelho.");
    });
  }

  function testar() {
    startTransition(async () => {
      const result = await testarNotificacao();
      if (result.ok) toast.success(result.message);
      else toast.error(result.error);
    });
  }

  return { estado, pending, ativar, desativar, testar };
}

function InstrucoesIOS() {
  return (
    <ol className="mt-2 space-y-1 text-sm text-muted-foreground">
      <li className="flex items-center gap-1.5">
        1. No Safari, toque em <ShareIcon className="inline size-4" /> <strong>Compartilhar</strong>
      </li>
      <li className="flex items-center gap-1.5">
        2. Escolha <SquarePlusIcon className="inline size-4" /> <strong>Adicionar à Tela de Início</strong>
      </li>
      <li>3. Abra o Koinonia pelo ícone e ative as notificações aqui.</li>
    </ol>
  );
}

/** Cartão completo (Meu perfil) */
export function CartaoNotificacoes() {
  const { estado, pending, ativar, desativar, testar } = useNotificacoes();

  return (
    <Card>
      <CardContent className="space-y-3">
        <div className="flex items-start gap-3">
          {estado === "ativado" ? (
            <BellIcon className="mt-0.5 size-5 text-primary" />
          ) : (
            <BellOffIcon className="mt-0.5 size-5 text-muted-foreground" />
          )}
          <div className="flex-1">
            <p className="font-medium">Notificações neste aparelho</p>
            <p className="text-sm text-muted-foreground">
              {estado === "carregando" && "Verificando..."}
              {estado === "ativado" && "Ativadas: você recebe avisos, lembretes de escala e de eventos."}
              {estado === "desativado" && "Receba avisos da igreja, lembretes da sua escala e dos eventos."}
              {estado === "bloqueado" &&
                "As notificações estão bloqueadas para este site. Libere nas configurações do navegador (ícone de cadeado na barra de endereço) e volte aqui."}
              {estado === "sem-suporte" && "Este navegador não recebe notificações. Tente pelo Chrome, Edge, Firefox ou Safari."}
              {estado === "instalar-ios" && "No iPhone, primeiro adicione o Koinonia à tela de início:"}
            </p>
            {estado === "instalar-ios" && <InstrucoesIOS />}
          </div>
        </div>
        {(estado === "desativado" || estado === "ativado") && (
          <div className="flex flex-wrap gap-2">
            {estado === "desativado" ? (
              <Button onClick={ativar} disabled={pending}>
                {pending ? <Loader2Icon className="animate-spin" /> : <BellIcon />} Ativar notificações
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={testar} disabled={pending}>
                  {pending && <Loader2Icon className="animate-spin" />} Enviar teste
                </Button>
                <Button variant="ghost" onClick={desativar} disabled={pending}>
                  Desativar
                </Button>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const CHAVE_DISPENSADO = "koinonia:convite-notificacoes-dispensado";
const assinarStorage = (aviso: () => void) => {
  window.addEventListener("storage", aviso);
  return () => window.removeEventListener("storage", aviso);
};
function lerDispensado() {
  try {
    return localStorage.getItem(CHAVE_DISPENSADO) === "1";
  } catch {
    return false;
  }
}

/** Convite discreto no Início: só aparece se dá para ativar e a pessoa ainda não ativou nem dispensou */
export function ConviteNotificacoes() {
  const { estado, pending, ativar } = useNotificacoes();
  const dispensadoSalvo = useSyncExternalStore(assinarStorage, lerDispensado, () => true);
  const [dispensadoAgora, setDispensadoAgora] = useState(false);

  if (dispensadoSalvo || dispensadoAgora || (estado !== "desativado" && estado !== "instalar-ios")) return null;

  function dispensar() {
    setDispensadoAgora(true);
    try {
      localStorage.setItem(CHAVE_DISPENSADO, "1");
    } catch {}
  }

  return (
    <Card className="mb-6 border-primary/30 bg-primary/5">
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <BellIcon className="size-5 shrink-0 text-primary" />
        <div className="flex-1 text-sm">
          <p className="font-medium">Receba os avisos da igreja no celular</p>
          <p className="text-muted-foreground">
            {estado === "instalar-ios"
              ? "No iPhone, adicione o Koinonia à tela de início para receber notificações:"
              : "Lembretes da sua escala, eventos e avisos importantes, direto no aparelho."}
          </p>
          {estado === "instalar-ios" && <InstrucoesIOS />}
        </div>
        <div className="flex gap-2">
          {estado === "desativado" && (
            <Button size="sm" onClick={ativar} disabled={pending}>
              {pending && <Loader2Icon className="animate-spin" />} Ativar
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={dispensar} aria-label="Dispensar">
            <XIcon />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
