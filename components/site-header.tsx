"use client"

import { useLayoutEffect, useRef, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { ExternalLinkIcon } from "lucide-react"

import { cn } from "@/lib/utils"

// Agentes: el dashboard de las corridas; Reclutadores: la pagina de solicitudes.
const PESTANAS = [
  { titulo: "Agentes", url: "/" },
  { titulo: "Reclutadores", url: "/reclutadores" },
]

export function SiteHeader() {
  const pathname = usePathname()
  const router = useRouter()
  const activa = Math.max(0, PESTANAS.findIndex((p) => p.url !== "/" && pathname.startsWith(p.url)))
  const [encima, setEncima] = useState<number | null>(null)
  // El fondo rojo sigue al mouse y vuelve a la pestaña activa al salir.
  const posicion = encima ?? activa

  // Los botones tienen ancho segun su texto: el fondo toma posicion y ancho del boton medido.
  const navRef = useRef<HTMLElement>(null)
  const botonesRef = useRef<(HTMLButtonElement | null)[]>([])
  const [fondo, setFondo] = useState({ left: 0, width: 0 })

  useLayoutEffect(() => {
    const medir = () => {
      const boton = botonesRef.current[posicion]
      if (boton) setFondo({ left: boton.offsetLeft, width: boton.offsetWidth })
    }
    medir()
    const observador = new ResizeObserver(medir)
    if (navRef.current) observador.observe(navRef.current)
    return () => observador.disconnect()
  }, [posicion])

  return (
    <header className="pointer-events-none fixed left-0 top-0 z-30 flex h-16 w-full items-center justify-between px-4 sm:px-6">
      <div className="pointer-events-auto flex basis-1/3 items-center justify-start gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt="Copera"
          decoding="async"
          className="h-12 w-auto object-contain"
          style={{ color: "transparent" }}
          src="/copera-logo.svg"
        />
      </div>
      <div className="pointer-events-auto hidden basis-1/3 items-center justify-center sm:flex">
        <nav
          ref={navRef}
          className="relative flex items-center gap-2 rounded-full p-1 text-sm"
          onMouseLeave={() => setEncima(null)}
        >
          <span
            className="absolute left-0 top-1 bottom-1 rounded-full bg-red-500/90 transition-[transform,width] duration-300 ease-out"
            style={{ width: fondo.width, transform: `translateX(${fondo.left}px)` }}
          />
          {PESTANAS.map((pestana, i) => (
            <button
              key={pestana.url}
              ref={(el) => {
                botonesRef.current[i] = el
              }}
              onClick={() => router.push(pestana.url)}
              onMouseEnter={() => setEncima(i)}
              className={cn(
                "relative z-10 cursor-pointer px-5 py-1.5 font-medium transition-colors",
                i === posicion ? "text-white" : "text-zinc-300 hover:text-white"
              )}
            >
              {pestana.titulo}
            </button>
          ))}
        </nav>
      </div>
      <div className="pointer-events-auto flex basis-1/3 items-center justify-end gap-2">
        <a
          href="https://github.com/DavidDaza2906/rare-once-it-costs-anything-costly-cooperation-between-llm-agents/blob/main/paper/latex/main.pdf"
          target="_blank"
          rel="noopener noreferrer"
          className="flex cursor-pointer items-center gap-2 rounded-full bg-red-500 px-4 py-1.5 text-sm font-medium text-white shadow-none transition-colors hover:bg-red-600"
        >
          Ver paper
          <ExternalLinkIcon size={14} />
        </a>
      </div>
    </header>
  )
}
