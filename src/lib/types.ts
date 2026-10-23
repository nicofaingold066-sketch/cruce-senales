// Tipos del contrato backend-interfaz v1 (docs/contrato.md). Todo dato es ficticio.

export interface Momento {
  utc: string
  /** Hora de pared en America/Santiago. La interfaz la muestra tal cual, sin convertir zonas. */
  local: string
}

export interface MiembroRef {
  miembro_id: string
  nombre: string
  simulado: boolean
}

export type Valor = 'si' | 'no' | 'pendiente'
/** Claves de franja ("A", "B") con su valor. Clave ausente = pendiente. */
export type Disponibilidad = Record<string, Valor>

export type EstadoClave =
  | 'borrador'
  | 'reuniendo_interes'
  | 'esperando_compromisos'
  | 'grupo_confirmado'
  | 'en_revision'
  | 'expirado'
  | 'cancelado'

export const ESTADO_ETIQUETA: Record<EstadoClave, string> = {
  borrador: 'Borrador',
  reuniendo_interes: 'Reuniendo interés',
  esperando_compromisos: 'Esperando compromisos',
  grupo_confirmado: 'Grupo confirmado',
  en_revision: 'En revisión',
  expirado: 'Expirado',
  cancelado: 'Cancelado',
}

export interface Franja {
  clave: string
  inicio: Momento
  fin: Momento
}

export interface SiguienteAccion {
  codigo: string
  texto: string
}

export type ResultadoEvaluacion =
  | 'opcion_publicada'
  | 'sin_opcion'
  | 'reparacion_publicada'
  | 'sin_alternativa'

export interface UltimaEvaluacion {
  resultado: ResultadoEvaluacion
  version: number | null
  en: Momento
}

export interface Cupos {
  minimo: number
  maximo: number
  confirmados: number
  disponibles: number
  faltan_para_minimo: number
  imprescindible_acepto: boolean
  pendientes: number
}

export interface Aceptacion {
  miembro: MiembroRef
  aceptado_en: Momento
}

export interface Opcion {
  version: number
  franja: Franja
  publicada_en: Momento
  aceptaron: Aceptacion[]
  cupos: Cupos
}

export interface Baja {
  miembro: MiembroRef
  en: Momento
  version: number | null
  habia_aceptado: boolean
}

export type ActorTipo = 'persona' | 'simulacion' | 'sistema'

export interface Evento {
  tipo: string
  actor: MiembroRef | null
  actor_tipo: ActorTipo
  ejecutado_por: MiembroRef | null
  en: Momento
  estado_previo: EstadoClave | null
  estado_nuevo: EstadoClave | null
  version_previa: number | null
  version_nueva: number | null
  state_rev: number
}

export interface Puede {
  abrir: boolean
  marcar_interes: boolean
  guardar_condiciones: boolean
  evaluar: boolean
  aceptar: boolean
  retirarme: boolean
  proponer_reparacion: boolean
  cancelar: boolean
  simular: boolean
}

export type EstadoCondiciones = 'sin_cargar' | 'incompletas' | 'completas'

export interface MiSituacion {
  miembro_id: string
  nombre: string
  es_organizador: boolean
  es_organizador_espacio: boolean
  interesado: boolean
  condiciones: EstadoCondiciones
  retirado: boolean
  elegible_en_version: boolean | null
  acepte_version: boolean
  puede: Puede
}

export interface EstadoPropuesta {
  id: string
  espacio_id: string
  titulo: string
  organizador: MiembroRef
  imprescindible: MiembroRef
  minimo: number
  maximo: number
  zona_horaria: string
  franjas: Franja[]
  plazo: Momento
  plazo_vencido: boolean
  creada_en: Momento
  estado: EstadoClave
  estado_etiqueta: string
  state_rev: number
  confirmados: number
  opcion: Opcion | null
  ultima_evaluacion: UltimaEvaluacion | null
  interesados: { cantidad: number; miembros: MiembroRef[] }
  personas_con_condiciones: number
  bajas: Baja[]
  siguiente_accion: SiguienteAccion
  mi_situacion: MiSituacion
  historial: Evento[]
}

export interface PropuestaResumen {
  id: string
  titulo: string
  estado: EstadoClave
  estado_etiqueta: string
  version: number | null
  confirmados: number
  minimo: number
  maximo: number
  plazo: Momento
  plazo_vencido: boolean
  siguiente_accion: SiguienteAccion
  state_rev: number
  mi_situacion: {
    interesado: boolean
    retirado: boolean
    acepte_version: boolean
    puede_aceptar: boolean
  }
}

export type TipoEspacio = 'amigos' | 'empresa'

export interface MiembroEspacio {
  miembro_id: string
  nombre: string
  rol: 'organizador' | 'miembro'
  simulado: boolean
  es_yo: boolean
}

export interface Espacio {
  id: string
  nombre: string
  tipo: TipoEspacio
  demo: boolean
  codigo_invitacion: string
  creado_en: Momento
  ultimo_reinicio: Momento | null
  mi_miembro_id: string
  mi_rol: 'organizador' | 'miembro'
  miembros: MiembroEspacio[]
}

export interface EspacioResumen {
  id: string
  nombre: string
  tipo: TipoEspacio
  demo: boolean
  codigo_invitacion: string
  mi_miembro_id: string
  mi_rol: 'organizador' | 'miembro'
  cantidad_miembros: number
}

export interface Condiciones {
  disponibilidad: Disponibilidad
  estado: EstadoCondiciones
  actualizadas_en: Momento | null
}

export interface MiembroPanel {
  miembro: MiembroRef
  interesado: boolean
  condiciones: { disponibilidad: Disponibilidad; estado: EstadoCondiciones }
  retirado: boolean
  elegible_en_version: boolean | null
  acepte_version: boolean
  puede: {
    marcar_interes: boolean
    guardar_condiciones: boolean
    aceptar: boolean
    retirarme: boolean
  }
}

export interface PanelSimulacion {
  rotulo: string
  miembros: MiembroPanel[]
}

// ---- Errores tipados (contrato 0.5) ----

export type ErrorCodigo =
  | 'sesion_invalida'
  | 'entrada_incompleta'
  | 'fuera_de_audiencia'
  | 'opcion_desactualizada'
  | 'cupo_completo'
  | 'plazo_vencido'
  | 'sin_alternativa'
  | 'no_autorizado'
  | 'fallo_temporal'
  // Errores propios de la interfaz (no vienen del servidor):
  | 'contrato_incompatible'

export interface ApiError {
  codigo: ErrorCodigo
  detalle: string
  mensaje: string
  reintentable: boolean
  /** state_rev actual de la propuesta, si el servidor lo informó. */
  state_rev: number | null
  /** true cuando no hubo conexión con el servidor (la acción no quedó registrada). */
  sinConexion?: boolean
}

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiError }
