import { createContext, useContext, useEffect, useState } from 'react'
import { flushSync } from 'react-dom'
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
  | { nombre: 'planes' }
  | { nombre: 'perfil' }
  | { nombre: 'crear' }
  | { nombre: 'espacio'; espacioId: string; vista?: 'agente' }
  | { nombre: 'nueva'; espacioId: string }
  | { nombre: 'responder'; espacioId: string; propuestaId?: string }
  | { nombre: 'propuesta'; espacioId: string; propuestaId: string }
  | { nombre: 'unirse'; codigo: string; invalida?: boolean }
  | { nombre: 'entrar' }
  | { nombre: 'invalida' }

/** U6 (revisión de Codex): un enlace mal copiado no puede romper la app; se avisa y se ofrece escribir el código. */
function rutaUnirse(crudo: string): Ruta {
  try {
    const codigo = decodeURIComponent(crudo).trim()
    if (/^[A-Za-z0-9]{4,16}$/.test(codigo)) return { nombre: 'unirse', codigo }
  } catch {
    // Escape inválido (por ejemplo "%"): se trata como invitación inválida.
  }
  return { nombre: 'unirse', codigo: '', invalida: true }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function parseRuta(hash: string): Ruta {
  const partes = hash.replace(/^#\/?/, '').split('/').filter(Boolean)
  if (partes[0] === 'unirse' && partes[1]) return rutaUnirse(partes[1])
  if (partes[0] === 'entrar') return { nombre: 'entrar' }
  if (partes[0] === 'planes') return { nombre: 'planes' }
  if (partes[0] === 'perfil') return { nombre: 'perfil' }
  if (partes[0] === 'crear') return { nombre: 'crear' }
  // rincones O-06: un enlace a un grupo o plan mal copiado no se manda al servidor (respondía "Falla temporal").
  if (partes[0] === 'e' && partes[1] && (!UUID.test(partes[1]) || (partes[2] === 'p' && partes[3] && !UUID.test(partes[3])))) {
    return { nombre: 'invalida' }
  }
  if (partes[0] === 'e' && partes[1]) {
    if (partes[2] === 'nueva') return { nombre: 'nueva', espacioId: partes[1] }
    if (partes[2] === 'responder') return { nombre: 'responder', espacioId: partes[1], ...(partes[3] ? { propuestaId: partes[3] } : {}) }
    if (partes[2] === 'p' && partes[3]) return { nombre: 'propuesta', espacioId: partes[1], propuestaId: partes[3] }
    // Mockup, pantalla 7: el agente del círculo es una pantalla propia del grupo (la monta Espacio).
    if (partes[2] === 'agente') return { nombre: 'espacio', espacioId: partes[1], vista: 'agente' }
    return { nombre: 'espacio', espacioId: partes[1] }
  }
  return { nombre: 'inicio' }
}

export const rutas = {
  inicio: () => '#/',
  planes: () => '#/planes',
  perfil: () => '#/perfil',
  crear: () => '#/crear',
  espacio: (id: string) => `#/e/${id}`,
  nueva: (id: string) => `#/e/${id}/nueva`,
  agente: (id: string) => `#/e/${id}/agente`,
  /** #88: responder en un toque la propuesta abierta (o esa propuesta); si no se puede, la pantalla vuelve al espacio. */
  responder: (id: string, propuestaId?: string) => `#/e/${id}/responder${propuestaId ? `/${propuestaId}` : ''}`,
  propuesta: (e: string, p: string) => `#/e/${e}/p/${p}`,
  unirse: (codigo: string) => `#/unirse/${encodeURIComponent(codigo)}`,
  entrar: () => '#/entrar',
}

export function irA(hash: string) {
  window.location.hash = hash
}

type Transicion = { ready?: Promise<unknown>; finished?: Promise<unknown>; updateCallbackDone?: Promise<unknown> }
type DocConTransicion = Document & { startViewTransition?: (cb: () => void) => Transicion }

export function useRuta(): Ruta {
  const [ruta, setRuta] = useState<Ruta>(() => parseRuta(window.location.hash))
  useEffect(() => {
    // Transición nativa entre pantallas (View Transitions API) donde exista; si no, el cambio es inmediato.
    const f = () => {
      const nueva = parseRuta(window.location.hash)
      const doc = document as DocConTransicion
      const reducido = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      if (doc.startViewTransition && !reducido) {
        const t = doc.startViewTransition(() => flushSync(() => setRuta(nueva)))
        // Si el navegador salta la transición (otra navegación, pestaña oculta), sus promesas se rechazan: no es un error.
        for (const pr of [t?.ready, t?.finished, t?.updateCallbackDone]) pr?.catch(() => {})
      } else setRuta(nueva)
    }
    window.addEventListener('hashchange', f)
    return () => window.removeEventListener('hashchange', f)
  }, [])
  return ruta
}
