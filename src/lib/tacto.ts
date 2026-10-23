// Respuesta háptica breve en acciones importantes (solo donde el teléfono la soporta, por ejemplo Android).
// No vibra con movimiento reducido. Nunca bloquea ni falla.
export function vibrar(patron: number | number[] = 10) {
  try {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    navigator.vibrate?.(patron)
  } catch {
    // Sin vibración disponible: no pasa nada.
  }
}
