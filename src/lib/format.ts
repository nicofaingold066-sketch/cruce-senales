// Formato de fechas. La interfaz muestra la hora "local" de America/Santiago que entrega el servidor.
// Nunca convierte zonas horarias: solo lee los componentes de la cadena.
import type { EstadoClave, Evento, Momento } from './types'
import { ESTADO_ETIQUETA } from './types'

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

export const ZONA_VISIBLE = 'America/Santiago'

interface Partes {
  y: number
  mo: number
  d: number
  hh: string
  mm: string
}

function partes(local: string): Partes | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(local)
  if (!m) return null
  return { y: Number(m[1]), mo: Number(m[2]), d: Number(m[3]), hh: m[4], mm: m[5] }
}

function diaSemana(p: Partes): string {
  // Solo aritmética de calendario (UTC como contenedor neutro), sin zona horaria.
  return DIAS[new Date(Date.UTC(p.y, p.mo - 1, p.d)).getUTCDay()]
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function fechaLarga(local: string): string {
  const p = partes(local)
  if (!p) return local
  return `${cap(diaSemana(p))} ${p.d} ${MESES[p.mo - 1]} ${p.y}`
}

export function fechaCorta(local: string): string {
  const p = partes(local)
  if (!p) return local
  return `${diaSemana(p).slice(0, 3)} ${p.d} ${MESES[p.mo - 1]}`
}

/** "Sábado 31 oct" (día de la semana con mayúscula, sin año), para resúmenes cortos. */
export function diaDe(local: string): string {
  const p = partes(local)
  if (!p) return local
  return `${cap(diaSemana(p))} ${p.d} ${MESES[p.mo - 1]}`
}

export function hora(local: string): string {
  const p = partes(local)
  return p ? `${p.hh}:${p.mm}` : local
}

/** "jue 29 oct, 20:00" */
export function momentoCorto(m: Momento | string): string {
  const l = typeof m === 'string' ? m : m.local
  return `${fechaCorta(l)}, ${hora(l)}`
}

/**
 * "Sin hora de fin" (pedido de Nico, 24 oct): el contrato exige `fin`, así que Nuevo plan manda inicio + 12 h y
 * cualquier franja de 8 h o más se lee como abierta. Nunca se muestra "hasta las 02:00".
 */
export const SIN_FIN_MINUTOS = 720
export const UMBRAL_SIN_FIN = 480

function minutosEntre(inicio: string, fin: string): number | null {
  const a = partes(inicio)
  const b = partes(fin)
  if (!a || !b) return null
  const t = (p: Partes) => Date.UTC(p.y, p.mo - 1, p.d, Number(p.hh), Number(p.mm))
  return (t(b) - t(a)) / 60000
}

/** true si la franja es "sin hora de fin" (dura 8 h o más). */
export function sinHoraDeFin(inicio: Momento | string, fin: Momento | string): boolean {
  const m = minutosEntre(typeof inicio === 'string' ? inicio : inicio.local, typeof fin === 'string' ? fin : fin.local)
  return m != null && m >= UMBRAL_SIN_FIN
}

/** El horario de una franja: "14:00 a 17:00", o "desde las 14:00 · sin hora de fin". Único lugar de esta regla. */
export function horarioTexto(inicio: Momento | string, fin: Momento | string): string {
  const i = typeof inicio === 'string' ? inicio : inicio.local
  const f = typeof fin === 'string' ? fin : fin.local
  return sinHoraDeFin(i, f) ? `desde las ${hora(i)} · sin hora de fin` : `${hora(i)} a ${hora(f)}`
}

/** "Sábado 31 oct 2026, 14:00 a 17:00" (franja completa). */
export function franjaTexto(inicio: Momento | string, fin: Momento | string): string {
  const i = typeof inicio === 'string' ? inicio : inicio.local
  const f = typeof fin === 'string' ? fin : fin.local
  if (sinHoraDeFin(i, f)) return `${fechaLarga(i)}, ${horarioTexto(i, f)}`
  const pi = partes(i)
  const pf = partes(f)
  if (pi && pf && pi.y === pf.y && pi.mo === pf.mo && pi.d === pf.d) {
    return `${fechaLarga(i)}, ${hora(i)} a ${hora(f)}`
  }
  return `${fechaLarga(i)}, ${hora(i)} a ${fechaLarga(f)}, ${hora(f)}`
}

export function etiquetaEstado(e: EstadoClave | null): string {
  return e ? ESTADO_ETIQUETA[e] : ''
}

/** Cuenta regresiva SOLO informativa (contrato 0.6). El servidor decide el plazo. */
export function cuentaRegresiva(plazoUtc: string, servidorUtc: string, recibidoMs: number, ahoraMs: number): string | null {
  const plazo = Date.parse(plazoUtc)
  const servidor = Date.parse(servidorUtc)
  if (Number.isNaN(plazo) || Number.isNaN(servidor)) return null
  const restanteMs = plazo - (servidor + (ahoraMs - recibidoMs))
  if (restanteMs <= 0) return null
  const s = Math.floor(restanteMs / 1000)
  const dias = Math.floor(s / 86400)
  const horas = Math.floor((s % 86400) / 3600)
  const min = Math.floor((s % 3600) / 60)
  const seg = s % 60
  if (dias > 0) return `${dias} d ${horas} h ${min} min`
  if (horas > 0) return `${horas} h ${min} min ${seg} s`
  return `${min} min ${seg} s`
}

/** Frase corta para el historial. No inventa nada: solo reformula el evento del servidor. */
export function describirEvento(e: Evento): string {
  const quien = e.actor?.nombre ?? 'El sistema'
  switch (e.tipo) {
    case 'propuesta_creada':
      return `${quien} creó la propuesta`
    case 'propuesta_abierta':
      return `${quien} abrió la propuesta`
    case 'opcion_publicada':
      return `Se publicó la versión ${e.version_nueva ?? ''} del plan`.replace('  ', ' ')
    case 'evaluacion_sin_opcion':
      return 'Se buscó una opción: sin opción compatible'
    case 'aceptacion':
      // Enmienda 13 (c): la aceptación de quien después se retiró llega sin actor; nunca se completa con un nombre.
      return `${e.actor?.nombre ?? 'Una persona'} aceptó la versión ${e.version_nueva ?? e.version_previa ?? ''}`.trim()
    case 'baja':
      // Enmienda 13 (c): la baja es sin nombre ni motivo para los demás, aunque el servidor mande actor.
      return e.version_previa != null ? `Una persona se retiró (versión ${e.version_previa})` : 'Una persona se retiró'
    case 'reparacion_publicada':
      return `Se publicó la versión ${e.version_nueva ?? ''} como alternativa; ninguna aceptación anterior cuenta`
    case 'reparacion_sin_alternativa':
      return 'Se buscó una alternativa: sin opción compatible'
    case 'propuesta_cancelada':
      return `${quien} canceló la propuesta`
    case 'propuesta_expirada':
      return 'Venció el plazo de aceptación'
    default:
      return e.tipo
  }
}

/** Partes para la hoja de calendario: { mes: "oct", num: 31, dia: "sáb" }. Sin convertir zonas. */
export function hojaCalendario(local: string): { mes: string; num: number; dia: string } | null {
  const p = partes(local)
  if (!p) return null
  return { mes: MESES[p.mo - 1], num: p.d, dia: diaSemana(p).slice(0, 3) }
}
