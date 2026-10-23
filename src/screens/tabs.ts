import type { PropuestaViva } from '../lib/hooks'
import type { EstadoPropuesta } from '../lib/types'

export type Pestana = 'plan' | 'respuesta' | 'historial' | 'simulacion'

export interface PestanaProps {
  p: EstadoPropuesta
  viva: PropuestaViva
  soloLectura: boolean
  irAPestana: (t: Pestana) => void
}
