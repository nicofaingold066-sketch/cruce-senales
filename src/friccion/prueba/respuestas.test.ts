// Respuestas de un toque: con y sin nombres de plan (enmienda 15). Puro, sin DOM.
import { expect, test } from 'vitest'
import { nombreDelPlan, opcionesRapidas } from '../respuestas'
import type { Franja } from '../../lib/types'

const M = (local: string) => ({ utc: '', local })
const fr = (clave: string, dia: string, etiqueta?: string | null): Franja => ({ clave, inicio: M(`${dia}T14:00`), fin: M(`${dia}T17:00`), ...(etiqueta !== undefined ? { etiqueta } : {}) })
const dos = [fr('A', '2026-10-31'), fr('B', '2026-11-01')]
const conNombres = [fr('A', '2026-10-31', 'Asado en el parque'), fr('B', '2026-11-01', 'Cine y pizza')]

test('dos días sin nombres: cuatro opciones, como hasta hoy', () => {
  const o = opcionesRapidas(dos)!
  expect(o.map((x) => x.texto)).toEqual(['Puedo los dos días', 'Solo el sábado 31', 'Solo el domingo 1', 'No puedo ninguno'])
  expect(o[0].detalle).toBe('Sábado 31 oct y Domingo 1 nov, 14:00 a 17:00')
  expect(o[1].detalle).toBe('14:00 a 17:00 · el domingo queda como No')
  expect(o[1].disponibilidad).toEqual({ A: 'si', B: 'no' })
})

test('dos planes con nombre (H24): el nombre va en cada opción; los rótulos empiezan igual (los guiones los buscan)', () => {
  const o = opcionesRapidas(conNombres)!
  expect(o.map((x) => x.texto)).toEqual(['Puedo los dos días', 'Solo el sábado 31 · Asado en el parque', 'Solo el domingo 1 · Cine y pizza', 'No puedo ninguno'])
  expect(o[0].detalle).toBe('Asado en el parque (sábado 31 oct) y Cine y pizza (domingo 1 nov)')
  expect(o[1].texto).toMatch(/^Solo el /)
  expect(o[0].texto).toMatch(/^Puedo los dos días/)
  expect(o[3].texto).toMatch(/^No puedo ninguno/)
})

test('etiqueta vacía o con espacios cuenta como sin nombre', () => {
  const o = opcionesRapidas([fr('A', '2026-10-31', '  '), fr('B', '2026-11-01', null)])!
  expect(o[1].texto).toBe('Solo el sábado 31')
})

test('una franja y tres franjas', () => {
  expect(opcionesRapidas([fr('A', '2026-10-31', 'Picnic')])!.map((x) => [x.texto, x.detalle])).toEqual([
    ['Puedo', 'Picnic · Sábado 31 oct, 14:00 a 17:00'],
    ['No puedo', 'Picnic · Sábado 31 oct, 14:00 a 17:00'],
  ])
  expect(opcionesRapidas([...dos, fr('C', '2026-11-02')])).toBeNull()
})

test('nombreDelPlan: el nombre, o el día si no tiene', () => {
  expect(nombreDelPlan(conNombres, 'B')).toBe('Cine y pizza')
  expect(nombreDelPlan(dos, 'B')).toBe('Domingo 1 nov')
  expect(nombreDelPlan(dos, 'Z')).toBe('Z')
})
