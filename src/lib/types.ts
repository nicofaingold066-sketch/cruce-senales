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
export const CODIGOS_SIGUIENTE = [
  'abrir_propuesta',
  'reunir_condiciones',
  'buscar_opcion',
  'sin_opcion',
  'aceptar_version',
  'te_toca_aceptar',
  'ya_aceptaste',
  'grupo_confirmado',
  'buscar_alternativa',
  'sin_alternativa',
  'expirado',
  'cancelado',
] as const
export type CodigoSiguiente = (typeof CODIGOS_SIGUIENTE)[number]

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
  /** Enmienda 7 (E7.2): null para quien no es organizador de la propuesta. */
  pendientes: number | null
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

export interface OpcionAnterior {
  version: number
  franja_clave: string
  inicio: Momento
  fin: Momento
}

/**
 * Enmienda 13 (c): en las bajas y los eventos de baja de OTRA persona, el servidor no dice quién fue: llega
 * `{ miembro_id: null, nombre: 'Una persona', simulado: false }` y `habia_aceptado: null`. La propia baja, como antes.
 */
export type MiembroEnBaja = Omit<MiembroRef, 'miembro_id'> & { miembro_id: string | null }

export interface Baja {
  miembro: MiembroEnBaja
  en: Momento
  version: number | null
  /** null cuando la baja es de otra persona (E13 (c)): no se dice si había confirmado. */
  habia_aceptado: boolean | null
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
  /** Enmienda 13 (a): decir "así no puedo, pero sigo" sobre la versión vigente (elegible, sin aceptar, sin retirarse). */
  opinar?: boolean
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
  /** Enmienda 13 (a): la propia opinión sobre la versión vigente; null si no opinó o ya aceptó. */
  mi_opinion?: 'asi_no_puedo' | null
  /** Enmienda 11: la invitación del agente a esta persona (solo la propia). */
  invitacion_agente?: { texto: string } | null
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
  /** Enmienda 6: la versión publicada inmediatamente anterior a la vigente (null si no hay o si la vigente es la 1). */
  opcion_anterior?: OpcionAnterior | null
  ultima_evaluacion: UltimaEvaluacion | null
  interesados: { cantidad: number; miembros: MiembroRef[] }
  /** Enmienda 7 (E7.2): null para quien no es organizador de la propuesta; no descuenta bajas. */
  personas_con_condiciones: number | null
  /**
   * Enmienda 13 (a): solo para el organizador de la propuesta (null para los demás). `asi_no_puedo` es null con
   * menos de 2: nunca se dice quiénes.
   */
  opiniones_totales?: { asi_no_puedo: number | null } | null
  /** Enmienda 14: la actividad de la propuesta (null si no se eligió; en grupos con propósito, de su familia). */
  actividad?: ActividadPropuesta | null
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
  /** Enmienda 14: la actividad de la propuesta (null si no se eligió). */
  actividad?: ActividadPropuesta | null
  mi_situacion: {
    interesado: boolean
    retirado: boolean
    acepte_version: boolean
    puede_aceptar: boolean
    /** Enmienda 11: la invitación del agente a esta persona. */
    invitacion_agente?: { texto: string } | null
  }
}

export type TipoEspacio = 'amigos' | 'empresa'

export interface MiembroEspacio {
  miembro_id: string
  nombre: string
  rol: 'organizador' | 'miembro'
  simulado: boolean
  es_yo: boolean
  /** Enmienda 9 (fase 2): integrante que el organizador anotó y que todavía no entró (sin sesión). */
  pendiente?: boolean
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
  /** Enmienda 14: para qué es el grupo ('libre', una familia o una actividad) y su familia derivada. */
  proposito?: Proposito
  familia?: Familia
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

// ---- Preferencias privadas (enmiendas 4, 8 y 10; migraciones 0035 a 0038) ----
// Solo las ve la propia persona (get_my_preferences). El grupo nunca ve zona, movilidad, tiempo ni momento de nadie:
// del viaje sale un solo número por opción (`ViajeEstimado`), y solo con 4 o más personas que lo cargaron.

export type Presupuesto = 'da_igual' | 'algo_barato' | 'ojala_gratis'
export type Energia = 'con_todo' | 'algo_tranquilo'
export type Ambiente = 'fiesta' | 'tranquilo' | 'da_igual'
export type LugarPreferido = 'da_igual' | 'bajo_techo'
/** Enmienda 10: comuna de Santiago (nunca dirección ni coordenadas). */
export type Zona =
  | 'providencia'
  | 'nunoa'
  | 'las_condes'
  | 'santiago_centro'
  | 'maipu'
  | 'la_florida'
  | 'puente_alto'
  | 'vitacura'
export type Movilidad = 'auto_con_lugar' | 'auto_sin_lugar' | 'transporte_publico' | 'bici_o_pie' | 'me_llevan'
/** Minutos como texto, igual que las demás claves de lista cerrada ("60" = 60 o más, nunca descarta). */
export type TiempoMax = '15' | '30' | '45' | '60'
/** "Momento" ya es la marca de tiempo del servidor: este es el momento del día preferido. */
export type MomentoDia = 'manana' | 'tarde' | 'noche' | 'da_igual'

export interface PreferenciasPropias {
  presupuesto: Presupuesto
  energia: Energia
  ambiente: Ambiente
  lugar: LugarPreferido
  /** Claves de `opciones.actividades` (1 a 6, sin repetir). */
  me_gustaria: string[]
  /** Enmienda 10: opcionales. La que falta no aporta esa variable; al guardar sin ella se borra. */
  zona?: Zona
  movilidad?: Movilidad
  tiempo_max?: TiempoMax
  momento?: MomentoDia
}

/** Enmienda 10: lo único que sale del viaje, por opción. null con menos de 4 personas con zona y movilidad. */
export interface ViajeEstimado {
  max_minutos: number
  estimado: true
}

/** Enmienda 10: motivo de `sin_plan_compatible` cuando todo quedó lejos para alguien (no dice para quién). */
export type MotivoSinPlan = 'sin_lugar_cerca_para_todos' | 'faltan_personas'

export const ZONA_ETIQUETA: Record<Zona, string> = {
  providencia: 'Providencia',
  nunoa: 'Ñuñoa',
  las_condes: 'Las Condes',
  santiago_centro: 'Santiago centro',
  maipu: 'Maipú',
  la_florida: 'La Florida',
  puente_alto: 'Puente Alto',
  vitacura: 'Vitacura',
}

export const MOVILIDAD_ETIQUETA: Record<Movilidad, string> = {
  auto_con_lugar: 'Tengo auto y puedo llevar gente',
  auto_sin_lugar: 'Tengo auto, sin lugar para llevar',
  transporte_publico: 'Transporte público',
  bici_o_pie: 'Bici o a pie',
  me_llevan: 'Necesito que me lleven',
}

export const TIEMPO_MAX_ETIQUETA: Record<TiempoMax, string> = {
  '15': 'Hasta 15 minutos',
  '30': 'Hasta 30 minutos',
  '45': 'Hasta 45 minutos',
  '60': '60 minutos o más',
}

export const MOMENTO_DIA_ETIQUETA: Record<MomentoDia, string> = {
  manana: 'Mañana (antes de las 13)',
  tarde: 'Tarde (de 13 a 19)',
  noche: 'Noche (después de las 19)',
  da_igual: 'Me da igual',
}

/** Texto fijo de la enmienda 10 junto a las cuatro preguntas. */
export const TEXTO_PRIVACIDAD_VIAJE =
  'Solo lo usa el servidor para elegir un lugar que te quede a mano. Nadie del grupo ve tu zona ni cómo te movés.'

/** "Queda a menos de N minutos para todos (estimado)", o null si el servidor no lo informó. */
export function textoViaje(v: ViajeEstimado | null | undefined): string | null {
  return v ? `Queda a menos de ${v.max_minutos} minutos para todos (estimado)` : null
}

export const MOTIVO_SIN_PLAN_TEXTO: Record<MotivoSinPlan, string> = {
  sin_lugar_cerca_para_todos: 'Ningún lugar les queda cerca a todos. Prueben con más tiempo de viaje u otro plan.',
  // Enmienda 14 (texto del contrato).
  faltan_personas: 'Todavía no hay suficientes personas para las actividades de este grupo. Cuando se sumen más, vuelve a pedir una propuesta.',
}

// ---- Enmienda 13: opinar sin bajarse ----
export type OpinionVersion = 'asi_no_puedo' | 'retirar_opinion'

/** Texto de la enmienda 13 (c) para quien se retira; el servidor lo manda en `siguiente_accion.texto`. */
export const TEXTO_GRACIAS_BAJA = 'Gracias por avisar. No hace falta contar por qué.'

/** true si la baja (o el actor de un evento de baja) es de otra persona y el servidor no dice quién (E13 (c)). */
export function esPersonaAnonima(m: { miembro_id: string | null } | null | undefined): boolean {
  return !!m && m.miembro_id === null
}

// ---- Enmienda 14: propósito del grupo, familias de actividad y quórum ----
// Espejo de la tabla fija del servidor (cruce.familia_de_actividad y catalogo_agente). Lo decide el servidor; esto
// sirve para mostrar y filtrar atajos. Una prueba de backend verifica que coincida con la base.

export type Familia = 'deporte' | 'comida' | 'salida_noche' | 'cultura' | 'aire_libre' | 'en_casa' | 'libre'

export type ActividadClave =
  | 'futbol' | 'padel' | 'tenis' | 'basquet'
  | 'asado' | 'cena' | 'cafe'
  | 'fiesta' | 'bar' | 'juegos_salida'
  | 'cultura' | 'cine'
  | 'parque' | 'cerro'
  | 'juegos_casa' | 'peli_casa'

/** 'libre', una familia o una actividad. Si una clave es actividad y familia ('cultura'), vale como familia. */
export type Proposito = Familia | ActividadClave

/** Orden y etiqueta de las familias para el selector "¿Para qué es este grupo?" ('libre' primero). */
export const FAMILIAS: { clave: Familia; etiqueta: string }[] = [
  { clave: 'libre', etiqueta: 'Libre' },
  { clave: 'deporte', etiqueta: 'Deporte' },
  { clave: 'comida', etiqueta: 'Comida' },
  { clave: 'salida_noche', etiqueta: 'Salida / noche' },
  { clave: 'cultura', etiqueta: 'Cultura' },
  { clave: 'aire_libre', etiqueta: 'Aire libre' },
  { clave: 'en_casa', etiqueta: 'En casa' },
]

export const FAMILIA_DE_ACTIVIDAD: Record<ActividadClave, Exclude<Familia, 'libre'>> = {
  futbol: 'deporte', padel: 'deporte', tenis: 'deporte', basquet: 'deporte',
  asado: 'comida', cena: 'comida', cafe: 'comida',
  fiesta: 'salida_noche', bar: 'salida_noche', juegos_salida: 'salida_noche',
  cultura: 'cultura', cine: 'cultura',
  parque: 'aire_libre', cerro: 'aire_libre',
  juegos_casa: 'en_casa', peli_casa: 'en_casa',
}

export const ACTIVIDAD_ETIQUETA: Record<ActividadClave, string> = {
  futbol: 'Fútbol', padel: 'Pádel', tenis: 'Tenis', basquet: 'Básquet',
  asado: 'Asado', cena: 'Cena', cafe: 'Café y brunch',
  fiesta: 'Fiesta', bar: 'Bar', juegos_salida: 'Bowling y escape room',
  cultura: 'Cultura', cine: 'Cine',
  parque: 'Parque', cerro: 'Cerro',
  juegos_casa: 'Juegos en casa', peli_casa: 'Película en casa',
}

/** Personas mínimas y máximas por actividad (quórum del agente; `max` sirve para precargar cupos). */
export const PERSONAS_POR_ACTIVIDAD: Record<ActividadClave, { min: number; max: number }> = {
  futbol: { min: 10, max: 14 }, padel: { min: 4, max: 4 }, tenis: { min: 2, max: 4 }, basquet: { min: 6, max: 10 },
  asado: { min: 4, max: 12 }, cena: { min: 2, max: 8 }, cafe: { min: 2, max: 6 },
  fiesta: { min: 6, max: 20 }, bar: { min: 3, max: 10 }, juegos_salida: { min: 4, max: 8 },
  cultura: { min: 2, max: 10 }, cine: { min: 2, max: 8 },
  parque: { min: 2, max: 20 }, cerro: { min: 2, max: 12 },
  juegos_casa: { min: 3, max: 8 }, peli_casa: { min: 2, max: 8 },
}

/** Lo que trae `propuesta.actividad` (enmienda 14). */
export interface ActividadPropuesta {
  clave: ActividadClave
  etiqueta: string
  familia: Exclude<Familia, 'libre'>
}

/** Aviso de quórum del agente (enmienda 14): el propósito concreto quedó afuera por tamaño del grupo. */
export interface QuorumAgente {
  actividad: ActividadClave
  etiqueta: string
  personas_min: number
  personas_posibles: number
}

/** Texto fijo del quórum (contrato E14, ajuste 7): tamaño del grupo, nunca asistencia. */
export function textoQuorum(q: QuorumAgente): string {
  return `Para ${q.etiqueta} hacen falta al menos ${q.personas_min} personas; este grupo tiene ${q.personas_posibles} por ahora. Estas opciones se pueden armar con el grupo actual.`
}

/** Mensaje del error `entrada_incompleta/fuera_de_proposito` (lo manda el servidor en `error.mensaje`). */
export const TEXTO_FUERA_DE_PROPOSITO =
  'Este grupo se armó para otro tipo de plan. Elige una actividad de ese tipo o crea un grupo en modo libre.'
