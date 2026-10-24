// Envoltorios tipados de las 25 operaciones del contrato (docs/contrato.md + docs/contrato-enmienda-2.md).
// La API es solo supabase.rpc. Nunca supabase.from ni Realtime.
import { supabase } from './supabase'
import type {
  ApiError,
  ApiResult,
  Condiciones,
  Disponibilidad,
  Espacio,
  EspacioResumen,
  EstadoPropuesta,
  MiembroRef,
  Momento,
  ActividadClave,
  Familia,
  OpinionVersion,
  Proposito,
  PanelSimulacion,
  PreferenciasPropias,
  PropuestaResumen,
  TipoEspacio,
} from './types'

export const CONTRATO_ESPERADO = 2

// ---- Sobre de respuesta ----

interface OkBase {
  ok: true
  contrato: number
  servidor_ahora: Momento
}

export type ServerInfoOk = OkBase & { sesion: { autenticada: boolean } }
export type EspacioOk<R> = OkBase & { resultado: R; espacio: Espacio }
export type PropuestaOk<R> = OkBase & { resultado: R; propuesta: EstadoPropuesta }

export type CrearEspacioOk = EspacioOk<{ espacio_id: string; codigo_invitacion: string; miembro_id: string }>
export type UnirseOk = EspacioOk<{
  espacio_id: string
  miembro_id: string
  reclamo_asiento_simulado: boolean
  ya_era_miembro: boolean
  repetido: boolean
}>
export type ListaEspaciosOk = OkBase & { espacios: EspacioResumen[] }
/** Enmienda 9: lo único que se ve con el código antes de unirse. */
export type VistaPorCodigoOk = OkBase & {
  /** Enmienda 14: `proposito` y `familia` llegan desde la 0048 (opcionales hasta entonces). */
  espacio: { nombre: string; demo: boolean; proposito?: Proposito; familia?: Familia }
  miembros: { miembro_id: string; nombre: string; libre: boolean }[]
}
export type VerEspacioOk = OkBase & { espacio: Espacio }
export type SembrarDemoOk = EspacioOk<{ espacio_id: string; creado: boolean; repetido: boolean }>
export type AgregarSimuladoOk = EspacioOk<{ miembro_id: string }>
export type ReiniciarDemoOk = EspacioOk<{ propuestas_eliminadas: number; generacion: number }>
export type CrearPropuestaOk = PropuestaOk<{ propuesta_id: string; repetido: boolean }>
export type RepetidoOk = PropuestaOk<{ repetido: boolean }>
/** Enmienda 3 (migración 0012): quiénes recibieron las condiciones del caso y quiénes no, con motivo. */
export type CargarCasoOk = PropuestaOk<{
  cargados: MiembroRef[]
  omitidos: { miembro: MiembroRef; motivo: 'fuera_del_caso' | 'retirado' | 'condiciones_congeladas' | (string & {}) }[]
  simulado: boolean
  repetido: boolean
}>
export type ListaPropuestasOk = OkBase & { propuestas: PropuestaResumen[] }
/**
 * Mejora #15 (migración 0021): con p_desde_rev igual al último rev_vista, si nada de lo que ve esta persona
 * cambió, llega la respuesta corta sin la propuesta. Si no, la de siempre con su rev_vista.
 */
export type VerPropuestaOk = OkBase &
  (
    | { sin_cambios?: false; rev_vista?: number; propuesta: EstadoPropuesta }
    | { sin_cambios: true; state_rev: number; rev_vista: number }
  )
export type InteresOk = PropuestaOk<{ interesado: boolean; repetido: boolean; simulado?: boolean }>
export type GuardarCondicionesOk = PropuestaOk<{ repetido: boolean; simulado?: boolean }> & {
  condiciones: Condiciones
}
export type MisCondicionesOk = OkBase & { condiciones: Condiciones; state_rev: number }
export type EvaluarOk = PropuestaOk<{
  tipo: 'opcion_publicada' | 'sin_opcion'
  version: number | null
  franja: string | null
  repetido: boolean
}>
export type AceptarOk = PropuestaOk<{
  version: number
  repetido: boolean
  grupo_confirmado: boolean
  simulado?: boolean
}>
export type BajaOk = PropuestaOk<{
  repetido: boolean
  efecto: 'sin_cambio_de_estado' | 'acuerdo_conservado' | 'pasa_a_revision' | 'expirado'
  simulado?: boolean
}>
export type ReparacionOk = PropuestaOk<{
  tipo: 'reparacion_publicada'
  version: number
  franja: string
  repetido: boolean
}>
export type PanelOk = OkBase & { state_rev: number; simulacion: PanelSimulacion }
/** Enmienda 13 (a): "así no puedo, pero sigo". No es baja ni cambia la versión; idempotente por intento. */
export type OpinarOk = PropuestaOk<{ opinion: 'asi_no_puedo' | null; repetido: boolean }>
/**
 * Preferencias privadas propias (enmiendas 4, 8 y 10). `preferencias` solo trae zona, movilidad, tiempo_max y
 * momento si la persona los cargó. `usar_en_agente` es true si todavía no guardó nada.
 */
export type MisPreferenciasOk = OkBase & {
  preferencias: PreferenciasPropias | null
  usar_en_agente: boolean
  actualizadas_en: Momento | null
  opciones: { actividades: { clave: string; etiqueta: string }[] }
  personas_con_preferencias: number
}
export type GuardarPreferenciasOk = OkBase & {
  resultado: { repetido: boolean }
  preferencias: PreferenciasPropias
  usar_en_agente: boolean
  actualizadas_en: Momento
}

// ---- Núcleo ----

let incompatible = false
const oyentesIncompatible = new Set<() => void>()

export function contratoIncompatible(): boolean {
  return incompatible
}
export function alIncompatible(fn: () => void): () => void {
  oyentesIncompatible.add(fn)
  return () => {
    oyentesIncompatible.delete(fn)
  }
}

// Detectada ANTES de enviar: la acción no salió del dispositivo y no quedó registrada.
const MENSAJE_SIN_CONEXION =
  'Sin conexión. No se guardó, pero lo que escribiste se conserva; reintenta cuando vuelva la conexión.'
// Cortada DESPUÉS de enviar: no sabemos si el servidor la registró. (Texto de psico, §16.6: "confirmar" se lee como
// la confirmación del plan; acá se dice "no sabemos si llegó".)
const MENSAJE_RESULTADO_INCIERTO =
  'No sabemos si llegó. Actualizamos la pantalla: si lo que hiciste no aparece, vuelve a intentarlo; no se duplica.'

export function nuevoIntento(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  const b = new Uint8Array(16)
  crypto.getRandomValues(b)
  b[6] = (b[6] & 0x0f) | 0x40
  b[8] = (b[8] & 0x3f) | 0x80
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

function fallo(
  detalle: string,
  mensaje: string,
  extra: Partial<ApiError> = {},
): { ok: false; error: ApiError } {
  return {
    ok: false,
    error: { codigo: 'fallo_temporal', detalle, mensaje, reintentable: true, state_rev: null, ...extra },
  }
}

/** Falla de red con la llamada ya enviada. En escrituras el resultado es incierto; en lecturas no hay nada que registrar. */
function falloDeRed(escritura: boolean) {
  return escritura
    ? fallo('resultado_incierto', MENSAJE_RESULTADO_INCIERTO, { resultadoIncierto: true })
    : fallo('sin_conexion', MENSAJE_SIN_CONEXION, { sinConexion: true })
}

/** Tope de espera de cada RPC (U3 de la revisión de Codex): una llamada colgada no congela botones ni sondeo. */
export const TOPE_RPC_MS = 10_000

/** El servidor no respondió a tiempo. Una escritura ya enviada puede haberse registrado: resultado incierto. */
function falloPorTope(escritura: boolean) {
  return escritura
    ? fallo('tope_de_espera', MENSAJE_RESULTADO_INCIERTO, { resultadoIncierto: true })
    : fallo('tope_de_espera', 'Está tardando más de lo normal. Seguimos intentando.')
}

function esErrorDeRed(msg: string): boolean {
  return /failed to fetch|networkerror|network request failed|load failed|fetch failed|timeout/i.test(msg)
}

async function llamar<T extends OkBase>(
  fn: string,
  args: Record<string, unknown>,
  escritura: boolean,
): Promise<ApiResult<T>> {
  if (escritura && incompatible) {
    return {
      ok: false,
      error: {
        codigo: 'contrato_incompatible',
        detalle: 'contrato_incompatible',
        mensaje: 'Hay una versión nueva de CRUXE: recarga la página.',
        reintentable: false,
        state_rev: null,
      },
    }
  }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return fallo('sin_conexion', MENSAJE_SIN_CONEXION, { sinConexion: true })
  }
  let res: { data: unknown; error: { message?: string; code?: string } | null }
  const control = new AbortController()
  const tope = setTimeout(() => control.abort(), TOPE_RPC_MS)
  try {
    res = (await supabase.rpc(fn as never, args as never).abortSignal(control.signal)) as typeof res
  } catch (e) {
    if (control.signal.aborted) return falloPorTope(escritura)
    const msg = e instanceof Error ? e.message : String(e)
    if (esErrorDeRed(msg)) return falloDeRed(escritura)
    return fallo('reintentar', 'Falla temporal. Intenta de nuevo.')
  } finally {
    clearTimeout(tope)
  }
  if (res.error && control.signal.aborted) return falloPorTope(escritura)
  if (res.error) {
    const msg = res.error.message ?? ''
    if (esErrorDeRed(msg)) return falloDeRed(escritura)
    if (res.error.code === '22P02') {
      // Un id que no es uuid (por ejemplo, un enlace mal copiado) no llega a la función: PostgREST lo rechaza.
      // Se responde lo mismo que el servidor para un id que no existe, sin reintento (pedido O-06 de rincones).
      return {
        ok: false,
        error: {
          codigo: 'fuera_de_audiencia',
          detalle: 'no_miembro',
          mensaje: 'No perteneces a este espacio o el elemento no existe.',
          reintentable: false,
          state_rev: null,
        },
      }
    }
    if (res.error.code === 'PGRST202') {
      // Operación aún no publicada en la base: se trata como falla temporal (contrato 0.3).
      return fallo(
        'operacion_no_publicada',
        'Esta función todavía no está disponible. Intenta más tarde.',
      )
    }
    return fallo('reintentar', 'Falla temporal. Intenta de nuevo.')
  }
  const cuerpo = res.data as
    | {
        ok?: boolean
        contrato?: number
        error?: { codigo: ApiError['codigo']; detalle: string; mensaje: string; reintentable: boolean }
        state_rev?: number | null
      }
    | null
  if (!cuerpo || typeof cuerpo !== 'object' || typeof cuerpo.ok !== 'boolean') {
    return fallo('respuesta_invalida', 'Falla temporal. Intenta de nuevo.')
  }
  if (cuerpo.contrato !== CONTRATO_ESPERADO) {
    incompatible = true
    oyentesIncompatible.forEach((f) => f())
    return {
      ok: false,
      error: {
        codigo: 'contrato_incompatible',
        detalle: 'contrato_incompatible',
        mensaje: 'Hay una versión nueva de CRUXE: recarga la página.',
        reintentable: false,
        state_rev: null,
      },
    }
  }
  if (cuerpo.ok) return { ok: true, data: cuerpo as unknown as T }
  const e = cuerpo.error
  if (!e) return fallo('respuesta_invalida', 'Falla temporal. Intenta de nuevo.')
  return {
    ok: false,
    error: {
      codigo: e.codigo,
      detalle: e.detalle,
      mensaje: e.mensaje,
      reintentable: e.reintentable,
      state_rev: typeof cuerpo.state_rev === 'number' ? cuerpo.state_rev : null,
    },
  }
}

export interface FranjaEntrada {
  /** HoraLocal "YYYY-MM-DDTHH:MM" en America/Santiago, sin desfase. */
  inicio: string
  fin: string
}

export interface CrearPropuestaParams {
  espacioId: string
  titulo: string
  franjas: FranjaEntrada[]
  minimo: number
  maximo: number
  imprescindibleId: string
  plazo: string
  intentoId: string
  /** Enmienda 14: actividad del catálogo (se manda solo si viene). En un grupo con propósito, de su familia. */
  actividad?: ActividadClave | null
}

// ---- Operaciones ----

export const api = {
  // 1.0
  serverInfo: () => llamar<ServerInfoOk>('server_info', {}, false),

  // 1.1 - 1.7 Espacios
  // Enmienda 14: `proposito` opcional; se manda solo si no es 'libre' (sin él, el grupo queda en modo libre, como hoy).
  createSpace: (nombre: string, tipo: TipoEspacio, nombreVisible: string, integrantes?: string[], proposito?: Proposito) =>
    llamar<CrearEspacioOk>(
      'create_space',
      {
        p_nombre: nombre,
        p_tipo: tipo,
        p_nombre_visible: nombreVisible,
        ...(integrantes && integrantes.length > 0 ? { p_integrantes: integrantes } : {}),
        ...(proposito && proposito !== 'libre' ? { p_proposito: proposito } : {}),
      },
      true,
    ),
  joinSpace: (codigo: string, nombreVisible: string, miembroId?: string | null) =>
    llamar<UnirseOk>(
      'join_space',
      miembroId
        ? { p_codigo: codigo, p_nombre_visible: nombreVisible, p_miembro_id: miembroId }
        : { p_codigo: codigo, p_nombre_visible: nombreVisible },
      true,
    ),
  previewSpaceByCode: (codigo: string) => llamar<VistaPorCodigoOk>('preview_space_by_code', { p_codigo: codigo }, false),
  listMySpaces: () => llamar<ListaEspaciosOk>('list_my_spaces', {}, false),
  getSpace: (espacioId: string) => llamar<VerEspacioOk>('get_space', { p_espacio_id: espacioId }, false),
  seedDemoSpace: () => llamar<SembrarDemoOk>('seed_demo_space', {}, true),
  addSimulatedMember: (espacioId: string, nombreVisible: string) =>
    llamar<AgregarSimuladoOk>(
      'add_simulated_member',
      { p_espacio_id: espacioId, p_nombre_visible: nombreVisible },
      true,
    ),
  resetDemo: (espacioId: string, intentoId: string) =>
    llamar<ReiniciarDemoOk>('reset_demo', { p_espacio_id: espacioId, p_intento_id: intentoId }, true),

  // 1.8 - 1.14 Propuesta, interés y condiciones
  createProposal: (p: CrearPropuestaParams) =>
    llamar<CrearPropuestaOk>(
      'create_proposal',
      {
        p_espacio_id: p.espacioId,
        p_titulo: p.titulo,
        p_franjas: p.franjas,
        p_minimo: p.minimo,
        p_maximo: p.maximo,
        p_imprescindible_id: p.imprescindibleId,
        p_plazo: p.plazo,
        p_zona_horaria: 'America/Santiago',
        p_intento_id: p.intentoId,
        ...(p.actividad ? { p_actividad: p.actividad } : {}),
      },
      true,
    ),
  openProposal: (propuestaId: string) =>
    llamar<RepetidoOk>('open_proposal', { p_propuesta_id: propuestaId }, true),
  listProposals: (espacioId: string) =>
    llamar<ListaPropuestasOk>('list_proposals', { p_espacio_id: espacioId }, false),
  getProposalState: (propuestaId: string, desdeRev?: number | null) =>
    llamar<VerPropuestaOk>(
      'get_proposal_state',
      desdeRev == null ? { p_propuesta_id: propuestaId } : { p_propuesta_id: propuestaId, p_desde_rev: desdeRev },
      false,
    ),
  markInterest: (propuestaId: string, interesado: boolean) =>
    llamar<InteresOk>('mark_interest', { p_propuesta_id: propuestaId, p_interesado: interesado }, true),
  saveMyConditions: (propuestaId: string, disponibilidad: Disponibilidad) =>
    llamar<GuardarCondicionesOk>(
      'save_my_conditions',
      { p_propuesta_id: propuestaId, p_disponibilidad: disponibilidad },
      true,
    ),
  getMyConditions: (propuestaId: string) =>
    llamar<MisCondicionesOk>('get_my_conditions', { p_propuesta_id: propuestaId }, false),

  // 1.15 - 1.19 Evaluación, aceptación, baja, alternativa, cancelación
  evaluateAndPublish: (propuestaId: string, intentoId: string) =>
    llamar<EvaluarOk>('evaluate_and_publish', { p_propuesta_id: propuestaId, p_intento_id: intentoId }, true),
  acceptVersion: (propuestaId: string, version: number, intentoId: string) =>
    llamar<AceptarOk>(
      'accept_version',
      { p_propuesta_id: propuestaId, p_version: version, p_intento_id: intentoId },
      true,
    ),
  withdrawCommitment: (propuestaId: string) =>
    llamar<BajaOk>('withdraw_commitment', { p_propuesta_id: propuestaId }, true),
  proposeRepair: (propuestaId: string, intentoId: string) =>
    llamar<ReparacionOk>('propose_repair', { p_propuesta_id: propuestaId, p_intento_id: intentoId }, true),
  cancelProposal: (propuestaId: string) =>
    llamar<RepetidoOk>('cancel_proposal', { p_propuesta_id: propuestaId }, true),

  // 1.20 - 1.24 Simulación (solo organizador del espacio)
  simulateMarkInterest: (propuestaId: string, miembroId: string, interesado: boolean) =>
    llamar<InteresOk>(
      'simulate_mark_interest',
      { p_propuesta_id: propuestaId, p_miembro_id: miembroId, p_interesado: interesado },
      true,
    ),
  simulateSaveConditions: (propuestaId: string, miembroId: string, disponibilidad: Disponibilidad) =>
    llamar<GuardarCondicionesOk>(
      'simulate_save_conditions',
      { p_propuesta_id: propuestaId, p_miembro_id: miembroId, p_disponibilidad: disponibilidad },
      true,
    ),
  simulateAccept: (propuestaId: string, miembroId: string, version: number, intentoId: string) =>
    llamar<AceptarOk>(
      'simulate_accept',
      { p_propuesta_id: propuestaId, p_miembro_id: miembroId, p_version: version, p_intento_id: intentoId },
      true,
    ),
  simulateWithdraw: (propuestaId: string, miembroId: string) =>
    llamar<BajaOk>('simulate_withdraw', { p_propuesta_id: propuestaId, p_miembro_id: miembroId }, true),
  // Enmienda 3: carga en UNA transacción las condiciones del caso a todos los simulados que puedan cambiarlas.
  simulateLoadCase: (propuestaId: string, intentoId: string) =>
    llamar<CargarCasoOk>('simulate_load_case', { p_propuesta_id: propuestaId, p_intento_id: intentoId }, true),
  getSimulationPanel: (propuestaId: string) =>
    llamar<PanelOk>('get_simulation_panel', { p_propuesta_id: propuestaId }, false),

  // Enmienda 13 (a): opinar sobre la versión vigente sin bajarse ('asi_no_puedo' o 'retirar_opinion').
  opinarVersion: (propuestaId: string, version: number, opinion: OpinionVersion, intentoId: string) =>
    llamar<OpinarOk>(
      'opinar_version',
      { p_propuesta_id: propuestaId, p_version: version, p_opinion: opinion, p_intento_id: intentoId },
      true,
    ),

  // Preferencias privadas (enmiendas 4, 8 y 10). El agente tiene sus propias llamadas en src/agente/api.ts.
  getMyPreferences: (espacioId: string) =>
    llamar<MisPreferenciasOk>('get_my_preferences', { p_espacio_id: espacioId }, false),
  /** Guardar es reemplazar: una clave opcional que no se manda queda vacía. Sin `usarEnAgente`, vale true. */
  saveMyPreferences: (espacioId: string, preferencias: PreferenciasPropias, usarEnAgente?: boolean) =>
    llamar<GuardarPreferenciasOk>(
      'save_my_preferences',
      {
        p_espacio_id: espacioId,
        p_preferencias: usarEnAgente === undefined ? preferencias : { ...preferencias, usar_en_agente: usarEnAgente },
      },
      true,
    ),
}

/** Texto para mostrar al usuario. Los mensajes del servidor ya son exactos (contrato 0.5). */
export function textoError(e: ApiError): string {
  return e.mensaje
}

/** Orientación adicional para el usuario según el error (enmienda 2). No calcula nada: solo explica. */
export function ayudaError(e: ApiError): string | null {
  if (e.codigo === 'cupo_completo' && e.detalle === 'reservado_imprescindible') {
    return 'El último cupo está reservado para quien no puede faltar. Si se libera otro, podrás confirmar.'
  }
  if (e.codigo === 'asiento_en_uso') {
    return 'Ese nombre ya está en uso en el grupo. Entra con otro: serás una persona nueva, sin respuestas anteriores.'
  }
  if (e.codigo === 'intento_obsoleto') {
    return 'Esa acción corresponde a una versión anterior de la demo (se reinició desde entonces). No se aplicó; actualizamos la pantalla.'
  }
  return null
}
