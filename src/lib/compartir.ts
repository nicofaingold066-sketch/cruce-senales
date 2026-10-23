// Compartir fuera de CRUXE: enlace de invitación, WhatsApp y archivo de calendario (.ics).
// Todo se arma en el teléfono con datos públicos del plan; nunca lleva condiciones de nadie.
import { rutas } from './shell'

export function enlaceInvitacion(codigo: string): string {
  return `${window.location.origin}${window.location.pathname}${rutas.unirse(codigo)}`
}

/** Quién puede venir a un plan (psico §3.3 y §8.5). Es una regla del grupo, nunca un dato de una persona. */
export type QuienViene = 'grupo' | 'parejas' | 'abierta'
export const FRASE_QUIEN_VIENE: Record<QuienViene, string> = {
  grupo: 'Esta vez es solo el grupo.',
  parejas: 'Pueden venir con pareja.',
  abierta: 'Cada uno puede traer a alguien. Cuenta para los cupos.',
}

export function textoInvitacion(espacio: string, codigo: string, quienViene?: QuienViene): string {
  // Fricción: decir de entrada que no hay cuenta y qué hacer. "Me interesa" lo ve el grupo: no se promete que todo es privado.
  const regla = quienViene ? ` ${FRASE_QUIEN_VIENE[quienViene]}` : ''
  return `Súmate a «${espacio}» en CRUXE: toca el enlace, elige tu nombre y marca cuándo puedes.${regla} Sin cuenta ni contraseña; tus condiciones solo las ve la app: ${enlaceInvitacion(codigo)}`
}

/** Enlace universal de WhatsApp con el texto ya escrito; la persona elige a quién mandarlo. */
export function urlWhatsApp(texto: string): string {
  return `https://wa.me/?text=${encodeURIComponent(texto)}`
}

/** "2026-10-31T17:00:00Z" → "20261031T170000Z" (formato de iCalendar, en UTC). */
function fechaIcs(utc: string): string | null {
  const d = new Date(utc)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

function escaparIcs(t: string): string {
  return t
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/[\r\n]+/g, '\\n')
    .replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '')
}

/** RFC 5545 §3.1: líneas de hasta 75 octetos; las largas siguen en la línea siguiente, que empieza con un espacio. */
function plegarIcs(linea: string): string {
  const partes: string[] = []
  let actual = ''
  let bytes = 0
  for (const c of linea) {
    const n = new TextEncoder().encode(c).length
    if (bytes + n > (partes.length ? 74 : 75)) {
      partes.push(actual)
      actual = ''
      bytes = 0
    }
    actual += c
    bytes += n
  }
  partes.push(actual)
  return partes.join('\r\n ')
}

/** Descarga un .ics con la franja confirmada. Devuelve false si los datos no alcanzan para armarlo. */
export function descargarCalendario(ev: { id: string; titulo: string; inicioUtc: string; finUtc: string; descripcion: string }): boolean {
  const ini = fechaIcs(ev.inicioUtc)
  const fin = fechaIcs(ev.finUtc)
  const ahora = fechaIcs(new Date().toISOString())
  if (!ini || !fin || !ahora) return false
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CRUXE//Plan confirmado//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${ev.id}@cruxe`,
    `DTSTAMP:${ahora}`,
    `DTSTART:${ini}`,
    `DTEND:${fin}`,
    `SUMMARY:${escaparIcs(ev.titulo)}`,
    `DESCRIPTION:${escaparIcs(ev.descripcion)}`,
    // psico §12 U3/U4: dos recordatorios del propio calendario (la víspera y dos horas antes). CRUXE no manda avisos.
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'TRIGGER:-P1D',
    `DESCRIPTION:${escaparIcs(`Mañana: ${ev.titulo}. Calcula tu viaje con unos 15 minutos de margen.`)}`,
    'END:VALARM',
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'TRIGGER:-PT2H',
    `DESCRIPTION:${escaparIcs(`En dos horas: ${ev.titulo}.`)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ]
    .map(plegarIcs)
    .join('\r\n')
  try {
    const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'cruxe-plan.ics'
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 2000)
    return true
  } catch {
    return false
  }
}
