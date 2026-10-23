// Aviso personal arriba de la propuesta (ux-flujo, recorrido real #98). Lógica pura, sin React.
// Cubre dudas vistas en pantalla y los textos de psico (docs/psicologia-grupo.md §8.1, §8.6):
// - El organizador que no puede faltar busca opción antes de responder y recibe "Sin opción compatible".
// - Quien no es elegible en la versión ve "Grupo confirmado" y "4 se juntan" sin enterarse de que es sin él/ella.
// - Quien se baja: "Gracias por avisar. No hace falta contar por qué." (lo que daña es mentir sobre el motivo, F1).
// - Plan en revisión: sin nombre ni motivo de quien se bajó; al organizador, dos salidas y ninguna culpa.
// - Grupo confirmado: al organizador, "Gracias por moverlo" (quien organiza concentra el trabajo, F3).
// - Quien puede confirmar: "Tu confirmación solo vale si llegan N; si no, nadie queda comprometido" (psico §8.9,
//   causa 5: nadie quiere ir primero; el mínimo ya funciona como contrato de aseguramiento, hay que decirlo).
// - Organizador, cerca del cierre: "Hoy conviene recordar…" (psico §8.9). No envía nada: lo envía una persona.
// - Enmienda 13: quien marcó "Así no puedo, pero sigo" ve que sigue en el plan; la baja se dice "Una persona se
//   retiró", sin nombre ni motivo (13 (c)). Ningún aviso nombra a nadie: ni a quien consulta ni a los demás.
// Solo mira datos de quien consulta (mi_situacion), el imprescindible y los cupos públicos: nunca de otra persona.
import type { EstadoPropuesta } from '../lib/types'

/** `mi_opinion` llega con la enmienda 13 (a); opcional para que funcione con o sin ella. */
export type MiSituacionE13 = EstadoPropuesta['mi_situacion'] & { mi_opinion?: 'asi_no_puedo' | null }

export type DatosAvisoParaMi = Pick<EstadoPropuesta, 'estado' | 'imprescindible'> & { mi_situacion: MiSituacionE13 } &
  Partial<Pick<EstadoPropuesta, 'opcion' | 'minimo'>>

/** Lo que la pantalla ya sabe y formatea: el cierre en texto y cuántas horas faltan según la hora del servidor. */
export interface ContextoAviso {
  /** Cierre de aceptación ya formateado ("vie 30 oct, 20:00"). */
  plazoTexto?: string | null
  /** Horas que faltan para el cierre, calculadas con `servidor_ahora` (no con el reloj del teléfono). */
  horasAlCierre?: number | null
}

export interface AvisoParaMi {
  clave:
    | 'primero_tu_disponibilidad'
    | 'version_sin_ti'
    | 'te_retiraste'
    | 'cambio_el_plan'
    | 'gracias_por_moverlo'
    | 'solo_vale_si_llegan'
    | 'hoy_conviene_recordar'
    | 'marcaste_asi_no_puedo'
  tono: 'info' | 'aviso' | 'ok'
  titulo: string
  texto: string
  /** true: ofrecer el botón "Ir a Mi respuesta". */
  irARespuesta: boolean
}

export function avisoParaMi(
  { estado, imprescindible, mi_situacion: yo, opcion, minimo }: DatosAvisoParaMi,
  { plazoTexto, horasAlCierre }: ContextoAviso = {},
): AvisoParaMi | null {
  if (yo.retirado) {
    return {
      clave: 'te_retiraste',
      tono: 'info',
      titulo: 'Gracias por avisar',
      texto: 'No hace falta contar por qué. Ya no participas en este plan.',
      irARespuesta: false,
    }
  }
  if (estado === 'en_revision') {
    const faltan = opcion?.cupos.faltan_para_minimo ?? 0
    const cuantos = faltan === 1 ? 'Falta 1 para el mínimo.' : faltan > 1 ? `Faltan ${faltan} para el mínimo.` : ''
    return yo.es_organizador
      ? {
          clave: 'cambio_el_plan',
          tono: 'aviso',
          titulo: 'Cambió el plan',
          texto: `Una persona se retiró. ${cuantos} Puedes buscar otra fecha o ver otra forma de juntarse.`.replace(/\s+/g, ' ').trim(),
          irARespuesta: false,
        }
      : {
          clave: 'cambio_el_plan',
          tono: 'info',
          titulo: 'Cambió el plan',
          texto: `Una persona se retiró. ${cuantos} Si sale una versión nueva, las confirmaciones anteriores no cuentan: confírmala de nuevo si te sirve.`.replace(/\s+/g, ' ').trim(),
          irARespuesta: false,
        }
  }
  if (estado === 'reuniendo_interes' && imprescindible.miembro_id === yo.miembro_id && yo.condiciones !== 'completas') {
    return {
      clave: 'primero_tu_disponibilidad',
      tono: 'aviso',
      titulo: 'Primero marca tu disponibilidad',
      texto: 'Eres quien no puede faltar: sin tu respuesta no hay opción posible.',
      irARespuesta: true,
    }
  }
  if ((estado === 'esperando_compromisos' || estado === 'grupo_confirmado') && yo.elegible_en_version === false) {
    // Los elegibles se fijan al publicar la versión (0002_utilidades.sql:262; accept_version los revisa en
    // 0005_api_motor.sql:135): completar ahora no te suma a ESTA versión, solo cuenta si el plan se rearma.
    const incompleta = yo.condiciones !== 'completas'
    return {
      clave: 'version_sin_ti',
      tono: 'info',
      titulo: 'Esta versión es sin ti',
      texto: incompleta
        ? 'Tu disponibilidad quedó incompleta, así que no entraste en esta versión. Si la completas, cuenta si el plan se rearma.'
        : 'Con lo que marcaste, esta fecha no te queda. No tienes que hacer nada.',
      irARespuesta: incompleta && yo.puede.guardar_condiciones === true,
    }
  }
  if (estado === 'esperando_compromisos' && yo.es_organizador) {
    // `cupos.pendientes` solo llega al organizador (E7.2); sin él, o lejos del cierre, no se dice nada.
    const pendientes = opcion?.cupos.pendientes ?? null
    if (pendientes && pendientes > 0 && typeof horasAlCierre === 'number' && horasAlCierre > 0 && horasAlCierre <= 36) {
      return {
        clave: 'hoy_conviene_recordar',
        tono: 'info',
        titulo: 'Hoy conviene recordar',
        texto: `Faltan ${pendientes} por confirmar${plazoTexto ? ` y se cierra ${plazoTexto}` : ''}. CRUXE no manda avisos solo: el recordatorio lo mandas tú.`,
        irARespuesta: false,
      }
    }
  }
  if (estado === 'esperando_compromisos' && yo.mi_opinion === 'asi_no_puedo' && !yo.acepte_version) {
    return {
      clave: 'marcaste_asi_no_puedo',
      tono: 'info',
      titulo: 'Marcaste que así no puedes',
      texto:
        'Sigues en el plan. Actualiza tu disponibilidad: si el plan se rearma, cuenta lo que marques ahora. Si al final puedes, confirma esta versión.',
      irARespuesta: yo.puede.guardar_condiciones === true,
    }
  }
  if (estado === 'esperando_compromisos' && yo.elegible_en_version === true && !yo.acepte_version && typeof minimo === 'number') {
    return {
      clave: 'solo_vale_si_llegan',
      tono: 'info',
      titulo: `Si no llegan ${minimo}, nadie queda comprometido`,
      texto: `Tu confirmación solo vale si llegan ${minimo}.${plazoTexto ? ` Se cierra ${plazoTexto}; si para entonces no están, el plan no se arma y no pasa nada.` : ''}`,
      irARespuesta: false,
    }
  }
  if (estado === 'grupo_confirmado' && yo.es_organizador) {
    return {
      clave: 'gracias_por_moverlo',
      tono: 'ok',
      titulo: 'Se armó la juntada',
      texto: 'Gracias por moverlo.',
      irARespuesta: false,
    }
  }
  return null
}
