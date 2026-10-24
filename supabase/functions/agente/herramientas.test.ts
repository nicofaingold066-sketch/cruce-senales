// Pruebas del bucle de herramientas, sin red: el modelo y las herramientas son simulados.
// `node --test "supabase/functions/agente/*.test.ts"`
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { bucleHerramientas, HERRAMIENTAS, NOMBRE_ELEGIR, textoPaso, type Herramientas, type Mensaje, type RespuestaModelo } from './herramientas.ts'
import { entradaModelo, type Candidata } from './logica.ts'

const NOMBRES = ['Tomi', 'Luna', 'Mati']
const franjas = [
  { inicio: '2026-10-31T14:00', fin: '2026-10-31T17:00' },
  { inicio: '2026-11-01T14:00', fin: '2026-11-01T17:00' },
]
const ASADO: Candidata = {
  id: 'lugar-sim-14', actividad: 'asado', actividad_etiqueta: 'Asado', lugar: { id: 'lugar-sim-14', nombre: 'Parrilla del parque (Simulación)', simulado: true },
  titulo: 'Asado en la parrilla del parque', franjas, frases_grupo: ['bajo_techo'],
}
const PADEL: Candidata = { ...ASADO, id: 'lugar-sim-02', actividad: 'padel', actividad_etiqueta: 'Pádel', lugar: { id: 'lugar-sim-02', nombre: 'Club de pádel (Simulación)', simulado: true }, titulo: 'Pádel en el club' }

function herramientas(registro: string[] = []): Herramientas {
  return {
    verClima: async (dia) => { registro.push(`clima:${dia}`); return { estado: dia === 'sabado' ? 'lluvia' : 'seco', maxima: 18, simulado: true } },
    buscarPlanes: async () => { registro.push('planes'); return { tipo: 'borrador', candidatas: [ASADO, PADEL], paraModelo: entradaModelo([ASADO, PADEL], { personas: 5 }, 'Simulación', NOMBRES) } },
    buscarCanchas: (a) => { registro.push(`canchas:${a}`); return a === 'padel' ? ['Google Maps', 'EasyCancha', 'ATC'] : [] },
  }
}
const uso = (id: string, name: string, input: unknown) => ({ type: 'tool_use', id, name, input })
const vuelta = (...bloques: unknown[]): RespuestaModelo => ({ id: 'gen_01PRUEBA', stop_reason: 'tool_use', content: bloques as RespuestaModelo['content'] })
const ELIGE = (id = 'lugar-sim-14', extra = {}) =>
  uso('t9', NOMBRE_ELEGIR, { eleccion_id: id, explicacion: 'El asado es bajo techo y el sábado viene con lluvia.', mensaje_al_grupo: 'Armemos un asado el sábado o el domingo. Marquen si les interesa.', ...extra })

/** Un modelo simulado que contesta en orden y guarda lo que recibió. */
function guion(respuestas: (RespuestaModelo | Error)[]) {
  const recibido: Mensaje[][] = []
  let i = 0
  const llamar = async (m: Mensaje[]) => {
    recibido.push(structuredClone(m))
    const r = respuestas[i++]
    if (!r) throw new Error('sin más respuestas')
    if (r instanceof Error) throw r
    return r
  }
  return { llamar, recibido, vueltas: () => i }
}

const base = (llamar: (m: Mensaje[], p: number) => Promise<RespuestaModelo>, extra: Record<string, unknown> = {}) => ({
  llamar, herramientas: herramientas(), entradaInicial: { clima: 'pedir con ver_clima' }, nombres: NOMBRES, hastaMs: Date.now() + 25000, ...extra,
})

test('bucle válido: clima de los dos días, planes, canchas y elección → pasos con texto fijo', async () => {
  const registro: string[] = []
  const pensamiento = { type: 'thinking', thinking: '', signature: 'firma-intacta' }
  const g = guion([
    vuelta(pensamiento, uso('t1', 'ver_clima', { dia: 'sabado' }), uso('t2', 'ver_clima', { dia: 'domingo' })),
    vuelta(uso('t3', 'buscar_planes', {})),
    vuelta(uso('t4', 'buscar_canchas', { actividad: 'padel' })),
    vuelta(ELIGE()),
  ])
  const r = await bucleHerramientas({ ...base(g.llamar), herramientas: herramientas(registro) })
  assert.ok(r)
  assert.equal(r.eleccion.id, 'lugar-sim-14')
  assert.deepEqual(r.pasos, [
    'Miré el clima del sábado: lluvia (simulación)',
    'Miré el clima del domingo: sin lluvia (simulación)',
    'Busqué planes que le sirven a todo el grupo: 2',
    'Busqué canchas reales de pádel: Google Maps, EasyCancha y ATC',
    'Elegí: Asado en Parrilla del parque (Simulación)',
  ])
  assert.deepEqual(registro, ['clima:sabado', 'clima:domingo', 'planes', 'canchas:padel'])
  assert.equal(r.idRespuesta, 'gen_01PRUEBA')
  // El turno del modelo vuelve tal cual (el pensamiento no se toca) y cada tool_use recibe su tool_result.
  const segundo = g.recibido[1]
  assert.deepEqual((segundo[1].content as unknown[])[0], pensamiento)
  assert.deepEqual((segundo[2].content as { tool_use_id: string }[]).map((x) => x.tool_use_id), ['t1', 't2'])
})

test('lo que recibe el modelo no trae nombres ni datos de una persona', async () => {
  const g = guion([vuelta(uso('t1', 'buscar_planes', {})), vuelta(ELIGE())])
  await bucleHerramientas(base(g.llamar))
  const todo = JSON.stringify(g.recibido)
  for (const n of NOMBRES) assert.ok(!todo.includes(n), `el modelo no recibe a ${n}`)
  assert.ok(!/me_gustaria|presupuesto"|zona|movilidad|miembro_id/.test(todo))
})

test('herramienta desconocida o entrada inválida: vuelve con is_error y el bucle sigue', async () => {
  const g = guion([
    vuelta(uso('t1', 'reservar_cancha', { lugar: 'x' }), uso('t2', 'ver_clima', { dia: 'lunes' })),
    vuelta(uso('t3', 'buscar_planes', {})),
    vuelta(ELIGE()),
  ])
  const r = await bucleHerramientas(base(g.llamar))
  assert.ok(r)
  const resultados = g.recibido[1][2].content as { is_error?: boolean; content: string }[]
  assert.deepEqual(resultados.map((x) => x.is_error), [true, true])
  assert.match(resultados[0].content, /herramienta desconocida/)
  assert.deepEqual(r.pasos, ['Busqué planes que le sirven a todo el grupo: 2', 'Elegí: Asado en Parrilla del parque (Simulación)'])
})

test('tope de pasos: más de cuatro herramientas → null (camino de siempre)', async () => {
  const g = guion([
    vuelta(uso('t1', 'ver_clima', { dia: 'sabado' }), uso('t2', 'ver_clima', { dia: 'domingo' }), uso('t3', 'buscar_planes', {})),
    vuelta(uso('t4', 'buscar_canchas', { actividad: 'padel' }), uso('t5', 'buscar_canchas', { actividad: 'tenis' })),
    vuelta(ELIGE()),
  ])
  assert.equal(await bucleHerramientas(base(g.llamar)), null)
  assert.equal(g.vueltas(), 2, 'no se ejecuta la quinta herramienta ni se pide otra vuelta')
})

test('tiempo agotado: sin tiempo no llama; si el modelo se pasa del plazo → null', async () => {
  const g1 = guion([vuelta(ELIGE())])
  assert.equal(await bucleHerramientas(base(g1.llamar, { hastaMs: Date.now() + 1000 })), null)
  assert.equal(g1.vueltas(), 0)
  let reloj = 0
  const g2 = guion([vuelta(uso('t1', 'buscar_planes', {})), vuelta(ELIGE())])
  const llamarLento = async (m: Mensaje[], p: number) => { const r = await g2.llamar(m); reloj += 20000; void p; return r }
  assert.equal(await bucleHerramientas(base(llamarLento, { ahora: () => reloj, hastaMs: 25000 })), null)
})

test('el modelo falla (error o aborto) → null', async () => {
  const aborto = Object.assign(new Error('abortado'), { name: 'AbortError' })
  assert.equal(await bucleHerramientas(base(guion([aborto]).llamar)), null)
  assert.equal(await bucleHerramientas(base(guion([vuelta(uso('t1', 'buscar_planes', {})), new Error('529')]).llamar)), null)
})

test('salida inválida → null: elige antes de buscar, una opción inventada, un texto prohibido o termina sin elegir', async () => {
  assert.equal(await bucleHerramientas(base(guion([vuelta(ELIGE())]).llamar)), null, 'elegir antes de buscar_planes')
  assert.equal(await bucleHerramientas(base(guion([vuelta(uso('t1', 'buscar_planes', {})), vuelta(ELIGE('inventada'))]).llamar)), null)
  assert.equal(
    await bucleHerramientas(base(guion([vuelta(uso('t1', 'buscar_planes', {})), vuelta(ELIGE('lugar-sim-14', { explicacion: 'Tomi no puede pagar otra cosa, así que asado.' }))]).llamar)),
    null,
  )
  const fin: RespuestaModelo = { stop_reason: 'end_turn', content: [{ type: 'text', text: '{"eleccion_id":"lugar-sim-14"}' }] }
  assert.equal(await bucleHerramientas(base(guion([vuelta(uso('t1', 'buscar_planes', {})), fin]).llamar)), null)
  const rechazo: RespuestaModelo = { stop_reason: 'refusal', content: [] }
  assert.equal(await bucleHerramientas(base(guion([rechazo]).llamar)), null)
})

test('sin plan compatible o error del servidor: corta enseguida, sin otra vuelta del modelo → null', async () => {
  const sinPlan: Herramientas = { ...herramientas(), buscarPlanes: async () => ({ tipo: 'sin_plan', motivo: 'faltan_personas' }) }
  const g = guion([vuelta(uso('t1', 'buscar_planes', {})), vuelta(ELIGE())])
  assert.equal(await bucleHerramientas({ ...base(g.llamar), herramientas: sinPlan }), null)
  assert.equal(g.vueltas(), 1)
  const caido: Herramientas = { ...herramientas(), buscarPlanes: async () => ({ tipo: 'error' }) }
  const g2 = guion([vuelta(uso('t1', 'buscar_planes', {})), vuelta(ELIGE())])
  assert.equal(await bucleHerramientas({ ...base(g2.llamar), herramientas: caido }), null)
  assert.equal(g2.vueltas(), 1)
})

test('elegir antes de buscar: vuelve con is_error ("primero buscar_planes") y el modelo puede seguir', async () => {
  const g = guion([vuelta(ELIGE()), vuelta(uso('t1', 'buscar_planes', {})), vuelta(ELIGE())])
  const r = await bucleHerramientas(base(g.llamar))
  assert.ok(r)
  const primero = (g.recibido[1][2].content as { is_error?: boolean; content: string; tool_use_id: string }[])[0]
  assert.equal(primero.tool_use_id, 't9'); assert.equal(primero.is_error, true); assert.match(primero.content, /Primero usa buscar_planes/)
})

test('buscar_planes y elegir_plan en la misma vuelta: primero busca y después valida la elección', async () => {
  const g = guion([vuelta(uso('t1', 'buscar_planes', {}), ELIGE())])
  const r = await bucleHerramientas(base(g.llamar))
  assert.ok(r)
  assert.deepEqual(r.pasos, ['Busqué planes que le sirven a todo el grupo: 2', 'Elegí: Asado en Parrilla del parque (Simulación)'])
})

test('elección inválida: una sola corrección; si vuelve a fallar → null', async () => {
  const mala = ELIGE('lugar-sim-14', { mensaje_al_grupo: 'Ya está confirmado el asado para el sábado, nos vemos.' })
  const g = guion([vuelta(uso('t1', 'buscar_planes', {})), vuelta(mala), vuelta(ELIGE('lugar-sim-02'))])
  const r = await bucleHerramientas(base(g.llamar))
  assert.ok(r); assert.equal(r.eleccion.id, 'lugar-sim-02')
  assert.match(String((g.recibido[2][4].content as { content: string }[])[0].content), /no pasó las reglas/)
  const g2 = guion([vuelta(uso('t1', 'buscar_planes', {})), vuelta(mala), vuelta(mala), vuelta(ELIGE())])
  assert.equal(await bucleHerramientas(base(g2.llamar)), null)
  assert.equal(g2.vueltas(), 3)
})

test('entradas raras ("constructor", "toString") no pasan como actividad ni día, y no dejan pasos raros', async () => {
  const g = guion([
    vuelta(uso('t1', 'buscar_canchas', { actividad: 'constructor' }), uso('t2', 'ver_clima', { dia: 'toString' })),
    vuelta(uso('t3', 'buscar_planes', {})),
    vuelta(ELIGE()),
  ])
  const r = await bucleHerramientas(base(g.llamar))
  assert.ok(r)
  assert.deepEqual((g.recibido[1][2].content as { is_error?: boolean }[]).map((x) => x.is_error), [true, true])
  assert.ok(!r.pasos.some((p) => /function|native|undefined|toString|constructor/.test(p)), r.pasos.join(' | '))
  assert.equal(textoPaso('buscar_canchas', { actividad: 'constructor' }, []), null)
})

test('un paso repetido no se repite en la lista', async () => {
  const g = guion([vuelta(uso('t1', 'ver_clima', { dia: 'sabado' })), vuelta(uso('t2', 'ver_clima', { dia: 'sabado' }), uso('t3', 'buscar_planes', {})), vuelta(ELIGE())])
  const r = await bucleHerramientas(base(g.llamar))
  assert.ok(r)
  assert.equal(r.pasos.filter((p) => p.startsWith('Miré el clima del sábado')).length, 1)
})

test('una herramienta que lanza no rompe el bucle: vuelve con is_error', async () => {
  const rota: Herramientas = { ...herramientas(), verClima: async () => { throw new Error('open-meteo caído') } }
  const g = guion([vuelta(uso('t1', 'ver_clima', { dia: 'sabado' })), vuelta(uso('t2', 'buscar_planes', {})), vuelta(ELIGE())])
  const r = await bucleHerramientas({ ...base(g.llamar), herramientas: rota })
  assert.ok(r)
  assert.equal((g.recibido[1][2].content as { is_error?: boolean }[])[0].is_error, true)
})

test('definiciones: cuatro herramientas, elegir_plan con los tres campos y sin herramientas de escritura', () => {
  assert.deepEqual(HERRAMIENTAS.map((h) => h.name), ['ver_clima', 'buscar_planes', 'buscar_canchas', 'elegir_plan'])
  assert.deepEqual(HERRAMIENTAS[3].input_schema.required, ['eleccion_id', 'explicacion', 'mensaje_al_grupo'])
  assert.ok(!HERRAMIENTAS.some((h) => /reserv|confirm|invit|crear|publicar/i.test(h.name)))
})

test('textoPaso: textos fijos, sin nada del modelo', () => {
  assert.equal(textoPaso('ver_clima', { dia: 'domingo' }, { estado: 'desconocido', simulado: false }), 'Miré el clima del domingo: sin pronóstico')
  assert.equal(textoPaso('buscar_planes', {}, { tipo: 'sin_plan', motivo: null }), 'Busqué planes que le sirven a todo el grupo: ninguno')
  assert.equal(textoPaso('buscar_canchas', { actividad: 'tenis' }, []), 'No hay sitios de canchas para tenis')
  assert.equal(textoPaso('ver_clima', { dia: 'lunes' }, { estado: 'seco' }), null)
})

test('una respuesta del modelo sin la forma esperada → null, sin lanzar', async () => {
  const raro = async () => null as unknown as RespuestaModelo
  assert.equal(await bucleHerramientas(base(raro)), null)
  const sinContenido = async () => ({ stop_reason: 'tool_use' }) as unknown as RespuestaModelo
  assert.equal(await bucleHerramientas(base(sinContenido)), null)
})
