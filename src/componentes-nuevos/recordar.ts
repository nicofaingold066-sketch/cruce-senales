// Mensajes de WhatsApp que el organizador manda al grupo (#89). Lógica pura, sin React ni navegador.
// Regla de privacidad: el mensaje va a TODO el grupo y nunca lleva nombres, conteos por persona ni condiciones.
// Por eso estas funciones no reciben nombres ni números de nadie: solo datos públicos del plan y el enlace
// (y, en 'confirmado', los cupos libres, que el grupo ya ve).

export type MotivoAviso = 'faltan' | 'version_nueva' | 'reparacion' | 'confirmado'

export interface DatosAviso {
  motivo: MotivoAviso
  /** Título público de la propuesta ("Pádel y algo después"). */
  titulo: string
  /** Franja vigente ya formateada por la pantalla ("sábado 31 oct, 20:00"). Solo para versión nueva o reparación. */
  cuando?: string | null
  /** Enlace de invitación del grupo (`enlaceInvitacion(codigo)`): sirve también a quien ya entró. */
  enlace: string
  /** Solo para 'confirmado': cupos que quedan (público: la lista de quién confirmó ya es del grupo). */
  cuposLibres?: number | null
}

const MAX_TITULO = 60

function limpio(t: string): string {
  const s = t.replace(/\s+/g, ' ').trim()
  return s.length > MAX_TITULO ? `${s.slice(0, MAX_TITULO - 1)}…` : s
}

/** Texto listo para pegar en el grupo. */
export function textoAviso({ motivo, titulo, cuando, enlace, cuposLibres }: DatosAviso): string {
  const plan = `«${limpio(titulo) || 'el plan'}»`
  const fecha = cuando ? limpio(cuando) : ''
  switch (motivo) {
    case 'faltan':
      return `Te lo recuerda CRUXE: para ${plan}, si todavía no respondiste, sin apuro: toca, elige tu nombre y marca cuándo puedes (es privado). Si ya respondiste, no hace falta nada: ${enlace}`
    case 'version_nueva':
      // #100: decir qué hacer si NO puede (no confirmar), para que el "no" no vuelva al chat ni al silencio ambiguo.
      return `Hay opción para ${plan}${fecha ? `: ${fecha}` : ''}. Si vas, toca y confírmala; si no puedes, no confirmes: el plan sale solo con quienes confirman. ${enlace}`
    case 'reparacion':
      // psico §8.1 y §8.4: qué cambió, nunca quién ni por qué.
      return `Hay una versión nueva de ${plan}${fecha ? `: ahora ${fecha}` : ''}. Las confirmaciones anteriores no cuentan; si te sirve, confirma de nuevo: ${enlace}`
    case 'confirmado': {
      // #100: el cierre lleva el enlace (el mensaje de hoy no lo trae) para que quien no confirmó pueda sumarse.
      const quedan = typeof cuposLibres === 'number' && cuposLibres > 0
        ? cuposLibres === 1 ? ' Queda 1 cupo.' : ` Quedan ${cuposLibres} cupos.`
        : ''
      return `Se juntan: ${plan}${fecha ? `, ${fecha}` : ''}.${quedan} Si vas y no confirmaste, toca y confirma: ${enlace}`
    }
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
