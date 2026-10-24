// "Posibles canchas" para una opción de deporte (pedido de Nico, 23 oct). Solo enlaces: sin clave, sin costo y sin
// mandar datos de nadie.
// - Google Maps (Maps URLs, no piden clave): una búsqueda por categoría sin ubicación muestra lo que está cerca de quien
//   toca el enlace. CRUXE no conoce ni envía la ubicación de nadie.
// - EasyCancha (Santiago): su buscador para Chile; no acepta deporte ni comuna en el enlace.
// - ATC Sports se sacó (auditoría M5): el enlace apuntaba a Mendoza (Argentina) y la app es de Santiago.
// Nunca dice "disponible": la disponibilidad se ve en cada sitio y CRUXE no reserva.
import type { FranjaBorrador } from './api'

const DEPORTES: Record<string, { busqueda: string }> = {
  padel: { busqueda: 'canchas de pádel' },
  futbol: { busqueda: 'canchas de fútbol' },
  tenis: { busqueda: 'canchas de tenis' },
}

export interface EnlaceCancha {
  clave: 'maps' | 'easycancha'
  texto: string
  url: string
}

// `franja` queda en la firma por compatibilidad: ningún sitio de Santiago acepta día y hora en el enlace.
export function enlacesCanchas(actividad: string | undefined, _franja?: FranjaBorrador): EnlaceCancha[] {
  const d = actividad ? DEPORTES[actividad] : undefined
  if (!d) return []
  const enlaces: EnlaceCancha[] = [
    {
      clave: 'maps',
      texto: `${d.busqueda[0].toLocaleUpperCase('es')}${d.busqueda.slice(1)} cerca de ti (Google Maps)`,
      url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(d.busqueda)}`,
    },
    {
      clave: 'easycancha',
      texto: 'Buscar y reservar en EasyCancha (Santiago)',
      url: 'https://www.easycancha.com/book/search?lang=es-CL&country=CL',
    },
  ]
  return enlaces
}
