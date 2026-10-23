"use client";

import { ChevronRightIcon, LogOutIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { siteConfig } from "@/config/site";
import { ROLE_LABEL } from "@/lib/permissions";
import type { Role } from "@/lib/types";
import { type MenuItem, menuItems } from "./menu-items";

export function AppSidebar({
  nome,
  role,
  liberados = [],
}: {
  nome: string;
  role: Role;
  /** itens restritos liberados só hoje para esta pessoa (ex.: Visitantes p/ a Porta Principal) */
  liberados?: string[];
}) {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();
  const itens = menuItems.filter((item) => !item.roles || item.roles.includes(role) || liberados.includes(item.href));

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
                if (item.subitens) {
                  return (
                    <GrupoMenu
                      key={item.href}
                      item={item}
                      ativo={ativo}
                      pathname={pathname}
                      aoNavegar={() => setOpenMobile(false)}
                    />
                  );
                }
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

/** Item com subitens: abre/fecha ao clicar; começa aberto se a rota atual está dentro dele */
function GrupoMenu({
  item,
  ativo,
  pathname,
  aoNavegar,
}: {
  item: MenuItem;
  ativo: boolean;
  pathname: string;
  aoNavegar: () => void;
}) {
  const [aberto, setAberto] = useState(ativo);
  const expandido = aberto || ativo;
  // subitem ativo = o de rota mais específica (senão "Visão geral" acenderia em todas)
  const subAtivo = item.subitens
    ?.filter((sub) => pathname === sub.href || pathname.startsWith(`${sub.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={ativo && !expandido}
        aria-expanded={expandido}
        onClick={() => setAberto(!expandido)}
      >
        <item.icon />
        <span>{item.label}</span>
        <ChevronRightIcon className={`ml-auto transition-transform ${expandido ? "rotate-90" : ""}`} />
      </SidebarMenuButton>
      {expandido && (
        <SidebarMenuSub>
          {item.subitens?.map((sub) => (
            <SidebarMenuSubItem key={sub.href}>
              <SidebarMenuSubButton asChild isActive={sub.href === subAtivo}>
                <Link href={sub.href} onClick={aoNavegar}>
                  <span>{sub.label}</span>
                </Link>
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>
          ))}
        </SidebarMenuSub>
      )}
    </SidebarMenuItem>
  );
}
