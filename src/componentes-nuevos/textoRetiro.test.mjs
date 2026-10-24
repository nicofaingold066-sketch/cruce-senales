// Pruebas de la ayuda junto a "Retirarme" (ux-flujo). Correr con: node --test "src/componentes-nuevos/*.test.mjs"
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { conEnmienda13, textoAyudaRetiro } from './textoRetiro.ts'

const yo = (extra = {}) => ({
  miembro_id: 'm-ana', nombre: 'Ana', retirado: false, acepte_version: false, elegible_en_version: null,
  puede: { retirarme: true }, ...extra,
})

test('antes de la opción: marcar "No puedo" en la fecha que no sirve', () => {
  assert.equal(textoAyudaRetiro({ estado: 'reuniendo_interes', mi_situacion: yo() }), 'Si solo una de las fechas no te sirve, márcala como "No puedo". Retirarte es para no participar más en este plan.')
})

test('con la versión publicada: "Así no puedo, pero sigo" si existe la enmienda 13; si no, no confirmar', () => {
  const con = textoAyudaRetiro({ estado: 'esperando_compromisos', mi_situacion: yo({ elegible_en_version: true, mi_opinion: null }) })
  assert.equal(con, 'Si solo esta fecha no te sirve, usa "Así no puedo, pero sigo". Retirarte es para no participar más en este plan.')
  const sin = textoAyudaRetiro({ estado: 'esperando_compromisos', mi_situacion: yo({ elegible_en_version: true }) })
  assert.equal(sin, 'Si solo esta fecha no te sirve, no confirmes. Retirarte es para no participar más en este plan.')
})

test('quien ya confirmó: sin pedir motivo; "sin decir quién" solo con la enmienda 13', () => {
  assert.match(textoAyudaRetiro({ estado: 'grupo_confirmado', mi_situacion: yo({ acepte_version: true, mi_opinion: null }) }), /sin decir quién\. No hace falta contar por qué\.$/)
  assert.doesNotMatch(textoAyudaRetiro({ estado: 'grupo_confirmado', mi_situacion: yo({ acepte_version: true }) }), /sin decir quién/)
})

test('sin alternativa que ofrecer o sin poder retirarse: nada', () => {
  assert.equal(textoAyudaRetiro({ estado: 'en_revision', mi_situacion: yo() }), null)
  assert.equal(textoAyudaRetiro({ estado: 'esperando_compromisos', mi_situacion: yo({ elegible_en_version: false }) }), null)
  assert.equal(textoAyudaRetiro({ estado: 'reuniendo_interes', mi_situacion: yo({ retirado: true }) }), null)
  assert.equal(textoAyudaRetiro({ estado: 'reuniendo_interes', mi_situacion: yo({ puede: { retirarme: false } }) }), null)
})

test('conEnmienda13 mira la clave, no el valor', () => {
  assert.equal(conEnmienda13({ mi_opinion: null }), true)
  assert.equal(conEnmienda13({}), false)
})
