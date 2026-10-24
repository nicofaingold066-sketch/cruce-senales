// Datos públicos de la escenificación. No contiene preferencias privadas ni respuestas de los personajes.
export const DEMO_MAKANA = {
  clave: 'makana',
  nombre: 'El plan que no deja a nadie afuera',
  personas: ['Bastián', 'Nacho', 'Carlos', 'Kai', 'Charlie', 'Joaco', 'Pía'],
  detalle: 'Serás Bastián, quien organiza; los otros seis amigos son ficticios y simulados. Participar es voluntario.',
  // Lugar ficticio, sin compras ni datos de personas reales. El parque requiere al menos dos personas.
  propuesta: {
    titulo: 'Parque del Encuentro (ficticio) · acceso norte · encuentro gratuito',
    aDia: '2026-10-31',
    aHora: '16:00',
    bDia: '2026-11-01',
    bHora: '16:00',
    duracion: 120,
    minimo: '2',
    maximo: '7',
    actividad: 'parque',
  },
} as const

/** El servidor identifica el fixture; nunca lo inferimos por el nombre del grupo o de sus integrantes. */
export function esDemoMakana(espacio?: { demo_caso?: string | null } | null): boolean {
  return espacio?.demo_caso === DEMO_MAKANA.clave
}
