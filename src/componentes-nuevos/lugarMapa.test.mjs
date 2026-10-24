// Pruebas de "Buscar el lugar en el mapa" (psico D10). Correr con: node --test "src/componentes-nuevos/*.test.mjs"
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { duracionTexto, mostrarBuscarLugar, urlLugar } from './lugarMapa.ts'

test('URL de búsqueda con el título codificado y nada más', () => {
  const u = urlLugar('  Pádel & café en Ñuñoa ')
  assert.equal(u, 'https://www.google.com/maps/search/?api=1&query=P%C3%A1del%20%26%20caf%C3%A9%20en%20%C3%91u%C3%B1oa')
  const q = new URL(u).searchParams
  assert.deepEqual([...q.keys()], ['api', 'query'])
  assert.equal(q.get('query'), 'Pádel & café en Ñuñoa')
})

test('en el demo o sin título no se muestra', () => {
  assert.equal(mostrarBuscarLugar(true, 'Asado en casa de Tomi'), false)
  assert.equal(mostrarBuscarLugar(false, '   '), false)
  assert.equal(mostrarBuscarLugar(false, 'Cine'), true)
})

test('duración: horas enteras, minutos si no, vacío si no se puede', () => {
  assert.equal(duracionTexto('2026-10-31T23:00:00Z', '2026-11-01T02:00:00Z'), '(3 h)')
  assert.equal(duracionTexto('2026-10-31T23:00:00Z', '2026-11-01T00:30:00Z'), '(90 min)')
  assert.equal(duracionTexto('x', 'y'), '')
  assert.equal(duracionTexto('2026-10-31T23:00:00Z', '2026-10-31T23:00:00Z'), '')
})
