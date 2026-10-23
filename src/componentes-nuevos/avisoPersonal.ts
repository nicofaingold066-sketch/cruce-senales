// Aviso personal arriba de la propuesta (ux-flujo, recorrido real #98). Lógica pura, sin React.
// Cubre dos dudas vistas en pantalla:
// - El organizador que no puede faltar busca opción antes de responder y recibe "Sin opción compatible".
// - Quien no es elegible en la versión ve "Grupo confirmado" y "4 se juntan" sin enterarse de que es sin él/ella.
// Solo mira datos de quien consulta (mi_situacion) y el imprescindible público: nunca revela nada de otra persona.
import type { EstadoPropuesta } from '../lib/types'

export type DatosAvisoParaMi = Pick<EstadoPropuesta, 'estado' | 'imprescindible' | 'mi_situacion'>

export interface AvisoParaMi {
  clave: 'primero_tu_disponibilidad' | 'version_sin_ti'
  tono: 'info' | 'aviso'
  titulo: string
  texto: string
  /** true: ofrecer el botón "Ir a Mi respuesta". */
  irARespuesta: boolean
}

export function avisoParaMi({ estado, imprescindible, mi_situacion: yo }: DatosAvisoParaMi): AvisoParaMi | null {
  if (yo.retirado) return null
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
  return null
}
