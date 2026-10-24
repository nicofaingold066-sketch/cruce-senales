import type { EstadoPropuesta, MiembroEspacio, MiembroRef } from '../lib/types'

/** Proyección mínima para dibujar participación pública; nunca conserva el objeto recibido. */
export interface PersonaPublica {
  miembro_id: string
  nombre: string
  simulado: boolean
  es_yo: boolean
}

type GrupoPublico = { miembros: readonly MiembroEspacio[] }
type PlanPublico = Pick<EstadoPropuesta, 'estado'> & {
  opcion: { version: number; aceptaron: readonly { miembro: MiembroRef }[] } | null
  interesados: { miembros: readonly MiembroRef[] }
}

export interface IntegrantesPublicos {
  entraron: PersonaPublica[]
  simulados: PersonaPublica[]
  porEntrar: PersonaPublica[]
}

export type ParticipacionPublica =
  | { tipo: 'version'; version: number; enRevision: boolean; confirmados: PersonaPublica[];
      sinConfirmar: PersonaPublica[] | null; porEntrar: PersonaPublica[] }
  | { tipo: 'interes'; interesados: PersonaPublica[]; porEntrar: PersonaPublica[] }

function persona(m: MiembroRef, esYo = false): PersonaPublica {
  return { miembro_id: m.miembro_id, nombre: m.nombre, simulado: m.simulado, es_yo: esYo }
}

function sinDuplicados(personas: PersonaPublica[]): PersonaPublica[] {
  const ids = new Set<string>()
  return personas.filter(m => {
    if (ids.has(m.miembro_id)) return false
    ids.add(m.miembro_id)
    return true
  })
}

/** Estar en el grupo y ser una simulación son datos distintos de aceptar un plan. */
export function integrantesPublicos(espacio: GrupoPublico): IntegrantesPublicos {
  const actuales = sinDuplicados(espacio.miembros.map(m => persona(m, m.es_yo)))
  const pendientes = new Set(espacio.miembros.filter(m => m.pendiente).map(m => m.miembro_id))
  return {
    entraron: actuales.filter(m => !pendientes.has(m.miembro_id) && !m.simulado),
    simulados: actuales.filter(m => !pendientes.has(m.miembro_id) && m.simulado),
    porEntrar: actuales.filter(m => pendientes.has(m.miembro_id)),
  }
}

/**
 * Solo la aceptación explícita de la opción actual es una confirmación. El complemento de miembros
 * no afirma disponibilidad, respuesta ni asistencia. Sin el espacio, ese complemento es desconocido.
 */
export function participacionDe(p: PlanPublico, espacio: GrupoPublico | null): ParticipacionPublica | null {
  if (p.estado === 'cancelado' || p.estado === 'expirado') return null
  const grupo = espacio ? integrantesPublicos(espacio) : null
  const yo = new Set(espacio?.miembros.filter(m => m.es_yo).map(m => m.miembro_id) ?? [])
  if (!p.opcion) {
    return {
      tipo: 'interes',
      interesados: sinDuplicados(p.interesados.miembros.map(m => persona(m, yo.has(m.miembro_id)))),
      porEntrar: grupo?.porEntrar ?? [],
    }
  }
  const confirmados = sinDuplicados(p.opcion.aceptaron.map(a => persona(a.miembro, yo.has(a.miembro.miembro_id))))
  const aceptaron = new Set(confirmados.map(m => m.miembro_id))
  // Mantener el orden del espacio, incluso cuando se mezclan personas reales y simuladas.
  const sinConfirmar = espacio
    ? sinDuplicados(espacio.miembros.filter(m => !m.pendiente && !aceptaron.has(m.miembro_id))
      .map(m => persona(m, m.es_yo)))
    : null
  return {
    tipo: 'version', version: p.opcion.version, enRevision: p.estado === 'en_revision', confirmados,
    sinConfirmar,
    porEntrar: grupo?.porEntrar.filter(m => !aceptaron.has(m.miembro_id)) ?? [],
  }
}
