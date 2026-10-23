// Ayudas para pruebas de backend contra el proyecto real (tjkfdnvzsikncjbskufm).
// Cada sesión es un cliente anónimo independiente: persistSession false, sin refresco automático.
// Solo usa la clave publishable del .env (nunca service_role).
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { randomUUID } from 'node:crypto'

const URL = process.env.VITE_SUPABASE_URL ?? ''
const KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? ''

export type Sesion = { c: SupabaseClient; userId: string }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Json = any

export function clienteSinSesion(): SupabaseClient {
  return createClient(URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } })
}

export async function nuevaSesion(): Promise<Sesion> {
  const c = clienteSinSesion()
  const { data, error } = await c.auth.signInAnonymously()
  if (error) {
    // anonymous_provider_disabled => falta habilitar sesiones anónimas en Auth (decisión humana).
    throw new Error(`signInAnonymously falló: ${error.code ?? ''} ${error.message}`)
  }
  return { c, userId: data.user!.id }
}

/** Llama a la RPC y devuelve el sobre. Un error de transporte se trata como fallo de la prueba. */
export async function rpc(s: Sesion | SupabaseClient, fn: string, args: Record<string, unknown> = {}): Promise<Json> {
  const c = 'c' in s ? s.c : s
  const { data, error } = await c.rpc(fn, args)
  if (error) throw new Error(`${fn}: error de transporte ${error.code ?? ''} ${error.message}`)
  return data
}

/** Igual que rpc, pero exige ok:true y muestra el error tipado si no. */
export async function ok(s: Sesion | SupabaseClient, fn: string, args: Record<string, unknown> = {}): Promise<Json> {
  const r = await rpc(s, fn, args)
  if (!r?.ok) throw new Error(`${fn} devolvió error: ${JSON.stringify(r?.error)}`)
  return r
}

export const intento = () => randomUUID()

export function sufijo(): string {
  return randomUUID().slice(0, 6)
}

/** Franjas futuras fijas (diciembre 2026) y un plazo anterior. */
export const FRANJAS = [
  { inicio: '2026-12-05T14:00', fin: '2026-12-05T17:00' },
  { inicio: '2026-12-06T14:00', fin: '2026-12-06T17:00' },
]
export const PLAZO = '2026-12-01T20:00'

export async function crearEspacioPrueba(s: Sesion, nombre: string, visible: string) {
  const r = await ok(s, 'create_space', { p_nombre: `t-${nombre}-${sufijo()}`, p_tipo: 'amigos', p_nombre_visible: visible })
  return { espacioId: r.resultado.espacio_id as string, codigo: r.resultado.codigo_invitacion as string, miembroId: r.resultado.miembro_id as string }
}

export async function simulado(s: Sesion, espacioId: string, nombre: string): Promise<string> {
  const r = await ok(s, 'add_simulated_member', { p_espacio_id: espacioId, p_nombre_visible: nombre })
  return r.resultado.miembro_id
}

export async function crearPropuesta(
  s: Sesion,
  espacioId: string,
  imprescindibleId: string,
  opts: { minimo?: number; maximo?: number; plazo?: string; titulo?: string } = {},
) {
  const r = await ok(s, 'create_proposal', {
    p_espacio_id: espacioId,
    p_titulo: opts.titulo ?? 't-propuesta',
    p_franjas: FRANJAS,
    p_minimo: opts.minimo ?? 4,
    p_maximo: opts.maximo ?? 6,
    p_imprescindible_id: imprescindibleId,
    p_plazo: opts.plazo ?? PLAZO,
    p_zona_horaria: 'America/Santiago',
    p_intento_id: intento(),
  })
  const id = r.resultado.propuesta_id as string
  await ok(s, 'open_proposal', { p_propuesta_id: id })
  return id
}

export const esperar = (ms: number) => new Promise((res) => setTimeout(res, ms))

export function err(r: Json): string {
  return r?.ok === false ? `${r.error.codigo}/${r.error.detalle}` : 'ok'
}
