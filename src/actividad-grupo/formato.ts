import type { Momento } from '../lib/types'
import type { EventoActividadGrupo } from './tipos'

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const TIPOS = new Set(['miembro_unido', 'miembro_salio', 'baja_plan'])

function partes(local: string): { fecha: string; dia: number; mes: number; ano: number; hora: string; diaCalendario: number } | null {
  const p = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})?$/.exec(local)
  if (!p) return null
  const ano = Number(p[1])
  const mes = Number(p[2])
  const dia = Number(p[3])
  // UTC se usa solo como calendario neutro: la hora visible sigue siendo la que envió el servidor.
  const diaCalendario = Date.UTC(ano, mes - 1, dia)
  const fecha = new Date(diaCalendario)
  if (fecha.getUTCFullYear() !== ano || fecha.getUTCMonth() !== mes - 1 || fecha.getUTCDate() !== dia || Number(p[4]) > 23 || Number(p[5]) > 59) return null
  return { fecha: local.slice(0, 10), dia, mes, ano, hora: `${p[4]}:${p[5]}`, diaCalendario }
}

/** Orden público por instante del servidor, sin mutar el resultado de get_space. */
export function ordenarActividad(actividad: readonly EventoActividadGrupo[]): EventoActividadGrupo[] {
  return actividad
    .filter((evento) => TIPOS.has(evento.tipo) && Number.isFinite(Date.parse(evento.en.utc)) && partes(evento.en.local) !== null)
    .slice()
    .sort((a, b) => Date.parse(b.en.utc) - Date.parse(a.en.utc))
}

/** No usa la zona ni el reloj del teléfono para decidir «Hoy» o «Ayer». */
export function diaActividad(en: Momento, ahora?: Momento): string {
  const evento = partes(en.local)
  if (!evento) return 'Fecha no disponible'
  const hoy = ahora ? partes(ahora.local) : null
  const esPasado = ahora !== undefined && Number.isFinite(Date.parse(ahora.utc)) && Date.parse(en.utc) <= Date.parse(ahora.utc)
  if (hoy && esPasado) {
    const diferencia = (hoy.diaCalendario - evento.diaCalendario) / 86_400_000
    if (diferencia === 0) return 'Hoy'
    if (diferencia === 1) return 'Ayer'
  }
  return `${evento.dia} ${MESES[evento.mes - 1]} ${evento.ano}`
}

export function horaActividad(en: Momento): string {
  return partes(en.local)?.hora ?? 'Hora no disponible'
}

export interface DiaActividad {
  clave: string
  etiqueta: string
  eventos: EventoActividadGrupo[]
}

/** Recibe la lista ya ordenada y limitada; conserva el orden de los movimientos. */
export function agruparActividad(actividad: readonly EventoActividadGrupo[], ahora?: Momento): DiaActividad[] {
  const dias: DiaActividad[] = []
  for (const evento of actividad) {
    const etiqueta = diaActividad(evento.en, ahora)
    const clave = `${evento.en.local.slice(0, 10)}:${etiqueta}`
    const ultimo = dias.at(-1)
    if (ultimo?.clave === clave) ultimo.eventos.push(evento)
    else dias.push({ clave, etiqueta, eventos: [evento] })
  }
  return dias
}
