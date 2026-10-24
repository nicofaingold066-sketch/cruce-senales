import { describe, expect, test } from 'vitest'
import type { Momento } from '../lib/types'
import { agruparActividad, diaActividad, horaActividad, ordenarActividad } from './formato'
import type { EventoActividadGrupo } from './tipos'

function momento(local: string, utc?: string): Momento {
  return { local, utc: utc ?? new Date(`${local}-03:00`).toISOString() }
}

function evento(id: string, en: Momento, tipo: EventoActividadGrupo['tipo'] = 'miembro_unido'): EventoActividadGrupo {
  return { id, tipo, en, miembro: { miembro_id: `m-${id}`, nombre: 'Persona ficticia', simulado: false }, plan: null }
}

describe('actividad compartida del grupo', () => {
  test('ordena por UTC descendente sin mutar la respuesta, incluso si la hora de pared se repite', () => {
    const primero = evento('antes', momento('2026-04-04T23:30:00', '2026-04-05T02:30:00Z'))
    const segundo = evento('despues', momento('2026-04-04T23:10:00', '2026-04-05T03:10:00Z'), 'miembro_salio')
    const entrada = Object.freeze([primero, segundo])
    expect(ordenarActividad(entrada).map((e) => e.id)).toEqual(['despues', 'antes'])
    expect(entrada.map((e) => e.id)).toEqual(['antes', 'despues'])
  })

  test('filtra tipos desconocidos y fechas inválidas en lugar de mostrar una acción inventada', () => {
    const valido = evento('valido', momento('2026-10-24T18:30:00'))
    const desconocido = { ...valido, id: 'otro', tipo: 'preferencias_guardadas' } as unknown as EventoActividadGrupo
    const sinInstante = { ...valido, id: 'sin-instante', en: { local: valido.en.local, utc: 'no es una fecha' } }
    const sinFecha = { ...valido, id: 'sin-fecha', en: { local: '2026-02-30T10:00:00', utc: valido.en.utc } }
    expect(ordenarActividad([desconocido, sinInstante, sinFecha, valido])).toEqual([valido])
  })

  test('Hoy y Ayer salen del calendario del servidor, también al cambiar de mes y año', () => {
    const ahora = momento('2027-01-01T00:10:00')
    expect(diaActividad(momento('2027-01-01T00:05:00'), ahora)).toBe('Hoy')
    expect(diaActividad(momento('2026-12-31T23:59:00'), ahora)).toBe('Ayer')
    expect(diaActividad(momento('2026-12-30T20:00:00'), ahora)).toBe('30 dic 2026')
    expect(horaActividad(momento('2026-12-31T23:59:00'))).toBe('23:59')
  })

  test('sin la hora del servidor y con eventos futuros muestra una fecha explícita', () => {
    const ahora = momento('2026-10-24T00:05:00')
    expect(diaActividad(momento('2026-10-24T00:04:00'))).toBe('24 oct 2026')
    expect(diaActividad(momento('2026-10-24T00:06:00'), ahora)).toBe('24 oct 2026')
    expect(diaActividad(momento('2026-10-25T13:00:00'), ahora)).toBe('25 oct 2026')
    expect(diaActividad(momento('2026-10-24T00:04:00'), { local: ahora.local, utc: 'inválida' })).toBe('24 oct 2026')
  })

  test('agrupa los tres recientes por fecha local sin perder ni cambiar los eventos originales', () => {
    const ahora = momento('2026-10-24T18:00:00')
    const entrada = [
      evento('1', momento('2026-10-24T17:55:00')),
      evento('2', momento('2026-10-24T17:30:00'), 'baja_plan'),
      evento('3', momento('2026-10-23T18:35:00'), 'miembro_salio'),
      evento('4', momento('2026-10-22T16:20:00')),
    ]
    const grupos = agruparActividad(ordenarActividad(entrada).slice(0, 3), ahora)
    expect(grupos.map((g) => [g.etiqueta, g.eventos.map((e) => e.id)])).toEqual([['Hoy', ['1', '2']], ['Ayer', ['3']]])
    expect(grupos[0].eventos[1]).toBe(entrada[1])
    expect(entrada).toHaveLength(4)
    expect(agruparActividad([], ahora)).toEqual([])
  })
})
