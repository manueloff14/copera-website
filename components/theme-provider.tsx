"use client"

import * as React from "react"

type Tema = "light" | "dark" | "system"
type TemaResuelto = "light" | "dark"

interface ContextoTema {
  theme: Tema
  resolvedTheme: TemaResuelto
  setTheme: (tema: Tema) => void
}

const CLAVE = "theme"
const CONSULTA_OSCURO = "(prefers-color-scheme: dark)"

const Contexto = React.createContext<ContextoTema>({
  theme: "system",
  resolvedTheme: "light",
  setTheme: () => {},
})

function aplicarTema(resuelto: TemaResuelto) {
  const raiz = document.documentElement
  // Apaga las transiciones durante el cambio para que no se anime todo el cambio de colores.
  const sinTransiciones = document.createElement("style")
  sinTransiciones.appendChild(
    document.createTextNode("*,*::before,*::after{transition:none!important}")
  )
  document.head.appendChild(sinTransiciones)
  raiz.classList.remove("light", "dark")
  raiz.classList.add(resuelto)
  raiz.style.colorScheme = resuelto
  window.getComputedStyle(document.body)
  setTimeout(() => document.head.removeChild(sinTransiciones), 1)
}

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState<Tema>("system")
  const [sistema, setSistema] = React.useState<TemaResuelto>("light")
  const [montado, setMontado] = React.useState(false)

  React.useEffect(() => {
    try {
      const guardado = localStorage.getItem(CLAVE)
      if (guardado === "light" || guardado === "dark" || guardado === "system") {
        setThemeState(guardado)
      }
    } catch {}

    const consulta = window.matchMedia(CONSULTA_OSCURO)
    const alCambiar = () => setSistema(consulta.matches ? "dark" : "light")
    alCambiar()
    setMontado(true)
    consulta.addEventListener("change", alCambiar)
    return () => consulta.removeEventListener("change", alCambiar)
  }, [])

  const resolvedTheme: TemaResuelto = theme === "system" ? sistema : theme

  React.useEffect(() => {
    // Hasta leer localStorage y el sistema, el estado es el placeholder: no aplicarlo.
    if (!montado) return
    aplicarTema(resolvedTheme)
  }, [montado, resolvedTheme])

  const setTheme = React.useCallback((tema: Tema) => {
    setThemeState(tema)
    try {
      localStorage.setItem(CLAVE, tema)
    } catch {}
  }, [])

  const valor = React.useMemo(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme, setTheme]
  )

  return (
    <Contexto.Provider value={valor}>
      <ThemeHotkey />
      {children}
    </Contexto.Provider>
  )
}

function useTheme() {
  return React.useContext(Contexto)
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  )
}

function ThemeHotkey() {
  const { resolvedTheme, setTheme } = useTheme()

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.repeat) {
        return
      }

      if (event.metaKey || event.ctrlKey || event.altKey) {
        return
      }

      if (event.key.toLowerCase() !== "d") {
        return
      }

      if (isTypingTarget(event.target)) {
        return
      }

      setTheme(resolvedTheme === "dark" ? "light" : "dark")
    }

    window.addEventListener("keydown", onKeyDown)

    return () => {
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [resolvedTheme, setTheme])

  return null
}

export { ThemeProvider, useTheme }
