// Mensajes de WhatsApp que el organizador manda al grupo (#89). Lógica pura, sin React ni navegador.
// Regla de privacidad: el mensaje va a TODO el grupo y nunca lleva nombres, conteos por persona ni condiciones.
// Por eso estas funciones no reciben nombres ni números de nadie: solo datos públicos del plan y el enlace.

export type MotivoAviso = 'faltan' | 'version_nueva' | 'reparacion'

export interface DatosAviso {
  motivo: MotivoAviso
  /** Título público de la propuesta ("Pádel y algo después"). */
  titulo: string
  /** Franja vigente ya formateada por la pantalla ("sábado 31 oct, 20:00"). Solo para versión nueva o reparación. */
  cuando?: string | null
  /** Enlace de invitación del grupo (`enlaceInvitacion(codigo)`): sirve también a quien ya entró. */
  enlace: string
}

const MAX_TITULO = 60

function limpio(t: string): string {
  const s = t.replace(/\s+/g, ' ').trim()
  return s.length > MAX_TITULO ? `${s.slice(0, MAX_TITULO - 1)}…` : s
}

/** Texto listo para pegar en el grupo. */
export function textoAviso({ motivo, titulo, cuando, enlace }: DatosAviso): string {
  const plan = `«${limpio(titulo) || 'el plan'}»`
  const fecha = cuando ? limpio(cuando) : ''
  switch (motivo) {
    case 'faltan':
      return `Faltan respuestas para ${plan}. Toca, elige tu nombre y marca cuándo puedes (es privado): ${enlace}`
    case 'version_nueva':
      return fecha
        ? `Hay opción para ${plan}: ${fecha}. Si vas, toca y confírmala: ${enlace}`
        : `Hay opción para ${plan}. Si vas, toca y confírmala: ${enlace}`
    case 'reparacion':
      return fecha
        ? `Cambió ${plan}: ahora ${fecha}. Las confirmaciones anteriores no cuentan; si vas, toca y confirma de nuevo: ${enlace}`
        : `Cambió ${plan}. Las confirmaciones anteriores no cuentan; si vas, toca y confirma de nuevo: ${enlace}`
  }
}

/** Mismo formato que `urlWhatsApp` de `src/lib/compartir.ts`: la persona elige a quién mandarlo. */
export function urlAviso(datos: DatosAviso): string {
  return `https://wa.me/?text=${encodeURIComponent(textoAviso(datos))}`
}

/** Rótulo del botón según el motivo. */
export function rotuloAviso(motivo: MotivoAviso): string {
  return motivo === 'faltan' ? 'Recordar a quien falta' : 'Avisar al grupo'
}
