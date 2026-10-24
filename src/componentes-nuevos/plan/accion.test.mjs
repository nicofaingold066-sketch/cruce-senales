// Pruebas puras de la acción primaria del plan (S4). Correr con: node --test "src/componentes-nuevos/plan/*.test.mjs"
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { accionPrimaria, cuentaConfirmados, etapaDe, porQueNoConfirmo, textoComoSalio, textoRegla } from './accion.ts'

const nada = {
  abrir: false, marcar_interes: false, guardar_condiciones: false, evaluar: false, aceptar: false,
  retirarme: false, proponer_reparacion: false, cancelar: false, simular: false, opinar: false,
}
const yo = (extra = {}, puede = {}) => ({
  miembro_id: 'm-ana', nombre: 'Ana', es_organizador: false, es_organizador_espacio: false, interesado: false,
  condiciones: 'completas', retirado: false, elegible_en_version: true, acepte_version: false, puede: { ...nada, ...puede }, ...extra,
})
const opcion = (version, confirmados = 1, extra = {}) => ({
  version,
  franja: { clave: 'A', inicio: { local: '2026-10-31T20:00:00', utc: '2026-10-31T23:00:00Z' }, fin: { local: '2026-10-31T23:00:00', utc: '2026-11-01T02:00:00Z' } },
  publicada_en: { local: '2026-10-29T12:00:00', utc: '2026-10-29T15:00:00Z' },
  aceptaron: [],
  cupos: { minimo: 4, maximo: 6, confirmados, disponibles: 6 - confirmados, faltan_para_minimo: 4 - confirmados, imprescindible_acepto: true, pendientes: null, reservado_imprescindible: false, libres_para_otros: 6 - confirmados, ...extra },
})
const p = (estado, mi_situacion, extra = {}) => ({
  estado, mi_situacion, siguiente_accion: { codigo: 'reunir_condiciones', texto: '' }, ultima_evaluacion: null, opcion: null, opiniones_totales: null, plazo_vencido: false, ...extra,
})

test('confirmar manda sobre todo lo demás cuando el servidor dice puede.aceptar', () => {
  const a = accionPrimaria(p('esperando_compromisos', yo({}, { aceptar: true, proponer_reparacion: true }), { opcion: opcion(2), opiniones_totales: { asi_no_puedo: 3 } }))
  assert.deepEqual(a, { clave: 'confirmar', texto: 'Confirmar versión 2', version: 2 })
})

test('quien se retiró no tiene acción', () => {
  assert.equal(accionPrimaria(p('esperando_compromisos', yo({ retirado: true }, { aceptar: true }), { opcion: opcion(1) })), null)
})

test('borrador: abrir solo si puede', () => {
  assert.deepEqual(accionPrimaria(p('borrador', yo({}, { abrir: true }))), { clave: 'abrir', texto: 'Abrir propuesta' })
  assert.equal(accionPrimaria(p('borrador', yo())), null)
})

test('reuniendo: sin responder, la acción es responder en un toque (también para quien organiza)', () => {
  const a = accionPrimaria(p('reuniendo_interes', yo({ condiciones: 'sin_cargar' }, { guardar_condiciones: true, evaluar: true })))
  assert.deepEqual(a, { clave: 'responder', texto: 'Responder en un toque' })
})

test('reuniendo: buscar es primario solo cuando el servidor dice buscar_opcion', () => {
  const org = yo({}, { evaluar: true })
  assert.deepEqual(accionPrimaria(p('reuniendo_interes', org)), { clave: 'buscar_opcion', texto: 'Buscar opción compatible', secundaria: true })
  assert.deepEqual(accionPrimaria(p('reuniendo_interes', org, { siguiente_accion: { codigo: 'buscar_opcion', texto: '' } })), { clave: 'buscar_opcion', texto: 'Buscar opción compatible', secundaria: false })
})

test('reuniendo: tras "sin opción", volver a buscar es primario', () => {
  const a = accionPrimaria(p('reuniendo_interes', yo({}, { evaluar: true }), { ultima_evaluacion: { resultado: 'sin_opcion', version: null, en: { local: '', utc: '' } } }))
  assert.deepEqual(a, { clave: 'buscar_opcion', texto: 'Volver a buscar opción', secundaria: false })
})

test('reuniendo: quien no organiza y ya respondió no tiene acción', () => {
  assert.equal(accionPrimaria(p('reuniendo_interes', yo({}, { guardar_condiciones: true }))), null)
})

test('esperando: rearmar solo con 2 o más "así no puedo" (con 1 o null, nada)', () => {
  const org = yo({ acepte_version: true }, { proponer_reparacion: true })
  assert.deepEqual(accionPrimaria(p('esperando_compromisos', org, { opcion: opcion(1), opiniones_totales: { asi_no_puedo: 2 } })), { clave: 'rearmar', texto: 'Rearmar con lo nuevo' })
  assert.equal(accionPrimaria(p('esperando_compromisos', org, { opcion: opcion(1), opiniones_totales: { asi_no_puedo: null } })), null)
  assert.equal(accionPrimaria(p('esperando_compromisos', org, { opcion: opcion(1), opiniones_totales: { asi_no_puedo: 1 } })), null)
})

test('en revisión: buscar alternativa para quien puede; "volver a" tras sin alternativa', () => {
  const org = yo({}, { proponer_reparacion: true })
  assert.deepEqual(accionPrimaria(p('en_revision', org, { opcion: opcion(1) })), { clave: 'buscar_alternativa', texto: 'Buscar alternativa' })
  assert.deepEqual(accionPrimaria(p('en_revision', org, { opcion: opcion(1), ultima_evaluacion: { resultado: 'sin_alternativa', version: 1, en: { local: '', utc: '' } } })), { clave: 'buscar_alternativa', texto: 'Volver a buscar alternativa' })
  assert.equal(accionPrimaria(p('en_revision', yo(), { opcion: opcion(1) })), null)
})

test('confirmado: calendario solo para quien confirmó', () => {
  assert.deepEqual(accionPrimaria(p('grupo_confirmado', yo({ acepte_version: true }), { opcion: opcion(1, 4) })), { clave: 'calendario', texto: 'Calendario' })
  assert.equal(accionPrimaria(p('grupo_confirmado', yo(), { opcion: opcion(1, 4) })), null)
})

test('cancelado y expirado: nada', () => {
  assert.equal(accionPrimaria(p('cancelado', yo({}, { cancelar: true }))), null)
  assert.equal(accionPrimaria(p('expirado', yo())), null)
})

test('por qué no confirmo: una línea por causa, en el orden del servidor', () => {
  const base = { estado: 'esperando_compromisos', plazo_vencido: false, opcion: opcion(1) }
  assert.equal(porQueNoConfirmo({ ...base, mi_situacion: yo({}, { aceptar: true }) }), null)
  assert.equal(porQueNoConfirmo({ ...base, mi_situacion: yo({ acepte_version: true }) }), 'Ya confirmaste la versión 1.')
  assert.equal(porQueNoConfirmo({ ...base, mi_situacion: yo({ elegible_en_version: false }) }), 'No formas parte de las personas que pueden aceptar esta versión.')
  assert.equal(porQueNoConfirmo({ ...base, plazo_vencido: true, mi_situacion: yo({ elegible_en_version: false }) }), 'Esta versión se armó sin ti y el plazo de aceptación ya cerró.')
  assert.equal(porQueNoConfirmo({ ...base, plazo_vencido: true, mi_situacion: yo() }), 'El plazo de aceptación ya cerró.')
  assert.match(porQueNoConfirmo({ ...base, mi_situacion: yo({ motivo_aceptar: 'cupo_reservado' }) }), /reservado para quien no puede faltar/)
  assert.equal(porQueNoConfirmo({ ...base, opcion: opcion(1, 6), mi_situacion: yo() }), 'Ya se completaron los cupos de esta versión.')
  assert.equal(porQueNoConfirmo({ ...base, estado: 'en_revision', mi_situacion: yo() }), null)
  assert.equal(porQueNoConfirmo({ ...base, opcion: null, mi_situacion: yo() }), null)
})

test('cuenta de confirmados (#56) y regla del motor (E15)', () => {
  assert.equal(cuentaConfirmados(2, 4), '2 de 4')
  assert.equal(cuentaConfirmados(5, 4), '5 (mínimo 4)')
  assert.equal(textoRegla('mas_si', 4), 'la que pueden más personas')
  assert.equal(textoRegla('temprana', 4), 'la fecha más temprana en la que llegan al mínimo (4)')
  assert.equal(textoRegla(undefined, 3), 'la fecha más temprana en la que llegan al mínimo (3)')
})

test('cómo salió: cuántos respondieron solo con el dato del servidor (organiza); nunca quién', () => {
  const base = { estado: 'esperando_compromisos', regla: 'temprana', minimo: 4, personas_con_condiciones: null, opcion: opcion(1), ultima_evaluacion: { resultado: 'opcion_publicada', version: 1 } }
  assert.equal(textoComoSalio(base), 'Cómo salió: se eligió la fecha más temprana en la que llegan al mínimo (4).')
  assert.equal(textoComoSalio({ ...base, personas_con_condiciones: 5 }), 'Cómo salió: 5 respondieron; se eligió la fecha más temprana en la que llegan al mínimo (4).')
  assert.equal(textoComoSalio({ ...base, regla: 'mas_si', personas_con_condiciones: 1 }), 'Cómo salió: 1 respondió; se eligió la que pueden más personas.')
  assert.match(textoComoSalio({ ...base, opcion: opcion(2), ultima_evaluacion: { resultado: 'reparacion_publicada', version: 2 } }), /después del cambio\.$/)
  assert.equal(textoComoSalio({ ...base, estado: 'reuniendo_interes', opcion: null, ultima_evaluacion: null }), 'Cómo sale: cuando haya respuestas, se elige la fecha más temprana en la que llegan al mínimo (4).')
  assert.equal(textoComoSalio({ ...base, estado: 'reuniendo_interes', opcion: null, personas_con_condiciones: 3, ultima_evaluacion: { resultado: 'sin_opcion' } }), 'Cómo salió: 3 respondieron; con esas respuestas no hubo una fecha posible.')
})

test('etapas: el grupo confirmado espera el encuentro (no se marca hecho lo que no pasó)', () => {
  assert.equal(etapaDe('reuniendo_interes'), 0)
  assert.equal(etapaDe('en_revision'), 1)
  assert.equal(etapaDe('esperando_compromisos'), 2)
  assert.equal(etapaDe('grupo_confirmado'), 3)
  assert.equal(etapaDe('cancelado'), null)
})

import { etiquetaPlan, textoTuRespuesta } from './accion.ts'

test('rótulo del estado como en el mockup; lo desconocido, como lo manda el servidor', () => {
  assert.equal(etiquetaPlan('reuniendo_interes', 'Reuniendo interés'), 'Reuniendo respuestas')
  assert.equal(etiquetaPlan('esperando_compromisos', 'Esperando compromisos'), 'Esperando confirmaciones')
  assert.equal(etiquetaPlan('grupo_confirmado', 'Grupo confirmado'), '¡Se juntan!')
  assert.equal(etiquetaPlan('en_revision', 'En revisión'), 'En revisión')
  assert.equal(etiquetaPlan('cancelado', 'Cancelado'), 'Cancelado')
})

test('tu respuesta: con lo propio; sin dato, lo que dice el estado de las condiciones', () => {
  const f = [{ clave: 'A', dia: 'sábado' }, { clave: 'B', dia: 'domingo' }]
  assert.equal(textoTuRespuesta({ A: 'si', B: 'si' }, f, 'completas'), 'puedo los dos días')
  assert.equal(textoTuRespuesta({ A: 'si', B: 'no' }, f, 'completas'), 'solo el sábado')
  assert.equal(textoTuRespuesta({ A: 'no', B: 'no' }, f, 'completas'), 'no puedo ninguno')
  assert.equal(textoTuRespuesta({ A: 'si' }, f, 'incompletas'), 'te falta algún día')
  assert.equal(textoTuRespuesta(null, f, 'completas'), 'respondiste')
  assert.equal(textoTuRespuesta(null, f, 'sin_cargar'), 'sin responder')
})
