import { LayoutDashboardIcon, MegaphoneIcon, type LucideIcon } from "lucide-react"

// Secciones del panel: alimentan el sidebar y el titulo del encabezado.
export interface Seccion {
  titulo: string
  url: string
  icono: LucideIcon
}

export const SECCIONES: Seccion[] = [
  { titulo: "Dashboard", url: "/", icono: LayoutDashboardIcon },
  { titulo: "Reclutadores", url: "/reclutadores", icono: MegaphoneIcon },
]

export function seccionActiva(pathname: string): Seccion | undefined {
  return SECCIONES.find((s) =>
    s.url === "/" ? pathname === "/" : pathname === s.url || pathname.startsWith(`${s.url}/`)
  )
}
