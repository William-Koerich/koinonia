import {
  CalendarDaysIcon,
  ClipboardListIcon,
  CoffeeIcon,
  GlobeIcon,
  HomeIcon,
  type LucideIcon,
  UserIcon,
  UsersIcon,
  UsersRoundIcon,
  WaypointsIcon,
} from "lucide-react";
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
  { href: "/app/eventos", label: "Eventos", icon: CalendarDaysIcon },
  { href: "/app/escala", label: "Escala", icon: ClipboardListIcon },
  { href: "/app/cantina", label: "Cantina", icon: CoffeeIcon },
  { href: "/app/ministerios", label: "Ministérios", icon: WaypointsIcon },
  { href: "/app/gcs", label: "GCs", icon: UsersRoundIcon },
  { href: "/app/usuarios", label: "Usuários", icon: UsersIcon, roles: ["ADMIN", "PASTOR"] },
  { href: "/app/conteudo", label: "Conteúdo do site", icon: GlobeIcon, roles: ["ADMIN", "PASTOR"] },
];
