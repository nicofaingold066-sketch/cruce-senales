// Pruebas de la lógica pura del agente: sin red, sin base y sin modelo (mejora #38).
// Correr con: node --test supabase/functions/agente/
// Usa solo el corredor de pruebas de Node (node:test), sin dependencias nuevas. Datos ficticios del caso.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Buffer } from 'node:buffer'
import {
  armarPedido,
  candidatasDe,
  crearLimiteModelo,
  elegirProveedor,
  GATEWAY_URL,
  MAX_TOKENS_MODELO,
  MODELO_DIRECTO,
  MODELO_GATEWAY,
  modoSalida,
  textoDeRespuesta,
  usuarioDe,
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
    '¡No pueden faltar! Queda cerca y no es caro llegar.',
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
    'Es barato y le sirve a todos.',
    'Una opción gratis para el finde.',
    'Pensado para un presupuesto ajustado.',
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
  // El presupuesto del grupo no le llega al modelo (hallazgo 7).
  assert.equal('presupuesto' in e.grupo, false)
  assert.equal(JSON.stringify(e).includes('moderado'), false)
})

test('entradaModelo con 3 personas o menos manda solo la cantidad', () => {
  const e = entradaModelo([ASADO], { ...PERFIL_5, personas: 3 }, 'Sin pronóstico disponible.', NOMBRES)
  assert.deepEqual(e.grupo, { personas: 3, gustos: [], ritmo: null, ambiente: null })
})

test('perfilParaRespuesta filtra gustos de una persona y reduce los grupos chicos', () => {
  assert.deepEqual(perfilParaRespuesta(PERFIL_5)?.gustos, [
    { actividad_etiqueta: 'Asado', cuantos: 4 },
    { actividad_etiqueta: 'Fútbol', cuantos: 2 },
  ])
  assert.deepEqual(perfilParaRespuesta({ ...PERFIL_5, personas: 2 }), { personas: 2 })
  assert.equal(perfilParaRespuesta(null), null)
  // Sin presupuesto, venga o no en la respuesta de la base (enmienda 7, E7.4).
  assert.equal('presupuesto_grupo' in (perfilParaRespuesta(PERFIL_5) ?? {}), false)
  const { presupuesto_grupo: _p, ...sinCampo } = PERFIL_5
  assert.deepEqual(perfilParaRespuesta(sinCampo), perfilParaRespuesta(PERFIL_5))
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

test('texto fijo con el grupo (mejora #40): nombra ritmo, ambiente y cuántos la eligieron, solo con totales', () => {
  const texto = unirFrases(ASADO.frases_grupo, false, { perfil: PERFIL_5, actividad: 'Asado' })
  assert.equal(
    texto,
    'Le sirve al presupuesto de todos, es bajo techo por si cambia el tiempo, es lo que más eligieron (4 de 5) y va con lo que prefiere la mayoría: un plan algo tranquilo y con ambiente tranquilo.',
  )
  for (const n of NOMBRES) assert.equal(texto.includes(n), false, `aparece ${n}`)
  // Sin ambiente mayoritario, solo el ritmo.
  assert.match(unirFrases(['ritmo_del_grupo'], false, { perfil: { ...PERFIL_5, ambiente_mayoritario: null } }), /mayoría: un plan algo tranquilo\.$/)
})

test('texto fijo con el grupo: con 3 personas o menos, o con una sola persona en la actividad, vuelve al texto general', () => {
  const chico = unirFrases(ASADO.frases_grupo, false, { perfil: { ...PERFIL_5, personas: 3 }, actividad: 'Asado' })
  assert.doesNotMatch(chico, /de 3|mayoría|más eligieron/)
  assert.equal(chico, 'Le sirve al presupuesto de todos, es bajo techo por si cambia el tiempo y va con el ritmo que prefiere el grupo.')
  // Una actividad de una sola persona no se presenta como "lo que más eligieron" (hallazgo 5).
  assert.equal(unirFrases(['bajo_techo', 'el_mas_elegido'], false, { perfil: PERFIL_5, actividad: 'Pádel' }), 'Es bajo techo por si cambia el tiempo.')
  // Sin perfil no se puede saber si delata a alguien: la frase no se dice.
  assert.equal(unirFrases(['el_mas_elegido', 'ritmo_del_grupo']), 'Va con el ritmo que prefiere el grupo.')
})

test('hallazgo 5: el modelo no recibe "lo que más eligieron" si delata a alguien', () => {
  const dos = entradaModelo([PARQUE], { personas: 2 }, 'Sin pronóstico disponible.', NOMBRES)
  const conFrase = { ...PARQUE, frases_grupo: [...PARQUE.frases_grupo, 'el_mas_elegido'] }
  const dosConFrase = entradaModelo([conFrase], { personas: 2 }, 'Sin pronóstico disponible.', NOMBRES)
  assert.deepEqual(dosConFrase.opciones[0].razones, dos.opciones[0].razones)
  assert.equal(JSON.stringify(dosConFrase).includes('más eligieron'), false)
  // Con 5 personas y la actividad elegida por 4, sí, con el conteo.
  const asado = entradaModelo([ASADO], PERFIL_5, 'Sin pronóstico disponible.', NOMBRES)
  assert.ok(asado.opciones[0].razones.includes('es lo que más eligieron (4 de 5)'))
})

// ---- Proveedor del modelo y costo (mejora #64): todo sin red, sin claves reales ni modelo ----

const entorno = (vars: Record<string, string>) => (n: string) => vars[n]

test('proveedor: con clave del Gateway usa el Gateway, aunque también haya clave directa', () => {
  const p = elegirProveedor(entorno({ AI_GATEWAY_API_KEY: 'k-gateway', ANTHROPIC_API_KEY: 'k-directa' }))
  assert.deepEqual(p, { tipo: 'gateway', variableClave: 'AI_GATEWAY_API_KEY', baseURL: GATEWAY_URL, modelo: MODELO_GATEWAY })
  assert.equal(GATEWAY_URL, 'https://ai-gateway.vercel.sh')
  assert.equal(MODELO_GATEWAY, 'anthropic/claude-haiku-5.5')
})

test('proveedor: sin clave del Gateway y con la directa usa la API de Anthropic, sin URL propia', () => {
  const p = elegirProveedor(entorno({ ANTHROPIC_API_KEY: 'k-directa' }))
  assert.deepEqual(p, { tipo: 'anthropic', variableClave: 'ANTHROPIC_API_KEY', modelo: MODELO_DIRECTO })
  assert.equal(p?.baseURL, undefined)
})

test('proveedor: sin ninguna clave, o con claves vacías, no hay modelo', () => {
  assert.equal(elegirProveedor(entorno({})), null)
  assert.equal(elegirProveedor(entorno({ AI_GATEWAY_API_KEY: '', ANTHROPIC_API_KEY: '   ' })), null)
})

test('proveedor: la respuesta nunca lleva el valor de la clave', () => {
  const p = elegirProveedor(entorno({ AI_GATEWAY_API_KEY: 'SECRETO-123' }))
  assert.ok(!JSON.stringify(p).includes('SECRETO-123'))
})

test('proveedor: AGENTE_MODELO solo vale si tiene el formato del proveedor elegido', () => {
  const gw = (m: string) => elegirProveedor(entorno({ AI_GATEWAY_API_KEY: 'k', AGENTE_MODELO: m }))
  assert.equal(gw('anthropic/claude-sonnet-5.5')?.modelo, 'anthropic/claude-sonnet-5.5')
  assert.equal(gw('claude-haiku-5-5')?.modelo, MODELO_GATEWAY, 'un id sin creador no sirve en el Gateway')
  const directo = (m: string) => elegirProveedor(entorno({ ANTHROPIC_API_KEY: 'k', AGENTE_MODELO: m }))
  assert.equal(directo('claude-sonnet-5-5')?.modelo, 'claude-sonnet-5-5')
  assert.equal(directo('anthropic/claude-haiku-5.5')?.modelo, MODELO_DIRECTO, 'un id con barra no sirve en la API directa')
})

test('modoSalida: json por defecto; "herramienta" fuerza una herramienta', () => {
  assert.equal(modoSalida(undefined), 'json')
  assert.equal(modoSalida(''), 'json')
  assert.equal(modoSalida('cualquier cosa'), 'json')
  assert.equal(modoSalida(' Herramienta '), 'herramienta')
})

const CANDIDATAS = [ASADO, { ...ASADO, id: 'lugar-sim-02' }]
const ENTRADA = { clima: 'seco', candidatas: [] }

test('pedido por el Gateway: modelo con creador, esquema JSON con la elección limitada, sin effort y con tope corto', () => {
  const gw = elegirProveedor(entorno({ AI_GATEWAY_API_KEY: 'k' }))!
  const pedido = armarPedido(gw, 'json', CANDIDATAS, 'SISTEMA', ENTRADA) as Record<string, any>
  assert.equal(pedido.model, 'anthropic/claude-haiku-5.5')
  assert.equal(pedido.max_tokens, MAX_TOKENS_MODELO)
  assert.ok(pedido.max_tokens >= 1000 && pedido.max_tokens < 2048, 'tope con lugar para el pensamiento del modelo, por debajo del anterior')
  assert.equal(pedido.output_config.effort, undefined)
  assert.equal(pedido.output_config.format.type, 'json_schema')
  assert.deepEqual(pedido.output_config.format.schema.properties.eleccion_id.enum, ['lugar-sim-01', 'lugar-sim-02'])
  assert.equal(pedido.output_config.format.schema.additionalProperties, false)
  assert.equal(pedido.tools, undefined)
  assert.equal(pedido.temperature, undefined)
  assert.equal(pedido.system, 'SISTEMA')
  assert.equal(pedido.messages.length, 1)
})

test('pedido por la API directa: igual que antes, con effort bajo', () => {
  const directa = elegirProveedor(entorno({ ANTHROPIC_API_KEY: 'k' }))!
  const pedido = armarPedido(directa, 'json', CANDIDATAS, 'S', ENTRADA) as Record<string, any>
  assert.equal(pedido.model, 'claude-haiku-5-5')
  assert.equal(pedido.output_config.effort, 'low')
  assert.equal(pedido.max_tokens, MAX_TOKENS_MODELO)
})

test('pedido en modo herramienta: herramienta forzada con el mismo esquema y sin output_config', () => {
  const gw = elegirProveedor(entorno({ AI_GATEWAY_API_KEY: 'k' }))!
  const pedido = armarPedido(gw, 'herramienta', CANDIDATAS, 'S', ENTRADA) as Record<string, any>
  assert.deepEqual(pedido.tool_choice, { type: 'tool', name: 'elegir_plan' })
  assert.equal(pedido.tools.length, 1)
  assert.equal(pedido.tools[0].name, 'elegir_plan')
  assert.deepEqual(pedido.tools[0].input_schema.properties.eleccion_id.enum, ['lugar-sim-01', 'lugar-sim-02'])
  assert.equal(pedido.output_config, undefined)
})

test('pedido: la entrada del modelo es solo la que se le pasa (sin nombres ni claves)', () => {
  const gw = elegirProveedor(entorno({ AI_GATEWAY_API_KEY: 'SECRETO-123' }))!
  const pedido = armarPedido(gw, 'json', CANDIDATAS, 'S', entradaModelo(CANDIDATAS, PERFIL_5, 'Sábado seco', NOMBRES))
  const texto = JSON.stringify(pedido)
  assert.ok(!texto.includes('SECRETO-123'))
  for (const n of NOMBRES) assert.ok(!texto.includes(n), `no debe llevar a ${n}`)
})

const SALIDA_OK = JSON.stringify({
  eleccion_id: 'lugar-sim-01',
  explicacion: 'Un asado les sirve a todos y el día viene tranquilo.',
  mensaje_al_grupo: 'Armemos un asado el sábado o el domingo. Marquen si les interesa y carguen su disponibilidad.',
})

test('respuesta en JSON: solo vale si terminó bien (end_turn) y trae texto', () => {
  const bien = { stop_reason: 'end_turn', content: [{ type: 'text', text: SALIDA_OK }] }
  assert.equal(textoDeRespuesta(bien, 'json'), SALIDA_OK)
  assert.equal(textoDeRespuesta({ stop_reason: 'max_tokens', content: bien.content }, 'json'), null, 'cortada por largo')
  assert.equal(textoDeRespuesta({ stop_reason: 'refusal', content: [] }, 'json'), null)
  assert.equal(textoDeRespuesta({ stop_reason: 'end_turn', content: [] }, 'json'), null)
})

test('respuesta por herramienta: toma la entrada de la herramienta esperada y la valida igual', () => {
  const tool = { type: 'tool_use', name: 'elegir_plan', input: JSON.parse(SALIDA_OK) }
  const texto = textoDeRespuesta({ stop_reason: 'tool_use', content: [tool] }, 'herramienta')
  assert.ok(texto)
  assert.equal(validarSalidaModelo(texto, CANDIDATAS, NOMBRES)?.eleccion.id, 'lugar-sim-01')
  assert.equal(textoDeRespuesta({ stop_reason: 'tool_use', content: [{ ...tool, name: 'otra' }] }, 'herramienta'), null)
  assert.equal(textoDeRespuesta({ stop_reason: 'end_turn', content: [tool] }, 'herramienta'), null)
  // Una elección fuera de la lista o un texto con un nombre siguen rechazándose, venga de donde venga.
  const mala = textoDeRespuesta({ stop_reason: 'tool_use', content: [{ ...tool, input: { ...tool.input, eleccion_id: 'otro' } }] }, 'herramienta')
  assert.equal(validarSalidaModelo(mala!, CANDIDATAS, NOMBRES), null)
  const conNombre = textoDeRespuesta({ stop_reason: 'tool_use', content: [{ ...tool, input: { ...tool.input, mensaje_al_grupo: 'Tomi, armemos un asado el sábado, marquen si les interesa.' } }] }, 'herramienta')
  assert.equal(validarSalidaModelo(conNombre!, CANDIDATAS, NOMBRES), null)
})

test('usuarioDe: toma el sub del JWT y no se rompe con nada raro', () => {
  const jwt = (carga: object) => `Bearer cabecera.${Buffer.from(JSON.stringify(carga)).toString('base64url')}.firma`
  assert.equal(usuarioDe(jwt({ sub: 'u-123' })), 'u-123')
  assert.equal(usuarioDe(jwt({ role: 'anon' })), 'sin-usuario')
  assert.equal(usuarioDe(jwt({ sub: 'x'.repeat(200) })), 'sin-usuario')
  assert.equal(usuarioDe('Bearer basura'), 'sin-usuario')
  assert.equal(usuarioDe(''), 'sin-usuario')
  assert.equal(usuarioDe(null), 'sin-usuario')
})

test('límite: una llamada al modelo por persona cada 10 s; otra persona no se ve afectada', () => {
  const l = crearLimiteModelo()
  assert.equal(l.permitir('ana', 0), true)
  assert.equal(l.permitir('ana', 9_999), false, 'antes de 10 s, no')
  assert.equal(l.permitir('beto', 5_000), true, 'otra persona sí')
  assert.equal(l.permitir('ana', 10_000), true, 'a los 10 s, sí')
  assert.equal(l.permitir('ana', 12_000), false)
})

test('límite: un pedido negado no corre la espera de la persona', () => {
  const l = crearLimiteModelo()
  assert.equal(l.permitir('ana', 0), true)
  for (let t = 1_000; t < 10_000; t += 1_000) assert.equal(l.permitir('ana', t), false)
  assert.equal(l.permitir('ana', 10_000), true, 'insistir no alarga la espera')
})

test('límite: tope global por ventana, aunque cada persona espere sus 10 s', () => {
  const l = crearLimiteModelo(10_000, 3, 60_000)
  assert.equal(l.permitir('a', 0), true)
  assert.equal(l.permitir('b', 1), true)
  assert.equal(l.permitir('c', 2), true)
  assert.equal(l.permitir('d', 3), false, 'cuarta llamada en la ventana')
  assert.equal(l.permitir('d', 60_000), true, 'pasada la ventana vuelve a haber lugar')
})

test('límite: la memoria no crece con quien dejó de pedir', () => {
  const l = crearLimiteModelo(10_000, 1_000_000, 60_000)
  for (let i = 0; i < 500; i++) l.permitir(`u${i}`, i)
  // Mucho después, un solo pedido limpia a los anteriores: solo se comprueba que sigue funcionando.
  assert.equal(l.permitir('u0', 1_000_000), true)
})
