// Helper propio del verificador A5. No importa nada de tests/backend ni de otros verificadores.
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export const A5_URL: string = (process.env.VITE_SUPABASE_URL ?? (import.meta as any).env?.VITE_SUPABASE_URL ?? '') as string
export const A5_KEY: string = (process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY ?? '') as string

export function a5Cliente(): SupabaseClient {
  if (!A5_URL.includes('tjkfdnvzsikncjbskufm')) throw new Error('A5: URL inesperada, se aborta')
  return createClient(A5_URL, A5_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
}

export async function a5Sesion(): Promise<{ c: SupabaseClient; token: string }> {
  const c = a5Cliente()
  const { data, error } = await c.auth.signInAnonymously()
  if (error || !data.session) throw new Error('A5: no se pudo crear sesion anonima: ' + (error?.message ?? 'sin sesion'))
  return { c, token: data.session.access_token }
}

export type A5Resp = { data: any; error: any; status: number }

export async function a5Rpc(c: SupabaseClient, nombre: string, args: Record<string, unknown> = {}): Promise<A5Resp> {
  const r = await c.rpc(nombre, args)
  return { data: r.data, error: r.error, status: r.status }
}

// Llamada REST cruda (para controlar cabeceras y ver el codigo HTTP real).
export async function a5Raw(
  path: string,
  opts: { method?: string; body?: unknown; token?: string | null; headers?: Record<string, string> } = {},
): Promise<{ status: number; json: any; text: string }> {
  const h: Record<string, string> = { apikey: A5_KEY, 'Content-Type': 'application/json', ...(opts.headers ?? {}) }
  if (opts.token) h.Authorization = `Bearer ${opts.token}`
  const res = await fetch(`${A5_URL}${path}`, {
    method: opts.method ?? 'POST',
    headers: h,
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  })
  const text = await res.text()
  let json: any = null
  try { json = JSON.parse(text) } catch { /* no json */ }
  return { status: res.status, json, text }
}

export const A5_PERMITIDAS = [
  'server_info', 'create_space', 'join_space', 'list_my_spaces', 'get_space', 'seed_demo_space',
  'add_simulated_member', 'reset_demo', 'create_proposal', 'open_proposal', 'list_proposals',
  'get_proposal_state', 'mark_interest', 'save_my_conditions', 'get_my_conditions',
  'evaluate_and_publish', 'accept_version', 'withdraw_commitment', 'propose_repair', 'cancel_proposal',
  'simulate_mark_interest', 'simulate_save_conditions', 'simulate_accept', 'simulate_withdraw',
  'get_simulation_panel',
] as const

const U = '00000000-0000-4000-8000-0000000000a5'

// Argumentos sintacticamente validos (ids inexistentes) para cada una de las 25.
export function a5ArgsFicticios(): Record<string, Record<string, unknown>> {
  return {
    server_info: {},
    create_space: { p_nombre: 'ver-A5-anon', p_tipo: 'amigos', p_nombre_visible: 'X' },
    join_space: { p_codigo: 'ZZZZZZZZ', p_nombre_visible: 'X' },
    list_my_spaces: {},
    get_space: { p_espacio_id: U },
    seed_demo_space: {},
    add_simulated_member: { p_espacio_id: U, p_nombre_visible: 'X' },
    reset_demo: { p_espacio_id: U, p_intento_id: crypto.randomUUID() },
    create_proposal: {
      p_espacio_id: U, p_titulo: 'ver-A5', p_franjas: [{ inicio: '2026-12-10T14:00', fin: '2026-12-10T17:00' }, { inicio: '2026-12-11T14:00', fin: '2026-12-11T17:00' }],
      p_minimo: 2, p_maximo: 3, p_imprescindible_id: U, p_plazo: '2026-12-05T20:00', p_zona_horaria: 'America/Santiago', p_intento_id: crypto.randomUUID(),
    },
    open_proposal: { p_propuesta_id: U },
    list_proposals: { p_espacio_id: U },
    get_proposal_state: { p_propuesta_id: U },
    mark_interest: { p_propuesta_id: U, p_interesado: true },
    save_my_conditions: { p_propuesta_id: U, p_disponibilidad: { A: 'si', B: 'no' } },
    get_my_conditions: { p_propuesta_id: U },
    evaluate_and_publish: { p_propuesta_id: U, p_intento_id: crypto.randomUUID() },
    accept_version: { p_propuesta_id: U, p_version: 1, p_intento_id: crypto.randomUUID() },
    withdraw_commitment: { p_propuesta_id: U },
    propose_repair: { p_propuesta_id: U, p_intento_id: crypto.randomUUID() },
    cancel_proposal: { p_propuesta_id: U },
    simulate_mark_interest: { p_propuesta_id: U, p_miembro_id: U, p_interesado: true },
    simulate_save_conditions: { p_propuesta_id: U, p_miembro_id: U, p_disponibilidad: { A: 'si' } },
    simulate_accept: { p_propuesta_id: U, p_miembro_id: U, p_version: 1, p_intento_id: crypto.randomUUID() },
    simulate_withdraw: { p_propuesta_id: U, p_miembro_id: U },
    get_simulation_panel: { p_propuesta_id: U },
  }
}

export function a5Resumen(r: A5Resp): string {
  if (r.error) return `HTTP ${r.status} err ${r.error.code} ${String(r.error.message).slice(0, 80)}`
  const d = r.data
  if (d && typeof d === 'object') return `HTTP ${r.status} ok=${d.ok} contrato=${d.contrato}${d.error ? ` ${d.error.codigo}/${d.error.detalle}` : ''}`
  return `HTTP ${r.status} ${JSON.stringify(d)}`
}
