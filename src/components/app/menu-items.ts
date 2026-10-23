import {
  BellIcon,
  CalendarDaysIcon,
  ClipboardListIcon,
  CoffeeIcon,
  GlobeIcon,
  HomeIcon,
  type LucideIcon,
  MegaphoneIcon,
  UserIcon,
  UsersIcon,
  UserRoundPlusIcon,
  UsersRoundIcon,
  WaypointsIcon,
  WalletIcon,
} from "lucide-react";
import { ROLES_FINANCEIRO, ROLES_VISITANTES } from "@/lib/permissions";
import type { Role } from "@/lib/types";

export type MenuItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Papéis que veem o item; ausente = todos */
  roles?: Role[];
  /** Com subitens, o item vira um grupo que abre e fecha (href = prefixo das rotas) */
  subitens?: { href: string; label: string }[];
};

export const menuItems: MenuItem[] = [
  { href: "/app", label: "Início", icon: HomeIcon },
  { href: "/app/perfil", label: "Meu perfil", icon: UserIcon },
  { href: "/app/avisos", label: "Avisos", icon: MegaphoneIcon },
  { href: "/app/eventos", label: "Eventos", icon: CalendarDaysIcon },
  { href: "/app/escala", label: "Escala", icon: ClipboardListIcon },
  { href: "/app/cantina", label: "Cantina", icon: CoffeeIcon },
  { href: "/app/ministerios", label: "Ministérios", icon: WaypointsIcon },
  { href: "/app/gcs", label: "GCs", icon: UsersRoundIcon },
  { href: "/app/visitantes", label: "Visitantes", icon: UserRoundPlusIcon, roles: ROLES_VISITANTES },
  {
    href: "/app/financeiro",
    label: "Financeiro",
    icon: WalletIcon,
    roles: ROLES_FINANCEIRO,
    subitens: [
      { href: "/app/financeiro", label: "Visão geral" },
      { href: "/app/financeiro/entradas", label: "Entradas" },
      { href: "/app/financeiro/contas-a-pagar", label: "Contas a pagar" },
    ],
  },
  { href: "/app/notificacoes", label: "Notificações", icon: BellIcon, roles: ["ADMIN", "PASTOR"] },
  { href: "/app/usuarios", label: "Usuários", icon: UsersIcon, roles: ["ADMIN", "PASTOR"] },
  { href: "/app/conteudo", label: "Conteúdo do site", icon: GlobeIcon, roles: ["ADMIN", "PASTOR"] },
];
