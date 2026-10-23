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
    return {
      clave: 'version_sin_ti',
      tono: 'info',
      titulo: 'Esta versión es sin ti',
      texto: 'Con lo que marcaste (o dejaste sin marcar), esta fecha no te queda. No tienes que hacer nada.',
      irARespuesta: false,
    }
  }
  return null
}
