// Aviso personal arriba de la propuesta (ux-flujo, recorrido real #98). Lógica pura, sin React.
// Cubre dudas vistas en pantalla y los textos de psico (docs/psicologia-grupo.md §8.1, §8.6):
// - El organizador que no puede faltar busca opción antes de responder y recibe "Sin opción compatible".
// - Quien no es elegible en la versión ve "Grupo confirmado" y "4 se juntan" sin enterarse de que es sin él/ella.
// - Quien se baja: "Gracias por avisar. No hace falta contar por qué." (lo que daña es mentir sobre el motivo, F1).
// - Plan en revisión: sin nombre ni motivo de quien se bajó; al organizador, dos salidas y ninguna culpa.
// - Grupo confirmado: al organizador, "Gracias por moverlo" (quien organiza concentra el trabajo, F3).
// Solo mira datos de quien consulta (mi_situacion), el imprescindible y los cupos públicos: nunca de otra persona.
import type { EstadoPropuesta } from '../lib/types'

export type DatosAvisoParaMi = Pick<EstadoPropuesta, 'estado' | 'imprescindible' | 'mi_situacion'> &
  Partial<Pick<EstadoPropuesta, 'opcion'>>

export interface AvisoParaMi {
  clave: 'primero_tu_disponibilidad' | 'version_sin_ti' | 'te_retiraste' | 'cambio_el_plan' | 'gracias_por_moverlo'
  tono: 'info' | 'aviso' | 'ok'
  titulo: string
  texto: string
  /** true: ofrecer el botón "Ir a Mi respuesta". */
  irARespuesta: boolean
}

export function avisoParaMi({ estado, imprescindible, mi_situacion: yo, opcion }: DatosAvisoParaMi): AvisoParaMi | null {
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
          texto: `${cuantos} Puedes buscar otra fecha o ver otra forma de juntarse.`.trim(),
          irARespuesta: false,
        }
      : {
          clave: 'cambio_el_plan',
          tono: 'info',
          titulo: 'Cambió el plan',
          texto: `${cuantos} Si sale una versión nueva, las confirmaciones anteriores no cuentan: confírmala de nuevo si te sirve.`.trim(),
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
