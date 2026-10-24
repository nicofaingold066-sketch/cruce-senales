// Transporte RPC ficticio: no red, base, SDK ni modelo real.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { crearPuertoBackendSocial, type ClienteRpcSocial } from './puerto-social.ts'
import { orquestarAgenteSocial } from './social/orquestador.ts'

const ESP = '00000000-0000-4000-8000-000000000001'
const RUN = '00000000-0000-4000-8000-000000000002'
const PROP = '00000000-0000-4000-8000-000000000003'
const HASH = 'a'.repeat(64)
const ok = (datos: Record<string, unknown> = {}) => ({ ok: true, contrato: 2, servidor_ahora: {}, ...datos })
const sobre = (data: unknown) => ({ data, error: null })
function banco(responder: (nombre: string, args: Record<string, unknown>, signal: AbortSignal) => unknown = () => sobre(ok())) {
  const llamadas: { nombre: string; args: Record<string, unknown>; signal: AbortSignal }[] = []
  const cliente: ClienteRpcSocial = {
    rpc(nombre, args) {
      return {
        then() { throw new Error('Debe aplicar AbortSignal antes del envío') },
        abortSignal(signal) {
          llamadas.push({ nombre, args: structuredClone(args), signal })
          return Promise.resolve(responder(nombre, args, signal)) as PromiseLike<{ data: unknown; error: unknown }>
        },
      }
    },
  }
  return { cliente, llamadas }
}

test('solo expone los seis RPC E11, sin aceptación, aprobación ni cambios de consentimiento', async () => {
  const t = banco(); const puerto = crearPuertoBackendSocial(t.cliente)
  assert.deepEqual(Object.keys(puerto).sort(), [
    'agente_social_contexto', 'agente_social_candidatos', 'iniciar_ejecucion_agente',
    'guardar_borrador_agente', 'publicar_borrador_agente', 'cerrar_ejecucion_agente',
  ].sort())
  await puerto.agente_social_contexto({ p_espacio_id: ESP })
  await puerto.agente_social_candidatos({ p_espacio_id: ESP, p_sabado: '2026-10-31', p_clima: { sabado: 'lluvia', domingo: 'seco' } })
  await puerto.iniciar_ejecucion_agente({ p_espacio_id: ESP, p_ejecucion_id: RUN, p_oportunidad: 'sabado:2026-10-31', p_parametros_hash: HASH })
  await puerto.guardar_borrador_agente({ p_ejecucion_id: RUN, p_opcion_ref: 'ref-opaca', p_texto: 'Idea de encuentro.' })
  await puerto.publicar_borrador_agente({ p_ejecucion_id: RUN, p_borrador_hash: HASH, p_intento_id: RUN })
  await puerto.cerrar_ejecucion_agente({ p_ejecucion_id: RUN, p_estado: 'fallida', p_motivo: 'sin_plan' })
  assert.deepEqual(t.llamadas.map(({ nombre, args }) => [nombre, args]), [
    ['agente_social_contexto', { p_espacio_id: ESP }],
    ['agente_social_candidatos', { p_espacio_id: ESP, p_sabado: '2026-10-31', p_clima: { sabado: 'lluvia', domingo: 'seco' } }],
    ['iniciar_ejecucion_agente', { p_espacio_id: ESP, p_ejecucion_id: RUN, p_oportunidad: 'sabado:2026-10-31', p_parametros_hash: HASH }],
    ['guardar_borrador_agente', { p_ejecucion_id: RUN, p_opcion_ref: 'ref-opaca', p_texto: 'Idea de encuentro.' }],
    ['publicar_borrador_agente', { p_ejecucion_id: RUN, p_borrador_hash: HASH, p_intento_id: RUN }],
    ['cerrar_ejecucion_agente', { p_ejecucion_id: RUN, p_estado: 'fallida', p_motivo: 'sin_plan' }],
  ])
})

test('descarta campos ajenos y toma snapshot del clima antes de esperar', async () => {
  const t = banco(); const p = crearPuertoBackendSocial(t.cliente)
  const args = { p_espacio_id: ESP, p_sabado: '2026-10-31', p_actor_id: 'no-se-envia',
    p_clima: { sabado: 'lluvia' as const, domingo: 'seco' as const, ubicacion_privada: 'no-se-envia' } }
  const llamada = p.agente_social_candidatos(args)
  args.p_clima = { ...args.p_clima, domingo: 'seco', ubicacion_privada: 'otro' }
  await llamada
  assert.deepEqual(t.llamadas[0].args, { p_espacio_id: ESP, p_sabado: '2026-10-31', p_clima: { sabado: 'lluvia', domingo: 'seco' } })
})

for (const data of [null, [], {}, { ok: true, contrato: 1 }, { ok: 'true', contrato: 2 },
  { ok: false, contrato: 2 }, { ok: false, contrato: 2, error: { codigo: 'x' } }]) {
  test(`sobre inválido se rechaza sin fingir rechazo conocido: ${JSON.stringify(data)}`, async () => {
    const t = banco(() => sobre(data)); const p = crearPuertoBackendSocial(t.cliente)
    await assert.rejects(p.agente_social_contexto({ p_espacio_id: ESP }), { message: 'rpc_social_no_disponible' })
    assert.equal(t.llamadas.length, 1)
  })
}

test('error lógico E11 conserva el recibo para validación canónica del orquestador', async () => {
  const data = { ok: false, contrato: 2, error: { codigo: 'opcion_desactualizada', detalle: 'oportunidad_en_uso' }, ejecucion: { id: RUN } }
  const t = banco(() => sobre(data)); const p = crearPuertoBackendSocial(t.cliente)
  assert.deepEqual(await p.iniciar_ejecucion_agente({ p_espacio_id: ESP, p_ejecucion_id: RUN, p_oportunidad: 'sabado:2026-10-31', p_parametros_hash: HASH }), data)
})

for (const modo of ['SDK', 'throw'] as const) {
  test(`error ${modo} se sanea y no repite publicación`, async () => {
    const t = banco(() => {
      if (modo === 'throw') throw new Error('MARCADOR_PRIVADO_FICTICIO')
      return { data: null, error: { message: 'MARCADOR_PRIVADO_FICTICIO', url: 'https://privado.invalid' } }
    })
    const p = crearPuertoBackendSocial(t.cliente)
    await assert.rejects(p.publicar_borrador_agente({ p_ejecucion_id: RUN, p_borrador_hash: HASH, p_intento_id: RUN }),
      (e: Error) => e.message === 'rpc_social_no_disponible' && !('cause' in e))
    assert.equal(t.llamadas.length, 1)
  })
}

test('tiempo agotado cancela transporte y no lo convierte en rechazo lógico', async () => {
  const t = banco(() => new Promise(() => {})); const p = crearPuertoBackendSocial(t.cliente, { limiteMs: 5 })
  await assert.rejects(p.guardar_borrador_agente({ p_ejecucion_id: RUN, p_opcion_ref: 'ref', p_texto: 'Idea.' }), { message: 'rpc_social_no_disponible' })
  assert.equal(t.llamadas.length, 1); assert.equal(t.llamadas[0].signal.aborted, true)
})

test('cancelación previa no envía y cancelación en vuelo aborta sin reintento', async () => {
  const previo = new AbortController(); previo.abort()
  const t = banco(); const p = crearPuertoBackendSocial(t.cliente, { signal: previo.signal })
  await assert.rejects(p.agente_social_contexto({ p_espacio_id: ESP })); assert.equal(t.llamadas.length, 0)
  const activo = new AbortController(); const u = banco(() => new Promise(() => {}))
  const q = crearPuertoBackendSocial(u.cliente, { signal: activo.signal })
  const pendiente = q.agente_social_contexto({ p_espacio_id: ESP }); activo.abort()
  await assert.rejects(pendiente, { message: 'rpc_social_no_disponible' })
  assert.equal(u.llamadas[0].signal.aborted, true); assert.equal(u.llamadas.length, 1)
})

test('al terminar retira el listener de cancelación del transporte anterior', async () => {
  const control = new AbortController(); const t = banco()
  await crearPuertoBackendSocial(t.cliente, { signal: control.signal }).agente_social_contexto({ p_espacio_id: ESP })
  control.abort()
  assert.equal(t.llamadas[0].signal.aborted, false)
})

test('rechaza límites de tiempo inválidos antes de enviar', () => {
  const t = banco()
  for (const limiteMs of [0, -1, 1.5, NaN, Infinity, 30001]) assert.throws(() => crearPuertoBackendSocial(t.cliente, { limiteMs }))
  assert.equal(t.llamadas.length, 0)
})

test('orquestador + puerto recuperan una publicación con respuesta perdida sin duplicarla', async () => {
  const franjas = [{ inicio: '2026-10-31T14:00', fin: '2026-10-31T17:00' }, { inicio: '2026-11-01T14:00', fin: '2026-11-01T17:00' }]
  const borrador = { hash: HASH, opcion_ref: 'ref-opaca', texto: 'Idea para encontrarse.', plan: {
    titulo: 'Asado', lugar: { nombre: 'Parque (Simulación)', simulado: true }, franjas,
    minimo: 3, maximo: 6, plazo: '2026-10-29T20:00', imprescindible: { nombre: 'Organizador ficticio' }, invitados: 3,
  } }
  let publicada = false; let efectos = 0
  const t = banco((nombre) => {
    if (nombre === 'agente_social_contexto') return sobre(ok({ politica: { modo: 'aprobacion', version: 1 }, destinatarios: 3 }))
    if (nombre === 'iniciar_ejecucion_agente') return sobre(ok({ propia: true, repetido: true, ejecucion: {
      id: RUN, oportunidad: 'sabado:2026-10-31', estado: publicada ? 'publicada' : 'borrador', propuesta_id: publicada ? PROP : null,
      borrador, aprobacion: { hash: HASH, aprobado_en: { utc: '2026-10-24T03:00:00Z', local: '2026-10-24T00:00:00' } }, motivo: null,
    } }))
    if (nombre === 'publicar_borrador_agente') {
      publicada = true; efectos++
      return { data: null, error: { message: 'Respuesta perdida ficticia' } }
    }
    throw new Error('RPC inesperada')
  })
  const r = await orquestarAgenteSocial({ espacioId: ESP, ejecucionId: RUN, sabado: '2026-10-31', oportunidad: 'sabado:2026-10-31',
    clima: { sabado: 'lluvia', domingo: 'seco' }, accion: { tipo: 'publicar', borradorHash: HASH } }, {
    backend: crearPuertoBackendSocial(t.cliente), modelo: async () => { throw new Error('No debe llamar al modelo') },
  })
  assert.equal(r.estado, 'publicada'); assert.equal(r.propuesta?.id, PROP); assert.equal(efectos, 1)
  assert.deepEqual(t.llamadas.map((l) => l.nombre), ['agente_social_contexto', 'iniciar_ejecucion_agente', 'publicar_borrador_agente', 'iniciar_ejecucion_agente'])
  assert.deepEqual(t.llamadas[1].args, t.llamadas[3].args)
})
