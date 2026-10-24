// "Buscar el lugar en el mapa" (psico §12 U1-U2, D10 aprobada por Nico 21:06). Lógica pura, sin React.
// Solo usa el título del plan: sin clave, sin ubicación, sin personas. CRUXE no sabe desde dónde sale nadie.

/** Enlace de búsqueda de Google Maps con el título del plan. */
export function urlLugar(titulo: string): string {
  return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(titulo.trim())
}

/** En el espacio demo los lugares son de simulación: no se ofrece el mapa. Sin título, tampoco. */
export function mostrarBuscarLugar(demo: boolean, titulo: string): boolean {
  return !demo && titulo.trim() !== ''
}

/** Duración para la línea fija de día y hora (U1): "(3 h)", "(90 min)"; vacío si no se puede calcular. */
export function duracionTexto(inicioUtc: string, finUtc: string): string {
  const min = Math.round((Date.parse(finUtc) - Date.parse(inicioUtc)) / 60000)
  if (!Number.isFinite(min) || min <= 0) return ''
  return min % 60 === 0 ? `(${min / 60} h)` : `(${min} min)`
}
