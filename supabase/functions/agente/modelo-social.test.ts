// Proveedor y SDK simulados: no se envía ninguna petición ni se usa una clave real.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { crearModeloSocial, type DependenciasModeloSocial } from './modelo-social.ts'
import type { OpcionModelo } from './social/contratos.ts'

const opcion: OpcionModelo = { opcion_ref: 'ref-opaca', actividad: 'asado', franjas: [
  { inicio: '2026-10-31T14:00', fin: '2026-10-31T17:00' }, { inicio: '2026-11-01T14:00', fin: '2026-11-01T17:00' },
], familia: 'comida', personas: { min: 4, max: 12 }, viaje_max_minutos: 25 }
const TEXTO = 'Les propongo un asado; marquen si les interesa y cuándo pueden.'
const respuesta = (mensaje = TEXTO, id = opcion.opcion_ref) => ({ stop_reason: 'end_turn', content: [
  { type: 'text', text: JSON.stringify({ eleccion_id: id, explicacion: 'Una idea de encuentro.', mensaje_al_grupo: mensaje }) },
] })
function banco(invocar: DependenciasModeloSocial['invocar'] = async () => respuesta()) {
  const pedidos: Parameters<DependenciasModeloSocial['invocar']>[] = []
  let permisos = 0
  const deps: DependenciasModeloSocial = {
    proveedor: { tipo: 'gateway', variableClave: 'AI_GATEWAY_API_KEY', baseURL: 'https://gateway.invalid', modelo: 'anthropic/opus', respaldo: 'anthropic/haiku' },
    permitir: () => { permisos++; return true }, invocar: async (...args) => { pedidos.push(args); return invocar(...args) },
    nombres: ['NombreFicticioPrivado'], ahora: () => 0, hastaMs: 30000,
  }
  return { deps, pedidos, get permisos() { return permisos }, correr: (opciones = [opcion], signal = new AbortController().signal) => crearModeloSocial(deps)(opciones, signal) }
}

test('usa principal existente, proyección mínima y esquema cerrado sin nombres ni datos adjuntos', async () => {
  const t = banco(); const entrada = { ...opcion, nombre: 'MARCADOR_PRIVADO', condiciones: { dinero: 1 } }
  assert.deepEqual(await t.correr([entrada]), { opcion_ref: opcion.opcion_ref, texto: TEXTO })
  assert.equal(t.pedidos.length, 1); assert.equal(t.permisos, 1)
  const [, p, signal, plazo] = t.pedidos[0]
  assert.equal(p.model, 'anthropic/opus'); assert.equal(plazo, 20000); assert.equal(signal.aborted, false)
  assert.deepEqual(JSON.parse(p.messages[0].content), { opciones: [opcion] })
  assert.doesNotMatch(JSON.stringify(p), /MARCADOR_PRIVADO|NombreFicticioPrivado|apiKey/)
  assert.doesNotMatch(p.messages[0].content, /condiciones|dinero/)
  assert.ok('output_config' in p); assert.ok('thinking' in p)
})

test('fallo principal usa un solo respaldo, conserva entrada y no renueva permiso', async () => {
  let intentos = 0
  const t = banco(async () => { if (++intentos === 1) throw new Error('Fallo proveedor ficticio'); return respuesta() })
  assert.deepEqual(await t.correr(), { opcion_ref: opcion.opcion_ref, texto: TEXTO })
  assert.deepEqual(t.pedidos.map((a) => a[1].model), ['anthropic/opus', 'anthropic/haiku'])
  assert.deepEqual(t.pedidos[0][1].messages, t.pedidos[1][1].messages); assert.equal(t.permisos, 1)
})

for (const [nombre, devolver] of [
  ['referencia ajena', () => respuesta(TEXTO, 'ajena')],
  ['aceptación falsa', () => respuesta('Ya está confirmado y reservado para todos.')],
  ['nombre visible', () => respuesta('NombreFicticioPrivado organiza este encuentro del grupo.')],
  ['281 caracteres', () => respuesta('a'.repeat(281))],
  ['control', () => respuesta(`${TEXTO}\u0000`)],
  ['JSON inválido', () => ({ stop_reason: 'end_turn', content: [{ type: 'text', text: '{' }] })],
  ['corte del proveedor', () => ({ stop_reason: 'max_tokens', content: [] })],
] as const) {
  test(`${nombre}: nunca entrega una salida insegura y hay como máximo dos intentos`, async () => {
    const t = banco(async () => devolver()); assert.equal(await t.correr(), null); assert.equal(t.pedidos.length, 2)
  })
}

test('sin proveedor, sin presupuesto, vacío, cancelado o sin permiso no llama al SDK', async () => {
  for (const caso of ['proveedor', 'tiempo', 'opciones', 'signal', 'permiso']) {
    const t = banco(); const c = new AbortController()
    if (caso === 'proveedor') t.deps.proveedor = null
    if (caso === 'tiempo') t.deps.hastaMs = 1000
    if (caso === 'signal') c.abort()
    if (caso === 'permiso') t.deps.permitir = () => false
    assert.equal(await t.correr(caso === 'opciones' ? [] : [opcion], c.signal), null)
    assert.equal(t.pedidos.length, 0)
  }
})

test('cancelación en vuelo corta aunque el SDK simulado ignore señal; sin respaldo tardío', async () => {
  const c = new AbortController(); const t = banco(async () => new Promise(() => {}))
  const pendiente = t.correr([opcion], c.signal); c.abort()
  assert.equal(await pendiente, null); assert.equal(t.pedidos.length, 1); assert.equal(t.pedidos[0][2].aborted, true)
})

test('formato herramienta existente transforma el mismo esquema y sin thinking incompatible', async () => {
  const t = banco(async () => ({ stop_reason: 'tool_use', content: [{ type: 'tool_use', name: 'elegir_plan', input: {
    eleccion_id: opcion.opcion_ref, explicacion: 'Una idea.', mensaje_al_grupo: TEXTO,
  } }] }))
  t.deps.modo = 'herramienta'
  assert.deepEqual(await t.correr(), { opcion_ref: opcion.opcion_ref, texto: TEXTO })
  assert.ok('tools' in t.pedidos[0][1]); assert.equal('thinking' in t.pedidos[0][1], false)
})
