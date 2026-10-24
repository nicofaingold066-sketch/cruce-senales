// E11 definitiva (0041). Puertos del agente existente, sin cliente HTTP, SDK ni JWT propios.
// E14 opcional: forma confirmada en el puente 0049 PREPARADO de backend (no prueba de
// aplicación). plan.actividad es string; quorum va en la raíz de candidatas, nunca en plan.
export type ErrorSocial = Readonly<{ codigo: string; detalle: string }>
export type Respuesta<T> = ({ ok: true; contrato: number; servidor_ahora: unknown } & T)
  | { ok: false; error: ErrorSocial; ejecucion?: EjecucionSocial }
export type EstadoClimaSocial = 'seco' | 'lluvia' | 'desconocido'
export interface ClimaSocial { sabado: EstadoClimaSocial; domingo: EstadoClimaSocial }
export type ActividadSocial =
  | 'asado' | 'padel' | 'futbol' | 'parque' | 'fiesta' | 'cena' | 'cafe' | 'bar'
  | 'juegos_salida' | 'cultura' | 'cine' | 'cerro' | 'juegos_casa' | 'tenis' | 'basquet' | 'peli_casa'
export interface FranjaSocial { inicio: string; fin: string }
export type FranjasSocial = readonly [FranjaSocial, FranjaSocial]
export interface ViajeSocial { max_minutos: number; estimado: boolean }
export type FamiliaSocial = 'deporte' | 'comida' | 'salida_noche' | 'cultura' | 'aire_libre' | 'en_casa'
export interface PersonasSocial { min: number; max: number }
export interface QuorumSocial {
  actividad: ActividadSocial
  etiqueta: string
  personas_min: number
  personas_posibles: number
}
export interface ContextoSocial {
  localidad: string
  zona_horaria: string
  politica: { modo: 'aprobacion' | 'autonoma'; version: number }
  personas_autorizadas: number
  destinatarios: number
}
export interface OpcionSocial {
  opcion_ref: string
  actividad: ActividadSocial
  actividad_etiqueta: string
  titulo: string
  franjas: FranjasSocial
  viaje: ViajeSocial | null
  familia?: FamiliaSocial
  personas?: PersonasSocial
}
// Solo plan visible E11, autorizado al organizador. Nunca ids de destinatarios,
// condiciones ni claves internas del cálculo/hash. Cupos y plazo vienen del servidor.
export interface PlanSocial {
  titulo: string
  lugar: { nombre: string; simulado: boolean }
  franjas: FranjasSocial
  minimo: number
  maximo: number
  plazo: string
  imprescindible: { nombre: string }
  invitados: number
  actividad?: ActividadSocial
}
export interface BorradorSocial { hash: string; opcion_ref: string; plan: PlanSocial }
export interface BorradorReciboSocial extends BorradorSocial { texto: string }
export interface AprobacionSocial { hash: string; aprobado_en: { utc: string; local: string } }
export interface EjecucionSocial {
  id: string
  estado: 'en_curso' | 'borrador' | 'publicada' | 'fallida'
  oportunidad: string
  propuesta_id: string | null
  borrador: BorradorReciboSocial | null
  aprobacion: AprobacionSocial | null
  motivo: string | null
}
export interface InicioSocial {
  p_espacio_id: string
  p_ejecucion_id: string
  p_oportunidad: string
  p_parametros_hash: string
}
export type MotivoCierreSocial = 'sin_plan' | 'candidatos_rechazados' | 'modelo_fallo' | 'reemplazada'
export interface PuertoBackendSocial {
  agente_social_contexto(p: { p_espacio_id: string }): Promise<Respuesta<ContextoSocial>>
  agente_social_candidatos(p: { p_espacio_id: string; p_sabado: string; p_clima: ClimaSocial }): Promise<Respuesta<{
    opciones: OpcionSocial[]; sin_plan_compatible: boolean; motivo?: string | null; quorum?: QuorumSocial | null
  }>>
  iniciar_ejecucion_agente(p: InicioSocial): Promise<Respuesta<{
    ejecucion: EjecucionSocial; repetido: boolean; propia: boolean
  }>>
  guardar_borrador_agente(p: { p_ejecucion_id: string; p_opcion_ref: string; p_texto: string }): Promise<Respuesta<{
    borrador: BorradorSocial; repetido: boolean
  }>>
  publicar_borrador_agente(p: { p_ejecucion_id: string; p_borrador_hash: string; p_intento_id: string }): Promise<Respuesta<{
    propuesta: { id: string }; invitados: number; repetido: boolean
  }>>
  cerrar_ejecucion_agente(p: { p_ejecucion_id: string; p_estado: 'fallida'; p_motivo: MotivoCierreSocial }): Promise<Respuesta<{
    ejecucion: EjecucionSocial; repetido: boolean
  }>>
}
// Proyección mínima al modelo: sin plan de aprobación, nombres ni conteos privados.
export interface OpcionModelo {
  readonly opcion_ref: string
  readonly actividad: ActividadSocial
  readonly franjas: FranjasSocial
  readonly viaje_max_minutos?: number
  readonly familia?: FamiliaSocial
  readonly personas?: Readonly<PersonasSocial>
}
export type PuertoModelo = (opciones: readonly OpcionModelo[], signal: AbortSignal) => Promise<unknown>
export interface EntradaSocial {
  espacioId: string
  sabado: string
  clima: ClimaSocial
  ejecucionId: string
  oportunidad: string
  accion?: { tipo: 'preparar' } | { tipo: 'publicar'; borradorHash: string }
}
export interface ResultadoSocial {
  estado: 'borrador' | 'publicada' | 'sin_plan' | 'necesita_aprobacion' | 'error'
  ejecucion?: EjecucionSocial
  borrador?: BorradorSocial
  propuesta?: { id: string }
  error?: ErrorSocial
  resultado_incierto?: boolean
  repetido?: boolean
  propia?: boolean
  quorum?: QuorumSocial | null
  motivo?: 'faltan_personas' | 'sin_lugar_cerca_para_todos'
}
// Aprobar, opt-ins, política y accept_version NO son herramientas del orquestador.
