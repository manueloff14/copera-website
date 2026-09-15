"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { seccionActiva, type Seccion } from "@/lib/secciones"

export function NavMain({ titulo, items }: { titulo: string; items: Seccion[] }) {
  const pathname = usePathname()
  const activa = seccionActiva(pathname)

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{titulo}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.url}>
              <SidebarMenuButton
                tooltip={item.titulo}
                isActive={activa?.url === item.url}
                render={<Link href={item.url} />}
              >
                <item.icono />
                <span>{item.titulo}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
