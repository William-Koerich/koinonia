"use client";

import { LogOutIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { sair } from "@/app/(auth)/actions";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { siteConfig } from "@/config/site";
import { ROLE_LABEL } from "@/lib/permissions";
import type { Role } from "@/lib/types";
import { menuItems } from "./menu-items";

export function AppSidebar({ nome, role }: { nome: string; role: Role }) {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();
  const itens = menuItems.filter((item) => !item.roles || item.roles.includes(role));

  return (
    <Sidebar>
      <SidebarHeader className="px-4 py-3">
        <Link href="/" className="font-heading font-semibold">
          {siteConfig.nome}
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {itens.map((item) => {
                const ativo =
                  item.href === "/app" ? pathname === "/app" : pathname.startsWith(item.href);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={ativo}>
                      <Link href={item.href} onClick={() => setOpenMobile(false)}>
                        <item.icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="gap-3 p-4">
        <div className="min-w-0 text-sm">
          <p className="truncate font-medium">{nome}</p>
          <p className="text-xs text-muted-foreground">{ROLE_LABEL[role]}</p>
        </div>
        <form action={sair}>
          <SidebarMenuButton type="submit" className="text-muted-foreground">
            <LogOutIcon />
            <span>Sair</span>
          </SidebarMenuButton>
        </form>
      </SidebarFooter>
    </Sidebar>
  );
}
