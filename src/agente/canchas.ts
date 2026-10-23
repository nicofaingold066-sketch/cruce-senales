// "Posibles canchas" para una opción de deporte (pedido de Nico, 23 oct). Solo enlaces: sin clave, sin costo y sin
// mandar datos de nadie.
// - Google Maps (Maps URLs, no piden clave): una búsqueda por categoría sin ubicación muestra lo que está cerca de quien
//   toca el enlace. CRUXE no conoce ni envía la ubicación de nadie.
// - EasyCancha (Santiago): su buscador para Chile; no acepta deporte ni comuna en el enlace.
// - ATC Sports (Mendoza): resultados con deporte, día y hora. Los parámetros no están documentados (probados el 23 oct).
// Nunca dice "disponible": la disponibilidad se ve en cada sitio y CRUXE no reserva.
import type { FranjaBorrador } from './api'

const DEPORTES: Record<string, { busqueda: string; atc: number }> = {
  padel: { busqueda: 'canchas de pádel', atc: 7 },
  futbol: { busqueda: 'canchas de fútbol', atc: 2 },
  tenis: { busqueda: 'canchas de tenis', atc: 8 },
}
// Identificador (geohash) que usa ATC para Mendoza.
const ATC_MENDOZA = '66phckevp'

export interface EnlaceCancha {
  clave: 'maps' | 'easycancha' | 'atc'
  texto: string
  url: string
}

export function enlacesCanchas(actividad: string | undefined, franja?: FranjaBorrador): EnlaceCancha[] {
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
  // Mismo formato que se probó a mano (la hora va con ":" sin codificar).
  const [dia, hora] = (franja?.inicio ?? '').split('T')
  const cuando = /^\d{4}-\d{2}-\d{2}$/.test(dia ?? '') && /^\d{2}:\d{2}$/.test(hora ?? '') ? `&dia=${dia}&horario=${hora}` : ''
  enlaces.push({
    clave: 'atc',
    texto: 'Ver turnos en ATC (Mendoza)',
    url: `https://atcsports.io/results?tipoDeporte=${d.atc}${cuando}&placeId=${ATC_MENDOZA}&locationName=Mendoza`,
  })
  return enlaces
}
