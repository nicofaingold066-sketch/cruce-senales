// Pruebas de "Rearmar con lo nuevo" (enmienda 13 (b), ux-flujo). Correr con: node --test "src/componentes-nuevos/*.test.mjs"
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { TOPE_VERSIONES, vistaRearmar } from './rearmar.ts'

const org = (puede = true, extra = {}) => ({
  miembro_id: 'm-vale', nombre: 'Vale', es_organizador: true, es_organizador_espacio: true,
  puede: { proponer_reparacion: puede }, ...extra,
})
const base = (extra = {}) => ({ estado: 'esperando_compromisos', mi_situacion: org(), opcion: { version: 1 }, ...extra })

test('el servidor decide: sin puede.proponer_reparacion no se muestra nada', () => {
  assert.equal(vistaRearmar(base({ mi_situacion: org(false) })), null)
})

test('solo para el organizador y solo en esperando_compromisos', () => {
  assert.equal(vistaRearmar(base({ mi_situacion: { ...org(), es_organizador: false } })), null)
  for (const estado of ['reuniendo_interes', 'grupo_confirmado', 'en_revision', 'expirado', 'cancelado']) {
    assert.equal(vistaRearmar(base({ estado })), null, estado)
  }
})

test('con 2 o más "así no puedo" dice cuántos; con null no da número', () => {
  const con = vistaRearmar(base({ opiniones_totales: { asi_no_puedo: 2 } }))
  assert.equal(con?.clave, 'rearmar')
  assert.equal(con.boton, 'Rearmar con lo nuevo')
  assert.equal(con.texto, '2 personas no pueden con esta versión. La versión 2 usa la disponibilidad actualizada y empieza sin confirmaciones: quien ya confirmó tiene que volver a confirmar.')
  const sin = vistaRearmar(base({ opiniones_totales: { asi_no_puedo: null } }))
  assert.match(sin.texto, /^La versión 2 usa la disponibilidad actualizada/)
  assert.doesNotMatch(sin.texto, /\d+ persona/)
  assert.equal(vistaRearmar(base()).texto, sin.texto)
})

test('tope de versiones: aviso sin botón; la última posible se avisa antes', () => {
  assert.equal(TOPE_VERSIONES, 3)
  const v2 = vistaRearmar(base({ opcion: { version: 2 } }))
  assert.equal(v2.nota, 'Será la última versión posible (3).')
  assert.equal(vistaRearmar(base()).nota, 'Se puede rearmar hasta la versión 3.')
  const v3 = vistaRearmar(base({ opcion: { version: 3 } }))
  assert.equal(v3.clave, 'tope_versiones')
  assert.equal(v3.boton, null)
  const porError = vistaRearmar(base(), { codigo: 'sin_alternativa', detalle: 'tope_versiones' })
  assert.equal(porError.clave, 'tope_versiones')
})

test('sin alternativa: no baja el mínimo ni finge un plan; deja reintentar si el servidor lo permite', () => {
  const a = vistaRearmar(base(), { codigo: 'sin_alternativa', detalle: 'sin_alternativa' })
  assert.equal(a.clave, 'sin_alternativa')
  assert.match(a.texto, /No se baja el mínimo/)
  assert.equal(a.boton, 'Volver a intentar')
  assert.equal(vistaRearmar(base({ mi_situacion: org(false) }), { codigo: 'sin_alternativa', detalle: 'sin_alternativa' }).boton, null)
})

test('ningún texto nombra a nadie', () => {
  for (const v of [vistaRearmar(base({ opiniones_totales: { asi_no_puedo: 3 } })), vistaRearmar(base({ opcion: { version: 3 } }))]) {
    assert.doesNotMatch(v.titulo + v.texto + (v.nota ?? ''), /Vale/)
  }
})
