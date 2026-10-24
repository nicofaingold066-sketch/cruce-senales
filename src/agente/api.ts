// Llamadas del agente del círculo (enmienda 4). Mismo sobre de respuesta que el resto del contrato.
// La función del servidor "agente" trae el clima y redacta; si no está publicada, se llama directo
// a proponer_plan_borrador con clima "desconocido" y texto fijo. Nunca se calcula el plan en el cliente.
import { CONTRATO_ESPERADO, contratoIncompatible } from '../lib/api'
import { supabase } from '../lib/supabase'
import type { ApiError, ApiResult, Momento } from '../lib/types'

export type Presupuesto = 'da_igual' | 'algo_barato' | 'ojala_gratis'
export type Energia = 'con_todo' | 'algo_tranquilo'
export type Ambiente = 'fiesta' | 'tranquilo' | 'da_igual'
export type LugarPref = 'da_igual' | 'bajo_techo'
// Enmienda 10: opcionales. Si faltan, esa persona no aporta esa variable.
export type Zona = 'providencia' | 'nunoa' | 'las_condes' | 'santiago_centro' | 'maipu' | 'la_florida' | 'puente_alto' | 'vitacura'
export type Movilidad = 'auto_con_lugar' | 'auto_sin_lugar' | 'transporte_publico' | 'bici_o_pie' | 'me_llevan'
/** Va como texto: un número da preferencias_invalidas (aclaración de forma de la enmienda 10). */
export type TiempoMax = '15' | '30' | '45' | '60'
export type MomentoDia = 'manana' | 'tarde' | 'noche' | 'da_igual'

export interface Preferencias {
  presupuesto: Presupuesto
  energia: Energia
  ambiente: Ambiente
  lugar: LugarPref
  me_gustaria: string[]
  zona?: Zona
  movilidad?: Movilidad
  tiempo_max?: TiempoMax
  momento?: MomentoDia
}

/** Enmienda 10: viaje máximo estimado del grupo hacia una opción (solo con 4 personas o más con zona). */
export interface Viaje {
  max_minutos: number
  estimado: boolean
}

export interface ActividadOpcion {
  clave: string
  etiqueta: string
}

export interface MisPreferencias {
  preferencias: Preferencias | null
  /** Enmienda 8: si es false, el agente no usa las preferencias de esta persona (siguen guardadas). true si no guardó. */
  usar_en_agente: boolean
  /** E11: permiso independiente. null significa que el servidor no confirmó este campo. */
  recibir_invitaciones_agente: boolean | null
  actualizadas_en: Momento | null
  opciones: { actividades: ActividadOpcion[] }
  personas_con_preferencias: number
}

export interface FranjaBorrador {
  /** HoraLocal "YYYY-MM-DDTHH:MM" en America/Santiago, formato exacto de create_proposal. */
  inicio: string
  fin: string
}

export interface CandidataAgente {
  id: string
  actividad?: string
  actividad_etiqueta: string
  lugar: { id: string; nombre: string; simulado: boolean }
  titulo: string
  franjas: FranjaBorrador[]
  frases_grupo: string[]
  viaje?: Viaje | null
  /** Enmienda 14: familia de la actividad y personas mínimas y máximas del catálogo (públicas). */
  familia?: string | null
  personas?: PersonasActividad | null
}

/** Enmienda 14: personas mínimas y máximas que pide la actividad (catálogo). */
export interface PersonasActividad {
  min: number
  max: number
}

/** Enmienda 14: la actividad del propósito que quedó afuera por el tamaño del grupo (números públicos del espacio). */
export interface Quorum {
  actividad: string
  etiqueta: string
  personas_min: number
  personas_posibles: number
}

/**
 * Texto fijo del tamaño del grupo (enmienda 14, ajuste 7): habla del grupo, nunca de asistencia. Igual a `textoQuorum`
 * de `src/lib/types.ts` (puente de backend 3efc838, con el cierre de psico); cuando el puente esté integrado, se usa ese.
 */
export function textoQuorum(q: Quorum): string {
  return `Para ${q.etiqueta} hacen falta al menos ${q.personas_min} personas; este grupo tiene ${q.personas_posibles} por ahora. Estas opciones se pueden armar con el grupo actual. Cuando se sumen más, vuelve a pedir una propuesta.`
}

/** Enmienda 14: motivo `faltan_personas` (ninguna actividad del propósito alcanza con el grupo actual). */
export const TEXTO_FALTAN_PERSONAS =
  'Todavía no hay suficientes personas para las actividades de este grupo. Cuando se sumen más, vuelve a pedir una propuesta.'

/** Totales del grupo (enmienda 4.1). Con 3 personas o menos solo trae `personas`. */
export interface PerfilGrupo {
  personas: number
  gustos?: { actividad_etiqueta: string; cuantos: number }[]
  energia_mayoritaria?: string | null
  ambiente_mayoritario?: string | null
  presupuesto_grupo?: string | null
}

export interface BorradorAgente extends CandidataAgente {
  tipo: 'borrador'
  personas_consideradas: number
  /** Todas las opciones que el servidor validó para el grupo (enmienda 4.1). La destacada es `elegida_id`. */
  candidatas: CandidataAgente[]
  elegida_id: string
  clima: { fuente: string; resumen: string; sabado: string; domingo: string }
  explicacion: string
  mensaje_al_grupo: string
  eleccion_fuente: 'modelo' | 'regla'
  explicacion_fuente: 'modelo' | 'texto_fijo'
  /** Qué modelo escribió: "opus", "haiku" (respaldo) u otro; null con la regla y el texto fijo. */
  modelo_usado?: string | null
  perfil_grupo?: PerfilGrupo | null
  /** Enmienda 10: el de la opción destacada. */
  viaje?: Viaje | null
  /** Enmienda 14: no nulo solo si la actividad del propósito quedó afuera por quórum y hubo otras que sí entraron. */
  quorum?: Quorum | null
}

/**
 * `motivo: "sin_lugar_cerca_para_todos"` cuando el tiempo de viaje descartó todas las opciones (enmienda 10);
 * `"faltan_personas"` cuando ninguna actividad del propósito alcanza con el grupo actual (enmienda 14).
 */
export type ResultadoAgente = BorradorAgente | { tipo: 'sin_plan_compatible'; motivo?: string }

/** Clima de simulación para la demo (mejora #23). */
export type ClimaSimulado = 'seco' | 'lluvia'

// Mismos textos que la función del servidor, para el respaldo sin función.
const FRASES: Record<string, string> = {
  presupuesto_todos: 'le sirve al presupuesto de todos',
  bajo_techo: 'es bajo techo por si cambia el tiempo',
  al_aire_libre_con_buen_tiempo: 'es al aire libre con buen pronóstico',
  el_mas_elegido: 'es lo que más eligieron',
  ritmo_del_grupo: 'va con el ritmo que prefiere el grupo',
  // Enmienda 14 (0049): la actividad del propósito del grupo.
  proposito_del_grupo: 'es lo que este grupo vino a hacer',
}

const ENERGIA_PLAN: Record<string, string> = { con_todo: 'un plan con todo', algo_tranquilo: 'un plan algo tranquilo' }
const AMBIENTE_PLAN: Record<string, string> = { fiesta: 'con ambiente de fiesta', tranquilo: 'con ambiente tranquilo' }

/** Misma regla que la función (logica.ts, textoFrase): con 3 personas o menos, sin detalles del grupo. */
function frase(codigo: string, simulado: boolean, perfil: PerfilGrupo | null | undefined, actividad: string | undefined): string | undefined {
  if (simulado && codigo === 'al_aire_libre_con_buen_tiempo') return 'es al aire libre con el sol de la simulación'
  const p = perfil && perfil.personas > 3 ? perfil : null
  if (p && codigo === 'ritmo_del_grupo') {
    const partes = [
      p.energia_mayoritaria ? ENERGIA_PLAN[p.energia_mayoritaria] : undefined,
      p.ambiente_mayoritario ? AMBIENTE_PLAN[p.ambiente_mayoritario] : undefined,
    ].filter((t): t is string => Boolean(t))
    if (partes.length === 2) return `va con lo que prefiere la mayoría: ${partes[0]} y ${partes[1]}`
    if (partes.length === 1) return `va con lo que prefiere la mayoría: ${partes[0]}`
  }
  if (codigo === 'el_mas_elegido') {
    // Solo con 4 o más personas y si la actividad la eligieron 2 o más; si no, la frase no se dice (hallazgo 5).
    const g = p && actividad ? p.gustos?.find((x) => x.actividad_etiqueta === actividad && x.cuantos >= 2) : undefined
    return g && p ? `es lo que más eligieron (${g.cuantos} de ${p.personas})` : undefined
  }
  return FRASES[codigo]
}

/**
 * Texto fijo de "por qué". `destacada` = la opción recomendada; las demás no dicen que son "la mejor".
 * `simulado` = clima de simulación: no se habla de pronóstico. Con `perfil` (solo totales, 4 personas
 * o más) y la etiqueta de la actividad, el texto nombra el ritmo, el ambiente y cuántos la eligieron (mejora #40).
 */
export function textoFijo(
  codigos: string[],
  destacada = true,
  simulado = false,
  perfil?: PerfilGrupo | null,
  actividad?: string,
): string {
  const partes = codigos.map((c) => frase(c, simulado, perfil, actividad)).filter((t): t is string => Boolean(t))
  if (partes.length === 0) {
    return destacada
      ? 'Es la opción que mejor le sirve al grupo con lo que cargaron.'
      : 'También le sirve a todo el grupo según lo que cargaron.'
  }
  const texto = partes.length === 1 ? partes[0] : `${partes.slice(0, -1).join(', ')} y ${partes[partes.length - 1]}`
  return `${texto.charAt(0).toUpperCase()}${texto.slice(1)}.`
}

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

/** "sábado 31 de 14:00 a 17:00", sin convertir zonas (HoraLocal de Santiago). */
function franjaCorta(f: FranjaBorrador): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}:\d{2})/.exec(f.inicio)
  const n = /T(\d{2}:\d{2})/.exec(f.fin)
  if (!m || !n) return `${f.inicio} a ${f.fin}`
  const dia = DIAS[new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))).getUTCDay()]
  return `${dia} ${Number(m[3])} de ${m[4]} a ${n[1]}`
}

/** Mismo mensaje fijo que la función del servidor. */
export function mensajeFijo(c: CandidataAgente): string {
  const [a, b] = c.franjas
  const dias = a && b ? ` el ${franjaCorta(a)} o el ${franjaCorta(b)}` : ''
  return `¡Hola! Les propongo ${c.titulo.charAt(0).toLowerCase()}${c.titulo.slice(1)}${dias}. Marquen si les interesa y carguen su disponibilidad en CRUXE.`
}

type Crudo = Partial<BorradorAgente> & CandidataAgente & { tipo: 'borrador' }

/**
 * Mismo filtro que la función: con 3 personas o menos solo la cantidad, sin actividades de una sola persona
 * y nunca el presupuesto del grupo (hallazgo 7). Anda con y sin ese campo (enmienda 7).
 */
function perfilSeguro(perfil: PerfilGrupo | null | undefined): PerfilGrupo | null {
  if (!perfil) return null
  if (perfil.personas <= 3) return { personas: perfil.personas }
  return {
    personas: perfil.personas,
    gustos: perfil.gustos?.filter((g) => g.cuantos >= 2) ?? [],
    energia_mayoritaria: perfil.energia_mayoritaria ?? null,
    ambiente_mayoritario: perfil.ambiente_mayoritario ?? null,
  }
}

/** Enmienda 10: de un viaje solo se toman los minutos y si es estimado; cualquier otra cosa se descarta. */
export function viajeSeguro(v: unknown): Viaje | null {
  if (!v || typeof v !== 'object') return null
  const m = (v as { max_minutos?: unknown }).max_minutos
  if (typeof m !== 'number' || !Number.isFinite(m) || m <= 0 || m > 600) return null
  return { max_minutos: Math.round(m), estimado: (v as { estimado?: unknown }).estimado !== false }
}

/** El viaje de una opción: el suyo, o el de arriba solo si es la primera (respuesta sin viaje por candidata). */
export function viajeDeOpcion(c: CandidataAgente, b: Pick<BorradorAgente, 'candidatas' | 'viaje'>): Viaje | null {
  if (c.viaje !== undefined) return viajeSeguro(c.viaje)
  return b.candidatas[0]?.id === c.id ? viajeSeguro(b.viaje) : null
}

/** Completa una respuesta que no trae los campos de la 4.1 (función vieja o RPC directa sin función). */
function normalizar(r: Crudo, sinFuncion: boolean): BorradorAgente {
  // Sin la 4.1 la única opción es la del servidor; su id es el del catálogo.
  const crudas = Array.isArray(r.candidatas) && r.candidatas.length > 0 ? r.candidatas : [{ ...r, id: r.id ?? r.lugar.id }]
  const candidatas = crudas.map((c) => (c.viaje === undefined ? c : { ...c, viaje: viajeSeguro(c.viaje) }))
  const elegidaId = r.elegida_id && candidatas.some((c) => c.id === r.elegida_id) ? r.elegida_id : candidatas[0].id
  const elegida = candidatas.find((c) => c.id === elegidaId) ?? candidatas[0]
  const fijo = sinFuncion || !r.explicacion
  return {
    ...r,
    ...elegida,
    tipo: 'borrador',
    personas_consideradas: r.personas_consideradas ?? 0,
    candidatas,
    elegida_id: elegida.id,
    clima: sinFuncion || !r.clima
      ? { fuente: 'sin_pronostico', resumen: 'Sin pronóstico disponible.', sabado: 'desconocido', domingo: 'desconocido' }
      : r.clima,
    explicacion: fijo ? textoFijo(elegida.frases_grupo, true, false, r.perfil_grupo, elegida.actividad_etiqueta) : (r.explicacion as string),
    mensaje_al_grupo: fijo || !r.mensaje_al_grupo ? mensajeFijo(elegida) : r.mensaje_al_grupo,
    perfil_grupo: perfilSeguro(r.perfil_grupo),
    viaje: viajeDeOpcion(elegida, { candidatas, viaje: r.viaje }),
    eleccion_fuente: !sinFuncion && r.eleccion_fuente === 'modelo' ? 'modelo' : 'regla',
    modelo_usado: !fijo && typeof r.modelo_usado === 'string' ? r.modelo_usado : null,
    explicacion_fuente: !fijo && r.explicacion_fuente === 'modelo' ? 'modelo' : 'texto_fijo',
  }
}

// Tiempos límite del cliente (mejora #32): la demo nunca queda esperando para siempre.
// La función del servidor corta sola a los ~8 s; si igual tarda más, se usa el respaldo por RPC.
// Con Opus la función puede tardar hasta unos 30 s (20 s Opus y, si falla, unos 8 s Haiku): el cliente espera un poco más.
const TIEMPO_FUNCION_MS = 35000
// #108 (incidente del 23 oct, 21:13): la base llegó a parones de ~7 s, al borde de su propio límite de 8 s.
// El cliente espera 15 s y reintenta UNA vez si se agotó el tiempo o la base cortó la consulta (57014).
const TIEMPO_RPC_MS = 15000
export const AVISO_REINTENTO = 'La red o el servidor tardaron más de lo normal. Reintentando…'

function tiempoAgotado(): { ok: false; error: ApiError } {
  return falloTemporal('tiempo_agotado', 'El servidor tardó demasiado en responder. Intenta de nuevo.')
}

function esAborto(e: unknown): boolean {
  const nombre = (e as { name?: string } | null)?.name ?? ''
  const mensaje = (e as { message?: string } | null)?.message ?? ''
  // postgrest-js no rechaza: devuelve `message: "TimeoutError: signal timed out"` (Chrome) sin `name`.
  return nombre === 'AbortError' || nombre === 'TimeoutError' || /abort|timeouterror|timed out/i.test(mensaje)
}

function incompatibleError(): { ok: false; error: ApiError } {
  return {
    ok: false,
    error: {
      codigo: 'contrato_incompatible',
      detalle: 'contrato_incompatible',
      mensaje: 'Versión incompatible: recarga la aplicación.',
      reintentable: false,
      state_rev: null,
    },
  }
}

function falloTemporal(detalle = 'reintentar', mensaje = 'Falla temporal. Intenta de nuevo.'): { ok: false; error: ApiError } {
  return { ok: false, error: { codigo: 'fallo_temporal', detalle, mensaje, reintentable: true, state_rev: null } }
}

type Sobre = { ok?: boolean; contrato?: number; error?: { codigo: ApiError['codigo']; detalle: string; mensaje: string; reintentable: boolean } }

function leerSobre<T>(cuerpo: unknown, tomar: (c: Record<string, unknown>) => T): ApiResult<T> {
  const c = cuerpo as Sobre | null
  if (!c || typeof c !== 'object' || typeof c.ok !== 'boolean') return falloTemporal('respuesta_invalida')
  if (c.contrato !== CONTRATO_ESPERADO) return incompatibleError()
  if (c.ok) return { ok: true, data: tomar(c as Record<string, unknown>) }
  if (!c.error) return falloTemporal('respuesta_invalida')
  return { ok: false, error: { ...c.error, state_rev: null } }
}

/** Opciones de una llamada del panel: `alReintentar` avisa a la pantalla que se está reintentando. */
export interface OpcionesLlamada {
  alReintentar?: () => void
}

async function rpcUnaVez<T>(
  fn: string,
  args: Record<string, unknown>,
  tomar: (c: Record<string, unknown>) => T,
): Promise<{ r: ApiResult<T>; reintentar: boolean }> {
  try {
    const { data, error } = await supabase.rpc(fn as never, args as never).abortSignal(AbortSignal.timeout(TIEMPO_RPC_MS))
    if (error) {
      const codigo = (error as { code?: string }).code
      if (codigo === 'PGRST202') {
        return { r: falloTemporal('operacion_no_publicada', 'El agente todavía no está disponible en el servidor.'), reintentar: false }
      }
      // 57014: la base cortó la consulta por su propio límite de tiempo (no la atrapa el manejo de errores de la RPC).
      if (codigo === '57014' || esAborto(error)) return { r: tiempoAgotado(), reintentar: true }
      return { r: falloTemporal(), reintentar: false }
    }
    return { r: leerSobre(data, tomar), reintentar: false }
  } catch (e) {
    return esAborto(e) ? { r: tiempoAgotado(), reintentar: true } : { r: falloTemporal(), reintentar: false }
  }
}

/**
 * Una RPC del panel. Si se agota el tiempo o la base corta la consulta, reintenta UNA vez (las del panel son
 * lecturas o, como save_my_preferences, idempotentes por contenido: repetirla no duplica nada).
 */
async function rpc<T>(
  fn: string,
  args: Record<string, unknown>,
  tomar: (c: Record<string, unknown>) => T,
  escritura = false,
  opciones: OpcionesLlamada = {},
): Promise<ApiResult<T>> {
  if (escritura && contratoIncompatible()) return incompatibleError()
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { ok: false, error: { ...falloTemporal('sin_conexion', 'Sin conexión con el servidor. Reintenta cuando vuelva la conexión.').error, sinConexion: true } }
  }
  const primera = await rpcUnaVez(fn, args, tomar)
  if (!primera.reintentar) return primera.r
  opciones.alReintentar?.()
  return (await rpcUnaVez(fn, args, tomar)).r
}

export const agenteApi = {
  getMyPreferences: (espacioId: string, opciones?: OpcionesLlamada) =>
    rpc<MisPreferencias>('get_my_preferences', { p_espacio_id: espacioId }, (c) => ({
      preferencias: (c.preferencias as Preferencias | null) ?? null,
      usar_en_agente: c.usar_en_agente !== false,
      recibir_invitaciones_agente: typeof c.recibir_invitaciones_agente === 'boolean' ? c.recibir_invitaciones_agente : null,
      actualizadas_en: (c.actualizadas_en as Momento | null) ?? null,
      opciones: (c.opciones as MisPreferencias['opciones']) ?? { actividades: [] },
      personas_con_preferencias: typeof c.personas_con_preferencias === 'number' ? c.personas_con_preferencias : 0,
    }), false, opciones),

  /** E11: no guarda preferencias ni confirma asistencia. Solo cambia el permiso propio. */
  setRecibirInvitaciones: (espacioId: string, recibir: boolean) =>
    rpc<{ recibir_invitaciones_agente: boolean }>(
      'set_recibir_invitaciones_agente',
      { p_espacio_id: espacioId, p_recibir: recibir },
      (c) => {
        if (typeof c.recibir_invitaciones_agente !== 'boolean') throw new Error('respuesta_invalida')
        return { recibir_invitaciones_agente: c.recibir_invitaciones_agente }
      },
      true,
    ),

  // Enmienda 8: `usar_en_agente` viaja dentro de p_preferencias; si falta, el servidor lo toma como true.
  saveMyPreferences: (espacioId: string, preferencias: Preferencias, usarEnAgente = true, opciones?: OpcionesLlamada) =>
    rpc<{ repetido: boolean; usar_en_agente: boolean }>(
      'save_my_preferences',
      { p_espacio_id: espacioId, p_preferencias: { ...preferencias, usar_en_agente: usarEnAgente } },
      (c) => ({
        repetido: Boolean((c.resultado as { repetido?: boolean } | undefined)?.repetido),
        usar_en_agente: c.usar_en_agente !== false,
      }),
      true,
      opciones,
    ),

  /** Pide el borrador al agente. Si la función del servidor no responde, usa la RPC directa sin clima. */
  /**
   * Pide el borrador al agente. `climaSimulado` solo lo acepta la función en espacios demo (lo comprueba ella).
   * El respaldo sin función nunca simula clima: va como "desconocido".
   */
  async proponer(espacioId: string, sabado: string, climaSimulado?: ClimaSimulado): Promise<ApiResult<ResultadoAgente>> {
    try {
      const body: Record<string, unknown> = { espacio_id: espacioId, sabado }
      if (climaSimulado) body.clima_simulado = climaSimulado
      const { data, error } = await supabase.functions.invoke('agente', { body, timeout: TIEMPO_FUNCION_MS })
      if (!error && data) {
        const r = leerSobre(data, (c) => {
          const res = c.resultado as ResultadoAgente
          return res.tipo === 'borrador' ? normalizar(res as Crudo, false) : res
        })
        // Un error de negocio (rol, pocas preferencias...) es definitivo; una falla temporal prueba la RPC.
        if (r.ok || r.error.codigo !== 'fallo_temporal') return r
      }
    } catch {
      // Función no publicada o sin red: sigue el respaldo.
    }
    return rpc<ResultadoAgente>(
      'proponer_plan_borrador',
      { p_espacio_id: espacioId, p_sabado: sabado, p_clima: { sabado: 'desconocido', domingo: 'desconocido' } },
      (c) => {
        const res = c.resultado as ResultadoAgente
        return res.tipo === 'borrador' ? normalizar(res as Crudo, true) : res
      },
    )
  },
}

// ---- Traspaso del borrador a la pantalla de nueva propuesta ----
// El borrador viaja en sessionStorage, por espacio, y se lee una sola vez. NuevaPropuesta (de Claude B)
// puede usar tomarBorradorAgente(espacioId) para precargar título y franjas. Nada de esto es privado.

const CLAVE = (espacioId: string) => `cruxe:borrador-agente:${espacioId}`

/** Lo que "Usar esta opción" deja para Nueva propuesta. Enmienda 14: también la actividad y sus personas. */
export interface BorradorParaPropuesta {
  titulo: string
  franjas: FranjaBorrador[]
  actividad?: string | null
  personas?: PersonasActividad | null
}

export function guardarBorradorAgente(espacioId: string, b: BorradorParaPropuesta): void {
  try {
    sessionStorage.setItem(
      CLAVE(espacioId),
      JSON.stringify({ titulo: b.titulo, franjas: b.franjas, actividad: b.actividad ?? null, personas: b.personas ?? null }),
    )
  } catch {
    // Sin almacenamiento: el organizador completa a mano.
  }
}

export function tomarBorradorAgente(espacioId: string): BorradorParaPropuesta | null {
  try {
    const crudo = sessionStorage.getItem(CLAVE(espacioId))
    if (!crudo) return null
    sessionStorage.removeItem(CLAVE(espacioId))
    const b = JSON.parse(crudo) as { titulo?: unknown; franjas?: unknown; actividad?: unknown; personas?: unknown }
    if (typeof b.titulo !== 'string' || !Array.isArray(b.franjas) || b.franjas.length !== 2) return null
    const p = b.personas as { min?: unknown; max?: unknown } | null
    const personas =
      p && Number.isInteger(p.min) && Number.isInteger(p.max) && (p.min as number) <= (p.max as number)
        ? { min: p.min as number, max: p.max as number }
        : null
    return {
      titulo: b.titulo,
      franjas: b.franjas as FranjaBorrador[],
      actividad: typeof b.actividad === 'string' && /^[a-z_]{1,30}$/.test(b.actividad) ? b.actividad : null,
      personas,
    }
  } catch {
    return null
  }
}
