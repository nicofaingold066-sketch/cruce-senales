import type { PropuestaViva } from '../lib/hooks'
import type { Espacio, EstadoPropuesta } from '../lib/types'

export type Pestana = 'plan' | 'respuesta' | 'historial' | 'simulacion'

export interface PestanaProps {
  p: EstadoPropuesta
  viva: PropuestaViva
  soloLectura: boolean
  irAPestana: (t: Pestana) => void
  /** El espacio de la propuesta (código de invitación y si es demo); null mientras carga. */
  espacio?: Espacio | null
}
