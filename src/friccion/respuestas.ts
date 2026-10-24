// Las respuestas de un toque de "¿Cuándo puedes?" (#88), puras para poder probarlas sin pantalla.
// Enmienda 15 (E-d): si las franjas traen `etiqueta` (dos planes con nombre), el nombre va en cada opción
// (sinteticos H24: "Solo el sábado · Asado en el parque"). Los rótulos siguen empezando igual ("Puedo los dos días",
// "Solo el …", "No puedo ninguno"): los guiones los buscan por ese comienzo.
import type { Disponibilidad, Franja, Preferencia } from '../lib/types'
import { diaDe, hora } from '../lib/format'

export interface Opcion {
  id: string
  texto: string
  detalle: string
  disponibilidad: Disponibilidad
  /** Para el día del calendario decorativo. */
  dia?: string
}

const mismoDia = (a: Franja, b: Franja) => a.inicio.local.slice(0, 10) === b.inicio.local.slice(0, 10)
const horario = (f: Franja) => `${hora(f.inicio.local)} a ${hora(f.fin.local)}`
const cuando = (f: Franja) => `${diaDe(f.inicio.local)}, ${horario(f)}`
const etiqueta = (f: Franja) => f.etiqueta?.trim() || null

/** El nombre corto del plan de esa franja, o su día si no tiene nombre. */
export function nombreDelPlan(franjas: Franja[], clave: Preferencia | string): string {
  const f = franjas.find((x) => x.clave === clave)
  return f ? (etiqueta(f) ?? diaDe(f.inicio.local)) : String(clave)
}

/** Las respuestas de un toque. Con más de dos franjas no hay atajo: se responde en el plan. */
export function opcionesRapidas(franjas: Franja[]): Opcion[] | null {
  if (franjas.length === 1) {
    const [a] = franjas
    const con = etiqueta(a) ? `${etiqueta(a)} · ` : ''
    return [
      { id: 'si', texto: 'Puedo', detalle: `${con}${cuando(a)}`, disponibilidad: { [a.clave]: 'si' }, dia: a.inicio.local },
      { id: 'no', texto: 'No puedo', detalle: `${con}${cuando(a)}`, disponibilidad: { [a.clave]: 'no' } },
    ]
  }
  if (franjas.length !== 2) return null
  const [a, b] = franjas
  const dias = !mismoDia(a, b)
  const igualHorario = horario(a) === horario(b)
  const conNombres = etiqueta(a) != null || etiqueta(b) != null
  const otra = (f: Franja) => (dias ? `el ${diaDe(f.inicio.local).split(' ')[0].toLocaleLowerCase('es')}` : `de ${horario(f)}`)
  // Mockup (pantalla 6): "Solo el sábado 31" (sin el mes; la ficha del día lo muestra al lado).
  const diaCorto = (f: Franja) => diaDe(f.inicio.local).split(' ').slice(0, 2).join(' ').toLocaleLowerCase('es')
  const solo = (f: Franja) => `${dias ? `Solo el ${diaCorto(f)}` : `Solo de ${horario(f)}`}${etiqueta(f) ? ` · ${etiqueta(f)}` : ''}`
  const plan = (f: Franja) => (etiqueta(f) ? `${etiqueta(f)} (${diaDe(f.inicio.local).toLocaleLowerCase('es')})` : diaDe(f.inicio.local))
  return [
    {
      id: 'ambas',
      texto: dias ? 'Puedo los dos días' : 'Puedo en los dos horarios',
      detalle: conNombres
        ? `${plan(a)} y ${plan(b)}`
        : dias
          ? `${diaDe(a.inicio.local)} y ${diaDe(b.inicio.local)}${igualHorario ? `, ${horario(a)}` : ''}`
          : `${diaDe(a.inicio.local)}: ${horario(a)} y ${horario(b)}`,
      disponibilidad: { [a.clave]: 'si', [b.clave]: 'si' },
    },
    { id: a.clave, texto: solo(a), detalle: `${dias ? horario(a) : diaDe(a.inicio.local)} · ${otra(b)} queda como No`, disponibilidad: { [a.clave]: 'si', [b.clave]: 'no' }, dia: a.inicio.local },
    { id: b.clave, texto: solo(b), detalle: `${dias ? horario(b) : diaDe(b.inicio.local)} · ${otra(a)} queda como No`, disponibilidad: { [a.clave]: 'no', [b.clave]: 'si' }, dia: b.inicio.local },
    { id: 'ninguna', texto: dias ? 'No puedo ninguno' : 'No puedo en ninguno', detalle: 'Puedes cambiarlo después', disponibilidad: { [a.clave]: 'no', [b.clave]: 'no' } },
  ]
}
