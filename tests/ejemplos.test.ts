import { describe, it, expect } from 'vitest'
import {
  ATAJOS,
  EJEMPLOS,
  atajosParaEspacio,
  atajosParaFamilia,
  atajosParaGrupo,
  FAMILIA_DE_ACTIVIDAD,
  PLANES_POR_FAMILIA,
  ordenarActividadesParaGrupo,
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

  it('los chips de Me gustaría: el grupo sube su actividad y Asado deja el primer lugar', () => {
    const a = ['asado', 'padel', 'futbol', 'parque', 'fiesta', 'cena', 'bar'].map((clave) => ({ clave }))
    const claves = (l: { clave: string }[]) => l.map((x) => x.clave)
    expect(claves(ordenarActividadesParaGrupo(a, 'Los del pádel'))[0]).toBe('padel')
    expect(claves(ordenarActividadesParaGrupo(a, 'Los del asado'))[0]).toBe('asado')
    const sin = claves(ordenarActividadesParaGrupo(a, 'Amigos de siempre'))
    expect(sin[0]).not.toBe('asado')
    expect(sin).toContain('asado')
    expect([...sin].sort()).toEqual(claves(a).sort())
    expect(ordenarActividadesParaGrupo([], 'x')).toEqual([])
    expect(claves(a)[0]).toBe('asado')
  })

  it('cada atajo trae la clave de su actividad del catálogo y las dos sin actividad son solo del modo libre', () => {
    const conActividad = ATAJOS.filter((a) => a.actividad !== null)
    for (const a of conActividad) expect(FAMILIA_DE_ACTIVIDAD[a.actividad as string]).toBeDefined()
    const claves = conActividad.map((a) => a.actividad)
    expect(new Set(claves).size).toBe(claves.length)
    expect(ATAJOS.filter((a) => a.actividad === null).map((a) => a.titulo).sort()).toEqual(['Cumple', 'Juntada'])
    // Los atajos nuevos de la enmienda 14.
    for (const t of ['Básquet', 'Bar', 'Bowling o escape room', 'Picnic en el parque', 'Película en casa', 'Tenis']) {
      expect(ATAJOS.map((a) => a.titulo)).toContain(t)
    }
  })

  it('la tabla de familias coincide con el contrato (16 actividades, 6 familias)', () => {
    expect(Object.keys(FAMILIA_DE_ACTIVIDAD)).toHaveLength(16)
    expect(new Set(Object.values(FAMILIA_DE_ACTIVIDAD))).toEqual(
      new Set(['deporte', 'comida', 'salida_noche', 'cultura', 'aire_libre', 'en_casa']),
    )
    expect(FAMILIA_DE_ACTIVIDAD.tenis).toBe('deporte')
    expect(FAMILIA_DE_ACTIVIDAD.basquet).toBe('deporte')
    expect(FAMILIA_DE_ACTIVIDAD.peli_casa).toBe('en_casa')
    expect(FAMILIA_DE_ACTIVIDAD.cine).toBe('cultura')
  })

  it('un grupo con propósito solo ve los atajos de su familia, y ninguna familia queda con menos de 2', () => {
    const familias = ['deporte', 'comida', 'salida_noche', 'cultura', 'aire_libre', 'en_casa'] as const
    for (const f of familias) {
      const r = atajosParaFamilia(f)
      expect(r.length).toBeGreaterThanOrEqual(2)
      for (const a of r) expect(FAMILIA_DE_ACTIVIDAD[a.actividad as string]).toBe(f)
    }
    expect(atajosParaFamilia('deporte').map((a) => a.titulo).sort()).toEqual(['Básquet', 'Fútbol', 'Pádel', 'Tenis'])
    expect(atajosParaFamilia('deporte').map((a) => a.titulo)).not.toContain('Asado')
    expect(atajosParaFamilia('en_casa').map((a) => a.titulo).sort()).toEqual(['Juegos de mesa', 'Película en casa'])
    // Libre, sin familia o nula: todos, incluidos los sin actividad.
    expect(atajosParaFamilia('libre')).toEqual(ATAJOS)
    expect(atajosParaFamilia(undefined)).toEqual(ATAJOS)
    expect(atajosParaFamilia(null)).toEqual(ATAJOS)
    for (const f of familias) expect(atajosParaFamilia(f).map((a) => a.titulo)).not.toContain('Cumple')
  })

  it('el espacio combina familia (filtra) y nombre del grupo (ordena), sin perder ni repetir atajos', () => {
    const r = atajosParaEspacio('Los del fútbol', 'deporte')
    expect(r[0].titulo).toBe('Fútbol')
    expect(r.map((a) => a.titulo).sort()).toEqual(['Básquet', 'Fútbol', 'Pádel', 'Tenis'])
    // El nombre nombra una actividad de otra familia: no se cuela.
    expect(atajosParaEspacio('Los del asado', 'deporte').map((a) => a.titulo)).not.toContain('Asado')
    // Libre: mismo resultado que por nombre.
    expect(atajosParaEspacio('Los del pádel', 'libre')).toEqual(atajosParaGrupo('Los del pádel'))
    expect(atajosParaEspacio('Los del asado', 'libre')[0].titulo).toBe('Asado')
    expect(new Set(atajosParaEspacio('x', 'comida').map((a) => a.titulo)).size).toBe(atajosParaEspacio('x', 'comida').length)
  })

  it('el placeholder del plan sigue a la familia del espacio y, sin familia o libre, es el de siempre', () => {
    const ej = ejemploPorIndice(5) // «Juegos de mesa el sábado»: el ejemplo rotado no es de deporte
    expect(placeholderPlan(ej)).toBe(`Ej.: ${ej.plan}`)
    expect(placeholderPlan(ej, 'libre')).toBe(`Ej.: ${ej.plan}`)
    expect(placeholderPlan(ej, null)).toBe(`Ej.: ${ej.plan}`)
    expect(placeholderPlan(ej, undefined)).toBe(`Ej.: ${ej.plan}`)
    const planesDeporte = PLANES_POR_FAMILIA.deporte.map((x) => `Ej.: ${x.plan}`)
    for (let i = 0; i < EJEMPLOS.length; i++) expect(planesDeporte).toContain(placeholderPlan(ejemploPorIndice(i), 'deporte'))
    // En un grupo de fútbol nunca sale el ejemplo del cerro.
    for (let i = 0; i < EJEMPLOS.length; i++) expect(placeholderPlan(ejemploPorIndice(i), 'deporte')).not.toContain('cerro')
  })

  it('cada ejemplo de plan por familia es de una actividad de esa familia y cabe en el campo', () => {
    for (const [familia, planes] of Object.entries(PLANES_POR_FAMILIA)) {
      expect(planes.length).toBeGreaterThanOrEqual(2)
      for (const p of planes) {
        expect(FAMILIA_DE_ACTIVIDAD[p.actividad]).toBe(familia)
        expect(p.plan.length).toBeGreaterThan(0)
        expect(p.plan.length).toBeLessThanOrEqual(80)
      }
    }
    expect(Object.keys(PLANES_POR_FAMILIA).sort()).toEqual(['aire_libre', 'comida', 'cultura', 'deporte', 'en_casa', 'salida_noche'])
  })

  it('«Fiesta» tiene atajo (4 horas, como la fila del catálogo) y vive en la familia salida / noche', () => {
    const f = ATAJOS.find((a) => a.titulo === 'Fiesta')
    expect(f?.actividad).toBe('fiesta')
    expect(f?.min).toBe(240)
    expect(FAMILIA_DE_ACTIVIDAD.fiesta).toBe('salida_noche')
    expect(atajosParaFamilia('salida_noche').map((a) => a.titulo).sort()).toEqual(['Bar', 'Bowling o escape room', 'Fiesta'])
    expect(atajosParaEspacio('Fiesta de fin de año', 'salida_noche')[0].titulo).toBe('Fiesta')
    expect(atajosParaEspacio('Fiesta de fin de año', 'deporte').map((a) => a.titulo)).not.toContain('Fiesta')
  })
})
