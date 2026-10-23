// Tipos del contrato backend-interfaz (docs/contrato.md + docs/contrato-enmienda-2.md; la enmienda prevalece). Todo dato es ficticio.

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

/** Códigos cerrados de `siguiente_accion` (enmienda 3). La interfaz elige color o ícono por código, nunca por texto. */
export type CodigoSiguiente =
  | 'abrir_propuesta'
  | 'reunir_condiciones'
  | 'buscar_opcion'
  | 'sin_opcion'
  | 'aceptar_version'
  | 'te_toca_aceptar'
  | 'ya_aceptaste'
  | 'grupo_confirmado'
  | 'buscar_alternativa'
  | 'sin_alternativa'
  | 'expirado'
  | 'cancelado'

export interface SiguienteAccion {
  /** Un código de `CodigoSiguiente`; se acepta cualquier otro como respaldo (se muestra solo el texto). */
  codigo: CodigoSiguiente | (string & {})
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
  /** Enmienda 2 (A1): mientras el imprescindible no acepte, se le reserva un cupo. */
  reservado_imprescindible: boolean
  /** Enmienda 2 (A1): cupos que el servidor deja libres para quienes no son el imprescindible. */
  libres_para_otros: number
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
  /** Enmienda 2 (A1): por qué `puede.aceptar` es false; "cupo_reservado" si el último cupo es del imprescindible. */
  motivo_aceptar?: string | null
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
  /** Enmienda 2 (A3): sube con cada reinicio real de la demo. */
  generacion: number
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
  /** Enmienda 2 (A3). */
  generacion: number
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
  | 'asiento_en_uso'
  | 'intento_obsoleto'
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
  /**
   * true cuando la llamada ya se había enviado y no pudimos confirmar el resultado (puede haberse registrado o no).
   * Se refresca el estado y se conserva el intento original para reintentar.
   */
  resultadoIncierto?: boolean
}

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiError }
