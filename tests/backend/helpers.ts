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

/** Llamada sin interpretar (para probar permisos): data, error de PostgREST y estado HTTP. */
export async function rpcCrudo(s: Sesion | SupabaseClient, fn: string, args: Record<string, unknown> = {}) {
  const c = 'c' in s ? s.c : s
  const { data, error, status } = await c.rpc(fn, args)
  return { data: data as Json, error, status }
}

/** Versión del contrato vigente (enmienda 2). */
export const CONTRATO = 2

export const intento = () => randomUUID()

const Z = '00000000-0000-4000-8000-000000000000'
/**
 * Lista permitida de entradas públicas (A5) con argumentos inofensivos: con una sesión válida cada
 * llamada termina en un sobre de error de negocio (o en una lectura vacía) y no escribe nada.
 * seed_demo_space es la excepción (crea el demo propio de esa sesión) y se prueba aparte.
 */
export const PERMITIDAS: Record<string, () => Record<string, unknown>> = {
  server_info: () => ({}),
  create_space: () => ({ p_nombre: '', p_tipo: 'amigos', p_nombre_visible: 'x' }),
  join_space: () => ({ p_codigo: 'ZZZZZZZZ', p_nombre_visible: 'x' }),
  preview_space_by_code: () => ({ p_codigo: 'ZZZZZZZZ' }), // enmienda 9
  list_my_spaces: () => ({}),
  get_space: () => ({ p_espacio_id: Z }),
  leave_space: () => ({ p_espacio_id: Z, p_intento_id: randomUUID() }), // actividad del grupo
  seed_demo_space: () => ({}),
  add_simulated_member: () => ({ p_espacio_id: Z, p_nombre_visible: 'x' }),
  reset_demo: () => ({ p_espacio_id: Z, p_intento_id: randomUUID() }),
  create_proposal: () => ({
    p_espacio_id: Z, p_titulo: '', p_franjas: [], p_minimo: 2, p_maximo: 2, p_imprescindible_id: Z,
    p_plazo: '2026-12-01T20:00', p_zona_horaria: 'America/Santiago', p_intento_id: randomUUID(),
  }),
  open_proposal: () => ({ p_propuesta_id: Z }),
  list_proposals: () => ({ p_espacio_id: Z }),
  get_proposal_state: () => ({ p_propuesta_id: Z }),
  mark_interest: () => ({ p_propuesta_id: Z, p_interesado: true }),
  save_my_conditions: () => ({ p_propuesta_id: Z, p_disponibilidad: { A: 'si' } }),
  get_my_conditions: () => ({ p_propuesta_id: Z }),
  evaluate_and_publish: () => ({ p_propuesta_id: Z, p_intento_id: randomUUID() }),
  accept_version: () => ({ p_propuesta_id: Z, p_version: 1, p_intento_id: randomUUID() }),
  withdraw_commitment: () => ({ p_propuesta_id: Z }),
  propose_repair: () => ({ p_propuesta_id: Z, p_intento_id: randomUUID() }),
  cancel_proposal: () => ({ p_propuesta_id: Z }),
  simulate_mark_interest: () => ({ p_propuesta_id: Z, p_miembro_id: Z, p_interesado: true }),
  simulate_save_conditions: () => ({ p_propuesta_id: Z, p_miembro_id: Z, p_disponibilidad: { A: 'si' } }),
  simulate_accept: () => ({ p_propuesta_id: Z, p_miembro_id: Z, p_version: 1, p_intento_id: randomUUID() }),
  simulate_withdraw: () => ({ p_propuesta_id: Z, p_miembro_id: Z }),
  get_simulation_panel: () => ({ p_propuesta_id: Z }),
  simulate_load_case: () => ({ p_propuesta_id: Z, p_intento_id: randomUUID() }), // enmienda 3
  // enmienda 4
  save_my_preferences: () => ({
    p_espacio_id: Z,
    p_preferencias: { presupuesto: 'da_igual', energia: 'con_todo', ambiente: 'da_igual', lugar: 'da_igual', me_gustaria: ['asado'] },
  }),
  get_my_preferences: () => ({ p_espacio_id: Z }),
  proponer_plan_borrador: () => ({ p_espacio_id: Z, p_sabado: '2026-10-31', p_clima: { sabado: 'desconocido', domingo: 'desconocido' } }),
  // enmienda 5
  simulate_save_preferences: () => ({
    p_espacio_id: Z, p_miembro_id: Z,
    p_preferencias: { presupuesto: 'da_igual', energia: 'con_todo', ambiente: 'da_igual', lugar: 'da_igual', me_gustaria: ['asado'] },
  }),
  // enmienda 11 (agente social, 0041)
  agente_social_contexto: () => ({ p_espacio_id: Z }),
  agente_social_candidatos: () => ({ p_espacio_id: Z, p_sabado: '2026-10-31', p_clima: { sabado: 'desconocido', domingo: 'desconocido' } }),
  set_recibir_invitaciones_agente: () => ({ p_espacio_id: Z, p_recibir: false }),
  set_politica_agente_social: () => ({ p_espacio_id: Z, p_modo: 'aprobacion', p_intento_id: randomUUID() }),
  iniciar_ejecucion_agente: () => ({ p_espacio_id: Z, p_ejecucion_id: randomUUID(), p_oportunidad: 'sabado:2026-10-31', p_parametros_hash: 'x' }),
  guardar_borrador_agente: () => ({ p_ejecucion_id: Z, p_opcion_ref: 'op_x', p_texto: 'x' }),
  aprobar_borrador_agente: () => ({ p_ejecucion_id: Z, p_borrador_hash: 'x', p_intento_id: randomUUID() }),
  publicar_borrador_agente: () => ({ p_ejecucion_id: Z, p_borrador_hash: 'x', p_intento_id: randomUUID() }),
  cerrar_ejecucion_agente: () => ({ p_ejecucion_id: Z, p_estado: 'fallida', p_motivo: 'sin_plan' }),
  // enmienda 13 (opinar sin bajarse, 0042)
  opinar_version: () => ({ p_propuesta_id: Z, p_version: 1, p_opinion: 'asi_no_puedo', p_intento_id: randomUUID() }),
}

/** Tamaño de la lista permitida (A5): 41 con E13; 42 con la salida explícita del grupo. */
export const TOTAL_PERMITIDAS = 42

/** Lista cerrada de siguiente_accion.codigo (enmienda 3). */
export const CODIGOS_SIGUIENTE = [
  'abrir_propuesta', 'reunir_condiciones', 'buscar_opcion', 'sin_opcion', 'aceptar_version', 'te_toca_aceptar',
  'ya_aceptaste', 'grupo_confirmado', 'buscar_alternativa', 'sin_alternativa', 'expirado', 'cancelado',
]

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

/**
 * Enmienda 7 (E7.3): la simulación solo existe en espacios demo. Para pruebas con simulados se usa el demo
 * propio de la sesión (seed_demo_space es idempotente: la misma sesión siempre recibe el mismo demo), con la
 * misma forma que crearEspacioPrueba. El organizador del demo es "Tomi" y ya trae 5 simulados sin
 * condiciones (Luna, Mati, Caro, Fede, Sofi): los simulados de la prueba necesitan nombres distintos.
 */
export async function demoPrueba(s: Sesion) {
  const r = await ok(s, 'seed_demo_space')
  return { espacioId: r.espacio.id as string, codigo: r.espacio.codigo_invitacion as string, miembroId: r.espacio.mi_miembro_id as string }
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
