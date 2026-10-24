// D3: la marca de "quién viene" en el nombre del grupo o título del plan, y la frase en el texto de la invitación.
import { expect, test } from 'vitest'
import { cabeQuienViene, conQuienViene, quienVieneDe, sinQuienViene, textoInvitacion } from '../../lib/compartir'

// enlaceInvitacion lee window.location: sin navegador se simula.
;(globalThis as unknown as { window: unknown }).window = { location: { origin: 'https://ejemplo.test', pathname: '/' } }

test('ida y vuelta de la marca para las tres reglas', () => {
  for (const q of ['grupo', 'parejas', 'abierta'] as const) {
    const con = conQuienViene('Los del pádel', q)
    expect(quienVieneDe(con)).toBe(q)
    expect(sinQuienViene(con)).toBe('Los del pádel')
  }
  expect(conQuienViene('Los del pádel', 'parejas')).toBe('Los del pádel · con parejas')
})

test('sin marca: nada; una marca anterior se reemplaza; mayúsculas no importan', () => {
  expect(quienVieneDe('Los del finde')).toBeNull()
  expect(quienVieneDe('Puerta · abierta al público')).toBeNull()
  expect(conQuienViene('Los del pádel · con parejas', 'grupo')).toBe('Los del pádel · solo el grupo')
  expect(conQuienViene('Los del pádel · con parejas', null)).toBe('Los del pádel')
  expect(quienVieneDe('Los del pádel · CON PAREJAS')).toBe('parejas')
})

test('si no cabe en los 60 del servidor, el nombre queda sin marca y cabeQuienViene lo dice', () => {
  const largo = 'Un nombre de grupo bastante largo para la prueba de hoy'
  expect(largo.length).toBeLessThanOrEqual(60)
  expect(conQuienViene(largo, 'parejas')).toBe(largo)
  expect(cabeQuienViene(largo, 'parejas')).toBe(false)
  expect(cabeQuienViene(largo, null)).toBe(true)
  expect(cabeQuienViene('Los del pádel', 'abierta')).toBe(true)
})

test('la invitación dice la regla cuando el nombre la trae, con el nombre limpio; sin marca, el texto de siempre', () => {
  const t = textoInvitacion('Los del pádel · con parejas', 'ABCD1234')
  expect(t).toContain('«Los del pádel»')
  expect(t).toContain('Pueden venir con pareja.')
  expect(t).toContain('#/unirse/ABCD1234')
  expect(t).not.toContain('·')
  const sin = textoInvitacion('Los del finde', 'ABCD1234')
  expect(sin).toBe('Súmate a «Los del finde» en CRUXE: toca el enlace, elige tu nombre y marca cuándo puedes. Sin cuenta ni contraseña; tus condiciones solo las ve la app: https://ejemplo.test/#/unirse/ABCD1234')
  // El argumento explícito manda sobre la marca.
  expect(textoInvitacion('Los del pádel · con parejas', 'ABCD1234', 'grupo')).toContain('Esta vez es solo el grupo.')
})
