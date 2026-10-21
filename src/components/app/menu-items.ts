import {
  CalendarDaysIcon,
  ClipboardListIcon,
  CoffeeIcon,
  GlobeIcon,
  HomeIcon,
  type LucideIcon,
  MegaphoneIcon,
  UserIcon,
  UsersIcon,
  UsersRoundIcon,
  WaypointsIcon,
  WalletIcon,
} from "lucide-react";
import { ROLES_FINANCEIRO } from "@/lib/permissions";
import type { Role } from "@/lib/types";

export type MenuItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Papéis que veem o item; ausente = todos */
  roles?: Role[];
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
  { href: "/app/financeiro", label: "Financeiro", icon: WalletIcon, roles: ROLES_FINANCEIRO },
  { href: "/app/usuarios", label: "Usuários", icon: UsersIcon, roles: ["ADMIN", "PASTOR"] },
  { href: "/app/conteudo", label: "Conteúdo do site", icon: GlobeIcon, roles: ["ADMIN", "PASTOR"] },
];
