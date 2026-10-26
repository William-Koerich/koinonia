"use client"

import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CheckIcon, InfoIcon, TriangleAlertIcon, XIcon, Loader2Icon } from "lucide-react"

/*
 * Toasts do Koinonia: cartão claro (mesmo fundo dos popovers), ícone num
 * círculo com a cor do tipo e texto sempre na cor de texto. O app não tem tema
 * escuro, então o toast é sempre claro (antes seguia o tema do sistema e
 * aparecia escuro sobre o app claro). No PWA instalado, respeita o entalhe.
 */
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      position="top-center"
      closeButton
      visibleToasts={3}
      duration={4500}
      gap={10}
      offset={{ top: "max(16px, env(safe-area-inset-top))" }}
      mobileOffset={{ top: "max(12px, env(safe-area-inset-top))", left: 12, right: 12 }}
      className="toaster group"
      icons={{
        success: <CheckIcon className="size-4" strokeWidth={2.5} />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <XIcon className="size-4" strokeWidth={2.5} />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "calc(var(--radius) + 4px)",
          "--width": "380px",
          // botão de fechar no canto direito (o padrão é o esquerdo)
          "--toast-close-button-start": "unset",
          "--toast-close-button-end": "0",
          "--toast-close-button-transform": "translate(35%, -35%)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast items-start! gap-3! px-4! py-3.5! shadow-lg! shadow-black/5!",
          content: "gap-0.5! pt-1",
          title: "text-sm! font-medium! leading-snug!",
          description: "text-[13px]! leading-snug! text-muted-foreground!",
          icon: "m-0! size-7! shrink-0 items-center! justify-center! rounded-full",
          closeButton: "border-border! bg-popover! text-muted-foreground! hover:text-foreground!",
          actionButton: "bg-primary! text-primary-foreground! rounded-md! font-medium!",
          success: "[&_[data-icon]]:bg-emerald-500/15 [&_[data-icon]]:text-emerald-700",
          error: "[&_[data-icon]]:bg-destructive/12 [&_[data-icon]]:text-destructive",
          warning: "[&_[data-icon]]:bg-amber-500/15 [&_[data-icon]]:text-amber-700",
          info: "[&_[data-icon]]:bg-sky-500/15 [&_[data-icon]]:text-sky-700",
          loading: "[&_[data-icon]]:bg-muted [&_[data-icon]]:text-muted-foreground",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
