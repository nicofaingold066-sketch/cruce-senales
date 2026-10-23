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

export interface Preferencias {
  presupuesto: Presupuesto
  energia: Energia
  ambiente: Ambiente
  lugar: LugarPref
  me_gustaria: string[]
}

export interface ActividadOpcion {
  clave: string
  etiqueta: string
}

export interface MisPreferencias {
  preferencias: Preferencias | null
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
}

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
  perfil_grupo?: PerfilGrupo | null
}

export type ResultadoAgente = BorradorAgente | { tipo: 'sin_plan_compatible' }

/** Clima de simulación para la demo (mejora #23). */
export type ClimaSimulado = 'seco' | 'lluvia'

// Mismos textos que la función del servidor, para el respaldo sin función.
const FRASES: Record<string, string> = {
  presupuesto_todos: 'le sirve al presupuesto de todos',
  bajo_techo: 'es bajo techo por si cambia el tiempo',
  al_aire_libre_con_buen_tiempo: 'es al aire libre con buen pronóstico',
  el_mas_elegido: 'es lo que más eligieron',
  ritmo_del_grupo: 'va con el ritmo que prefiere el grupo',
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

/** Completa una respuesta que no trae los campos de la 4.1 (función vieja o RPC directa sin función). */
function normalizar(r: Crudo, sinFuncion: boolean): BorradorAgente {
  // Sin la 4.1 la única opción es la del servidor; su id es el del catálogo.
  const candidatas = Array.isArray(r.candidatas) && r.candidatas.length > 0 ? r.candidatas : [{ ...r, id: r.id ?? r.lugar.id }]
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
    eleccion_fuente: !sinFuncion && r.eleccion_fuente === 'modelo' ? 'modelo' : 'regla',
    explicacion_fuente: !fijo && r.explicacion_fuente === 'modelo' ? 'modelo' : 'texto_fijo',
  }
}

// Tiempos límite del cliente (mejora #32): la demo nunca queda esperando para siempre.
// La función del servidor corta sola a los ~8 s; si igual tarda más, se usa el respaldo por RPC.
const TIEMPO_FUNCION_MS = 10000
const TIEMPO_RPC_MS = 8000

function tiempoAgotado(): { ok: false; error: ApiError } {
  return falloTemporal('tiempo_agotado', 'El servidor tardó demasiado en responder. Intenta de nuevo.')
}

function esAborto(e: unknown): boolean {
  const nombre = (e as { name?: string } | null)?.name ?? ''
  const mensaje = (e as { message?: string } | null)?.message ?? ''
  return nombre === 'AbortError' || nombre === 'TimeoutError' || /abort/i.test(mensaje)
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

async function rpc<T>(
  fn: string,
  args: Record<string, unknown>,
  tomar: (c: Record<string, unknown>) => T,
  escritura = false,
): Promise<ApiResult<T>> {
  if (escritura && contratoIncompatible()) return incompatibleError()
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { ok: false, error: { ...falloTemporal('sin_conexion', 'Sin conexión con el servidor. Reintenta cuando vuelva la conexión.').error, sinConexion: true } }
  }
  try {
    const { data, error } = await supabase.rpc(fn as never, args as never).abortSignal(AbortSignal.timeout(TIEMPO_RPC_MS))
    if (error) {
      if ((error as { code?: string }).code === 'PGRST202') {
        return falloTemporal('operacion_no_publicada', 'El agente todavía no está disponible en el servidor.')
      }
      return esAborto(error) ? tiempoAgotado() : falloTemporal()
    }
    return leerSobre(data, tomar)
  } catch (e) {
    return esAborto(e) ? tiempoAgotado() : falloTemporal()
  }
}

export const agenteApi = {
  getMyPreferences: (espacioId: string) =>
    rpc<MisPreferencias>('get_my_preferences', { p_espacio_id: espacioId }, (c) => ({
      preferencias: (c.preferencias as Preferencias | null) ?? null,
      actualizadas_en: (c.actualizadas_en as Momento | null) ?? null,
      opciones: (c.opciones as MisPreferencias['opciones']) ?? { actividades: [] },
      personas_con_preferencias: typeof c.personas_con_preferencias === 'number' ? c.personas_con_preferencias : 0,
    })),

  saveMyPreferences: (espacioId: string, preferencias: Preferencias) =>
    rpc<{ repetido: boolean }>(
      'save_my_preferences',
      { p_espacio_id: espacioId, p_preferencias: preferencias },
      (c) => ({ repetido: Boolean((c.resultado as { repetido?: boolean } | undefined)?.repetido) }),
      true,
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

export function guardarBorradorAgente(espacioId: string, b: { titulo: string; franjas: FranjaBorrador[] }): void {
  try {
    sessionStorage.setItem(CLAVE(espacioId), JSON.stringify({ titulo: b.titulo, franjas: b.franjas }))
  } catch {
    // Sin almacenamiento: el organizador completa a mano.
  }
}

export function tomarBorradorAgente(espacioId: string): { titulo: string; franjas: FranjaBorrador[] } | null {
  try {
    const crudo = sessionStorage.getItem(CLAVE(espacioId))
    if (!crudo) return null
    sessionStorage.removeItem(CLAVE(espacioId))
    const b = JSON.parse(crudo) as { titulo?: unknown; franjas?: unknown }
    if (typeof b.titulo !== 'string' || !Array.isArray(b.franjas) || b.franjas.length !== 2) return null
    return { titulo: b.titulo, franjas: b.franjas as FranjaBorrador[] }
  } catch {
    return null
  }
}
