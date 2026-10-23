// Compartir fuera de CRUXE: enlace de invitación, WhatsApp y archivo de calendario (.ics).
// Todo se arma en el teléfono con datos públicos del plan; nunca lleva condiciones de nadie.
import { rutas } from './shell'

export function enlaceInvitacion(codigo: string): string {
  return `${window.location.origin}${window.location.pathname}${rutas.unirse(codigo)}`
}

export function textoInvitacion(espacio: string, codigo: string): string {
  return `Súmate a «${espacio}» en CRUXE para armar el próximo plan: ${enlaceInvitacion(codigo)}`
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
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ].join('\r\n')
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
