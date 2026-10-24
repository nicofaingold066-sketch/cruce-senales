// Mejora #47 (hallazgo 8, navegador compartido): entrar como otra persona sin perder la sesión anterior.
// No se usa supabase.auth.signOut(): llama a /logout y REVOCA la sesión anónima, que no se recupera
// (en la notebook de la demo, Tomi se perdería). Se guarda el refresh_token de la sesión actual en este
// navegador y se crea otra sesión anónima, que solo reemplaza la sesión local.
import { isAuthRetryableFetchError } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { guardarPerfil, leerPerfil, olvidarPerfil } from './perfil'

const CLAVE = 'cruxe:sesion-guardada'

export interface SesionGuardada {
  refresh_token: string
  /** "Tomi en «Los del finde»": solo para mostrar en la portada. */
  etiqueta: string
  /** Nombre local (lib/perfil) de quien guardó la sesión: se restaura al volver y no queda a la vista de otra persona. */
  nombre?: string
}

export function leerGuardada(): SesionGuardada | null {
  try {
    const crudo = localStorage.getItem(CLAVE)
    if (!crudo) return null
    const g = JSON.parse(crudo) as Partial<SesionGuardada>
    return typeof g.refresh_token === 'string' && typeof g.etiqueta === 'string'
      ? { refresh_token: g.refresh_token, etiqueta: g.etiqueta, ...(typeof g.nombre === 'string' ? { nombre: g.nombre } : {}) }
      : null
  } catch {
    return null
  }
}

export function olvidarGuardada() {
  try {
    localStorage.removeItem(CLAVE)
  } catch {
    // Sin almacenamiento no hay nada guardado.
  }
}

function guardar(g: SesionGuardada): boolean {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(g))
    return true
  } catch {
    return false
  }
}

export type ResultadoCambio = { ok: true; guardada: boolean } | { ok: false; mensaje: string }

/**
 * Deja guardada la sesión actual (si el navegador no guarda ya otra) y crea una sesión anónima nueva.
 * Si algo falla antes de crearla, sigue la sesión de antes y no queda nada guardado de este intento.
 */
export async function entrarComoOtraPersona(etiqueta: string): Promise<ResultadoCambio> {
  // Una sola sesión guardada: no se pisa la que ya está (en la demo, la de Tomi vale más que la de un invitado).
  let guardada = false
  if (!leerGuardada()) {
    // refreshSession rota el token ahora: el que se guarda es el último y nadie más lo usa después.
    const { data, error } = await supabase.auth.refreshSession()
    const token = data.session?.refresh_token
    if (error || !token) return { ok: false, mensaje: 'No se pudo guardar tu sesión actual. Sigues como antes; intenta de nuevo.' }
    const nombre = leerPerfil()?.nombre
    if (!guardar({ refresh_token: token, etiqueta, ...(nombre ? { nombre } : {}) })) {
      return { ok: false, mensaje: 'Este navegador no permite guardar la sesión actual. Para entrar como otra persona, usa una ventana privada.' }
    }
    guardada = true
  }
  const r = await supabase.auth.signInAnonymously()
  if (r.error || !r.data.session) {
    if (guardada) olvidarGuardada()
    return { ok: false, mensaje: 'No se pudo crear una sesión nueva. Sigues como antes; intenta de nuevo.' }
  }
  return { ok: true, guardada }
}

/** Vuelve a la sesión guardada. Si el token ya no sirve, se olvida y se avisa. */
export async function volverAGuardada(g: SesionGuardada): Promise<{ ok: true } | { ok: false; mensaje: string }> {
  const { data, error } = await supabase.auth.refreshSession({ refresh_token: g.refresh_token })
  if (error || !data.session) {
    // Un error de red no invalida el token: se conserva para reintentar.
    if (error && isAuthRetryableFetchError(error)) {
      return { ok: false, mensaje: 'Sin conexión. Tu sesión sigue guardada; intenta de nuevo.' }
    }
    olvidarGuardada()
    return { ok: false, mensaje: `La sesión de ${g.etiqueta} ya no se puede recuperar en este navegador.` }
  }
  olvidarGuardada()
  // El nombre local vuelve con su sesión (o se borra si no había), así nadie más queda mostrado como esa persona.
  if (g.nombre) guardarPerfil(g.nombre)
  else olvidarPerfil()
  return { ok: true }
}

/**
 * Abre una sesión anónima nueva en este navegador (hallazgo 8 de la revisión de privacidad, mejora #47) SIN revocar
 * la anterior: signOut, aun con scope 'local', llama a /logout y la sesión anónima de Tomi no se recupera nunca.
 * La anterior queda guardada para volver desde el inicio (lib/sesiones). Borra también lo que la app guardó en
 * sessionStorage (por ejemplo, el borrador del agente).
 */
export async function sesionNueva(etiqueta: string) {
  const r = await entrarComoOtraPersona(etiqueta)
  if (r.ok) {
    // La persona nueva no hereda el nombre local de la anterior ("Hola, Tomi." en la notebook de Tomi).
    olvidarPerfil()
    try {
      for (const k of Object.keys(sessionStorage)) if (k.startsWith('cruxe:')) sessionStorage.removeItem(k)
    } catch {
      // Sin almacenamiento: no hay nada que borrar.
    }
  }
  return r
}
