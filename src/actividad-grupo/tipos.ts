import type { Momento } from '../lib/types'

/** Movimientos públicos del grupo. Nunca contiene motivos ni condiciones personales. */
export interface EventoActividadGrupo {
  id: string
  tipo: 'miembro_unido' | 'miembro_salio' | 'baja_plan'
  miembro: {
    miembro_id: string | null
    nombre: string
    simulado: boolean
  }
  en: Momento
  plan: { id: string; titulo: string } | null
}
