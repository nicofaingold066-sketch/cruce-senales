// Mejora #47 (hallazgo 8, navegador compartido): entrar como otra persona sin perder la sesión anterior.
// No se usa supabase.auth.signOut(): llama a /logout y REVOCA la sesión anónima, que no se recupera
// (en la notebook de la demo, Tomi se perdería). Se guarda el refresh_token de la sesión actual en este
// navegador y se crea otra sesión anónima, que solo reemplaza la sesión local.
import { isAuthRetryableFetchError } from '@supabase/supabase-js'
import { supabase } from './supabase'

const CLAVE = 'cruxe:sesion-guardada'

export interface SesionGuardada {
  refresh_token: string
  /** "Tomi en «Los del asado»": solo para mostrar en la portada. */
  etiqueta: string
}

export function leerGuardada(): SesionGuardada | null {
  try {
    const crudo = localStorage.getItem(CLAVE)
    if (!crudo) return null
    const g = JSON.parse(crudo) as Partial<SesionGuardada>
    return typeof g.refresh_token === 'string' && typeof g.etiqueta === 'string'
      ? { refresh_token: g.refresh_token, etiqueta: g.etiqueta }
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
    if (!guardar({ refresh_token: token, etiqueta })) {
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
      return { ok: false, mensaje: 'Sin conexión con el servidor. La sesión sigue guardada; intenta de nuevo.' }
    }
    olvidarGuardada()
    return { ok: false, mensaje: `La sesión de ${g.etiqueta} ya no se puede recuperar en este navegador.` }
  }
  olvidarGuardada()
  return { ok: true }
}
