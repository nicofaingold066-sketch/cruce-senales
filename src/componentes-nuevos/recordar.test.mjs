// Pruebas de los mensajes de aviso (#89). Sin red, sin navegador, sin dependencias nuevas.
// Correr con: node --test "src/componentes-nuevos/*.test.mjs"
// (Node 22.6+ importa el .ts quitando los tipos. Vitest del repo solo mira tests/**.)
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { rotuloAviso, textoAviso, urlAviso } from './recordar.ts'

const enlace = 'https://ejemplo.test/#/unirse/ABCD1234'

test('faltan: mensaje genérico con el enlace, sin nombres ni conteos', () => {
  const t = textoAviso({ motivo: 'faltan', titulo: 'Pádel y algo después', enlace })
  assert.equal(t, 'Para «Pádel y algo después»: si todavía no respondiste, toca, elige tu nombre y marca cuándo puedes (es privado). Si ya respondiste, no hace falta nada: ' + enlace)
  // Llega también a quien ya respondió o se bajó (pedido de sinteticos): no le reclama nada.
  assert.match(t, /si todavía no respondiste/i)
  assert.match(t, /Si ya respondiste, no hace falta nada/)
  // Ningún número fuera del enlace: no hay "faltan 3" ni "2 de 5".
  assert.doesNotMatch(t.replace(enlace, ''), /\d/)
})

test('versión nueva con fecha', () => {
  const t = textoAviso({ motivo: 'version_nueva', titulo: 'Cine', cuando: 'sábado 31 oct, 20:00', enlace })
  assert.equal(t, 'Hay opción para «Cine»: sábado 31 oct, 20:00. Si vas, toca y confírmala: ' + enlace)
})

test('reparación dice que las confirmaciones anteriores no cuentan', () => {
  const t = textoAviso({ motivo: 'reparacion', titulo: 'Cena', cuando: 'domingo 1 nov, 20:00', enlace })
  assert.match(t, /^Cambió «Cena»: ahora domingo 1 nov, 20:00\./)
  assert.match(t, /no cuentan/)
  assert.ok(t.endsWith(enlace))
})

test('sin fecha, versión nueva y reparación no dejan huecos', () => {
  for (const motivo of ['version_nueva', 'reparacion']) {
    const t = textoAviso({ motivo, titulo: 'Cumple', cuando: null, enlace })
    assert.doesNotMatch(t, /: \.|ahora \.|undefined|null/)
  }
})

test('título vacío, con espacios de más o muy largo', () => {
  assert.match(textoAviso({ motivo: 'faltan', titulo: '   ', enlace }), /«el plan»/)
  assert.match(textoAviso({ motivo: 'faltan', titulo: '  Juegos   de\nmesa ', enlace }), /«Juegos de mesa»/)
  const largo = textoAviso({ motivo: 'faltan', titulo: 'x'.repeat(200), enlace })
  assert.match(largo, /«x{59}…»/)
})

test('URL de WhatsApp con el texto codificado (mismo formato que compartir.ts)', () => {
  const u = urlAviso({ motivo: 'faltan', titulo: 'Pádel & café', enlace })
  assert.ok(u.startsWith('https://wa.me/?text='))
  assert.equal(decodeURIComponent(u.slice('https://wa.me/?text='.length)), textoAviso({ motivo: 'faltan', titulo: 'Pádel & café', enlace }))
  assert.doesNotMatch(u.slice('https://wa.me/?text='.length), /[ &#]/)
})

test('rótulos', () => {
  assert.equal(rotuloAviso('faltan'), 'Recordar a quien falta')
  assert.equal(rotuloAviso('version_nueva'), 'Avisar al grupo')
  assert.equal(rotuloAviso('reparacion'), 'Avisar al grupo')
})
