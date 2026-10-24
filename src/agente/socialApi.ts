// E11: transporte humano. No modifica preferencias, asistencia ni política.
import { supabase } from '../lib/supabase'
import type { ApiResult, ErrorCodigo } from '../lib/types'

export type ClimaSocial = { sabado: 'seco' | 'lluvia' | 'desconocido'; domingo: 'seco' | 'lluvia' | 'desconocido' }
export interface SolicitudSocial {
  espacio_id: string
  social: { accion: 'preparar'; sabado: string; ejecucion_id: string; clima: ClimaSocial }
}
export interface PlanSocialCliente {
  titulo: string; lugar: { nombre: string; simulado: boolean }
  franjas: [{ inicio: string; fin: string }, { inicio: string; fin: string }]
  minimo: number; maximo: number; plazo: string; imprescindible: { nombre: string }; invitados: number
}
export interface BorradorSocialCliente { hash: string; plan: PlanSocialCliente }
export interface ReciboSocial {
  estado: 'borrador' | 'publicada' | 'sin_plan'
  ejecucionId: string | null; propia: boolean; borrador: BorradorSocialCliente | null
  aprobacionHash: string | null; propuestaId: string | null; texto: string | null
  eleccionFuente: 'regla' | 'modelo' | null; explicacionFuente: 'texto_fijo' | 'modelo' | null
}
export interface PendienteSocial {
  version: 1; solicitud: SolicitudSocial
  intentos: Partial<Record<'aprobar' | 'publicar', { hash: string; id: string }>>
}
const objeto = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x)
const texto = (x: unknown, max = 512): x is string => typeof x === 'string' && x.trim().length > 0 && x.length <= max && !/[\u0000-\u001f\u007f-\u009f]/u.test(x)
const uuid = (x: unknown): x is string => typeof x === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(x)
const cantidad = (x: unknown): x is number => Number.isSafeInteger(x) && (x as number) >= 0
const fecha = (x: unknown): x is string => texto(x, 40) && /^\d{4}-\d\d-\d\dT\d\d:\d\d/.test(x) && Number.isFinite(Date.parse(x))
const climaValido = (x: unknown): x is ClimaSocial => objeto(x) && ['seco', 'lluvia', 'desconocido'].includes(String(x.sabado)) && ['seco', 'lluvia', 'desconocido'].includes(String(x.domingo))
const capacidades = new Set<string>()

export function falloSocial(detalle = 'respuesta_no_confirmada', incierto = false, reintentable = true): ApiResult<never> {
  return { ok: false, error: { codigo: 'fallo_temporal', detalle, state_rev: null, reintentable,
    mensaje: incierto ? 'El servidor pudo haber registrado la acción. Comprueba o reintenta con la misma solicitud.' : 'No pudimos completar esta operación. Puedes volver a intentarlo.',
    ...(incierto ? { resultadoIncierto: true } : {}) } }
}
function rechazo(x: unknown): ApiResult<never> {
  const e = objeto(x) ? x : {}
  const mensajes: Partial<Record<ErrorCodigo, string>> = {
    sesion_invalida: 'Vuelve a iniciar tu sesión para continuar.',
    fuera_de_audiencia: 'Ya no tienes acceso a este espacio.',
    no_autorizado: 'El servidor no autorizó esta acción. Revisa tu rol y la aprobación del borrador.',
    opcion_desactualizada: 'El borrador cambió o dejó de ser válido. Comprueba el recibo antes de continuar.',
    entrada_incompleta: 'El servidor no pudo validar esta solicitud.',
    sin_alternativa: 'No hay una propuesta disponible con las condiciones actuales.',
  }
  const codigo = typeof e.codigo === 'string' && Object.hasOwn(mensajes, e.codigo) ? e.codigo as ErrorCodigo : 'fallo_temporal'
  return { ok: false, error: { codigo, detalle: 'rechazo_social', mensaje: mensajes[codigo] ?? 'La operación no pudo completarse. Vuelve a intentarlo.',
    reintentable: codigo === 'fallo_temporal', state_rev: null } }
}
function previo(): ApiResult<never> | null {
  return typeof navigator !== 'undefined' && !navigator.onLine
    ? { ok: false, error: { codigo: 'fallo_temporal', detalle: 'sin_conexion', mensaje: 'Sin conexión. Tu solicitud sigue pendiente.', reintentable: true, state_rev: null, sinConexion: true } } : null
}
function contrato(x: unknown): x is Record<string, unknown> { return objeto(x) && x.ok === true && x.contrato === 2 }

export function crearSolicitudSocial(espacioId: string, sabado: string, clima: ClimaSocial, ejecucionId: string): SolicitudSocial {
  const solicitud: SolicitudSocial = { espacio_id: espacioId, social: { accion: 'preparar', sabado, ejecucion_id: ejecucionId, clima: { sabado: clima.sabado, domingo: clima.domingo } } }
  if (!solicitudValida(solicitud)) throw new Error('solicitud_social_invalida')
  return solicitud
}
function solicitudValida(x: unknown): x is SolicitudSocial {
  if (!objeto(x) || !uuid(x.espacio_id) || Object.hasOwn(x, 'sabado') || !objeto(x.social)) return false
  const s = x.social
  if (s.accion !== 'preparar' || !uuid(s.ejecucion_id) || !climaValido(s.clima) || typeof s.sabado !== 'string' || !/^\d{4}-\d\d-\d\d$/.test(s.sabado)) return false
  const d = new Date(`${s.sabado}T12:00:00Z`)
  return Number.isFinite(d.getTime()) && d.getUTCDay() === 6 && d.toISOString().slice(0, 10) === s.sabado
}
export const claveSocial = (espacioId: string, sabado: string) => `cruce:social:v1:${espacioId}:${sabado}`

/** Solo conserva clima/UUID e intentos; nunca planes, texto ni datos de personas. Fallar al persistir impide enviar. */
export function leerPendienteSocial(storage: Pick<Storage, 'getItem'>, espacioId: string, sabado: string): PendienteSocial | null {
  const raw = storage.getItem(claveSocial(espacioId, sabado))
  if (raw === null) return null
  const x: unknown = JSON.parse(raw)
  if (!objeto(x) || x.version !== 1 || !solicitudValida(x.solicitud) || x.solicitud.espacio_id !== espacioId || x.solicitud.social.sabado !== sabado || !objeto(x.intentos)) throw new Error('recuperacion_social_invalida')
  const intentos: PendienteSocial['intentos'] = {}
  for (const op of ['aprobar', 'publicar'] as const) {
    const i = x.intentos[op]
    if (i !== undefined) {
      if (!objeto(i) || !texto(i.hash, 256) || !uuid(i.id)) throw new Error('intento_social_invalido')
      intentos[op] = { hash: i.hash, id: i.id }
    }
  }
  // Proyección explícita: un almacenamiento alterado nunca añade campos al transporte.
  return { version: 1, solicitud: crearSolicitudSocial(espacioId, sabado, x.solicitud.social.clima, x.solicitud.social.ejecucion_id), intentos }
}
export function guardarPendienteSocial(storage: Pick<Storage, 'setItem'>, pendiente: PendienteSocial): void {
  storage.setItem(claveSocial(pendiente.solicitud.espacio_id, pendiente.solicitud.social.sabado), JSON.stringify(pendiente))
}

function borradorDe(x: unknown): BorradorSocialCliente | null {
  if (!objeto(x) || !texto(x.hash, 256) || !objeto(x.plan)) return null
  const p = x.plan
  if (!texto(p.titulo, 80) || !objeto(p.lugar) || !texto(p.lugar.nombre) || typeof p.lugar.simulado !== 'boolean'
    || !Array.isArray(p.franjas) || p.franjas.length !== 2 || !p.franjas.every((f) => objeto(f) && fecha(f.inicio) && fecha(f.fin) && Date.parse(f.fin) > Date.parse(f.inicio))
    || !cantidad(p.minimo) || !cantidad(p.maximo) || p.minimo < 2 || p.minimo > p.maximo || p.maximo > 20 || !fecha(p.plazo)
    || !objeto(p.imprescindible) || !texto(p.imprescindible.nombre, 80) || !cantidad(p.invitados)) return null
  return { hash: x.hash, plan: { titulo: p.titulo, lugar: { nombre: p.lugar.nombre, simulado: p.lugar.simulado },
    franjas: p.franjas.map((f) => ({ inicio: f.inicio as string, fin: f.fin as string })) as PlanSocialCliente['franjas'],
    minimo: p.minimo, maximo: p.maximo, plazo: p.plazo, imprescindible: { nombre: p.imprescindible.nombre }, invitados: p.invitados } }
}
function reciboDe(x: Record<string, unknown>, solicitud: SolicitudSocial): ApiResult<ReciboSocial> {
  const r = x.resultado_social
  if (!objeto(r)) return falloSocial('recibo_invalido', true)
  if (r.estado === 'error') {
    const fallo = rechazo(r.error)
    return r.resultado_incierto === true ? falloSocial('recibo_pendiente', true) : fallo
  }
  const base = { eleccionFuente: x.eleccion_fuente === 'regla' || x.eleccion_fuente === 'modelo' ? x.eleccion_fuente : null,
    explicacionFuente: x.explicacion_fuente === 'texto_fijo' || x.explicacion_fuente === 'modelo' ? x.explicacion_fuente : null } as const
  if (r.estado === 'sin_plan') return { ok: true, data: { ...base, estado: 'sin_plan', ejecucionId: null, propia: false, borrador: null, aprobacionHash: null, propuestaId: null, texto: null } }
  const e = r.ejecucion
  if (!objeto(e) || !uuid(e.id) || e.oportunidad !== `sabado:${solicitud.social.sabado}` || typeof r.propia !== 'boolean' || (r.propia && e.id !== solicitud.social.ejecucion_id)) return falloSocial('recibo_invalido', true)
  const borrador = borradorDe(r.borrador ?? e.borrador)
  if (objeto(r.borrador) && objeto(e.borrador) && r.borrador.hash !== e.borrador.hash) return falloSocial('borrador_discordante', true)
  const textoGuardado = objeto(e.borrador) && texto(e.borrador.texto, 280) ? e.borrador.texto : null
  if (r.estado === 'publicada' && e.estado === 'publicada' && objeto(r.propuesta) && uuid(r.propuesta.id) && e.propuesta_id === r.propuesta.id) {
    return { ok: true, data: { ...base, estado: 'publicada', ejecucionId: e.id, propia: r.propia, borrador, aprobacionHash: null, propuestaId: r.propuesta.id, texto: textoGuardado } }
  }
  if (!['borrador', 'necesita_aprobacion'].includes(String(r.estado)) || e.estado !== 'borrador' || !borrador || e.propuesta_id !== null) return falloSocial('borrador_invalido', true)
  let aprobacionHash: string | null = null
  if (e.aprobacion !== null) {
    if (!objeto(e.aprobacion) || e.aprobacion.hash !== borrador.hash || !objeto(e.aprobacion.aprobado_en) || !fecha(e.aprobacion.aprobado_en.utc) || !fecha(e.aprobacion.aprobado_en.local)) return falloSocial('aprobacion_invalida', true)
    aprobacionHash = borrador.hash
  }
  return { ok: true, data: { ...base, estado: 'borrador', ejecucionId: e.id, propia: r.propia, borrador, aprobacionHash, propuestaId: null, texto: textoGuardado } }
}

async function invocar(body: object): Promise<{ data: unknown; error: unknown }> {
  // Incluye el presupuesto del modelo y el tiempo de persistir el recibo; sin retry automático.
  try { return await supabase.functions.invoke('agente', { body, timeout: 45_000 }) }
  catch { return { data: null, error: true } }
}
async function mutar<T>(nombre: 'aprobar_borrador_agente' | 'publicar_borrador_agente', ejecucionId: string, hash: string, intentoId: string, validar: (x: Record<string, unknown>) => T | null): Promise<ApiResult<T>> {
  const bloqueo = previo()
  if (bloqueo) return bloqueo
  if (!uuid(ejecucionId) || !uuid(intentoId) || !texto(hash, 256)) return falloSocial('entrada_invalida', false, false)
  try {
    const { data, error } = await supabase.rpc(nombre, { p_ejecucion_id: ejecucionId, p_borrador_hash: hash, p_intento_id: intentoId }).abortSignal(AbortSignal.timeout(15000))
    if (error) return falloSocial('respuesta_no_confirmada', true)
    if (objeto(data) && data.ok === false) return rechazo(data.error)
    if (!contrato(data)) return falloSocial('contrato_invalido', true)
    const resultado = validar(data)
    return resultado === null ? falloSocial('eco_invalido', true) : { ok: true, data: resultado }
  } catch { return falloSocial('respuesta_no_confirmada', true) }
}
export const socialApi = {
  async capacidad(espacioId: string): Promise<ApiResult<true>> {
    capacidades.delete(espacioId)
    const bloqueo = previo()
    if (bloqueo) return bloqueo
    if (!uuid(espacioId)) return falloSocial('entrada_invalida', false, false)
    // Sin fecha raíz: también un rollback al handler antiguo corta antes del modelo.
    const { data, error } = await invocar({ espacio_id: espacioId, social: { accion: 'capacidad' } })
    if (error || !contrato(data) || !objeto(data.capacidades) || data.capacidades.agente_social !== 1) return falloSocial('funcion_no_disponible')
    capacidades.add(espacioId)
    return { ok: true, data: true }
  },
  async preparar(solicitud: SolicitudSocial): Promise<ApiResult<ReciboSocial>> {
    const bloqueo = previo()
    if (bloqueo) return bloqueo
    if (!solicitudValida(solicitud) || !capacidades.has(solicitud.espacio_id)) return falloSocial('capacidad_no_confirmada', false, false)
    // Copia solo campos públicos del contrato; no envía propiedades añadidas por el caller.
    const body = crearSolicitudSocial(solicitud.espacio_id, solicitud.social.sabado, solicitud.social.clima, solicitud.social.ejecucion_id)
    const { data, error } = await invocar(body)
    if (error) return falloSocial('respuesta_no_confirmada', true)
    if (objeto(data) && data.ok === false) return rechazo(data.error)
    return contrato(data) ? reciboDe(data, body) : falloSocial('contrato_invalido', true)
  },
  aprobar(ejecucionId: string, hash: string, intentoId: string) {
    return mutar('aprobar_borrador_agente', ejecucionId, hash, intentoId, (x) => objeto(x.aprobacion) && x.aprobacion.hash === hash
      && objeto(x.aprobacion.aprobado_en) && fecha(x.aprobacion.aprobado_en.utc) && fecha(x.aprobacion.aprobado_en.local) ? { hash } : null)
  },
  publicar(ejecucionId: string, hash: string, intentoId: string) {
    return mutar('publicar_borrador_agente', ejecucionId, hash, intentoId, (x) => objeto(x.propuesta) && uuid(x.propuesta.id) && cantidad(x.invitados) && typeof x.repetido === 'boolean'
      ? { propuestaId: x.propuesta.id, invitados: x.invitados, repetido: x.repetido } : null)
  },
}

/** Recibe exclusivamente mi_situacion, nunca busca invitaciones de otras personas. */
export function textoInvitacionAgente(situacion: unknown): string | null {
  return objeto(situacion) && objeto(situacion.invitacion_agente) && texto(situacion.invitacion_agente.texto, 280) ? situacion.invitacion_agente.texto : null
}
