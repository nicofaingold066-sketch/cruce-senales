import { describe, it, expect } from 'vitest'
import {
  ATAJOS,
  EJEMPLOS,
  atajosParaGrupo,
  ayudaGrupo,
  ejemploPorIndice,
  ejemploPorSemilla,
  placeholderGrupo,
  placeholderPlan,
} from '../src/lib/ejemplos'

describe('ejemplos que rotan (mejora #92)', () => {
  it('recorre la lista y da la vuelta, también con negativos, decimales y valores raros', () => {
    const n = EJEMPLOS.length
    expect(ejemploPorIndice(0)).toBe(EJEMPLOS[0])
    expect(ejemploPorIndice(n)).toBe(EJEMPLOS[0])
    expect(ejemploPorIndice(n + 2)).toBe(EJEMPLOS[2])
    expect(ejemploPorIndice(-1)).toBe(EJEMPLOS[n - 1])
    expect(ejemploPorIndice(2.9)).toBe(EJEMPLOS[2])
    expect(ejemploPorIndice(Number.NaN)).toBe(EJEMPLOS[0])
    expect(ejemploPorIndice(Number.POSITIVE_INFINITY)).toBe(EJEMPLOS[0])
  })

  it('la semilla es determinista y reparte entre varios ejemplos', () => {
    expect(ejemploPorSemilla('abc')).toBe(ejemploPorSemilla('abc'))
    expect(ejemploPorSemilla('')).toBe(EJEMPLOS[0])
    const usados = new Set(['K7M2', 'P4QX', 'ZZ91', 'mesa', 'cena', '2026-10-24', '2026-10-25', 'a', 'b', 'c'].map((s) => ejemploPorSemilla(s).clave))
    expect(usados.size).toBeGreaterThan(2)
  })

  it('cubre pádel, cumpleaños, cena, cine, cerro y juegos en casa, sin claves repetidas', () => {
    const claves = EJEMPLOS.map((e) => e.clave)
    expect(new Set(claves).size).toBe(claves.length)
    for (const c of ['padel', 'cumple', 'cena', 'cine', 'cerro', 'juegos']) expect(claves).toContain(c)
  })

  it('no asume asado y respeta el largo de los campos (60 y 80)', () => {
    for (const e of EJEMPLOS) {
      expect(`${e.grupo} ${e.plan} ${e.tipo}`.toLowerCase()).not.toContain('asado')
      expect(e.grupo.length).toBeGreaterThan(0)
      expect(e.grupo.length).toBeLessThanOrEqual(60)
      expect(e.plan.length).toBeGreaterThan(0)
      expect(e.plan.length).toBeLessThanOrEqual(80)
    }
  })

  it('los textos salen con el formato que usa la interfaz', () => {
    const e = ejemploPorIndice(0)
    expect(placeholderGrupo(e)).toBe('Ej.: Los del pádel')
    expect(placeholderPlan(e)).toBe('Ej.: Pádel el martes a las 20:00')
    expect(ayudaGrupo(e)).toBe('Cualquier grupo sirve, por ejemplo amigos del pádel.')
  })

  it('los atajos no arrancan por asado y llevan pádel y tenis', () => {
    expect(ATAJOS[0].titulo).not.toBe('Asado')
    const titulos = ATAJOS.map((a) => a.titulo)
    expect(new Set(titulos).size).toBe(titulos.length)
    expect(titulos).toContain('Pádel')
    expect(titulos).toContain('Tenis')
    expect(titulos).toContain('Asado')
    expect(atajosParaGrupo('').map((a) => a.titulo)).toEqual(titulos)
  })

  it('el nombre del grupo sube su actividad al primer lugar, sin perder ni repetir atajos', () => {
    const casos: [string, string][] = [
      ['Los del pádel', 'Pádel'],
      ['LOS DEL PADEL', 'Pádel'],
      ['Cumpleaños de Vale', 'Cumple'],
      ['Los del asado', 'Asado'],
      ['Club de lectura', 'Café o brunch'],
      ['Tenis de los domingos', 'Tenis'],
    ]
    for (const [grupo, primero] of casos) {
      const r = atajosParaGrupo(grupo)
      expect(r[0].titulo).toBe(primero)
      expect(r.length).toBe(ATAJOS.length)
      expect(new Set(r.map((a) => a.titulo)).size).toBe(ATAJOS.length)
    }
    expect(atajosParaGrupo('Amigos de siempre')[0].titulo).toBe('Pádel')
  })
})
