import { SiteHeader } from "@/components/site-header"

// Marco comun de las secciones del panel: el header queda montado al navegar entre paginas.
export default function PanelLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      {/* El header es fixed (h-16): el contenido arranca debajo. */}
      <div className="flex flex-1 flex-col pt-16">
        <div className="@container/main flex flex-1 flex-col gap-2">
          {children}
        </div>
      </div>
    </div>
  )
}
