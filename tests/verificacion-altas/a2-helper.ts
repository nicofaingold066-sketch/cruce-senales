// Helper propio del verificador A2. No importa nada de tests/backend ni de otros verificadores.
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { randomUUID } from 'node:crypto'

const URL = (import.meta as any).env?.VITE_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
const KEY = (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY

export type Env = { ok: boolean; contrato?: number; error?: { codigo: string; detalle: string; mensaje: string }; [k: string]: any }

export let a2SesionesCreadas = 0

export async function a2Sesion(): Promise<SupabaseClient> {
  if (!URL || !KEY) throw new Error('faltan variables VITE_ en el entorno')
  const c = createClient(URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  const { error } = await c.auth.signInAnonymously()
  if (error) throw new Error('signInAnonymously fallo: ' + error.message)
  a2SesionesCreadas++
  return c
}

export async function a2Rpc(c: SupabaseClient, fn: string, args: Record<string, unknown> = {}): Promise<Env> {
  const { data, error } = await c.rpc(fn, args)
  if (error) return { ok: false, error: { codigo: 'rpc_error', detalle: error.code ?? '', mensaje: error.message } }
  return data as Env
}

export const a2Cod = (r: Env) => (r.ok ? 'ok' : `${r.error?.codigo}/${r.error?.detalle}`)

export function a2Esperar(r: Env, ctx: string): Env {
  if (!r.ok) throw new Error(`${ctx}: esperaba ok, vino ${a2Cod(r)} ${JSON.stringify(r.error)}`)
  return r
}

let contador = 0
export function a2Nombre(tag: string): string {
  // nombres de 30 caracteres como maximo
  contador++
  const sufijo = Math.random().toString(36).slice(2, 6)
  return `ver-A2-${tag}-${contador}${sufijo}`.slice(0, 30)
}

export type A2Org = { c: SupabaseClient; espacioId: string; codigo: string; miMiembroId: string }

export async function a2Organizador(): Promise<A2Org> {
  const c = await a2Sesion()
  const r = a2Esperar(await a2Rpc(c, 'seed_demo_space'), 'seed_demo_space')
  return { c, espacioId: r.resultado.espacio_id, codigo: r.espacio.codigo_invitacion, miMiembroId: r.espacio.mi_miembro_id }
}

export async function a2Simulado(org: A2Org, nombre: string): Promise<string> {
  const r = a2Esperar(await a2Rpc(org.c, 'add_simulated_member', { p_espacio_id: org.espacioId, p_nombre_visible: nombre }), 'add_simulated_member')
  return r.resultado.miembro_id
}

export async function a2Propuesta(org: A2Org, titulo: string): Promise<string> {
  const r = a2Esperar(
    await a2Rpc(org.c, 'create_proposal', {
      p_espacio_id: org.espacioId,
      p_titulo: titulo,
      p_franjas: [
        { inicio: '2026-11-20T14:00', fin: '2026-11-20T17:00' },
        { inicio: '2026-11-21T14:00', fin: '2026-11-21T17:00' },
      ],
      p_minimo: 2,
      p_maximo: 6,
      p_imprescindible_id: org.miMiembroId,
      p_plazo: '2026-11-19T20:00',
      p_zona_horaria: 'America/Santiago',
      p_intento_id: randomUUID(),
    }),
    'create_proposal',
  )
  const pid = r.resultado.propuesta_id
  a2Esperar(await a2Rpc(org.c, 'open_proposal', { p_propuesta_id: pid }), 'open_proposal')
  return pid
}

export const a2Uuid = () => randomUUID()
export const a2Dormir = (ms: number) => new Promise((r) => setTimeout(r, ms))
