// Prueba de carga de CRUXE (mejora #45), contra la base real (tjkfdnvzsikncjbskufm). Solo mide: no migra,
// no reinicia demos y no borra nada. Datos ficticios; cada sesión anónima es propia de esta corrida y se
// reutiliza en todos los escenarios (hay tope de sesiones anónimas por hora): 20 en (A) y 10 más en (B).
//
// Uso:  node tests/carga/carga.mjs            (escenarios A, B, C y D, en ese orden)
//       node tests/carga/carga.mjs A D        (solo algunos; B y C usan el demo del grupo 0 de A)
//
// Escenarios:
//   (A) Día de demo: 10 grupos en paralelo, cada uno con su demo y 2 sesiones reales (Tomi organiza, Luna
//       reclama su asiento) más los simulados. Recorrido: propuesta, caso cargado, v1, 4 aceptaciones, baja,
//       reparación, v2 y 4 aceptaciones. Las dos sesiones sondean get_proposal_state cada 3 s con p_desde_rev
//       (como la app) durante 2 minutos.
//   (B) Pico: 30 sesiones sondean la misma propuesta cada 1 s durante 60 s mientras el organizador actúa.
//   (C) Ráfaga: 20 aceptaciones concurrentes (10 personas x 2, con y sin el mismo intento) y una ola de
//       reintentos sobre la misma propuesta. Invariante: una sola aceptación por persona.
//   (D) proponer_plan_borrador: 10 en paralelo sobre demos distintos (3 rondas).
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { performance } from 'node:perf_hooks'

// ---- configuración ----------------------------------------------------------------------------
function leerEnv() {
  const env = { ...process.env }
  try {
    for (const linea of readFileSync(new URL('../../.env', import.meta.url), 'utf8').split('\n')) {
      const m = linea.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (m && env[m[1]] === undefined) env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
    }
  } catch { /* sin .env: se usan las variables del entorno */ }
  return env
}
const ENV = leerEnv()
const URL_BASE = ENV.VITE_SUPABASE_URL ?? ''
const CLAVE = ENV.VITE_SUPABASE_PUBLISHABLE_KEY ?? ''
if (new URL(URL_BASE).hostname !== 'tjkfdnvzsikncjbskufm.supabase.co') throw new Error('Proyecto no permitido')
if (!CLAVE.startsWith('sb_publishable_')) throw new Error('Solo se admite la clave pública publishable')

const GRUPOS = 10
const SONDEO_A_MS = 3000
const DURACION_A_MS = 120_000
const PICO_SESIONES = 30
const SONDEO_B_MS = 1000
const DURACION_B_MS = 60_000
const RAFAGA_PERSONAS = 10
const RONDAS_D = 3
const FRANJAS = [{ inicio: '2026-12-05T14:00', fin: '2026-12-05T17:00' }, { inicio: '2026-12-06T14:00', fin: '2026-12-06T17:00' }]
const PLAZO = '2026-12-01T20:00'
const SI = { A: 'si', B: 'si' }

const hora = () => new Date().toLocaleTimeString('es-CL', { timeZone: 'America/Santiago', hour12: false })
const dormir = (ms) => new Promise((r) => setTimeout(r, ms))
const azar = (a, b) => a + Math.random() * (b - a)

// ---- medición ---------------------------------------------------------------------------------
const llamadas = [] // { esc, fn, ms, res }  res: 'ok' | 'codigo/detalle' | 'transporte:<code>'
let escenario = 'prep'

async function rpc(s, fn, args = {}) {
  const t0 = performance.now()
  let data = null
  let res
  try {
    const r = await s.c.rpc(fn, args)
    data = r.data
    if (r.error) res = `transporte:${r.error.code || r.status || 'sin_codigo'}`
    else if (data?.ok) res = 'ok'
    else res = `${data?.error?.codigo}/${data?.error?.detalle}`
  } catch (e) {
    res = `transporte:${e?.name ?? 'excepcion'}`
  }
  llamadas.push({ esc: escenario, fn, ms: performance.now() - t0, res })
  return { res, data }
}
// Igual que rpc, pero el recorrido no sigue si falla: el error queda medido y se corta ese grupo.
async function exigir(s, fn, args = {}) {
  const r = await rpc(s, fn, args)
  if (r.res !== 'ok') throw new Error(`${s.nombre} ${fn}: ${r.res}`)
  return r.data
}

const pct = (xs, p) => {
  if (!xs.length) return NaN
  const o = [...xs].sort((a, b) => a - b)
  return o[Math.min(o.length - 1, Math.ceil((p / 100) * o.length) - 1)]
}
const ms = (x) => (Number.isFinite(x) ? Math.round(x) : '-')

function resumen(esc) {
  const filas = llamadas.filter((l) => l.esc === esc)
  const porFn = new Map()
  for (const l of filas) {
    if (!porFn.has(l.fn)) porFn.set(l.fn, [])
    porFn.get(l.fn).push(l)
  }
  const tabla = []
  const todos = filas.map((l) => l.ms)
  const errores = {}
  for (const l of filas) if (l.res !== 'ok') errores[l.res] = (errores[l.res] ?? 0) + 1
  for (const [fn, ls] of [...porFn.entries()].sort()) {
    const xs = ls.map((l) => l.ms)
    const err = ls.filter((l) => l.res !== 'ok')
    tabla.push({
      rpc: fn, n: ls.length, p50: ms(pct(xs, 50)), p95: ms(pct(xs, 95)), p99: ms(pct(xs, 99)), max: ms(Math.max(...xs)),
      e57014: err.filter((l) => l.res.includes('57014')).length,
      e55P03: err.filter((l) => l.res.includes('55P03')).length,
      fallo_temporal: err.filter((l) => l.res.startsWith('fallo_temporal')).length,
      errores: err.length,
    })
  }
  const total = {
    rpc: 'TOTAL', n: filas.length, p50: ms(pct(todos, 50)), p95: ms(pct(todos, 95)), p99: ms(pct(todos, 99)),
    max: ms(Math.max(...todos)), e57014: tabla.reduce((a, f) => a + f.e57014, 0), e55P03: tabla.reduce((a, f) => a + f.e55P03, 0),
    fallo_temporal: tabla.reduce((a, f) => a + f.fallo_temporal, 0), errores: tabla.reduce((a, f) => a + f.errores, 0),
  }
  return { tabla: [...tabla, total], total, errores }
}

function imprimirTabla(titulo, tabla) {
  const cols = ['rpc', 'n', 'p50', 'p95', 'p99', 'max', 'e57014', 'e55P03', 'fallo_temporal', 'errores']
  console.log(`\n### ${titulo}\n`)
  console.log(`| ${cols.join(' | ')} |`)
  console.log(`|${cols.map((c) => (c === 'rpc' ? '---' : '---:')).join('|')}|`)
  for (const f of tabla) console.log(`| ${cols.map((c) => (c === 'rpc' && f.rpc === 'TOTAL' ? '**TOTAL**' : f[c])).join(' | ')} |`)
}

// ---- sesiones ---------------------------------------------------------------------------------
let sesionesCreadas = 0
async function nuevaSesion(nombre) {
  for (let intento = 1; ; intento++) {
    const c = createClient(URL_BASE, CLAVE, { auth: { persistSession: false, autoRefreshToken: false } })
    const { error } = await c.auth.signInAnonymously()
    if (!error) {
      sesionesCreadas++
      return { c, nombre }
    }
    if (intento >= 4) throw new Error(`signInAnonymously ${nombre}: ${error.message}`)
    await dormir(2000 * intento)
  }
}
async function sesiones(nombres) {
  const out = []
  for (let i = 0; i < nombres.length; i += 5) out.push(...(await Promise.all(nombres.slice(i, i + 5).map(nuevaSesion))))
  return out
}

// ---- (A) día de demo --------------------------------------------------------------------------
const grupos = [] // { tomi, luna, demo, ids, prop }

async function sondear(s, prop, cadaMs, hasta, info) {
  let rev = null
  while (Date.now() < hasta) {
    const t = Date.now()
    const { res, data } = await rpc(s, 'get_proposal_state', { p_propuesta_id: prop, p_desde_rev: rev })
    if (res === 'ok') {
      rev = data.rev_vista
      if (data.sin_cambios) info.sinCambios++
      else info.completas++
    }
    await dormir(Math.max(0, cadaMs - (Date.now() - t)))
  }
}

async function recorrido(g, hasta, info) {
  const { tomi, luna } = g
  g.demo = (await exigir(tomi, 'seed_demo_space')).espacio
  g.ids = Object.fromEntries(g.demo.miembros.map((m) => [m.nombre, m.miembro_id]))
  const j = await exigir(luna, 'join_space', { p_codigo: g.demo.codigo_invitacion, p_nombre_visible: 'Luna' })
  if (!j.resultado.reclamo_asiento_simulado) throw new Error('Luna no reclamó su asiento')
  const c = await exigir(tomi, 'create_proposal', {
    p_espacio_id: g.demo.id, p_titulo: 'Asado en casa de Tomi', p_franjas: FRANJAS, p_minimo: 4, p_maximo: 6,
    p_imprescindible_id: g.ids.Tomi, p_plazo: PLAZO, p_zona_horaria: 'America/Santiago', p_intento_id: randomUUID(),
  })
  g.prop = c.resultado.propuesta_id
  const sondeos = [tomi, luna].map((s) => sondear(s, g.prop, SONDEO_A_MS, hasta, info))
  try {
    await pasos(g, info)
  } finally {
    await Promise.all(sondeos) // si un paso falla, los sondeos igual terminan dentro de (A)
  }
}

async function pasos(g, info) {
  const { tomi, luna } = g
  const pausa = () => dormir(azar(2500, 5000)) // tiempo de quien usa la app entre acciones
  await exigir(tomi, 'open_proposal', { p_propuesta_id: g.prop })
  await pausa()
  await exigir(luna, 'mark_interest', { p_propuesta_id: g.prop, p_interesado: true })
  await exigir(tomi, 'save_my_conditions', { p_propuesta_id: g.prop, p_disponibilidad: SI })
  await exigir(luna, 'save_my_conditions', { p_propuesta_id: g.prop, p_disponibilidad: SI })
  await pausa()
  await exigir(tomi, 'simulate_load_case', { p_propuesta_id: g.prop, p_intento_id: randomUUID() })
  await pausa()
  const v1 = await exigir(tomi, 'evaluate_and_publish', { p_propuesta_id: g.prop, p_intento_id: randomUUID() })
  if (v1.resultado.version !== 1 || v1.resultado.franja !== 'A') throw new Error('v1 inesperada ' + JSON.stringify(v1.resultado))
  await pausa()
  const acepta = (s, version, nombre) => exigir(s, nombre ? 'simulate_accept' : 'accept_version', {
    p_propuesta_id: g.prop, p_version: version, p_intento_id: randomUUID(), ...(nombre ? { p_miembro_id: g.ids[nombre] } : {}),
  })
  await acepta(luna, 1)
  await acepta(tomi, 1, 'Mati')
  await acepta(tomi, 1, 'Caro')
  await pausa()
  const conf1 = await acepta(tomi, 1)
  if (conf1.propuesta.estado !== 'grupo_confirmado') throw new Error('v1 no confirmó')
  await pausa()
  const baja = await exigir(tomi, 'simulate_withdraw', { p_propuesta_id: g.prop, p_miembro_id: g.ids.Caro })
  if (baja.propuesta.estado !== 'en_revision') throw new Error('la baja no pasó a revisión')
  await pausa()
  const v2 = await exigir(tomi, 'propose_repair', { p_propuesta_id: g.prop, p_intento_id: randomUUID() })
  if (v2.resultado.version !== 2 || v2.propuesta.opcion.aceptaron.length !== 0) throw new Error('v2 inesperada')
  await pausa()
  await acepta(luna, 2)
  await acepta(tomi, 2, 'Mati')
  await acepta(tomi, 2, 'Fede')
  await pausa()
  const conf2 = await acepta(tomi, 2)
  if (conf2.propuesta.estado !== 'grupo_confirmado' || conf2.propuesta.confirmados !== 4) throw new Error('v2 no confirmó')
  info.recorridos++
}

async function escenarioA() {
  escenario = 'A'
  const t0 = Date.now()
  const hasta = t0 + DURACION_A_MS
  const info = { recorridos: 0, fallidos: [], sinCambios: 0, completas: 0 }
  await Promise.all(grupos.map(async (g, i) => {
    await dormir(i * 300) // los grupos no arrancan en el mismo milisegundo
    try {
      await recorrido(g, hasta, info)
    } catch (e) {
      info.fallidos.push(`grupo ${i}: ${e.message}`)
    }
  }))
  return { ...info, segundos: Math.round((Date.now() - t0) / 1000) }
}

// ---- (B) pico ---------------------------------------------------------------------------------
async function escenarioB(extras) {
  const g = grupos[0]
  const tomi = g.tomi
  escenario = 'prep'
  // 30 sesiones sondeando: las 20 de (A) y 10 más; las que no son de este demo entran con otro nombre.
  const pollers = [...grupos.flatMap((x) => [x.tomi, x.luna]), ...extras].slice(0, PICO_SESIONES)
  await Promise.all(pollers.filter((s) => s !== g.tomi && s !== g.luna).map((s) =>
    exigir(s, 'join_space', { p_codigo: g.demo.codigo_invitacion, p_nombre_visible: `Carga ${s.nombre}` })))
  const c = await exigir(tomi, 'create_proposal', {
    p_espacio_id: g.demo.id, p_titulo: 'Pico de carga', p_franjas: FRANJAS, p_minimo: 2, p_maximo: 6,
    p_imprescindible_id: g.ids.Tomi, p_plazo: PLAZO, p_zona_horaria: 'America/Santiago', p_intento_id: randomUUID(),
  })
  const prop = c.resultado.propuesta_id
  await exigir(tomi, 'open_proposal', { p_propuesta_id: prop })

  escenario = 'B'
  const t0 = Date.now()
  const hasta = t0 + DURACION_B_MS
  const info = { sinCambios: 0, completas: 0, acciones: 0, accionesFallidas: [] }
  const sondeos = pollers.map(async (s, i) => { await dormir((i * 1000) / pollers.length); await sondear(s, prop, SONDEO_B_MS, hasta, info) })
  const acciones = [
    ['save_my_conditions', { p_propuesta_id: prop, p_disponibilidad: SI }],
    ['simulate_load_case', { p_propuesta_id: prop, p_intento_id: randomUUID() }],
    ['get_simulation_panel', { p_propuesta_id: prop }],
    ['evaluate_and_publish', { p_propuesta_id: prop, p_intento_id: randomUUID() }],
    ['simulate_accept', { p_propuesta_id: prop, p_miembro_id: g.ids.Mati, p_version: 1, p_intento_id: randomUUID() }],
    ['simulate_accept', { p_propuesta_id: prop, p_miembro_id: g.ids.Caro, p_version: 1, p_intento_id: randomUUID() }],
    ['accept_version', { p_propuesta_id: prop, p_version: 1, p_intento_id: randomUUID() }],
    ['simulate_mark_interest', { p_propuesta_id: prop, p_miembro_id: g.ids.Sofi, p_interesado: true }],
    ['simulate_mark_interest', { p_propuesta_id: prop, p_miembro_id: g.ids.Fede, p_interesado: true }],
    ['simulate_withdraw', { p_propuesta_id: prop, p_miembro_id: g.ids.Caro }],
    ['get_simulation_panel', { p_propuesta_id: prop }],
    ['simulate_mark_interest', { p_propuesta_id: prop, p_miembro_id: g.ids.Sofi, p_interesado: false }],
    ['list_proposals', { p_espacio_id: g.demo.id }],
  ]
  const actuar = (async () => {
    await dormir(2000)
    for (const [fn, args] of acciones) {
      const { res } = await rpc(tomi, fn, args)
      info.acciones++
      if (res !== 'ok') info.accionesFallidas.push(`${fn}: ${res}`)
      await dormir((DURACION_B_MS - 6000) / acciones.length)
    }
  })()
  await Promise.all([...sondeos, actuar])
  const fin = (await rpc(tomi, 'get_proposal_state', { p_propuesta_id: prop })).data?.propuesta
  return { ...info, sesiones: pollers.length, estadoFinal: fin?.estado, confirmados: fin?.confirmados, segundos: Math.round((Date.now() - t0) / 1000) }
}

// ---- (C) ráfaga -------------------------------------------------------------------------------
async function escenarioC(extras) {
  const g = grupos[0]
  const tomi = g.tomi
  escenario = 'prep'
  // Diez personas reales del demo del grupo 0 (entraron en B), con condiciones, elegibles en la versión 1.
  const personas = [...grupos.slice(1).flatMap((x) => [x.tomi, x.luna]), ...extras].slice(0, RAFAGA_PERSONAS)
  const c = await exigir(tomi, 'create_proposal', {
    p_espacio_id: g.demo.id, p_titulo: 'Ráfaga de aceptaciones', p_franjas: FRANJAS, p_minimo: 2, p_maximo: 20,
    p_imprescindible_id: g.ids.Tomi, p_plazo: PLAZO, p_zona_horaria: 'America/Santiago', p_intento_id: randomUUID(),
  })
  const prop = c.resultado.propuesta_id
  await exigir(tomi, 'open_proposal', { p_propuesta_id: prop })
  await exigir(tomi, 'save_my_conditions', { p_propuesta_id: prop, p_disponibilidad: SI })
  await Promise.all(personas.map((s) => exigir(s, 'save_my_conditions', { p_propuesta_id: prop, p_disponibilidad: SI })))
  const ev = await exigir(tomi, 'evaluate_and_publish', { p_propuesta_id: prop, p_intento_id: randomUUID() })
  const rev0 = ev.propuesta.state_rev
  const yo = {}
  for (const s of personas) yo[s.nombre] = (await exigir(s, 'get_proposal_state', { p_propuesta_id: prop })).propuesta.mi_situacion.miembro_id

  escenario = 'C'
  const t0 = Date.now()
  // 20 llamadas a la vez: la mitad de las personas repite el MISMO intento (doble envío), la otra mitad hace
  // dos clics con intentos distintos.
  const planes = personas.flatMap((s, i) => {
    const mismo = randomUUID()
    return i < personas.length / 2
      ? [{ s, intento: mismo, tipo: 'mismo' }, { s, intento: mismo, tipo: 'mismo' }]
      : [{ s, intento: randomUUID(), tipo: 'distinto' }, { s, intento: randomUUID(), tipo: 'distinto' }]
  })
  const ola1 = await Promise.all(planes.sort(() => Math.random() - 0.5).map(async (p) =>
    ({ ...p, r: await rpc(p.s, 'accept_version', { p_propuesta_id: prop, p_version: 1, p_intento_id: p.intento }) })))
  // Reintentos: cada persona vuelve a aceptar con un intento nuevo, todas a la vez.
  const ola2 = await Promise.all(personas.map(async (s) =>
    ({ s, r: await rpc(s, 'accept_version', { p_propuesta_id: prop, p_version: 1, p_intento_id: randomUUID() }) })))
  const st = (await rpc(tomi, 'get_proposal_state', { p_propuesta_id: prop })).data.propuesta

  const fallas = []
  const malos = [...ola1, ...ola2].filter((x) => x.r.res !== 'ok')
  if (malos.length) fallas.push(`${malos.length} llamadas sin ok: ${[...new Set(malos.map((x) => x.r.res))].join(', ')}`)
  for (const s of personas) {
    const mias = ola1.filter((x) => x.s === s && x.r.res === 'ok')
    const nuevas = mias.filter((x) => x.r.data.resultado.repetido === false).length
    if (nuevas !== 1) fallas.push(`${s.nombre}: ${nuevas} aceptaciones nuevas en la ráfaga (debía ser 1)`)
    const r2 = ola2.find((x) => x.s === s)
    if (r2?.r.res === 'ok' && r2.r.data.resultado.repetido !== true) fallas.push(`${s.nombre}: el reintento no salió repetido`)
  }
  const aceptaron = st.opcion.aceptaron.map((a) => a.miembro.miembro_id)
  const esperados = Object.values(yo).sort()
  if (new Set(aceptaron).size !== aceptaron.length) fallas.push('una persona figura dos veces en aceptaron')
  if (JSON.stringify([...aceptaron].sort()) !== JSON.stringify(esperados)) fallas.push('aceptaron no coincide con las 10 personas')
  if (st.confirmados !== personas.length || st.opcion.cupos.confirmados !== personas.length) fallas.push(`confirmados ${st.confirmados}`)
  const eventos = st.historial.filter((e) => e.tipo === 'aceptacion' && esperados.includes(e.actor?.miembro_id))
  if (eventos.length !== personas.length) fallas.push(`${eventos.length} eventos de aceptación (debían ser ${personas.length})`)
  if (st.state_rev !== rev0 + personas.length) fallas.push(`state_rev subió ${st.state_rev - rev0} (debía subir ${personas.length})`)
  if (st.estado !== 'esperando_compromisos' || st.opcion.cupos.imprescindible_acepto !== false
      || st.opcion.cupos.reservado_imprescindible !== true || st.opcion.cupos.libres_para_otros !== 20 - personas.length - 1) {
    fallas.push(`estado o cupos contradictorios: ${st.estado} ${JSON.stringify(st.opcion.cupos)}`)
  }
  // Cierra el anfitrión: grupo confirmado con 11.
  const fin = await rpc(tomi, 'accept_version', { p_propuesta_id: prop, p_version: 1, p_intento_id: randomUUID() })
  if (fin.res !== 'ok' || fin.data.propuesta.estado !== 'grupo_confirmado' || fin.data.propuesta.confirmados !== personas.length + 1) {
    fallas.push(`cierre del anfitrión: ${fin.res} ${fin.data?.propuesta?.estado} ${fin.data?.propuesta?.confirmados}`)
  }
  return {
    llamadasRafaga: ola1.length, reintentos: ola2.length, confirmados: st.confirmados, eventos: eventos.length,
    stateRev: `${rev0} -> ${st.state_rev}`, invariantes: fallas.length ? fallas : 'ok', segundos: Math.round((Date.now() - t0) / 1000),
  }
}

// ---- (D) proponer_plan_borrador ---------------------------------------------------------------
async function escenarioD() {
  escenario = 'D'
  const t0 = Date.now()
  let sab = new Date()
  do sab = new Date(sab.getTime() + 86_400_000)
  while (sab.toLocaleDateString('en-US', { timeZone: 'America/Santiago', weekday: 'short' }) !== 'Sat')
  const sabado = sab.toLocaleDateString('en-CA', { timeZone: 'America/Santiago' })
  const tipos = {}
  for (let ronda = 0; ronda < RONDAS_D; ronda++) {
    const rs = await Promise.all(grupos.map((g) => rpc(g.tomi, 'proponer_plan_borrador', {
      p_espacio_id: g.demo.id, p_sabado: sabado, p_clima: { sabado: 'seco', domingo: 'seco' },
    })))
    for (const r of rs) {
      const k = r.res === 'ok' ? r.data.resultado.tipo : r.res
      tipos[k] = (tipos[k] ?? 0) + 1
    }
  }
  return { sabado, rondas: RONDAS_D, resultados: tipos, segundos: Math.round((Date.now() - t0) / 1000) }
}

// ---- principal --------------------------------------------------------------------------------
const pedidos = process.argv.slice(2).map((x) => x.toUpperCase())
const corre = (x) => pedidos.length === 0 || pedidos.includes(x)

console.log(`Prueba de carga CRUXE · inicio ${hora()} (America/Santiago) · escenarios ${pedidos.length ? pedidos.join(',') : 'A,B,C,D'}`)
escenario = 'prep'
const base = await sesiones(Array.from({ length: GRUPOS * 2 }, (_, i) => `${i % 2 ? 'L' : 'T'}${Math.floor(i / 2)}`))
for (let i = 0; i < GRUPOS; i++) grupos.push({ tomi: base[2 * i], luna: base[2 * i + 1] })
const extras = corre('B') || corre('C') ? await sesiones(Array.from({ length: PICO_SESIONES - GRUPOS * 2 }, (_, i) => `X${i}`)) : []
console.log(`${sesionesCreadas} sesiones anónimas creadas (${hora()})`)

const informes = {}
if (corre('A') || corre('B') || corre('C') || corre('D')) {
  if (corre('A')) {
    console.log(`\n(A) Día de demo: ${GRUPOS} grupos, sondeo cada ${SONDEO_A_MS / 1000} s durante ${DURACION_A_MS / 1000} s (${hora()})`)
    informes.A = await escenarioA()
  } else {
    // Sin (A), cada grupo igual necesita su demo y a Luna para B, C y D.
    escenario = 'prep'
    await Promise.all(grupos.map(async (g) => {
      g.demo = (await exigir(g.tomi, 'seed_demo_space')).espacio
      g.ids = Object.fromEntries(g.demo.miembros.map((m) => [m.nombre, m.miembro_id]))
      await exigir(g.luna, 'join_space', { p_codigo: g.demo.codigo_invitacion, p_nombre_visible: 'Luna' })
    }))
  }
  console.log('(A)', JSON.stringify(informes.A ?? 'omitido'))
  if (corre('B')) {
    console.log(`\n(B) Pico: ${PICO_SESIONES} sesiones cada ${SONDEO_B_MS / 1000} s durante ${DURACION_B_MS / 1000} s (${hora()})`)
    informes.B = await escenarioB(extras)
    console.log('(B)', JSON.stringify(informes.B))
  }
  if (corre('C')) {
    if (!corre('B')) {
      escenario = 'prep'
      await Promise.all([...grupos.slice(1).flatMap((x) => [x.tomi, x.luna]), ...extras].slice(0, RAFAGA_PERSONAS).map((s) =>
        exigir(s, 'join_space', { p_codigo: grupos[0].demo.codigo_invitacion, p_nombre_visible: `Carga ${s.nombre}` })))
    }
    console.log(`\n(C) Ráfaga: ${RAFAGA_PERSONAS * 2} aceptaciones concurrentes y ${RAFAGA_PERSONAS} reintentos (${hora()})`)
    informes.C = await escenarioC(extras)
    console.log('(C)', JSON.stringify(informes.C))
  }
  if (corre('D')) {
    console.log(`\n(D) proponer_plan_borrador: ${GRUPOS} en paralelo x ${RONDAS_D} rondas (${hora()})`)
    informes.D = await escenarioD()
    console.log('(D)', JSON.stringify(informes.D))
  }
}

// Cierre: las propuestas de prueba quedan canceladas (no se borra nada). No se mide.
escenario = 'cierre'
await Promise.all(grupos.filter((g) => g.prop).map((g) => rpc(g.tomi, 'cancel_proposal', { p_propuesta_id: g.prop })))

console.log(`\n## Resultados (fin ${hora()}, latencia de ida y vuelta medida desde el cliente, en ms)`)
const criterio = { A: { p95: 1000, cero: true }, B: { p95: 1500 }, C: {}, D: { p95: 1500 } }
for (const esc of ['prep', 'A', 'B', 'C', 'D']) {
  if (!llamadas.some((l) => l.esc === esc)) continue
  const { tabla, total, errores } = resumen(esc)
  imprimirTabla(esc === 'prep' ? 'Preparación (no entra en los criterios)' : `Escenario ${esc}`, tabla)
  if (Object.keys(errores).length) console.log(`\nErrores por código: ${JSON.stringify(errores)}`)
  const c = criterio[esc]
  if (c) {
    const veredictos = []
    if (c.p95) veredictos.push(`p95 ${total.p95} ms ${total.p95 < c.p95 ? '<' : '>='} ${c.p95} ms`)
    if (c.cero) veredictos.push(`${total.errores} errores`)
    if (esc === 'C') veredictos.push(`invariantes: ${JSON.stringify(informes.C?.invariantes)}`)
    const pasa = (!c.p95 || total.p95 < c.p95) && (!c.cero || total.errores === 0) && (esc !== 'C' || informes.C?.invariantes === 'ok')
    console.log(`\nCriterio ${esc}: ${veredictos.join(' · ')} → ${pasa ? 'CUMPLE' : 'NO CUMPLE'}`)
  }
}
console.log(`\nSesiones anónimas creadas: ${sesionesCreadas}. Llamadas medidas: ${llamadas.filter((l) => l.esc !== 'cierre').length}.`)
