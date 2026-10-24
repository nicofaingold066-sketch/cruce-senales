import { describe, expect, it } from 'vitest'
import { franjaTexto, horarioTexto, sinHoraDeFin } from '../format'

describe('horario con y sin hora de fin', () => {
  it('una franja corta muestra inicio y fin', () => {
    expect(horarioTexto('2026-10-31T14:00', '2026-10-31T17:00')).toBe('14:00 a 17:00')
    expect(sinHoraDeFin('2026-10-31T14:00', '2026-10-31T17:00')).toBe(false)
  })
  it('12 h (o 8 h o más) se lee sin hora de fin y nunca dice "hasta las 02:00"', () => {
    expect(horarioTexto('2026-10-31T14:00', '2026-11-01T02:00')).toBe('desde las 14:00 · sin hora de fin')
    expect(sinHoraDeFin('2026-10-31T20:00', '2026-11-01T04:00')).toBe(true)
    expect(sinHoraDeFin('2026-10-31T20:00', '2026-11-01T03:59')).toBe(false)
    expect(franjaTexto('2026-10-31T14:00', '2026-11-01T02:00')).toBe('Sábado 31 oct 2026, desde las 14:00 · sin hora de fin')
  })
  it('una franja que cruza la medianoche y dura menos de 8 h sigue con su fin', () => {
    expect(franjaTexto('2026-10-31T22:00', '2026-11-01T01:00')).toBe('Sábado 31 oct 2026, 22:00 a Domingo 1 nov 2026, 01:00')
  })
})
