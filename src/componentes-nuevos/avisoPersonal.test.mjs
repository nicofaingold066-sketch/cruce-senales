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
  })

test('quien se retiró: gracias, sin pedir motivo', () => {
  const a = avisoParaMi({ estado: 'reuniendo_interes', imprescindible: vale, mi_situacion: yo({ retirado: true }) })
  assert.equal(a?.clave, 'te_retiraste')
  assert.match(a.texto, /No hace falta contar por qué/)
})

test('en revisión: sin nombre ni motivo; organizador con dos salidas', () => {
  const opcion = { cupos: { faltan_para_minimo: 1 } }
  const org = avisoParaMi({ estado: 'en_revision', imprescindible: vale, mi_situacion: yo({ condiciones: 'completas' }), opcion })
  assert.equal(org?.clave, 'cambio_el_plan')
  assert.equal(org.texto, 'Una persona se retiró. Falta 1 para el mínimo. Puedes buscar otra fecha o ver otra forma de juntarse.')
  const ana = yo({ miembro_id: 'm-ana', es_organizador: false, condiciones: 'completas', elegible_en_version: true })
  const a = avisoParaMi({ estado: 'en_revision', imprescindible: vale, mi_situacion: ana, opcion: { cupos: { faltan_para_minimo: 2 } } })
  assert.match(a.texto, /^Una persona se retiró\. Faltan 2 para el mínimo\. Si sale una versión nueva/)
  assert.doesNotMatch(a.titulo + a.texto, /Vale|Ana|porque|se bajó|había confirmado/)
  const sinOpcion = avisoParaMi({ estado: 'en_revision', imprescindible: vale, mi_situacion: ana })
  assert.equal(sinOpcion.texto, 'Una persona se retiró. Si sale una versión nueva, las confirmaciones anteriores no cuentan: confírmala de nuevo si te sirve.')
})

test('grupo confirmado: gracias al organizador, nada a los demás', () => {
  const org = avisoParaMi({ estado: 'grupo_confirmado', imprescindible: vale, mi_situacion: yo({ condiciones: 'completas', elegible_en_version: true }) })
  assert.equal(org?.clave, 'gracias_por_moverlo')
  assert.equal(org?.tono, 'ok')
  const ana = yo({ miembro_id: 'm-ana', es_organizador: false, condiciones: 'completas', elegible_en_version: true })
  assert.equal(avisoParaMi({ estado: 'grupo_confirmado', imprescindible: vale, mi_situacion: ana }), null)
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

test('quien puede confirmar: su confirmación solo vale si llegan al mínimo', () => {
  const ana = yo({ miembro_id: 'm-ana', es_organizador: false, condiciones: 'completas', elegible_en_version: true })
  const a = avisoParaMi({ estado: 'esperando_compromisos', imprescindible: vale, mi_situacion: ana, minimo: 4 }, { plazoTexto: 'jue 29 oct, 20:00' })
  assert.equal(a?.clave, 'solo_vale_si_llegan')
  assert.equal(a.titulo, 'Si no llegan 4, nadie queda comprometido')
  assert.match(a.texto, /^Tu confirmación solo vale si llegan 4\. Se cierra jue 29 oct, 20:00;/)
  assert.equal(avisoParaMi({ estado: 'esperando_compromisos', imprescindible: vale, mi_situacion: { ...ana, acepte_version: true }, minimo: 4 }), null)
})

test('organizador cerca del cierre con pendientes: hoy conviene recordar; lejos o sin pendientes, no', () => {
  const org = yo({ condiciones: 'completas', elegible_en_version: true, acepte_version: true })
  const opcion = { cupos: { pendientes: 2 } }
  const a = avisoParaMi({ estado: 'esperando_compromisos', imprescindible: vale, mi_situacion: org, opcion, minimo: 4 }, { plazoTexto: 'mañana', horasAlCierre: 20 })
  assert.equal(a?.clave, 'hoy_conviene_recordar')
  assert.match(a.texto, /^Faltan 2 por confirmar y se cierra mañana\. CRUXE no manda avisos solo/)
  assert.equal(avisoParaMi({ estado: 'esperando_compromisos', imprescindible: vale, mi_situacion: org, opcion, minimo: 4 }, { horasAlCierre: 80 }), null)
  assert.equal(avisoParaMi({ estado: 'esperando_compromisos', imprescindible: vale, mi_situacion: org, opcion: { cupos: { pendientes: 0 } }, minimo: 4 }, { horasAlCierre: 10 }), null)
  assert.equal(avisoParaMi({ estado: 'esperando_compromisos', imprescindible: vale, mi_situacion: org, opcion: { cupos: { pendientes: null } }, minimo: 4 }, { horasAlCierre: 10 }), null)
})

test('enmienda 13: quien marcó "así no puedo" sigue en el plan y puede actualizar su disponibilidad', () => {
  const ana = yo({ miembro_id: 'm-ana', es_organizador: false, condiciones: 'completas', elegible_en_version: true, mi_opinion: 'asi_no_puedo', puede: { guardar_condiciones: true } })
  const a = avisoParaMi({ estado: 'esperando_compromisos', imprescindible: vale, mi_situacion: ana, minimo: 4 })
  assert.equal(a?.clave, 'marcaste_asi_no_puedo')
  assert.equal(a?.irARespuesta, true)
  assert.match(a.texto, /^Sigues en el plan\./)
  // Si después confirma, el aviso deja de salir.
  const conf = avisoParaMi({ estado: 'esperando_compromisos', imprescindible: vale, mi_situacion: { ...ana, acepte_version: true }, minimo: 4 })
  assert.notEqual(conf?.clave, 'marcaste_asi_no_puedo')
  // Sin la enmienda (sin mi_opinion), el aviso de siempre.
  const sinE13 = avisoParaMi({ estado: 'esperando_compromisos', imprescindible: vale, mi_situacion: { ...ana, mi_opinion: undefined }, minimo: 4 })
  assert.equal(sinE13?.clave, 'solo_vale_si_llegan')
})

test('ningún aviso nombra a nadie (baja sin nombre, enmienda 13 (c))', () => {
  const imp = { miembro_id: 'm-caro', nombre: 'Carolina', simulado: false }
  const estados = ['reuniendo_interes', 'esperando_compromisos', 'grupo_confirmado', 'en_revision', 'expirado', 'cancelado']
  const personas = [
    yo({ miembro_id: 'm-caro', nombre: 'Carolina' }),
    yo({ miembro_id: 'm-beto', nombre: 'Bernardo', es_organizador: false, condiciones: 'completas', elegible_en_version: true }),
    yo({ miembro_id: 'm-dani', nombre: 'Daniela', es_organizador: false, condiciones: 'incompletas', elegible_en_version: false, puede: { guardar_condiciones: true } }),
    yo({ miembro_id: 'm-eli', nombre: 'Elisa', retirado: true }),
    yo({ miembro_id: 'm-fer', nombre: 'Fernando', es_organizador: false, elegible_en_version: true, mi_opinion: 'asi_no_puedo' }),
  ]
  let vistos = 0
  for (const estado of estados) for (const persona of personas) {
    const a = avisoParaMi(
      { estado, imprescindible: imp, mi_situacion: persona, minimo: 4, opcion: { cupos: { faltan_para_minimo: 1, pendientes: 2 } }, bajas: [{ miembro: { nombre: 'Gabriela' } }] },
      { plazoTexto: 'jue 29 oct, 20:00', horasAlCierre: 10 },
    )
    if (!a) continue
    vistos++
    assert.doesNotMatch(a.titulo + ' ' + a.texto, /Carolina|Bernardo|Daniela|Elisa|Fernando|Gabriela/, `${estado}/${persona.nombre}`)
  }
  assert.ok(vistos >= 8, `se revisaron ${vistos} avisos`)
})
