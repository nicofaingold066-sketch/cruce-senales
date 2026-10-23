// Pruebas del aviso personal (ux-flujo). Correr con: node --test "src/componentes-nuevos/*.test.mjs"
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { avisoParaMi } from './avisoPersonal.ts'

const vale = { miembro_id: 'm-vale', nombre: 'Vale', simulado: false }
const yo = (extra = {}) => ({
  miembro_id: 'm-vale', nombre: 'Vale', es_organizador: true, es_organizador_espacio: true, interesado: false,
  condiciones: 'sin_cargar', retirado: false, elegible_en_version: null, acepte_version: false, puede: {}, ...extra,
})

test('imprescindible sin condiciones en reuniendo interés: primero su disponibilidad', () => {
  for (const condiciones of ['sin_cargar', 'incompletas']) {
    const a = avisoParaMi({ estado: 'reuniendo_interes', imprescindible: vale, mi_situacion: yo({ condiciones }) })
    assert.equal(a?.clave, 'primero_tu_disponibilidad')
    assert.equal(a?.irARespuesta, true)
  }
})

test('imprescindible con condiciones completas: sin aviso', () => {
  assert.equal(avisoParaMi({ estado: 'reuniendo_interes', imprescindible: vale, mi_situacion: yo({ condiciones: 'completas' }) }), null)
})

test('otra persona sin condiciones no recibe el aviso del imprescindible', () => {
  const ana = yo({ miembro_id: 'm-ana', nombre: 'Ana', es_organizador: false })
  assert.equal(avisoParaMi({ estado: 'reuniendo_interes', imprescindible: vale, mi_situacion: ana }), null)
})

test('no elegible en la versión: "Esta versión es sin ti", con o sin grupo confirmado', () => {
  const coni = yo({ miembro_id: 'm-coni', nombre: 'Coni', condiciones: 'completas', elegible_en_version: false })
  for (const estado of ['esperando_compromisos', 'grupo_confirmado']) {
    const a = avisoParaMi({ estado, imprescindible: vale, mi_situacion: coni })
    assert.equal(a?.clave, 'version_sin_ti')
    assert.equal(a?.irARespuesta, false)
    // No nombra a nadie más.
    assert.doesNotMatch(a.titulo + a.texto, /Vale|Coni/)
  }
})

test('elegible o sin versión: sin aviso; retirado: sin aviso', () => {
  const ana = yo({ miembro_id: 'm-ana', condiciones: 'completas', elegible_en_version: true })
  assert.equal(avisoParaMi({ estado: 'esperando_compromisos', imprescindible: vale, mi_situacion: ana }), null)
  assert.equal(avisoParaMi({ estado: 'en_revision', imprescindible: vale, mi_situacion: { ...ana, elegible_en_version: false } }), null)
  assert.equal(avisoParaMi({ estado: 'reuniendo_interes', imprescindible: vale, mi_situacion: yo({ retirado: true }) }), null)
})

test('no elegible con disponibilidad incompleta: no promete entrar en esta versión', () => {
  const ema = yo({ miembro_id: 'm-ema', condiciones: 'incompletas', elegible_en_version: false, puede: { guardar_condiciones: true } })
  const a = avisoParaMi({ estado: 'esperando_compromisos', imprescindible: vale, mi_situacion: ema })
  assert.equal(a?.clave, 'version_sin_ti')
  assert.equal(a?.irARespuesta, true)
  assert.match(a.texto, /si el plan se rearma/)
  assert.doesNotMatch(a.texto, /entrar en (la|esta) opción/)
  const sinGuardar = avisoParaMi({ estado: 'grupo_confirmado', imprescindible: vale, mi_situacion: { ...ema, puede: {} } })
  assert.equal(sinGuardar?.irARespuesta, false)
})
