// HTTP/SDK/RPC simulados. Ninguna red, DB, clave ni inferencia real.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { stripTypeScriptTypes } from 'node:module'
import { atenderSocial } from './social-http.ts'
import { crearModeloSocial } from './modelo-social.ts'
import * as logica from './logica.ts'
import type { ClienteRpcSocial } from './puerto-social.ts'

const ESP = '00000000-0000-4000-8000-000000000001'
const RUN = '00000000-0000-4000-8000-000000000002'
const HASH = 'a'.repeat(64)
const TEXTO = 'Les propongo un asado; marquen si les interesa y cuándo pueden.'
const entrada = () => ({ espacio_id: ESP, social: { accion: 'preparar', sabado: '2026-10-31', ejecucion_id: RUN,
  clima: { sabado: 'lluvia', domingo: 'seco' } } })
const probe = { espacio_id: ESP, social: { accion: 'capacidad' } }
const franjas = [{ inicio: '2026-10-31T14:00', fin: '2026-10-31T17:00' }, { inicio: '2026-11-01T14:00', fin: '2026-11-01T17:00' }]
const plan = { titulo: 'Asado ficticio', lugar: { nombre: 'Parque (Simulación)', simulado: true }, franjas,
  minimo: 3, maximo: 6, plazo: '2026-10-29T20:00', imprescindible: { nombre: 'Organizador ficticio' }, invitados: 3 }
const ok = (data: Record<string, unknown>) => ({ ok: true, contrato: 2, servidor_ahora: {}, ...data })

function banco(modo = 'aprobacion', espacioDisponible = true) {
  const llamadas: { nombre: string; args: Record<string, unknown> }[] = []
  let signalEspacio: AbortSignal | undefined
  let recibo = { id: RUN, estado: 'en_curso', oportunidad: 'sabado:2026-10-31', propuesta_id: null,
    borrador: null as unknown, aprobacion: null, motivo: null }
  const cliente: ClienteRpcSocial = {
    rpc(nombre, args) {
      if (nombre === 'get_space' || nombre === 'proponer_plan_borrador') {
        llamadas.push({ nombre, args: structuredClone(args) })
        const r = { data: nombre === 'get_space' && !espacioDisponible ? null : ok(nombre === 'get_space'
          ? { espacio: { demo: true, miembros: [{ nombre: 'PersonaFicticia' }] } }
          : { resultado: { tipo: 'sin_plan_compatible' } }), error: null }
        return Object.assign(Promise.resolve(r), { abortSignal: (signal: AbortSignal) => { signalEspacio = signal; return Promise.resolve(r) } })
      }
      return {
        then() { throw new Error('Debe aplicar señal') },
        abortSignal() {
          llamadas.push({ nombre, args: structuredClone(args) })
          let data: unknown
          if (nombre === 'agente_social_contexto') data = ok({ politica: { modo, version: 1 }, destinatarios: 3 })
          else if (nombre === 'iniciar_ejecucion_agente') data = ok({ ejecucion: structuredClone(recibo), propia: true, repetido: recibo.estado !== 'en_curso' })
          else if (nombre === 'agente_social_candidatos') data = ok({ sin_plan_compatible: false, opciones: [
            { opcion_ref: 'ref-opaca', actividad: 'asado', actividad_etiqueta: 'Asado', titulo: 'Asado ficticio', franjas, viaje: null },
          ] })
          else if (nombre === 'guardar_borrador_agente') {
            recibo = { ...recibo, estado: 'borrador', borrador: { hash: HASH, opcion_ref: args.p_opcion_ref, texto: args.p_texto, plan } }
            data = ok({ borrador: { hash: HASH, opcion_ref: args.p_opcion_ref, plan }, repetido: false })
          } else throw new Error(`RPC no autorizada en esta prueba: ${nombre}`)
          return Promise.resolve({ data, error: null })
        },
      }
    },
  }
  return { cliente, llamadas, get signalEspacio() { return signalEspacio } }
}

test('probe nuevo exige contrato y no llama RPC ni modelo', async () => {
  const t = banco(); let modelos = 0
  assert.deepEqual(await atenderSocial(probe, { cliente: t.cliente, modelo: async () => { modelos++; return null } }),
    { ok: true, contrato: 2, capacidades: { agente_social: 1 } })
  assert.equal(t.llamadas.length, 0); assert.equal(modelos, 0)
})

for (const modo of ['aprobacion', 'autonoma']) {
  test(`preparar bajo política ${modo}: guarda borrador/recibo, jamás publica`, async () => {
    const t = banco(modo); let modelos = 0
    const r = await atenderSocial(entrada(), { cliente: t.cliente, modelo: async () => { modelos++; return { opcion_ref: 'ref-opaca', texto: TEXTO } } })
    assert.equal(r.ok, true)
    assert.ok('resultado_social' in r)
    const resultado = r.resultado_social
    assert.equal(resultado.estado, modo === 'autonoma' ? 'borrador' : 'necesita_aprobacion')
    assert.equal(resultado.ejecucion?.propuesta_id, null); assert.equal(resultado.ejecucion?.aprobacion, null)
    assert.deepEqual(resultado.borrador?.plan, plan); assert.equal(modelos, 1)
    assert.equal(r.eleccion_fuente, 'modelo'); assert.equal(r.explicacion_fuente, 'modelo')
    assert.deepEqual(t.llamadas.map((l) => l.nombre), ['agente_social_contexto', 'iniciar_ejecucion_agente', 'agente_social_candidatos', 'guardar_borrador_agente'])
  })
}

test('fallback es texto fijo; recibo repetido omite fuente que no puede comprobar', async () => {
  const t = banco(); const deps = { cliente: t.cliente, modelo: async () => null }
  const r = await atenderSocial(entrada(), deps)
  assert.ok('explicacion_fuente' in r); assert.equal(r.explicacion_fuente, 'texto_fijo')
  const cantidad = t.llamadas.length; const segunda = await atenderSocial(entrada(), deps)
  assert.ok('resultado_social' in segunda); assert.equal(segunda.resultado_social.ejecucion?.estado, 'borrador')
  assert.equal('explicacion_fuente' in segunda, false)
  assert.equal(t.llamadas.slice(cantidad).some((l) => /guardar|publicar|candidatos/.test(l.nombre)), false)
})

for (const invalida of [null, [], {}, { ...entrada(), sabado: '2026-10-31' }, { ...entrada(), social: { ...entrada().social, accion: 'publicar' } },
  { ...entrada(), social: { ...entrada().social, clima: { sabado: true, domingo: 'seco' } } }]) {
  test(`entrada inválida no inicia trabajo: ${JSON.stringify(invalida)}`, async () => {
    const t = banco(); let modelos = 0
    const r = await atenderSocial(invalida, { cliente: t.cliente, modelo: async () => { modelos++; return null } })
    assert.equal(r.ok, false); assert.equal(t.llamadas.length, 0); assert.equal(modelos, 0)
  })
}

function montar(source: string, cliente: ClienteRpcSocial, conClave = false) {
  let handler!: (req: Request) => Promise<Response>
  let sdk = 0
  const sinImports = source.replace(/^import \{ createClient \} from .*$/m, '')
    .replace(/^import Anthropic from .*$/m, '').replace(/import \{[\s\S]*?\} from '\.\/logica\.ts'/, '')
    .replaceAll("await import('./social-http.ts')", 'depsSocial')
    .replaceAll("await import('./modelo-social.ts')", 'depsModelo')
  class SdkFicticio {
    constructor() { sdk++ }
    messages = { create: async () => ({ stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify({
      eleccion_id: 'ref-opaca', explicacion: 'Una idea ficticia.', mensaje_al_grupo: TEXTO,
    }) }] }) }
  }
  const entorno: Record<string, string> = { SUPABASE_URL: 'https://proyecto.invalid', SUPABASE_ANON_KEY: 'publica-ficticia',
    ...(conClave ? { AI_GATEWAY_API_KEY: 'valor-ficticio-de-prueba-no-es-credencial' } : {}) }
  const runtime = { env: { get: (nombre: string) => entorno[nombre] }, serve: (fn: typeof handler) => { handler = fn } }
  new Function('createClient', 'Anthropic', 'Deno', 'depsSocial', 'depsModelo', ...Object.keys(logica), stripTypeScriptTypes(sinImports))(
    () => cliente, SdkFicticio, runtime, { atenderSocial }, { crearModeloSocial }, ...Object.values(logica))
  return { pedir: (body: unknown, auth = true, signal?: AbortSignal) => handler(new Request('https://prueba.invalid/agente', {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: 'Bearer sesion-ficticia' } : {}) }, body: JSON.stringify(body), signal,
  })), get sdk() { return sdk } }
}

test('handler anterior real: probe y preparar anidados fallan antes de RPC/SDK incluso con proveedor', async () => {
  // Objeto histórico local, no se obtiene código por red ni se ejecuta una función remota.
  const anterior = execFileSync('git', ['show', '8f27c5b6b793cbd41a78d40d14a57d1debaff735:supabase/functions/agente/index.ts'], { encoding: 'utf8' })
  const t = banco(); const h = montar(anterior, t.cliente, true)
  for (const body of [probe, entrada()]) {
    const r = await (await h.pedir(body)).json()
    assert.equal(r.ok, false); assert.equal(r.error.detalle, 'fecha_invalida')
  }
  assert.equal(t.llamadas.length, 0); assert.equal(h.sdk, 0)
})

test('handler nuevo real: probe sin RPC/SDK; preparar llega al proveedor inyectado y no publica con autónoma', async () => {
  const nuevo = readFileSync(new URL('./index.ts', import.meta.url), 'utf8')
  const t = banco('autonoma'); const h = montar(nuevo, t.cliente, true)
  const cap = await (await h.pedir(probe)).json()
  assert.equal(cap.capacidades.agente_social, 1); assert.equal(h.sdk, 0); assert.equal(t.llamadas.length, 0)
  const r = await (await h.pedir(entrada())).json()
  assert.equal(r.ok, true); assert.equal(r.resultado_social.estado, 'borrador')
  assert.equal(r.explicacion_fuente, 'modelo'); assert.equal(h.sdk, 1)
  assert.equal(t.llamadas.some((l) => /publicar|aprobar|accept|interes|set_/.test(l.nombre)), false)
})

test('handler nuevo sin sesión o JSON nulo no toca DB ni SDK', async () => {
  const t = banco(); const h = montar(readFileSync(new URL('./index.ts', import.meta.url), 'utf8'), t.cliente, true)
  assert.equal((await (await h.pedir(probe, false)).json()).error.codigo, 'sesion_invalida')
  assert.equal((await (await h.pedir(null)).json()).error.detalle, 'formato_invalido')
  assert.equal(t.llamadas.length, 0); assert.equal(h.sdk, 0)
})

test('lectura social del espacio tiene señal, propaga cancelación y no continúa sin respuesta válida', async () => {
  const t = banco('aprobacion', false); const c = new AbortController()
  const h = montar(readFileSync(new URL('./index.ts', import.meta.url), 'utf8'), t.cliente, true)
  const r = await (await h.pedir(entrada(), true, c.signal)).json()
  assert.equal(r.ok, false); assert.equal(r.error.codigo, 'fallo_temporal'); assert.equal(h.sdk, 0)
  assert.deepEqual(t.llamadas.map((l) => l.nombre), ['get_space'])
  assert.ok(t.signalEspacio); assert.equal(t.signalEspacio.aborted, false)
  c.abort(); assert.equal(t.signalEspacio.aborted, true)
})

test('petición social cancelada antes de leer espacio no envía RPC ni SDK', async () => {
  const t = banco(); const c = new AbortController(); c.abort()
  const h = montar(readFileSync(new URL('./index.ts', import.meta.url), 'utf8'), t.cliente, true)
  const r = await (await h.pedir(entrada(), true, c.signal)).json()
  assert.equal(r.ok, false); assert.equal(t.llamadas.length, 0); assert.equal(h.sdk, 0)
})

test('modo previo conserva RPC y respuesta sin plan, sin entrar en social ni usar modelo', async () => {
  const t = banco(); const h = montar(readFileSync(new URL('./index.ts', import.meta.url), 'utf8'), t.cliente, true)
  const originalFetch = globalThis.fetch
  let climaExterno = 0
  globalThis.fetch = async () => { climaExterno++; throw new Error('Red prohibida en prueba') }
  try {
    const r = await (await h.pedir({ espacio_id: ESP, sabado: '2026-10-31', clima_simulado: 'seco' })).json()
    assert.deepEqual(r.resultado, { tipo: 'sin_plan_compatible' })
    assert.deepEqual(t.llamadas.map((l) => l.nombre), ['get_space', 'proponer_plan_borrador'])
    assert.deepEqual(t.llamadas[1].args.p_clima, { sabado: 'seco', domingo: 'seco' })
    assert.equal(h.sdk, 0); assert.equal(climaExterno, 0)
  } finally { globalThis.fetch = originalFetch }
})
