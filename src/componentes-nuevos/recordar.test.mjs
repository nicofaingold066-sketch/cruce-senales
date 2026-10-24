// Pruebas de los mensajes de aviso (#89). Sin red, sin navegador, sin dependencias nuevas.
// Correr con: node --test "src/componentes-nuevos/*.test.mjs"
// (Node 22.6+ importa el .ts quitando los tipos. Vitest del repo solo mira tests/**.)
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { rotuloAviso, textoAviso, urlAviso } from './recordar.ts'

const enlace = 'https://ejemplo.test/#/unirse/ABCD1234'

test('faltan: mensaje genérico con el enlace, sin nombres ni conteos', () => {
  const t = textoAviso({ motivo: 'faltan', titulo: 'Pádel y algo después', enlace })
  assert.equal(t, 'Recordatorio para «Pádel y algo después»: si aún no marcaste cuándo puedes, sin apuro: toca, elige tu nombre y marca (es privado). Si ya lo hiciste, no hace falta nada: ' + enlace)
  // Llega también a quien ya respondió o se bajó (pedido de sinteticos): no le reclama nada.
  assert.match(t, /si aún no marcaste cuándo puedes/)
  assert.match(t, /Si ya lo hiciste, no hace falta nada/)
  assert.doesNotMatch(t, /todavía no respondiste|Te lo recuerda CRUXE/)
  // Ningún número fuera del enlace: no hay "faltan 3" ni "2 de 5".
  assert.doesNotMatch(t.replace(enlace, ''), /\d/)
})

test('versión nueva con fecha: dice qué hacer si no puede', () => {
  const t = textoAviso({ motivo: 'version_nueva', titulo: 'Cine', cuando: 'sábado 31 oct, 20:00', enlace })
  assert.equal(t, 'Hay opción para «Cine»: sábado 31 oct, 20:00. Si vas, toca y confírmala; si no puedes, no confirmes: el plan sale solo con quienes confirman. ' + enlace)
})

test('confirmado: lleva el enlace y los cupos libres, sin nombres', () => {
  const t = textoAviso({ motivo: 'confirmado', titulo: 'Pádel', cuando: 'sábado 31 oct, 20:00', enlace, cuposLibres: 2 })
  assert.equal(t, 'Se juntan: «Pádel», sábado 31 oct, 20:00. Quedan 2 cupos. Si vas y no confirmaste, toca y confirma: ' + enlace)
  assert.match(textoAviso({ motivo: 'confirmado', titulo: 'Pádel', enlace, cuposLibres: 1 }), /Queda 1 cupo\./)
  const lleno = textoAviso({ motivo: 'confirmado', titulo: 'Pádel', enlace, cuposLibres: 0 })
  assert.doesNotMatch(lleno, /cupo/)
  assert.equal(rotuloAviso('confirmado'), 'Avisar al grupo')
})

test('reparación dice que las confirmaciones anteriores no cuentan', () => {
  const t = textoAviso({ motivo: 'reparacion', titulo: 'Cena', cuando: 'domingo 1 nov, 20:00', enlace })
  assert.match(t, /^Hay una versión nueva de «Cena»: ahora domingo 1 nov, 20:00\./)
  assert.doesNotMatch(t, /porque|se bajó|baja/)
  assert.match(t, /no cuentan/)
  assert.ok(t.endsWith(enlace))
})

test('sin fecha, versión nueva y reparación no dejan huecos', () => {
  for (const motivo of ['version_nueva', 'reparacion', 'confirmado']) {
    const t = textoAviso({ motivo, titulo: 'Cumple', cuando: null, enlace })
    assert.doesNotMatch(t, /: \.|ahora \.|, \.|undefined|null/)
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
