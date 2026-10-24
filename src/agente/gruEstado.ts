import { useSyncExternalStore } from 'react'

export type GruEstado = 'disponible' | 'buscando' | 'listo' | 'sin-opcion' | 'error'
export interface ActividadGru {
  estado: GruEstado
  espacioId: string | null
}

const inicial: ActividadGru = { estado: 'disponible', espacioId: null }
const actividades = new Map<string, ActividadGru>()
const oyentes = new Set<() => void>()
let ultima = inicial

/** Solo actividad visual en memoria: no guarda preferencias, personas ni confirmaciones. */
export function actualizarEstadoGru(espacioId: string, estado: GruEstado) {
  const anterior = actividades.get(espacioId)
  if (anterior?.estado === estado && ultima === anterior) return
  const actividad: ActividadGru = { espacioId, estado }
  actividades.set(espacioId, actividad)
  ultima = actividad
  oyentes.forEach((avisar) => avisar())
}

function suscribir(avisar: () => void) {
  oyentes.add(avisar)
  return () => { oyentes.delete(avisar) }
}

export function useEstadoGru(espacioId?: string | null): ActividadGru {
  return useSyncExternalStore(suscribir, () => espacioId ? actividades.get(espacioId) ?? inicial : ultima, () => inicial)
}
