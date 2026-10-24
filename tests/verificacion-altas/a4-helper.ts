// Helper propio del verificador A4 (atomicidad entre operaciones). No importa helpers ajenos.
// Todos los datos son ficticios. Nunca imprime la URL ni la clave.
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export type A4C = SupabaseClient
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type A4R = any

export const a4Errores: Array<{ op: string; r: A4R }> = []
export const a4Transporte: Array<{ op: string; msg: string; code?: string }> = []
export let a4SesionesCreadas = 0

export async function a4Sesion(): Promise<A4C> {
  const url = import.meta.env.VITE_SUPABASE_URL as string
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string
  if (!url || !key) throw new Error('faltan variables VITE_ en el entorno')
  const c = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  const { error } = await c.auth.signInAnonymously()
  if (error) throw new Error('signInAnonymously falló: ' + error.message)
  a4SesionesCreadas++
  return c
}

export async function a4Rpc(c: A4C, op: string, args: Record<string, unknown> = {}): Promise<A4R> {
  const { data, error } = await c.rpc(op, args)
  if (error) {
    a4Transporte.push({ op, msg: error.message, code: error.code })
    return { ok: false, transporte: true, error: { codigo: 'transporte', detalle: error.code, mensaje: error.message } }
  }
  if (data && data.ok === false) a4Errores.push({ op, r: data })
  return data
}

export const a4Dormir = (ms: number) => new Promise((r) => setTimeout(r, Math.max(0, ms)))

export function a4Mezclar<T>(xs: T[]): T[] {
  const a = xs.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ---- Reloj del servidor ---------------------------------------------------------------------
export const a4Reloj = { skewMs: 0, offsetLocalMs: 0 }

export async function a4SincronizarReloj(c: A4C): Promise<void> {
  const muestras: number[] = []
  for (let i = 0; i < 5; i++) {
    const t0 = Date.now()
    const r = await a4Rpc(c, 'server_info', {})
    const t1 = Date.now()
    const s = Date.parse(r.servidor_ahora.utc)
    a4Reloj.offsetLocalMs = Date.parse(r.servidor_ahora.local + 'Z') - s
    muestras.push(s + 500 - (t0 + t1) / 2)
  }
  muestras.sort((a, b) => a - b)
  a4Reloj.skewMs = muestras[2]
}

export const a4AhoraServidorMs = () => Date.now() + a4Reloj.skewMs
export const a4Local = (utcMs: number, conSeg = true) =>
  new Date(utcMs + a4Reloj.offsetLocalMs).toISOString().slice(0, conSeg ? 19 : 16)
export const a4Seg = (m: { utc: string }) => Date.parse(m.utc) / 1000

export async function a4EsperarHastaServidor(utcMs: number): Promise<void> {
  await a4Dormir(utcMs - a4AhoraServidorMs())
}

// ---- Construcción de datos de prueba ---------------------------------------------------------
export type A4Espacio = { id: string; codigo: string; yo: string; sims: Record<string, string> }

export async function a4CrearEspacio(T: A4C, sufijo: string, sims: string[]): Promise<A4Espacio> {
  const r = await a4Rpc(T, 'create_space', { p_nombre: `ver-a4-${sufijo}`, p_tipo: 'amigos', p_nombre_visible: 'Org A4' })
  if (!r?.ok) throw new Error('create_space: ' + JSON.stringify(r?.error))
  const e: A4Espacio = { id: r.resultado.espacio_id, codigo: r.resultado.codigo_invitacion, yo: r.resultado.miembro_id, sims: {} }
  for (const n of sims) {
    const s = await a4Rpc(T, 'add_simulated_member', { p_espacio_id: e.id, p_nombre_visible: n })
    if (!s?.ok) throw new Error('add_simulated_member: ' + JSON.stringify(s?.error))
    e.sims[n] = s.resultado.miembro_id
  }
  return e
}

/**
 * Enmienda 7 (E7.3): la simulación solo existe en espacios demo. Un espacio con simulados es el demo propio
 * de la sesión T (seed_demo_space es idempotente: siempre el mismo) más los simulados pedidos.
 */
export async function a4EspacioDemo(T: A4C, sims: string[]): Promise<A4Espacio> {
  const r = await a4Rpc(T, 'seed_demo_space', {})
  if (!r?.ok) throw new Error('seed_demo_space: ' + JSON.stringify(r?.error))
  const e: A4Espacio = { id: r.resultado.espacio_id, codigo: r.espacio.codigo_invitacion, yo: r.espacio.mi_miembro_id, sims: {} }
  for (const n of sims) {
    const s = await a4Rpc(T, 'add_simulated_member', { p_espacio_id: e.id, p_nombre_visible: n })
    if (!s?.ok) throw new Error('add_simulated_member: ' + JSON.stringify(s?.error))
    e.sims[n] = s.resultado.miembro_id
  }
  return e
}

export function a4ArgsCrear(
  espacioId: string,
  impId: string,
  intento: string,
  o: { minimo?: number; maximo?: number; plazoUtcMs?: number; titulo?: string } = {},
) {
  const base = a4AhoraServidorMs()
  const plazo = o.plazoUtcMs ?? Math.floor((base + 3600_000) / 1000) * 1000
  const dia = 24 * 3600_000
  const a0 = Math.floor((base + 2 * dia) / 60_000) * 60_000
  const b0 = a0 + dia
  return {
    p_espacio_id: espacioId,
    p_titulo: o.titulo ?? 'ver-a4 propuesta',
    p_franjas: [
      { inicio: a4Local(a0, false), fin: a4Local(a0 + 3 * 3600_000, false) },
      { inicio: a4Local(b0, false), fin: a4Local(b0 + 3 * 3600_000, false) },
    ],
    p_minimo: o.minimo ?? 2,
    p_maximo: o.maximo ?? 6,
    p_imprescindible_id: impId,
    p_plazo: a4Local(plazo, true),
    p_zona_horaria: 'America/Santiago',
    p_intento_id: intento,
  }
}

export type A4Prop = { id: string; plazoSeg: number; version: number | null; rev: number }

export async function a4Propuesta(
  T: A4C,
  e: A4Espacio,
  o: { minimo: number; maximo: number; plazoEnSeg?: number; sims?: string[]; abrir?: boolean; publicar?: boolean; titulo?: string },
): Promise<A4Prop> {
  const plazoUtcMs = Math.floor((a4AhoraServidorMs() + (o.plazoEnSeg ?? 3600) * 1000) / 1000) * 1000
  const c = await a4Rpc(T, 'create_proposal', a4ArgsCrear(e.id, e.yo, crypto.randomUUID(), {
    minimo: o.minimo, maximo: o.maximo, plazoUtcMs, titulo: o.titulo ?? 'ver-a4 propuesta',
  }))
  if (!c?.ok) throw new Error('create_proposal: ' + JSON.stringify(c?.error))
  const id = c.resultado.propuesta_id
  let rev = c.propuesta.state_rev
  let version: number | null = null
  if (o.abrir !== false || o.publicar) {
    const a = await a4Rpc(T, 'open_proposal', { p_propuesta_id: id })
    if (!a?.ok) throw new Error('open_proposal: ' + JSON.stringify(a?.error))
    rev = a.propuesta.state_rev
  }
  if (o.publicar) {
    const m = await a4Rpc(T, 'save_my_conditions', { p_propuesta_id: id, p_disponibilidad: { A: 'si', B: 'si' } })
    if (!m?.ok) throw new Error('save_my_conditions: ' + JSON.stringify(m?.error))
    for (const n of o.sims ?? []) {
      const s = await a4Rpc(T, 'simulate_save_conditions', {
        p_propuesta_id: id, p_miembro_id: e.sims[n], p_disponibilidad: { A: 'si', B: 'si' },
      })
      if (!s?.ok) throw new Error('simulate_save_conditions: ' + JSON.stringify(s?.error))
    }
    const ev = await a4Rpc(T, 'evaluate_and_publish', { p_propuesta_id: id, p_intento_id: crypto.randomUUID() })
    if (!ev?.ok || ev.resultado.tipo !== 'opcion_publicada') throw new Error('evaluate: ' + JSON.stringify(ev?.error ?? ev?.resultado))
    version = ev.resultado.version
    rev = ev.propuesta.state_rev
  }
  return { id, plazoSeg: plazoUtcMs / 1000, version, rev }
}

// ---- Invariantes -------------------------------------------------------------------------
// Cadena de eventos: state_rev estrictamente creciente, estado_previo = estado_nuevo anterior,
// momento no decreciente con el orden de serialización.
export function a4CadenaEventos(prop: A4R): string[] {
  const v: string[] = []
  const todo: A4R[] = prop?.historial ?? []
  // Enmienda 13 (c): la baja de otra persona se publica sin actor ni estados (estado_previo y estado_nuevo null). Ese evento no
  // participa de la cadena de estados, pero sí del orden de state_rev y del momento. La aceptación de quien se retiró ya no sale.
  const sinEstado = (e: A4R) => e.tipo === 'baja' && e.estado_previo == null && e.estado_nuevo == null
  const h: A4R[] = todo.filter((e) => !sinEstado(e))
  for (let i = 1; i < todo.length; i++) {
    const a = todo[i - 1]
    const b = todo[i]
    if (!(b.state_rev > a.state_rev)) v.push(`state_rev no creciente ${a.state_rev}->${b.state_rev}`)
    if (Date.parse(b.en.utc) < Date.parse(a.en.utc)) v.push(`momento decreciente ${a.en.utc} -> ${b.en.utc}`)
  }
  for (let i = 1; i < h.length; i++) {
    const a = h[i - 1]
    const b = h[i]
    if (b.estado_previo !== a.estado_nuevo) v.push(`cadena rota ${a.tipo}:${a.estado_nuevo} -> ${b.tipo}:${b.estado_previo}`)
  }
  const exp = h.filter((x) => x.tipo === 'propuesta_expirada').length
  if (exp > 1) v.push(`propuesta_expirada registrada ${exp} veces`)
  const ult = h[h.length - 1]
  // Si el último evento es una baja anónima, la transición que produjo no se publica: no hay con qué comparar el estado actual
  // (cada prueba verifica el estado final por su cuenta, p. ej. `en_revision/2`).
  const ultimoEsBajaAnonima = todo.length > 0 && sinEstado(todo[todo.length - 1])
  if (ult && !ultimoEsBajaAnonima && prop.estado !== ult.estado_nuevo && ult.tipo !== undefined) {
    // el último evento debe dejar el estado actual (mark_interest no genera evento ni cambia estado)
    v.push(`estado actual ${prop.estado} distinto del último evento ${ult.estado_nuevo}`)
  }
  if (prop?.opcion) {
    if (prop.confirmados !== prop.opcion.aceptaron.length) v.push('confirmados != largo de aceptaron')
    if (prop.opcion.cupos.confirmados !== prop.confirmados) v.push('cupos.confirmados != confirmados')
  }
  if (prop?.estado === 'grupo_confirmado' && (prop.confirmados < prop.minimo || !prop.opcion?.cupos?.imprescindible_acepto))
    v.push('grupo_confirmado sin mínimo o sin imprescindible')
  return v
}

// Lectura coherente: el instante del servidor, plazo_vencido y estado expirado deben coincidir.
export function a4LecturaCoherente(r: A4R, prop: A4R, plazoSeg: number): string | null {
  const sa = a4Seg(r.servidor_ahora)
  const vencidoPorReloj = sa >= plazoSeg
  if (prop.plazo_vencido !== vencidoPorReloj) return `plazo_vencido=${prop.plazo_vencido} con servidor_ahora=${r.servidor_ahora.utc}`
  const venciblePorEstado = ['borrador', 'reuniendo_interes', 'esperando_compromisos', 'en_revision', 'expirado'].includes(prop.estado)
  if (venciblePorEstado && (prop.estado === 'expirado') !== vencidoPorReloj)
    return `estado=${prop.estado} con servidor_ahora=${r.servidor_ahora.utc} plazo=${new Date(plazoSeg * 1000).toISOString()}`
  return null
}

// Forma de los errores: solo el sobre del contrato, mensaje de la tabla, sin datos internos.
export const A4_MENSAJES: Record<string, string> = {
  'sesion_invalida/sin_sesion': 'No hay una sesión válida. Recarga la página para continuar.',
  'entrada_incompleta/campo_faltante': 'Falta completar un dato obligatorio.',
  'entrada_incompleta/formato_invalido': 'Un dato tiene un formato inválido.',
  'entrada_incompleta/nombre_en_uso': 'Ese nombre ya está en uso en este espacio.',
  'entrada_incompleta/intento_reutilizado': 'Este identificador de intento ya se usó para otra operación.',
  'entrada_incompleta/plazo_invalido': 'El cierre de aceptación debe ser futuro y no posterior al inicio de ninguna franja.',
  'fuera_de_audiencia/no_miembro': 'No perteneces a este espacio o el elemento no existe.',
  'fuera_de_audiencia/no_elegible_en_version': 'No formas parte de las personas que pueden aceptar esta versión.',
  'opcion_desactualizada/version_no_vigente': 'Esta versión ya no está vigente. Actualiza para ver la versión actual.',
  'opcion_desactualizada/estado_no_admite': 'La propuesta cambió de estado y esta acción ya no aplica. Actualiza la pantalla.',
  'cupo_completo/sin_cupo': 'Ya se completaron los cupos de esta versión.',
  'plazo_vencido/plazo_vencido': 'El plazo de aceptación ya cerró.',
  'no_autorizado/no_es_organizador': 'Solo el organizador de la propuesta puede hacer esto.',
  'no_autorizado/no_es_organizador_espacio': 'Solo el organizador del espacio puede hacer esto.',
  'no_autorizado/retirado': 'Te retiraste de esta propuesta y ya no puedes participar en ella.',
  'no_autorizado/condiciones_congeladas': 'Estás en la versión vigente. Si esta fecha no te sirve, marca «Así no puedo, pero sigo» y podrás cambiar cuándo puedes.',
  'no_autorizado/miembro_no_simulado': 'Solo se puede simular a miembros marcados como Simulación.',
  'fallo_temporal/reintentar': 'Falla temporal. Intenta de nuevo.',
}
// Textos nuevos de la enmienda: el coordinador fijó que valen los de la tabla del backend; se exige
// solo que existan, no contengan datos internos y no estén vacíos.
const A4_NUEVOS = new Set(['cupo_completo/reservado_imprescindible', 'asiento_en_uso/asiento_en_uso', 'intento_obsoleto/intento_obsoleto'])

export function a4FormaError(r: A4R): string | null {
  if (r?.transporte) return 'error de transporte: ' + r.error?.mensaje
  const claves = Object.keys(r).sort().join(',')
  if (claves !== 'contrato,error,ok,servidor_ahora,state_rev') return 'claves inesperadas: ' + claves
  if (r.contrato !== 2) return 'contrato != 2'
  const ek = Object.keys(r.error).sort().join(',')
  if (ek !== 'codigo,detalle,mensaje,reintentable') return 'claves de error inesperadas: ' + ek
  const par = `${r.error.codigo}/${r.error.detalle}`
  const texto = JSON.stringify(r)
  if (/sqlstate|SQLSTATE|PL\/pgSQL|cruce\.|auth\.uid|user_id|contexto|stack|line \d/i.test(texto)) return 'texto con datos internos: ' + texto
  if (A4_MENSAJES[par] !== undefined) {
    if (r.error.mensaje !== A4_MENSAJES[par]) return `mensaje distinto para ${par}`
  } else if (A4_NUEVOS.has(par)) {
    if (typeof r.error.mensaje !== 'string' || r.error.mensaje.length === 0) return `mensaje vacío para ${par}`
  } else return `par no listado ${par}`
  if (r.error.reintentable !== (r.error.codigo === 'fallo_temporal')) return 'reintentable incoherente'
  return null
}
