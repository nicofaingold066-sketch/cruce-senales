// "Buscar el lugar en el mapa" (psico §12 U1-U2, D10 aprobada por Nico 21:06). Lógica pura, sin React.
// Solo usa el título del plan: sin clave, sin ubicación, sin personas. CRUXE no sabe desde dónde sale nadie.
// Se saca la marca de modalidad del título ("· solo el grupo", "· con parejas"): es una regla del grupo (psico D2/D3,
// sinteticos 22:25) y no tiene por qué viajar a un servicio externo.
// La expresión es la misma que `RE_MARCA` de `src/lib/compartir.ts` (friccion); se copia acá para que esta lógica siga
// siendo pura y probable con Node (la prueba `lugarMapa.test.mjs` compara los dos textos para que no se desalineen).
export const RE_MARCA_MODALIDAD = /\s·\s(solo el grupo|con parejas|abierta)\s*$/i
const sinMarca = (t: string) => t.replace(RE_MARCA_MODALIDAD, '').trim()

/** Enlace de búsqueda de Google Maps con el título del plan. */
export function urlLugar(titulo: string): string {
  return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(sinMarca(titulo))
}

/** En el espacio demo los lugares son de simulación: no se ofrece el mapa. Sin título, tampoco. */
export function mostrarBuscarLugar(demo: boolean, titulo: string): boolean {
  return !demo && sinMarca(titulo) !== ''
}

/** Duración para la línea fija de día y hora (U1): "(3 h)", "(90 min)"; vacío si no se puede calcular. */
export function duracionTexto(inicioUtc: string, finUtc: string): string {
  const min = Math.round((Date.parse(finUtc) - Date.parse(inicioUtc)) / 60000)
  if (!Number.isFinite(min) || min <= 0) return ''
  return min % 60 === 0 ? `(${min / 60} h)` : `(${min} min)`
}
