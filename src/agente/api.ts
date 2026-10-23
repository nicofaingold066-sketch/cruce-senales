// Llamadas del agente del círculo (enmienda 4). Mismo sobre de respuesta que el resto del contrato.
// La función del servidor "agente" trae el clima y redacta; si no está publicada, se llama directo
// a proponer_plan_borrador con clima "desconocido" y texto fijo. Nunca se calcula el plan en el cliente.
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

export interface BorradorAgente {
  tipo: 'borrador'
  actividad: string
  actividad_etiqueta: string
  lugar: { id: string; nombre: string; simulado: boolean }
  titulo: string
  franjas: FranjaBorrador[]
  frases_grupo: string[]
  personas_consideradas: number
  clima: { fuente: string; resumen: string; sabado: string; domingo: string }
  explicacion: string
  explicacion_fuente: 'modelo' | 'texto_fijo'
}

export type ResultadoAgente = BorradorAgente | { tipo: 'sin_plan_compatible' }

// Mismos textos que la función del servidor, para el respaldo sin función.
const FRASES: Record<string, string> = {
  presupuesto_todos: 'le sirve al presupuesto de todos',
  bajo_techo: 'es bajo techo por si cambia el tiempo',
  al_aire_libre_con_buen_tiempo: 'es al aire libre y se espera buen tiempo',
  el_mas_elegido: 'es lo que más eligieron',
  ritmo_del_grupo: 'va con el ritmo que prefiere el grupo',
}

export function textoFijo(codigos: string[]): string {
  const partes = codigos.map((c) => FRASES[c]).filter((t): t is string => Boolean(t))
  if (partes.length === 0) return 'Es la opción que mejor le sirve al grupo con lo que cargaron.'
  const texto = partes.length === 1 ? partes[0] : `${partes.slice(0, -1).join(', ')} y ${partes[partes.length - 1]}`
  return `${texto.charAt(0).toUpperCase()}${texto.slice(1)}.`
}

function falloTemporal(detalle = 'reintentar', mensaje = 'Falla temporal. Intenta de nuevo.'): { ok: false; error: ApiError } {
  return { ok: false, error: { codigo: 'fallo_temporal', detalle, mensaje, reintentable: true, state_rev: null } }
}

type Sobre = { ok?: boolean; error?: { codigo: ApiError['codigo']; detalle: string; mensaje: string; reintentable: boolean } }

function leerSobre<T>(cuerpo: unknown, tomar: (c: Record<string, unknown>) => T): ApiResult<T> {
  const c = cuerpo as Sobre | null
  if (!c || typeof c !== 'object' || typeof c.ok !== 'boolean') return falloTemporal('respuesta_invalida')
  if (c.ok) return { ok: true, data: tomar(c as Record<string, unknown>) }
  if (!c.error) return falloTemporal('respuesta_invalida')
  return { ok: false, error: { ...c.error, state_rev: null } }
}

async function rpc<T>(fn: string, args: Record<string, unknown>, tomar: (c: Record<string, unknown>) => T): Promise<ApiResult<T>> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { ok: false, error: { ...falloTemporal('sin_conexion', 'Sin conexión con el servidor. Reintenta cuando vuelva la conexión.').error, sinConexion: true } }
  }
  try {
    const { data, error } = await supabase.rpc(fn as never, args as never)
    if (error) {
      if ((error as { code?: string }).code === 'PGRST202') {
        return falloTemporal('operacion_no_publicada', 'El agente todavía no está disponible en el servidor.')
      }
      return falloTemporal()
    }
    return leerSobre(data, tomar)
  } catch {
    return falloTemporal()
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
    ),

  /** Pide el borrador al agente. Si la función del servidor no responde, usa la RPC directa sin clima. */
  async proponer(espacioId: string, sabado: string): Promise<ApiResult<ResultadoAgente>> {
    try {
      const { data, error } = await supabase.functions.invoke('agente', { body: { espacio_id: espacioId, sabado } })
      if (!error && data) {
        const r = leerSobre(data, (c) => c.resultado as ResultadoAgente)
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
        if (res.tipo !== 'borrador') return res
        return {
          ...res,
          clima: { fuente: 'sin_pronostico', resumen: 'Sin pronóstico disponible.', sabado: 'desconocido', domingo: 'desconocido' },
          explicacion: textoFijo(res.frases_grupo),
          explicacion_fuente: 'texto_fijo',
        }
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
