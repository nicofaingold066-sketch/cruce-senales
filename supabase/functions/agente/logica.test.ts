// Pruebas de la lógica pura del agente: sin red, sin base y sin modelo (mejora #38).
// Correr con: node --test supabase/functions/agente/
// Usa solo el corredor de pruebas de Node (node:test), sin dependencias nuevas. Datos ficticios del caso.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  candidatasDe,
  climaPedido,
  climaSimulado,
  entradaModelo,
  esSabado,
  leerPronostico,
  mensajeFijo,
  perfilParaRespuesta,
  resumenClima,
  sinNombres,
  textoValido,
  unirFrases,
  validarSalidaModelo,
  type Candidata,
  type PerfilGrupo,
  type ResultadoPlan,
} from './logica.ts'

const NOMBRES = ['Tomi', 'Luna', 'Mati', 'Caro', 'Fede', 'Sofi']

const ASADO: Candidata = {
  id: 'lugar-sim-01',
  actividad: 'asado',
  actividad_etiqueta: 'Asado',
  lugar: { id: 'lugar-sim-01', nombre: 'Quincho de Tomi (Simulación)', simulado: true },
  titulo: 'Asado en casa de Tomi',
  franjas: [
    { inicio: '2026-10-31T14:00', fin: '2026-10-31T17:00' },
    { inicio: '2026-11-01T14:00', fin: '2026-11-01T17:00' },
  ],
  frases_grupo: ['presupuesto_todos', 'bajo_techo', 'el_mas_elegido', 'ritmo_del_grupo'],
}

const PARQUE: Candidata = {
  id: 'lugar-sim-04',
  actividad: 'parque',
  actividad_etiqueta: 'Parque',
  lugar: { id: 'lugar-sim-04', nombre: 'Parque de la comuna (Simulación)', simulado: true },
  titulo: 'Picnic en el parque',
  franjas: [
    { inicio: '2026-10-31T12:00', fin: '2026-10-31T15:00' },
    { inicio: '2026-11-01T12:00', fin: '2026-11-01T15:00' },
  ],
  frases_grupo: ['presupuesto_todos', 'al_aire_libre_con_buen_tiempo', 'ritmo_del_grupo'],
}

const PERFIL_5: PerfilGrupo = {
  personas: 5,
  gustos: [
    { actividad_etiqueta: 'Asado', cuantos: 4 },
    { actividad_etiqueta: 'Fútbol', cuantos: 2 },
    { actividad_etiqueta: 'Pádel', cuantos: 1 },
    { actividad_etiqueta: 'Fiesta', cuantos: 1 },
  ],
  energia_mayoritaria: 'algo_tranquilo',
  ambiente_mayoritario: 'tranquilo',
  presupuesto_grupo: 'moderado',
}

test('textoValido acepta invitaciones normales', () => {
  for (const t of [
    '¡Hola! Les propongo un asado en el quincho el sábado 31 o el domingo 1. Marquen si les interesa.',
    'Elijan una de las dos fechas y marquen si les interesa.',
    'Que cada uno de ustedes marque su disponibilidad.',
    '¡No pueden faltar! Es barato, nada caro.',
    '¡Salud por el asado del sábado con todo el grupo!',
    'Marquen si les interesa y confirmen en CRUXE cuando se publique.',
  ]) {
    assert.equal(textoValido(t, 320, NOMBRES), true, t)
  }
})

test('textoValido rechaza nombres, situaciones personales y promesas que no pasaron', () => {
  for (const t of [
    'Les propongo el asado en casa de Tomi el sábado.',
    'Caro, este plan es para ti el sábado.',
    'Como alguien no tiene plata, elegimos algo barato.',
    'El plan ya está confirmado para el sábado a las dos.',
    'Uno de ustedes no puede pagar, así que es barato.',
    'Es ideal para quien anda cansado esta semana.',
    'Lo reservamos en el club para el domingo.',
    'Ya agendé el quincho para el sábado.',
  ]) {
    assert.equal(textoValido(t, 320, NOMBRES), false, t)
  }
})

test('textoValido rechaza lo que no es texto, lo muy corto, lo muy largo y los saltos de línea', () => {
  assert.equal(textoValido(undefined, 320, NOMBRES), false)
  assert.equal(textoValido(42, 320, NOMBRES), false)
  assert.equal(textoValido('Corto.', 320, NOMBRES), false)
  assert.equal(textoValido('a'.repeat(241), 240, NOMBRES), false)
  assert.equal(textoValido('Primera línea del mensaje.\nSegunda línea.', 320, NOMBRES), false)
})

test('sinNombres saca los nombres de los integrantes de los textos del catálogo', () => {
  assert.equal(sinNombres('Asado en casa de Tomi', NOMBRES), 'Asado en casa')
  assert.equal(sinNombres('Quincho de Tomi', NOMBRES), 'Quincho')
  assert.equal(sinNombres('Picnic en el parque', NOMBRES), 'Picnic en el parque')
  // "caro" como palabra común no es un nombre del catálogo, pero se trata igual: mejor de más que de menos.
  assert.equal(sinNombres('Fútbol con Fede', NOMBRES), 'Fútbol')
})

test('entradaModelo no lleva nombres ni ids de integrantes', () => {
  const e = entradaModelo([ASADO, PARQUE], PERFIL_5, 'Sábado sin lluvia.', NOMBRES)
  const json = JSON.stringify(e)
  for (const n of NOMBRES) assert.equal(json.includes(n), false, `aparece ${n}`)
  assert.equal(json.includes('miembro'), false)
  assert.deepEqual(
    e.opciones.map((o) => o.id),
    ['lugar-sim-01', 'lugar-sim-04'],
  )
  assert.equal(e.opciones[0].plan, 'Asado en casa')
  assert.equal(e.opciones[0].lugar, 'Quincho')
})

test('entradaModelo solo manda gustos que eligieron al menos 2 personas', () => {
  const e = entradaModelo([ASADO], PERFIL_5, 'Sin pronóstico disponible.', NOMBRES)
  assert.deepEqual(e.grupo.gustos, ['Asado: 4 de 5', 'Fútbol: 2 de 5'])
  assert.equal(e.grupo.ritmo, 'algo tranquilo')
  assert.equal(e.grupo.presupuesto, 'algo económico')
})

test('entradaModelo con 3 personas o menos manda solo la cantidad', () => {
  const e = entradaModelo([ASADO], { ...PERFIL_5, personas: 3 }, 'Sin pronóstico disponible.', NOMBRES)
  assert.deepEqual(e.grupo, { personas: 3, gustos: [], ritmo: null, ambiente: null, presupuesto: null })
})

test('perfilParaRespuesta filtra gustos de una persona y reduce los grupos chicos', () => {
  assert.deepEqual(perfilParaRespuesta(PERFIL_5)?.gustos, [
    { actividad_etiqueta: 'Asado', cuantos: 4 },
    { actividad_etiqueta: 'Fútbol', cuantos: 2 },
  ])
  assert.deepEqual(perfilParaRespuesta({ ...PERFIL_5, personas: 2 }), { personas: 2 })
  assert.equal(perfilParaRespuesta(null), null)
})

test('climaPedido: el clima simulado solo vale en un espacio demo y con un valor válido', () => {
  assert.equal(climaPedido(true, 'seco'), 'seco')
  assert.equal(climaPedido(true, 'lluvia'), 'lluvia')
  assert.equal(climaPedido(true, 'granizo'), null)
  assert.equal(climaPedido(true, undefined), null)
  assert.equal(climaPedido(false, 'seco'), null)
  assert.equal(climaPedido(false, 'lluvia'), null)
})

test('clima simulado: rótulo claro y el texto fijo no habla de pronóstico', () => {
  assert.equal(resumenClima(climaSimulado('seco')), 'Simulación: sábado y domingo con sol.')
  assert.equal(resumenClima(climaSimulado('lluvia')), 'Simulación: sábado y domingo con lluvia.')
  assert.match(unirFrases(PARQUE.frases_grupo, true), /con el sol de la simulación/)
  assert.doesNotMatch(unirFrases(PARQUE.frases_grupo, true), /pronóstico/)
  assert.match(unirFrases(PARQUE.frases_grupo, false), /con buen pronóstico/)
  // La frase no repite "y": "…, es al aire libre con buen pronóstico y va con el ritmo…".
  assert.equal(unirFrases(PARQUE.frases_grupo).split(' y ').length, 2)
})

test('leerPronostico: lluvia por probabilidad o por código, y nunca inventa buen tiempo', () => {
  const j = {
    daily: {
      time: ['2026-10-31', '2026-11-01'],
      precipitation_probability_max: [60, 10],
      weather_code: [3, 61],
      temperature_2m_max: [18.4, 22.6],
    },
  }
  const c = leerPronostico(j, '2026-10-31')
  assert.deepEqual(c.sabado, { estado: 'lluvia', maxima: 18 })
  assert.deepEqual(c.domingo, { estado: 'lluvia', maxima: 23 })
  assert.deepEqual(leerPronostico({ daily: { time: ['2026-10-31'], precipitation_probability_max: [5], weather_code: [1] } }, '2026-10-31').sabado, {
    estado: 'seco',
    maxima: null,
  })
  const vacio = leerPronostico({}, '2026-10-31')
  assert.equal(vacio.sabado.estado, 'desconocido')
  assert.equal(vacio.domingo.estado, 'desconocido')
  assert.equal(resumenClima({ ...vacio, fuente: 'sin_pronostico' }), 'Sin pronóstico disponible.')
})

test('validarSalidaModelo: la elección tiene que estar entre las candidatas y los textos ser válidos', () => {
  const buena = JSON.stringify({
    eleccion_id: 'lugar-sim-04',
    explicacion: 'Es al aire libre, sirve a todos y va con el ritmo tranquilo del grupo.',
    mensaje_al_grupo: '¡Hola! Les propongo un picnic en el parque el sábado 31 o el domingo 1. Marquen si les interesa.',
  })
  const r = validarSalidaModelo(buena, [ASADO, PARQUE], NOMBRES)
  assert.equal(r?.eleccion.id, 'lugar-sim-04')
  assert.equal(validarSalidaModelo(JSON.stringify({ ...JSON.parse(buena), eleccion_id: 'lugar-sim-02' }), [ASADO, PARQUE], NOMBRES), null)
  assert.equal(
    validarSalidaModelo(JSON.stringify({ ...JSON.parse(buena), mensaje_al_grupo: 'Luna, te va a encantar el parque el sábado.' }), [ASADO, PARQUE], NOMBRES),
    null,
  )
  assert.equal(validarSalidaModelo('esto no es JSON', [ASADO, PARQUE], NOMBRES), null)
  assert.equal(validarSalidaModelo('null', [ASADO, PARQUE], NOMBRES), null)
})

test('candidatasDe: sin la enmienda 4.1 la única opción es la del servidor, con el id del catálogo', () => {
  const { id: _id, ...sinId } = ASADO
  const base = { ...sinId, tipo: 'borrador', personas_consideradas: 6 } as unknown as ResultadoPlan
  assert.deepEqual(
    candidatasDe(base).map((c) => c.id),
    ['lugar-sim-01'],
  )
  const conCuatro = { ...ASADO, tipo: 'borrador', personas_consideradas: 6, candidatas: [ASADO, PARQUE, ASADO, PARQUE] } as ResultadoPlan
  assert.equal(candidatasDe(conCuatro).length, 3)
})

test('mensajeFijo y esSabado', () => {
  assert.equal(
    mensajeFijo(ASADO),
    '¡Hola! Les propongo asado en casa de Tomi el sábado 31 de 14:00 a 17:00 o el domingo 1 de 14:00 a 17:00. Marquen si les interesa y carguen su disponibilidad en CRUXE.',
  )
  assert.equal(esSabado('2026-10-31'), true)
  assert.equal(esSabado('2026-10-30'), false)
  assert.equal(esSabado('31-10-2026'), false)
})
