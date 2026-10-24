import { describe, expect, it } from 'vitest'
import { hoyEnSantiago, sabadoInicial, sabadosParaElegir } from './fechas'

describe('sábados del agente (auditoría M4)', () => {
  it('el sábado 24 oct ofrece 31 oct y 7 nov, no 14 nov (más de 16 días) ni el mismo día', () => {
    expect(sabadosParaElegir('2026-10-24').map((s) => s.v)).toEqual(['2026-10-31', '2026-11-07'])
  })
  it('un viernes ofrece tres sábados, el último a 15 días', () => {
    expect(sabadosParaElegir('2026-10-23').map((s) => s.v)).toEqual(['2026-10-24', '2026-10-31', '2026-11-07'])
  })
  it('todos los chips caen en sábado, después de hoy y a 16 días o menos', () => {
    for (let d = 0; d < 14; d++) {
      const hoy = new Date(Date.UTC(2026, 9, 20 + d, 12)).toISOString().slice(0, 10)
      const base = Date.parse(`${hoy}T12:00:00Z`)
      for (const s of sabadosParaElegir(hoy)) {
        const dias = (Date.parse(`${s.v}T12:00:00Z`) - base) / 86400000
        expect(new Date(`${s.v}T12:00:00Z`).getUTCDay()).toBe(6)
        expect(dias).toBeGreaterThan(0)
        expect(dias).toBeLessThanOrEqual(16)
      }
    }
  })
  it('rotula como el mockup: "Sáb 31 oct"', () => {
    expect(sabadosParaElegir('2026-10-24')[0].texto).toBe('Sáb 31 oct')
  })
  it('arranca en el recordado o el del caso si valen; si no, en el primero', () => {
    const validos = sabadosParaElegir('2026-11-02')
    expect(sabadoInicial(undefined, validos, '2026-10-31')).toBe('2026-11-07')
    expect(sabadoInicial('2026-11-14', validos, '2026-10-31')).toBe('2026-11-14')
    expect(sabadoInicial(undefined, sabadosParaElegir('2026-10-24'), '2026-10-31')).toBe('2026-10-31')
  })
  it('hoy se cuenta en Santiago (a las 01:00 UTC del 25 todavía es 24 en Santiago)', () => {
    expect(hoyEnSantiago(new Date('2026-10-25T01:00:00Z'))).toBe('2026-10-24')
  })
})
