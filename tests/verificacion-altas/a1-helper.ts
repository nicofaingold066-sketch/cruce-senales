// Helper propio del verificador independiente de A1 (cupo del imprescindible).
// No importa nada de tests/backend/. Solo usa RPC publicas del contrato.
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { randomUUID } from 'node:crypto'

const URL = import.meta.env.VITE_SUPABASE_URL as string
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string

export type J = any

export interface A1Sesion {
  nombre: string
  c: SupabaseClient
}

export async function a1Sesion(nombre: string): Promise<A1Sesion> {
  if (!URL || !URL.includes('tjkfdnvzsikncjbskufm')) throw new Error('URL de proyecto no permitida')
  const c = createClient(URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  const { error } = await c.auth.signInAnonymously()
  if (error) throw new Error('signInAnonymously fallo: ' + error.message)
  return { nombre, c }
}

export async function a1Rpc(s: A1Sesion, fn: string, args: Record<string, unknown>): Promise<J> {
  const { data, error } = await s.c.rpc(fn, args)
  if (error) throw new Error(`${fn} error PostgREST: ${error.message}`)
  return data
}

export function a1Ok(r: J, ctx: string): J {
  if (!r || r.ok !== true) throw new Error(`${ctx}: se esperaba ok y llego ${JSON.stringify(r?.error ?? r)}`)
  return r
}

export const a1Uuid = () => randomUUID()

// Fechas futuras fijas (hoy es 23 oct 2026).
export const A1_FRANJAS = [
  { inicio: '2026-11-20T14:00', fin: '2026-11-20T17:00' },
  { inicio: '2026-11-21T14:00', fin: '2026-11-21T17:00' },
]
export const A1_PLAZO = '2026-11-15T20:00'

export interface A1Espacio {
  espacioId: string
  codigo: string
  miembros: Record<string, string> // nombre -> miembro_id
  sims: Set<string> // miembro_id de simulados
}

/**
 * Espacio de prueba con organizador org, invitados reales y simulados. Enmienda 7 (E7.3): la simulación solo
 * existe en espacios demo, así que es el demo propio de la sesión org (seed_demo_space, idempotente), no un
 * espacio "ver-A1-..." nuevo. El organizador del demo se llama "Tomi"; acá se lo sigue mapeando como org.nombre.
 * Los 5 simulados del demo (Luna, Mati, Caro, Fede, Sofi) no tienen condiciones y no entran en las propuestas.
 */
export async function a1CrearEspacio(
  org: A1Sesion,
  reales: A1Sesion[],
  simulados: string[],
  _etiqueta: string,
): Promise<A1Espacio> {
  const r = a1Ok(await a1Rpc(org, 'seed_demo_space', {}), 'seed_demo_space')
  const espacioId = r.espacio.id
  const codigo = r.espacio.codigo_invitacion
  const miembros: Record<string, string> = { [org.nombre]: r.espacio.mi_miembro_id }
  for (const s of reales) {
    const j = a1Ok(await a1Rpc(s, 'join_space', { p_codigo: codigo, p_nombre_visible: s.nombre }), 'join_space ' + s.nombre)
    miembros[s.nombre] = j.resultado.miembro_id
  }
  const sims = new Set<string>()
  for (const n of simulados) {
    const a = a1Ok(await a1Rpc(org, 'add_simulated_member', { p_espacio_id: espacioId, p_nombre_visible: n }), 'add_simulated_member')
    miembros[n] = a.resultado.miembro_id
    sims.add(a.resultado.miembro_id)
  }
  return { espacioId, codigo, miembros, sims }
}

/**
 * Crea, abre, carga condiciones A+B a los elegibles indicados y publica la version 1.
 * elegiblesReales: sesiones reales que guardan condiciones; elegiblesSim: nombres simulados.
 */
export async function a1Propuesta(
  org: A1Sesion,
  esp: A1Espacio,
  opts: { minimo: number; maximo: number; imprescindible: string; reales: A1Sesion[]; sims: string[]; titulo: string },
): Promise<string> {
  const cr = a1Ok(
    await a1Rpc(org, 'create_proposal', {
      p_espacio_id: esp.espacioId,
      p_titulo: opts.titulo,
      p_franjas: A1_FRANJAS,
      p_minimo: opts.minimo,
      p_maximo: opts.maximo,
      p_imprescindible_id: esp.miembros[opts.imprescindible],
      p_plazo: A1_PLAZO,
      p_zona_horaria: 'America/Santiago',
      p_intento_id: a1Uuid(),
    }),
    'create_proposal',
  )
  const pid = cr.resultado.propuesta_id
  a1Ok(await a1Rpc(org, 'open_proposal', { p_propuesta_id: pid }), 'open_proposal')
  for (const s of opts.reales) {
    a1Ok(await a1Rpc(s, 'save_my_conditions', { p_propuesta_id: pid, p_disponibilidad: { A: 'si', B: 'si' } }), 'save ' + s.nombre)
  }
  for (const n of opts.sims) {
    a1Ok(
      await a1Rpc(org, 'simulate_save_conditions', {
        p_propuesta_id: pid,
        p_miembro_id: esp.miembros[n],
        p_disponibilidad: { A: 'si', B: 'si' },
      }),
      'sim save ' + n,
    )
  }
  const ev = a1Ok(await a1Rpc(org, 'evaluate_and_publish', { p_propuesta_id: pid, p_intento_id: a1Uuid() }), 'evaluate')
  if (ev.resultado.tipo !== 'opcion_publicada' || ev.resultado.version !== 1) {
    throw new Error('evaluate no publico v1: ' + JSON.stringify(ev.resultado))
  }
  return pid
}

export async function a1Aceptar(s: A1Sesion, pid: string, version = 1, intento = a1Uuid()): Promise<J> {
  return a1Rpc(s, 'accept_version', { p_propuesta_id: pid, p_version: version, p_intento_id: intento })
}

export async function a1SimAceptar(org: A1Sesion, pid: string, miembroId: string, version = 1, intento = a1Uuid()): Promise<J> {
  return a1Rpc(org, 'simulate_accept', { p_propuesta_id: pid, p_miembro_id: miembroId, p_version: version, p_intento_id: intento })
}

export async function a1Estado(s: A1Sesion, pid: string): Promise<J> {
  return a1Ok(await a1Rpc(s, 'get_proposal_state', { p_propuesta_id: pid }), 'get_proposal_state').propuesta
}

/** Verifica la coherencia interna de cupos de un EstadoPropuesta. Devuelve lista de violaciones. */
export function a1Incoherencias(p: J, imprescindibleRetirado = false): string[] {
  const v: string[] = []
  const c = p?.opcion?.cupos
  if (!c) return ['sin opcion.cupos']
  const conf = p.opcion.aceptaron.length
  if (c.confirmados !== conf) v.push(`confirmados ${c.confirmados} != aceptaron ${conf}`)
  if (p.confirmados !== conf) v.push(`propuesta.confirmados ${p.confirmados} != ${conf}`)
  if (c.disponibles !== p.maximo - conf) v.push(`disponibles ${c.disponibles} != ${p.maximo - conf}`)
  const impAcepto = p.opcion.aceptaron.some((a: J) => a.miembro.miembro_id === p.imprescindible.miembro_id)
  if (c.imprescindible_acepto !== impAcepto) v.push(`imprescindible_acepto ${c.imprescindible_acepto} != ${impAcepto}`)
  const reservado = !impAcepto && !imprescindibleRetirado
  if (c.reservado_imprescindible !== reservado) v.push(`reservado_imprescindible ${c.reservado_imprescindible} != ${reservado}`)
  const libres = Math.max(0, p.maximo - conf - (reservado ? 1 : 0))
  if (c.libres_para_otros !== libres) v.push(`libres_para_otros ${c.libres_para_otros} != ${libres}`)
  if (conf > p.maximo) v.push(`confirmados ${conf} > maximo ${p.maximo}`)
  return v
}

export function a1Cupos(p: J) {
  const c = p.opcion.cupos
  return {
    estado: p.estado,
    conf: c.confirmados,
    disp: c.disponibles,
    res: c.reservado_imprescindible,
    libres: c.libres_para_otros,
    imp: c.imprescindible_acepto,
  }
}

export function a1Err(r: J): string {
  return r?.ok ? 'ok' : `${r?.error?.codigo}/${r?.error?.detalle}`
}
