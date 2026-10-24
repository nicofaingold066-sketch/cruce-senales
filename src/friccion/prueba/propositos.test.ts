// Enmienda 14: el espejo de la tabla fija, el selector y la frase de la invitación. Puro, sin red ni DOM.
import { expect, test } from 'vitest'
import { ACTIVIDADES, esProposito, explicacionProposito, familiaDeProposito, FAMILIAS, fraseProposito, FRASE_PROPOSITO, opcionesProposito } from '../propositos'
import { textoInvitacion } from '../../lib/compartir'

;(globalThis as unknown as { window: unknown }).window = { location: { origin: 'https://ejemplo.test', pathname: '/' } }

test('la tabla fija: 6 familias, 16 actividades, cada una con una familia que existe y sin claves repetidas', () => {
  expect(FAMILIAS).toHaveLength(6)
  expect(ACTIVIDADES).toHaveLength(16)
  const familias = new Set(FAMILIAS.map((f) => f.clave))
  for (const a of ACTIVIDADES) expect(familias.has(a.familia)).toBe(true)
  expect(new Set(ACTIVIDADES.map((a) => a.clave)).size).toBe(16)
  expect(ACTIVIDADES.filter((a) => a.familia === 'deporte').map((a) => a.clave)).toEqual(['futbol', 'padel', 'tenis', 'basquet'])
})

test('familiaDeProposito: libre, familia, actividad; "cultura" vale como familia; lo desconocido es null', () => {
  expect(familiaDeProposito('libre')).toBe('libre')
  expect(familiaDeProposito('deporte')).toBe('deporte')
  expect(familiaDeProposito('futbol')).toBe('deporte')
  expect(familiaDeProposito('cultura')).toBe('cultura')
  expect(familiaDeProposito('cine')).toBe('cultura')
  expect(familiaDeProposito('sushi')).toBeNull()
  expect(esProposito('sushi')).toBe(false)
  expect(esProposito('peli_casa')).toBe(true)
})

test('el selector: "Libre" primero, cada familia con "Cualquier …" y sus actividades; sin fiesta (E14, 8) ni "cultura" repetida; valores únicos y válidos', () => {
  const { libre, grupos } = opcionesProposito()
  expect(libre.valor).toBe('libre')
  expect(grupos.map((g) => g.familia)).toEqual(['deporte', 'comida', 'salida_noche', 'cultura', 'aire_libre', 'en_casa'])
  const todos = grupos.flatMap((g) => g.opciones.map((o) => o.valor))
  expect(todos).not.toContain('fiesta')
  expect(new Set(todos).size).toBe(todos.length)
  for (const v of todos) expect(esProposito(v)).toBe(true)
  const noche = grupos.find((g) => g.familia === 'salida_noche')!
  expect(noche.opciones.map((o) => o.valor)).toEqual(['salida_noche', 'bar', 'juegos_salida'])
  expect(grupos.find((g) => g.familia === 'cultura')!.opciones.map((o) => o.valor)).toEqual(['cultura', 'cine'])
  for (const g of grupos) expect(g.opciones[0].etiqueta).toMatch(/^Cualquier /)
})

test('hay frase para todo lo que se ofrece, y libre o desconocido no tiene', () => {
  for (const v of opcionesProposito().grupos.flatMap((g) => g.opciones.map((o) => o.valor))) expect(FRASE_PROPOSITO[v], v).toBeTruthy()
  expect(fraseProposito('futbol')).toBe('para jugar fútbol')
  expect(fraseProposito('deporte')).toBe('para hacer deporte')
  expect(fraseProposito('libre')).toBeNull()
  expect(fraseProposito(undefined)).toBeNull()
  expect(fraseProposito('sushi')).toBeNull()
})

test('la explicación bajo el selector dice el tipo y no promete otra cosa', () => {
  expect(explicacionProposito('libre')).toBe('Cualquiera del grupo puede proponer lo que quiera.')
  expect(explicacionProposito('futbol')).toBe('Las propuestas de este grupo serán de este tipo de plan (deporte).')
  expect(explicacionProposito('en_casa')).toContain('en casa')
})

test('la invitación: con propósito dice "para jugar fútbol"; libre o sin dato, el texto de siempre; junto a "quién viene"', () => {
  const con = textoInvitacion('Los del fútbol', 'ABCD1234', null, 'futbol')
  expect(con).toBe('Súmate a «Los del fútbol» en CRUXE para jugar fútbol: toca el enlace, elige tu nombre y marca cuándo puedes. Sin cuenta ni contraseña; tus condiciones solo las ve la app: https://ejemplo.test/#/unirse/ABCD1234')
  const antes = 'Súmate a «Los del asado» en CRUXE: toca el enlace, elige tu nombre y marca cuándo puedes. Sin cuenta ni contraseña; tus condiciones solo las ve la app: https://ejemplo.test/#/unirse/ABCD1234'
  expect(textoInvitacion('Los del asado', 'ABCD1234')).toBe(antes)
  expect(textoInvitacion('Los del asado', 'ABCD1234', null, 'libre')).toBe(antes)
  expect(textoInvitacion('Los del asado', 'ABCD1234', null, null)).toBe(antes)
  const ambos = textoInvitacion('Los del pádel · solo el grupo', 'ABCD1234', null, 'padel')
  expect(ambos).toContain('en CRUXE para jugar pádel: toca el enlace')
  expect(ambos).toContain('Esta vez es solo el grupo.')
})
