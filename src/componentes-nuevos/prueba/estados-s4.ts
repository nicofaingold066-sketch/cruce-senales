// Estados ficticios de la pantalla del plan (S4) para la galería y las capturas del rediseño, sin base ni red.
// Cada caso es lo que el servidor devolvería a UNA persona en UN momento: nada se calcula acá, solo se declara.
// Datos ficticios: grupo «Los del pádel» (Vale organiza y no puede faltar; Ana, Beto, Coni, Diego, Ema).
import type { Baja, Espacio, EstadoPropuesta, Evento, MiembroRef, Momento, Opcion, Puede } from '../../lib/types'

/** Hora de pared de Santiago (UTC-3 en primavera) → Momento del contrato. */
export function mom(local: string): Momento {
  return { local, utc: new Date(`${local}-03:00`).toISOString().replace('.000Z', 'Z') }
}

const persona = (id: string, nombre: string): MiembroRef => ({ miembro_id: id, nombre, simulado: false })
export const VALE = persona('m-vale', 'Vale')
export const ANA = persona('m-ana', 'Ana')
export const BETO = persona('m-beto', 'Beto')
export const CONI = persona('m-coni', 'Coni')
export const DIEGO = persona('m-diego', 'Diego')
export const EMA = persona('m-ema', 'Ema')
const TODOS = [VALE, ANA, BETO, CONI, DIEGO, EMA]

export const FRANJA_A = { clave: 'A', inicio: mom('2026-10-31T20:00:00'), fin: mom('2026-10-31T23:00:00'), etiqueta: null }
export const FRANJA_B = { clave: 'B', inicio: mom('2026-11-01T13:00:00'), fin: mom('2026-11-01T16:00:00'), etiqueta: null }
const PLAZO = mom('2026-10-30T20:00:00')
export const SERVIDOR_AHORA = mom('2026-10-29T18:00:00')

/** El espacio como lo ve `yo`. */
export function espacioDe(yo: MiembroRef, demo = false): Espacio {
  return {
    id: 'e-padel',
    nombre: 'Los del pádel',
    tipo: 'amigos',
    demo,
    codigo_invitacion: 'ABCD1234',
    creado_en: mom('2026-10-28T10:00:00'),
    ultimo_reinicio: null,
    generacion: 1,
    mi_miembro_id: yo.miembro_id,
    mi_rol: yo.miembro_id === VALE.miembro_id ? 'organizador' : 'miembro',
    miembros: TODOS.map((m) => ({
      miembro_id: m.miembro_id,
      nombre: m.nombre,
      rol: m.miembro_id === VALE.miembro_id ? 'organizador' : 'miembro',
      simulado: false,
      es_yo: m.miembro_id === yo.miembro_id,
      pendiente: m.miembro_id === EMA.miembro_id,
    })),
    proposito: 'libre',
    familia: 'libre',
  }
}

const NADA: Puede = {
  abrir: false, marcar_interes: false, guardar_condiciones: false, evaluar: false, aceptar: false,
  retirarme: false, proponer_reparacion: false, cancelar: false, simular: false, opinar: false,
}

function evento(tipo: string, en: string, extra: Partial<Evento> = {}): Evento {
  return {
    tipo, actor: null, actor_tipo: 'sistema', ejecutado_por: null, en: mom(en),
    estado_previo: null, estado_nuevo: null, version_previa: null, version_nueva: null, state_rev: 1, ...extra,
  }
}

const CREADA = evento('propuesta_creada', '2026-10-28T10:05:00', { actor: VALE, actor_tipo: 'persona', estado_nuevo: 'borrador' })
const ABIERTA = evento('propuesta_abierta', '2026-10-28T10:06:00', { actor: VALE, actor_tipo: 'persona', estado_previo: 'borrador', estado_nuevo: 'reuniendo_interes', state_rev: 2 })
const V1 = evento('opcion_publicada', '2026-10-29T12:00:00', { estado_previo: 'reuniendo_interes', estado_nuevo: 'esperando_compromisos', version_nueva: 1, state_rev: 6 })
const acepto = (m: MiembroRef, en: string, version: number, rev: number) =>
  evento('aceptacion', en, { actor: m, actor_tipo: 'persona', version_previa: version, version_nueva: version, state_rev: rev })

function opcion(version: number, franja: typeof FRANJA_A, aceptaron: { m: MiembroRef; en: string }[], extra: Partial<Opcion['cupos']> = {}): Opcion {
  const confirmados = aceptaron.length
  const minimo = 4
  const maximo = 6
  const imprescindible_acepto = aceptaron.some((a) => a.m.miembro_id === VALE.miembro_id)
  const reservado = !imprescindible_acepto && maximo - confirmados <= 1
  return {
    version,
    franja,
    publicada_en: mom(version === 1 ? '2026-10-29T12:00:00' : '2026-10-29T17:30:00'),
    aceptaron: aceptaron.map((a) => ({ miembro: a.m, aceptado_en: mom(a.en) })),
    cupos: {
      minimo, maximo, confirmados,
      disponibles: maximo - confirmados,
      faltan_para_minimo: Math.max(0, minimo - confirmados),
      imprescindible_acepto,
      pendientes: null,
      reservado_imprescindible: reservado,
      libres_para_otros: maximo - confirmados - (reservado ? 1 : 0),
      ...extra,
    },
  }
}

/** Base común; cada caso cambia lo suyo. `yo` decide `mi_situacion` y los campos que el servidor solo da a quien organiza. */
function base(yo: MiembroRef, extra: Partial<EstadoPropuesta>): EstadoPropuesta {
  const org = yo.miembro_id === VALE.miembro_id
  return {
    id: 'p-padel-1',
    espacio_id: 'e-padel',
    titulo: 'Pádel y algo después',
    organizador: VALE,
    imprescindible: VALE,
    minimo: 4,
    maximo: 6,
    zona_horaria: 'America/Santiago',
    franjas: [FRANJA_A, FRANJA_B],
    plazo: PLAZO,
    plazo_vencido: false,
    creada_en: mom('2026-10-28T10:05:00'),
    estado: 'reuniendo_interes',
    estado_etiqueta: 'Reuniendo interés',
    state_rev: 3,
    confirmados: 0,
    opcion: null,
    opcion_anterior: null,
    ultima_evaluacion: null,
    interesados: { cantidad: 0, miembros: [] },
    personas_con_condiciones: org ? 0 : null,
    opiniones_totales: org ? { asi_no_puedo: null } : null,
    actividad: { clave: 'padel', etiqueta: 'Pádel', familia: 'deporte' },
    ronda: null,
    regla: 'temprana',
    planes_totales: null,
    bajas: [],
    siguiente_accion: { codigo: 'reunir_condiciones', texto: 'Marca cuándo puedes en «Mi respuesta».' },
    mi_situacion: {
      miembro_id: yo.miembro_id,
      nombre: yo.nombre,
      es_organizador: org,
      es_organizador_espacio: org,
      interesado: false,
      condiciones: 'sin_cargar',
      retirado: false,
      elegible_en_version: null,
      acepte_version: false,
      motivo_aceptar: null,
      mi_opinion: null,
      invitacion_agente: null,
      puede: { ...NADA, marcar_interes: true, guardar_condiciones: true, retirarme: true, cancelar: org },
    },
    historial: [CREADA, ABIERTA],
    ...extra,
  }
}

export interface CasoS4 {
  id: string
  titulo: string
  yo: MiembroRef
  p: EstadoPropuesta
  demo?: boolean
}

const BAJA_ANONIMA: Baja = { miembro: { miembro_id: null, nombre: 'Una persona', simulado: false }, en: mom('2026-10-29T17:00:00'), version: 1, habia_aceptado: null }

export const CASOS_S4: CasoS4[] = [
  {
    id: 'borrador-org',
    titulo: 'Borrador, organizadora',
    yo: VALE,
    p: base(VALE, {
      estado: 'borrador', estado_etiqueta: 'Borrador', state_rev: 1, historial: [CREADA],
      siguiente_accion: { codigo: 'abrir_propuesta', texto: 'Abre la propuesta para que el grupo responda.' },
      mi_situacion: { ...base(VALE, {}).mi_situacion, puede: { ...NADA, abrir: true, cancelar: true } },
    }),
  },
  {
    id: 'reuniendo-org-sin-responder',
    titulo: 'Reuniendo interés, organizadora sin responder (no puede faltar)',
    yo: VALE,
    p: base(VALE, {
      personas_con_condiciones: 2,
      interesados: { cantidad: 1, miembros: [BETO] },
      siguiente_accion: { codigo: 'reunir_condiciones', texto: 'Primero marca tu disponibilidad: eres quien no puede faltar.' },
      mi_situacion: { ...base(VALE, {}).mi_situacion, puede: { ...NADA, marcar_interes: true, guardar_condiciones: true, evaluar: true, retirarme: true, cancelar: true } },
    }),
  },
  {
    id: 'reuniendo-invitada-sin-responder',
    titulo: 'Reuniendo interés, invitada sin responder',
    yo: ANA,
    p: base(ANA, { interesados: { cantidad: 1, miembros: [BETO] } }),
  },
  {
    id: 'reuniendo-org-lista',
    titulo: 'Reuniendo interés, organizadora con 4 respuestas: le toca buscar',
    yo: VALE,
    p: base(VALE, {
      state_rev: 5,
      personas_con_condiciones: 4,
      interesados: { cantidad: 2, miembros: [VALE, BETO] },
      siguiente_accion: { codigo: 'buscar_opcion', texto: 'Ya hay 4 personas con condiciones. Busca una opción compatible.' },
      mi_situacion: { ...base(VALE, {}).mi_situacion, interesado: true, condiciones: 'completas', puede: { ...NADA, marcar_interes: true, guardar_condiciones: true, evaluar: true, retirarme: true, cancelar: true } },
    }),
  },
  {
    id: 'reuniendo-sin-opcion',
    titulo: 'Reuniendo interés, se buscó y no hubo opción (organizadora)',
    yo: VALE,
    p: base(VALE, {
      state_rev: 6,
      personas_con_condiciones: 4,
      ultima_evaluacion: { resultado: 'sin_opcion', version: null, en: mom('2026-10-29T12:00:00') },
      historial: [CREADA, ABIERTA, evento('evaluacion_sin_opcion', '2026-10-29T12:00:00', { state_rev: 6 })],
      siguiente_accion: { codigo: 'sin_opcion', texto: 'Sin opción compatible con las respuestas de hoy. Espera más respuestas o cancela.' },
      mi_situacion: { ...base(VALE, {}).mi_situacion, condiciones: 'completas', puede: { ...NADA, marcar_interes: true, guardar_condiciones: true, evaluar: true, retirarme: true, cancelar: true } },
    }),
  },
  {
    id: 'esperando-invitada-te-toca',
    titulo: 'Versión 1 publicada, invitada: le toca confirmar (1 de 4)',
    yo: ANA,
    p: base(ANA, {
      estado: 'esperando_compromisos', estado_etiqueta: 'Esperando compromisos', state_rev: 7, confirmados: 1,
      opcion: opcion(1, FRANJA_A, [{ m: VALE, en: '2026-10-29T12:10:00' }]),
      ultima_evaluacion: { resultado: 'opcion_publicada', version: 1, en: mom('2026-10-29T12:00:00') },
      interesados: { cantidad: 2, miembros: [VALE, BETO] },
      historial: [CREADA, ABIERTA, V1, acepto(VALE, '2026-10-29T12:10:00', 1, 7)],
      siguiente_accion: { codigo: 'te_toca_aceptar', texto: 'Te toca confirmar la versión 1' },
      mi_situacion: { ...base(ANA, {}).mi_situacion, condiciones: 'completas', elegible_en_version: true, puede: { ...NADA, aceptar: true, retirarme: true, opinar: true } },
    }),
  },
  {
    id: 'esperando-org-confirmo-rearmar',
    titulo: 'Versión 1, organizadora que ya confirmó: 2 «así no puedo», ronda cerrada, faltan 3',
    yo: VALE,
    p: base(VALE, {
      estado: 'esperando_compromisos', estado_etiqueta: 'Esperando compromisos', state_rev: 9, confirmados: 1,
      opcion: opcion(1, FRANJA_A, [{ m: VALE, en: '2026-10-29T12:10:00' }], { pendientes: 3 }),
      ultima_evaluacion: { resultado: 'opcion_publicada', version: 1, en: mom('2026-10-29T12:00:00') },
      personas_con_condiciones: 4,
      opiniones_totales: { asi_no_puedo: 2 },
      ronda: { horas: 2, cierra: mom('2026-10-29T14:00:00'), abierta: false },
      interesados: { cantidad: 2, miembros: [VALE, BETO] },
      historial: [CREADA, ABIERTA, V1, acepto(VALE, '2026-10-29T12:10:00', 1, 7)],
      siguiente_accion: { codigo: 'ya_aceptaste', texto: 'Ya confirmaste la versión 1. Algunos no pueden así: puedes rearmar con lo nuevo.' },
      mi_situacion: { ...base(VALE, {}).mi_situacion, interesado: true, condiciones: 'completas', elegible_en_version: true, acepte_version: true, puede: { ...NADA, retirarme: true, proponer_reparacion: true, cancelar: true } },
    }),
  },
  {
    id: 'esperando-v2-reparada-no-elegible',
    titulo: 'Versión 2 tras un rearme, invitado que quedó fuera de esta versión',
    yo: DIEGO,
    p: base(DIEGO, {
      estado: 'esperando_compromisos', estado_etiqueta: 'Esperando compromisos', state_rev: 12, confirmados: 0,
      opcion: opcion(2, FRANJA_B, []),
      opcion_anterior: { version: 1, franja_clave: 'A', inicio: FRANJA_A.inicio, fin: FRANJA_A.fin },
      ultima_evaluacion: { resultado: 'reparacion_publicada', version: 2, en: mom('2026-10-29T17:30:00') },
      bajas: [BAJA_ANONIMA],
      historial: [
        CREADA, ABIERTA, V1, acepto(VALE, '2026-10-29T12:10:00', 1, 7), acepto(ANA, '2026-10-29T13:00:00', 1, 8),
        evento('baja', '2026-10-29T17:00:00', { version_previa: 1, state_rev: 10 }),
        evento('reparacion_publicada', '2026-10-29T17:30:00', { estado_previo: 'esperando_compromisos', estado_nuevo: 'esperando_compromisos', version_previa: 1, version_nueva: 2, state_rev: 12 }),
      ],
      siguiente_accion: { codigo: 'aceptar_version', texto: 'Esperando las confirmaciones de la versión 2.' },
      mi_situacion: { ...base(DIEGO, {}).mi_situacion, condiciones: 'completas', elegible_en_version: false, puede: { ...NADA, guardar_condiciones: true, retirarme: true } },
    }),
  },
  {
    id: 'confirmado-invitada',
    titulo: 'Grupo confirmado en la versión 1, invitada que confirmó (5, mínimo 4)',
    yo: ANA,
    p: base(ANA, {
      estado: 'grupo_confirmado', estado_etiqueta: 'Grupo confirmado', state_rev: 14, confirmados: 5,
      opcion: opcion(1, FRANJA_A, [
        { m: VALE, en: '2026-10-29T12:10:00' }, { m: ANA, en: '2026-10-29T13:00:00' }, { m: BETO, en: '2026-10-29T13:20:00' },
        { m: CONI, en: '2026-10-29T15:00:00' }, { m: DIEGO, en: '2026-10-29T16:00:00' },
      ]),
      ultima_evaluacion: { resultado: 'opcion_publicada', version: 1, en: mom('2026-10-29T12:00:00') },
      interesados: { cantidad: 2, miembros: [VALE, BETO] },
      historial: [CREADA, ABIERTA, V1, acepto(VALE, '2026-10-29T12:10:00', 1, 7), acepto(ANA, '2026-10-29T13:00:00', 1, 8), acepto(BETO, '2026-10-29T13:20:00', 1, 9), acepto(CONI, '2026-10-29T15:00:00', 1, 10), acepto(DIEGO, '2026-10-29T16:00:00', 1, 11)],
      siguiente_accion: { codigo: 'grupo_confirmado', texto: 'Grupo confirmado en la versión 1. ¡Se juntan!' },
      mi_situacion: { ...base(ANA, {}).mi_situacion, condiciones: 'completas', elegible_en_version: true, acepte_version: true, puede: { ...NADA, retirarme: true } },
    }),
  },
  {
    id: 'revision-org',
    titulo: 'En revisión tras una baja, organizadora: le toca buscar alternativa',
    yo: VALE,
    p: base(VALE, {
      estado: 'en_revision', estado_etiqueta: 'En revisión', state_rev: 15, confirmados: 3,
      opcion: opcion(1, FRANJA_A, [{ m: VALE, en: '2026-10-29T12:10:00' }, { m: ANA, en: '2026-10-29T13:00:00' }, { m: BETO, en: '2026-10-29T13:20:00' }], { pendientes: 2 }),
      ultima_evaluacion: { resultado: 'opcion_publicada', version: 1, en: mom('2026-10-29T12:00:00') },
      personas_con_condiciones: 5,
      bajas: [BAJA_ANONIMA],
      historial: [CREADA, ABIERTA, V1, acepto(VALE, '2026-10-29T12:10:00', 1, 7), acepto(ANA, '2026-10-29T13:00:00', 1, 8), acepto(BETO, '2026-10-29T13:20:00', 1, 9), evento('baja', '2026-10-29T17:00:00', { estado_previo: 'grupo_confirmado', estado_nuevo: 'en_revision', version_previa: 1, state_rev: 15 })],
      siguiente_accion: { codigo: 'buscar_alternativa', texto: 'Una persona se retiró. Busca una alternativa.' },
      mi_situacion: { ...base(VALE, {}).mi_situacion, interesado: true, condiciones: 'completas', elegible_en_version: true, acepte_version: true, puede: { ...NADA, retirarme: true, proponer_reparacion: true, cancelar: true } },
    }),
  },
  {
    id: 'revision-sin-alternativa-invitado',
    titulo: 'En revisión sin alternativa, invitado que había confirmado',
    yo: BETO,
    p: base(BETO, {
      estado: 'en_revision', estado_etiqueta: 'En revisión', state_rev: 16, confirmados: 3,
      opcion: opcion(1, FRANJA_A, [{ m: VALE, en: '2026-10-29T12:10:00' }, { m: ANA, en: '2026-10-29T13:00:00' }, { m: BETO, en: '2026-10-29T13:20:00' }]),
      ultima_evaluacion: { resultado: 'sin_alternativa', version: 1, en: mom('2026-10-29T17:40:00') },
      bajas: [BAJA_ANONIMA],
      historial: [CREADA, ABIERTA, V1, acepto(VALE, '2026-10-29T12:10:00', 1, 7), acepto(ANA, '2026-10-29T13:00:00', 1, 8), acepto(BETO, '2026-10-29T13:20:00', 1, 9), evento('baja', '2026-10-29T17:00:00', { version_previa: 1, state_rev: 15 }), evento('reparacion_sin_alternativa', '2026-10-29T17:40:00', { state_rev: 16 })],
      siguiente_accion: { codigo: 'sin_alternativa', texto: 'Sin alternativa con las respuestas actuales. Si alguien actualiza cuándo puede, se puede volver a buscar.' },
      mi_situacion: { ...base(BETO, {}).mi_situacion, interesado: true, condiciones: 'completas', elegible_en_version: true, acepte_version: true, puede: { ...NADA, guardar_condiciones: true, retirarme: true } },
    }),
  },
  {
    id: 'esperando-retirada',
    titulo: 'Versión 1, invitada que se retiró',
    yo: EMA,
    p: base(EMA, {
      estado: 'esperando_compromisos', estado_etiqueta: 'Esperando compromisos', state_rev: 8, confirmados: 1,
      opcion: opcion(1, FRANJA_A, [{ m: VALE, en: '2026-10-29T12:10:00' }]),
      ultima_evaluacion: { resultado: 'opcion_publicada', version: 1, en: mom('2026-10-29T12:00:00') },
      bajas: [{ miembro: EMA, en: mom('2026-10-29T14:00:00'), version: 1, habia_aceptado: false }],
      historial: [CREADA, ABIERTA, V1, acepto(VALE, '2026-10-29T12:10:00', 1, 7), evento('baja', '2026-10-29T14:00:00', { actor: EMA, actor_tipo: 'persona', version_previa: 1, state_rev: 8 })],
      siguiente_accion: { codigo: 'aceptar_version', texto: 'Gracias por avisar. No hace falta contar por qué.' },
      mi_situacion: { ...base(EMA, {}).mi_situacion, condiciones: 'completas', retirado: true, elegible_en_version: false, puede: { ...NADA } },
    }),
  },
  {
    id: 'cancelado',
    titulo: 'Cancelada, invitada',
    yo: CONI,
    p: base(CONI, {
      estado: 'cancelado', estado_etiqueta: 'Cancelado', state_rev: 9,
      historial: [CREADA, ABIERTA, evento('propuesta_cancelada', '2026-10-29T18:00:00', { actor: VALE, actor_tipo: 'persona', estado_previo: 'reuniendo_interes', estado_nuevo: 'cancelado', state_rev: 9 })],
      siguiente_accion: { codigo: 'cancelado', texto: 'Vale canceló la propuesta. No se puede reabrir.' },
      mi_situacion: { ...base(CONI, {}).mi_situacion, condiciones: 'completas', puede: { ...NADA } },
    }),
  },
]
