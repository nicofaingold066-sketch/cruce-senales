// Helper propio del verificador A3. No importa nada de tests/backend.
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { randomUUID } from 'node:crypto'

const URL = import.meta.env.VITE_SUPABASE_URL as string
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string

export type Sobre = {
  ok: boolean
  contrato?: number
  error?: { codigo: string; detalle: string; mensaje: string; reintentable: boolean }
  [k: string]: any
}

export async function a3Sesion(): Promise<SupabaseClient> {
  if (!URL || !URL.includes('tjkfdnvzsikncjbskufm')) throw new Error('URL de proyecto inesperada')
  const c = createClient(URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  const { error } = await c.auth.signInAnonymously()
  if (error) throw new Error('signInAnonymously fallo: ' + error.message)
  return c
}

export async function a3Rpc(c: SupabaseClient, fn: string, args: Record<string, unknown> = {}): Promise<Sobre> {
  const { data, error } = await c.rpc(fn, args)
  if (error) return { ok: false, error: { codigo: 'rpc_error', detalle: error.message, mensaje: error.message, reintentable: true } }
  return data as Sobre
}

export const a3Id = () => randomUUID()

function fmt(d: Date) {
  return d.toISOString().slice(0, 16) // YYYY-MM-DDTHH:MM (hora de pared; desfase irrelevante con dias de margen)
}

export function a3ArgsPropuesta(espacioId: string, imprescindibleId: string, titulo: string, intento: string) {
  const base = Date.now()
  const dia = 24 * 3600 * 1000
  // Fijamos al dia para que reintentos del mismo intento tengan parametros identicos.
  const d0 = new Date(Math.floor(base / dia) * dia + 40 * dia + 17 * 3600 * 1000)
  const a1 = new Date(d0.getTime()), a2 = new Date(d0.getTime() + 3 * 3600 * 1000)
  const b1 = new Date(d0.getTime() + dia), b2 = new Date(d0.getTime() + dia + 3 * 3600 * 1000)
  const plazo = new Date(d0.getTime() - 5 * dia)
  return {
    p_espacio_id: espacioId,
    p_titulo: titulo,
    p_franjas: [{ inicio: fmt(a1), fin: fmt(a2) }, { inicio: fmt(b1), fin: fmt(b2) }],
    p_minimo: 2,
    p_maximo: 4,
    p_imprescindible_id: imprescindibleId,
    p_plazo: fmt(plazo),
    p_zona_horaria: 'America/Santiago',
    p_intento_id: intento,
  }
}

export async function a3Propuestas(c: SupabaseClient, espacioId: string): Promise<any[]> {
  const r = await a3Rpc(c, 'list_proposals', { p_espacio_id: espacioId })
  if (!r.ok) throw new Error('list_proposals fallo: ' + JSON.stringify(r.error))
  return r.propuestas
}

export async function a3Generacion(c: SupabaseClient, espacioId: string): Promise<number> {
  const r = await a3Rpc(c, 'get_space', { p_espacio_id: espacioId })
  if (!r.ok) throw new Error('get_space fallo: ' + JSON.stringify(r.error))
  return Number(r.espacio.generacion)
}
