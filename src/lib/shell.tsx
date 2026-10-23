import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'

export interface Identidad {
  espacio: string | null
  yo: string | null
  rol: string | null
}

interface ShellCtx {
  identidad: Identidad
  setIdentidad: (i: Identidad) => void
  /** true cuando el contrato del servidor no coincide: se bloquean las acciones de escritura. */
  soloLectura: boolean
}

const Ctx = createContext<ShellCtx>({
  identidad: { espacio: null, yo: null, rol: null },
  setIdentidad: () => {},
  soloLectura: false,
})

export function ShellProvider({ soloLectura, children }: { soloLectura: boolean; children: ReactNode }) {
  const [identidad, setIdentidad] = useState<Identidad>({ espacio: null, yo: null, rol: null })
  return <Ctx.Provider value={{ identidad, setIdentidad, soloLectura }}>{children}</Ctx.Provider>
}

export function useShell() {
  return useContext(Ctx)
}

/** Publica el espacio y la identidad activa en el encabezado mientras la pantalla está montada. */
export function useIdentidad(espacio: string | null, yo: string | null, rol: string | null) {
  const { setIdentidad } = useShell()
  useEffect(() => {
    setIdentidad({ espacio, yo, rol })
  }, [espacio, yo, rol, setIdentidad])
  useEffect(() => () => setIdentidad({ espacio: null, yo: null, rol: null }), [setIdentidad])
}

// Aviso de una sola vez entre pantallas (por ejemplo, tras reclamar un asiento).
let avisoPendiente: string | null = null
export function dejarAviso(texto: string) {
  avisoPendiente = texto
}
export function tomarAviso(): string | null {
  const a = avisoPendiente
  avisoPendiente = null
  return a
}

// ---- Ruta por hash (sin router) ----

export type Ruta =
  | { nombre: 'inicio' }
  | { nombre: 'espacio'; espacioId: string }
  | { nombre: 'nueva'; espacioId: string }
  | { nombre: 'propuesta'; espacioId: string; propuestaId: string }

export function parseRuta(hash: string): Ruta {
  const partes = hash.replace(/^#\/?/, '').split('/').filter(Boolean)
  if (partes[0] === 'e' && partes[1]) {
    if (partes[2] === 'nueva') return { nombre: 'nueva', espacioId: partes[1] }
    if (partes[2] === 'p' && partes[3]) return { nombre: 'propuesta', espacioId: partes[1], propuestaId: partes[3] }
    return { nombre: 'espacio', espacioId: partes[1] }
  }
  return { nombre: 'inicio' }
}

export const rutas = {
  inicio: () => '#/',
  espacio: (id: string) => `#/e/${id}`,
  nueva: (id: string) => `#/e/${id}/nueva`,
  propuesta: (e: string, p: string) => `#/e/${e}/p/${p}`,
}

export function irA(hash: string) {
  window.location.hash = hash
}

export function useRuta(): Ruta {
  const [ruta, setRuta] = useState<Ruta>(() => parseRuta(window.location.hash))
  useEffect(() => {
    const f = () => setRuta(parseRuta(window.location.hash))
    window.addEventListener('hashchange', f)
    return () => window.removeEventListener('hashchange', f)
  }, [])
  return ruta
}
