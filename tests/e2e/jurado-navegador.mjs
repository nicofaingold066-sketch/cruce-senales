// #17: las cuatro variantes de docs/jurado-variantes.md a través de la UI real.
// node tests/e2e/jurado-navegador.mjs [url]
// Sin URL levanta Vite local; con URL prueba ese despliegue. Reutiliza solo dos sesiones
// anónimas propias (Tomi y Luna), un demo y cuatro propuestas. Ninguna escritura por API manual.
// Playwright/Chrome ya instalados, como red-controlada.mjs. No llama al agente ni al modelo.
// CRUXE_CAPTURAS es opcional: carpeta de capturas ficticias, fuera del repositorio recomendado.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { createServer } from 'vite'

const require = createRequire(import.meta.url)
let pw
try { pw = require('playwright') } catch {
  pw = require(process.env.CRUXE_PLAYWRIGHT_DIR || '/Users/macair/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
}
const hora = () => new Date().toLocaleString('sv-SE', { timeZone: 'America/Santiago' })
const log = t => console.log(`[${hora()} Santiago] ${t}`)
function baseLibre() {
  execFileSync('git', ['fetch', '-q', 'origin', 'coordinacion'], { stdio: 'pipe' })
  const ficha = execFileSync('git', ['show', 'origin/coordinacion:agentes/backend.md'], { encoding: 'utf8' })
  const tocando = ficha.match(/## Tocando ahora\s*\n([\s\S]*?)(?=\n## |$)/)?.[1]
  assert.ok(tocando, 'No se pudo verificar la ficha de backend')
  assert.doesNotMatch(tocando, /MIGRACION EN CURSO|PRUEBA DE CARGA EN CURSO/i,
    'Backend migrando o midiendo carga: no correr contra la base')
}
baseLibre()
const entrada = process.argv[2] || process.env.CRUXE_URL
const server = entrada ? null : await createServer({ server: { host: '127.0.0.1', port: 4191, strictPort: true } })
if (server) await server.listen()
const BASE = (entrada || 'http://127.0.0.1:4191').replace(/\/+$/, '')
const carpeta = process.env.CRUXE_CAPTURAS
  ? `${process.env.CRUXE_CAPTURAS}/jurado-${new Date().toISOString().replace(/[:.]/g, '-')}` : ''
if (carpeta) mkdirSync(carpeta, { recursive: true })
const browser = await pw.chromium.launch({ headless: true,
  executablePath: process.env.CRUXE_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' })
const opciones = { viewport: { width: 375, height: 812 }, locale: 'es-CL', timezoneId: 'America/Santiago' }
const ctxT = await browser.newContext(opciones), ctxL = await browser.newContext(opciones)
const T = await ctxT.newPage(), L = await ctxL.newPage()
const jsErrores = [], privados = [], erroresRPC = [], lecturasPendientes = new Set()
const sesiones = new Set(), propuestas = []
let comprobadas = 0, aprobadas = 0, fallidas = 0, modelos = 0, rpcObservadas = 0, espacioUrl

function sinPrivados(v, ruta = 'propuesta') {
  if (!v || typeof v !== 'object') return
  for (const [k, x] of Object.entries(v)) {
    if (k === 'condiciones' && ruta.endsWith('.mi_situacion') && typeof x === 'string') continue
    if (['disponibilidad', 'condiciones', 'preferencias', 'elegibles', 'user_id',
      'access_token', 'refresh_token', 'p_intento_id'].includes(k)) privados.push(`${ruta}.${k}`)
    sinPrivados(x, `${ruta}.${k}`)
  }
}
// Enmienda 10: zona, movilidad, tiempo máximo y momento son privados. Ninguna respuesta compartida los trae
// (solo las RPC de las propias preferencias de quien llama). Las claves de lista cerrada se buscan como claves y como valores.
const PROPIAS = ['get_my_preferences', 'save_my_preferences', 'simulate_save_preferences']
const CLAVES_E10 = ['movilidad', 'tiempo_max', 'minutos_por_persona', 'minutos_persona']
const VALORES_E10 = ['me_llevan', 'auto_con_lugar', 'auto_sin_lugar', 'transporte_publico', 'bici_o_pie',
  'providencia', 'nunoa', 'las_condes', 'santiago_centro', 'maipu', 'la_florida', 'puente_alto', 'vitacura']
function sinE10(v, ruta) {
  if (Array.isArray(v)) return v.forEach((x, i) => sinE10(x, `${ruta}[${i}]`))
  if (v && typeof v === 'object') {
    for (const [k, x] of Object.entries(v)) {
      if (CLAVES_E10.includes(k)) privados.push(`E10 ${ruta}.${k}`)
      sinE10(x, `${ruta}.${k}`)
    }
  } else if (typeof v === 'string' && VALORES_E10.includes(v)) privados.push(`E10 ${ruta}=valor privado`)
}
// Enmienda 13. (c) La baja no trae nombre, motivo ni si había confirmado, en ninguna respuesta compartida (tampoco al
// organizador: ve el total, no quién). (a) `opiniones_totales` solo lo ve el organizador, es null con menos de 2 y nunca
// trae nombres. Se activa sola cuando el servidor trae las claves nuevas (`mi_situacion.mi_opinion` / `opiniones_totales`);
// hasta entonces queda como pendiente, sin contar. `ejecutado_por` de un evento es quien corrió la simulación (público).
let e13 = null
const NOMBRES_DEMO = ['Tomi', 'Luna', 'Mati', 'Caro', 'Fede', 'Sofi']
function sinE13(p, nombre) {
  if (!p?.mi_situacion) return
  if (e13 === null) e13 = 'mi_opinion' in p.mi_situacion || 'opiniones_totales' in p
  if (!e13) return
  const baja = JSON.stringify({ bajas: p.bajas ?? null,
    eventos: (p.historial ?? []).filter(e => e.tipo === 'baja').map(({ ejecutado_por: _simula, ...e }) => e) })
  for (const n of NOMBRES_DEMO) if (baja.includes(`"${n}"`)) privados.push(`E13 ${nombre}: la baja nombra a ${n}`)
  if (baja.includes('habia_aceptado')) privados.push(`E13 ${nombre}: la baja dice si había confirmado`)
  const totales = p.opiniones_totales ?? null
  if (totales === null) return
  if (!nombre.startsWith('Tomi')) privados.push(`E13 ${nombre}: ve opiniones_totales`)
  if (typeof totales !== 'object' || Object.values(totales).some(v => typeof v !== 'number' || v < 2)) privados.push(`E13 ${nombre}: opiniones_totales con menos de 2 o forma rara`)
  for (const n of NOMBRES_DEMO) if (JSON.stringify(totales).includes(n)) privados.push(`E13 ${nombre}: opiniones_totales nombra a ${n}`)
}
async function observar(p, nombre) {
  p.setDefaultTimeout(15000)
  p.on('pageerror', e => jsErrores.push(`${nombre}: ${e.name}`))
  // Ni el agente ni proveedores de modelos pueden ejecutarse en este guion.
  await p.route('**/*', route => {
    const u = new URL(route.request().url())
    if (u.pathname.startsWith('/functions/v1/') || /anthropic|openai\.com/.test(u.hostname)) {
      modelos++; return route.abort('blockedbyclient')
    }
    return route.continue()
  })
  p.on('response', response => {
    const u = new URL(response.url())
    if (!u.pathname.startsWith('/rest/v1/rpc/') && u.pathname !== '/auth/v1/signup') return
    const promesa = (async () => {
      const r = await response.json()
      if (u.pathname === '/auth/v1/signup') {
        if (r.user?.id) sesiones.add(r.user.id)
        return // Nunca se guardan ni imprimen tokens.
      }
      rpcObservadas++
      if (r.contrato !== 2) privados.push('respuesta sin contrato 2')
      if (!PROPIAS.includes(u.pathname.split('/').at(-1))) sinE10(r, u.pathname.split('/').at(-1))
      if (r.propuesta) {
        sinPrivados(r.propuesta); sinE13(r.propuesta, nombre)
        if (nombre === 'Luna') {
          if (r.propuesta.personas_con_condiciones !== null) privados.push('Luna: conteo de condiciones')
          if (r.propuesta.opcion && r.propuesta.opcion.cupos.pendientes !== null) privados.push('Luna: pendientes')
        }
      }
      if (r.ok === false) erroresRPC.push(`${u.pathname.split('/').at(-1)}:${r.error?.codigo}/${r.error?.detalle}`)
    })().catch(() => { if (!p.isClosed()) jsErrores.push(`${nombre}: respuesta no legible`) })
    lecturasPendientes.add(promesa)
    void promesa.finally(() => lecturasPendientes.delete(promesa))
  })
}
await observar(T, 'Tomi'); await observar(L, 'Luna')
const boton = (p, nombre) => p.getByRole('button', { name: nombre, exact: true })
const tocar = (p, nombre) => boton(p, nombre).click()
const tab = (p, nombre) => p.getByRole('tab', { name: nombre, exact: true }).click()
const texto = (p, t) => p.getByText(t, { exact: false }).first().waitFor()
const estado = (p, t) => p.locator('.estado-hero-etiqueta').filter({ hasText: new RegExp(`^${t}$`, 'i') }).waitFor()
function comprobar(condicion, mensaje) { assert.ok(condicion, mensaje); comprobadas++ }
async function accion(p, fn, clic, ok = true) {
  const espera = p.waitForResponse(r => new URL(r.url()).pathname === `/rest/v1/rpc/${fn}`)
  await clic()
  const response = await espera
  const r = await response.json()
  assert.equal(response.status(), 200, `${fn}: transporte`)
  assert.equal(r.contrato, 2, `${fn}: contrato`)
  assert.equal(r.ok, ok, `${fn}: ${r.error?.codigo ?? ''}/${r.error?.detalle ?? ''}`)
  return r
}
async function condiciones(p, a = 'Sí puedo', b = 'Sí puedo') {
  await tab(p, 'Mi respuesta')
  for (const [clave, valor] of [['A', a], ['B', b]]) {
    await p.locator('fieldset', { has: p.locator('legend', { hasText: `Franja ${clave}:` }) })
      .getByLabel(valor, { exact: true }).check()
  }
  await accion(p, 'save_my_conditions', () => tocar(p, 'Guardar condiciones'))
  await texto(p, 'Guardado. Solo tú ves estas condiciones.')
}
async function foto(p, nombre) {
  if (carpeta) await p.screenshot({ path: `${carpeta}/${nombre}.png`, fullPage: true })
}
async function preparar(minimo = 4, maximo = 6, tomi = true, caro = true) {
  baseLibre()
  await T.goto(espacioUrl)
  await T.getByRole('link', { name: /Crear propuesta|Nueva propuesta/ }).first().click()
  await T.getByLabel(/Mínimo/).fill(String(minimo)); await T.getByLabel('Máximo', { exact: true }).fill(String(maximo))
  await tocar(T, 'Revisar antes de crear')
  const creada = await accion(T, 'create_proposal', () => tocar(T, 'Crear y abrir al grupo'))
  await T.waitForURL(/\/p\//)
  await estado(T, 'Reuniendo interés')
  propuestas.push({ url: T.url(), id: creada.resultado.propuesta_id, cancelada: false })
  await condiciones(T, tomi ? 'Sí puedo' : 'No puedo', tomi ? 'Sí puedo' : 'No puedo')
  await L.goto(T.url()); await condiciones(L)
  await tab(T, 'Simulación')
  await accion(T, 'simulate_load_case', () => tocar(T, 'Cargar condiciones del caso a las personas simuladas'))
  await texto(T, 'cargadas las condiciones de')
  if (!caro) {
    const tarjeta = T.getByRole('region', { name: 'Simulación de Caro', exact: true })
    await tarjeta.locator('summary').click()
    for (const clave of ['A', 'B']) await tarjeta.locator('fieldset', { hasText: `Franja ${clave}:` }).getByLabel('No puedo', { exact: true }).check()
    await accion(T, 'simulate_save_conditions', () => tocar(T, 'Guardar condiciones de Caro'))
  }
  await tab(T, 'Plan'); await tab(L, 'Plan')
}
async function evaluar(franja) {
  const r = await accion(T, 'evaluate_and_publish', () => tocar(T, 'Buscar opción compatible'))
  assert.equal(r.resultado.franja, franja)
  if (franja) {
    await texto(T, 'Opción vigente · Versión 1')
    comprobar(await T.locator('.opcion .suave').filter({ hasText: `Franja ${franja} ·` }).count() === 1, `UI: franja ${franja}`)
  }
  return r
}
async function aceptar(nombre, pagina = T) {
  const real = nombre === 'Luna' || nombre === 'Tomi'
  const p = nombre === 'Luna' ? L : pagina
  await tab(p, real ? 'Plan' : 'Simulación')
  return accion(p, real ? 'accept_version' : 'simulate_accept', () => tocar(p,
    real ? 'Confirmar versión 1' : `Aceptar versión 1 por ${nombre}`))
}
async function cancelar() {
  baseLibre()
  const actual = propuestas.at(-1)
  if (!actual || actual.cancelada) return
  await T.goto(actual.url); await tab(T, 'Plan')
  await tocar(T, 'Cancelar propuesta')
  await accion(T, 'cancel_proposal', () => tocar(T, 'Sí, cancelar'))
  await estado(T, 'Cancelado'); actual.cancelada = true
}
async function variante(nombre, prueba) {
  const inicio = Date.now()
  try {
    await prueba(); await Promise.all([...lecturasPendientes])
    assert.deepEqual(privados, [], 'Privacidad de respuestas compartidas')
    assert.deepEqual(jsErrores, [], 'Errores JS')
    aprobadas++; log(`PASS ${nombre} (${Date.now() - inicio} ms)`)
  } catch (e) {
    fallidas++; log(`FAIL ${nombre}: ${String(e.message).split('\n')[0]}`)
    await foto(T, `fallo-${aprobadas + 1}-Tomi`).catch(() => {})
    await foto(L, `fallo-${aprobadas + 1}-Luna`).catch(() => {})
    throw e
  } finally { await cancelar() }
}

log(`Jurado navegador: ${BASE}; 375 px; base ${execFileSync('git', ['rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim()}`)
try {
  await T.goto(BASE)
  const seed = await accion(T, 'seed_demo_space', () => tocar(T, 'Probar la demo «Los del asado»'))
  await T.getByRole('heading', { name: 'Los del asado', exact: true }).waitFor()
  espacioUrl = T.url()
  const codigo = seed.espacio.codigo_invitacion
  await L.goto(`${BASE}/#/unirse/${codigo}`)
  const unirse = L.locator('form', { has: L.getByRole('heading', { name: 'Unirme con un código', exact: true }) })
  // El label incluye también la ayuda <small>; se acota al formulario de unirse.
  await unirse.getByLabel('Tu nombre en el espacio').fill('Luna')
  const unir = await accion(L, 'join_space', () => tocar(L, 'Unirme'))
  assert.equal(unir.resultado.reclamo_asiento_simulado, true)
  await L.getByRole('heading', { name: 'Los del asado', exact: true }).waitFor()
  comprobar(sesiones.size === 2, 'Dos identidades anónimas distintas')
  log('Demo propio creado por UI; Luna reclama su asiento. Se reutilizan las dos sesiones.')

  await variante('V1 mínimo 5: domingo, espera con cuatro y confirma con Tomi quinto', async () => {
    await preparar(5)
    const ev = await evaluar('B')
    comprobar(ev.propuesta.minimo === 5 && ev.propuesta.opcion.cupos.pendientes === 5, 'Mínimo 5 y cinco elegibles')
    for (const [i, n] of ['Luna', 'Mati', 'Fede', 'Sofi'].entries()) {
      const r = await aceptar(n)
      comprobar(r.propuesta.confirmados === i + 1 && r.propuesta.estado === 'esperando_compromisos', `Espera después de ${n}`)
    }
    await tab(T, 'Plan'); await estado(T, 'Esperando compromisos')
    comprobar(/4 de 5/.test(await T.locator('.opcion').innerText()), 'UI: cuatro confirmaciones aún insuficientes')
    const fin = await aceptar('Tomi')
    comprobar(fin.propuesta.confirmados === 5 && fin.propuesta.estado === 'grupo_confirmado', 'Quinto con anfitrión confirma')
    await estado(T, 'Grupo confirmado'); await estado(L, 'Grupo confirmado')
    await foto(L, 'V1-minimo5-domingo-confirmado')
  })

  await variante('V2a anfitrión no disponible: sin opción, conserva mínimo y privacidad', async () => {
    await preparar(4, 6, false)
    const r = await evaluar(null)
    comprobar(r.resultado.tipo === 'sin_opcion' && r.propuesta.minimo === 4 && r.propuesta.opcion === null, 'Sin opción, reglas intactas')
    await texto(T, 'Sin opción compatible'); await texto(L, 'Sin opción compatible')
    await estado(T, 'Reuniendo interés'); await estado(L, 'Reuniendo interés')
    comprobar(/Mínimo 4/.test(await L.locator('main').innerText()), 'UI: mínimo no se reduce')
    comprobar(!/Tomi.{0,30}(?:no puede|no está disponible)/i.test(await L.locator('main').innerText()), 'UI: no revela motivo privado')
    await foto(L, 'V2a-sin-opcion')
  })

  await variante('V2b baja de Caro y anfitrión no disponible: sin alternativa, sigue En revisión/v1', async () => {
    await preparar(); await evaluar('A')
    for (const n of ['Luna', 'Mati', 'Caro', 'Tomi']) await aceptar(n)
    await estado(T, 'Grupo confirmado')
    await tab(T, 'Simulación'); await tocar(T, 'Se baja: Caro')
    const baja = await accion(T, 'simulate_withdraw', () => tocar(T, 'Sí, Caro se baja'))
    comprobar(baja.propuesta.estado === 'en_revision', 'Baja rompe el mínimo')
    // E13 (c) en pantalla: el historial compartido no nombra a quien se retiró, ni en la sesión de Luna ni en la del
    // organizador. El texto nuevo ("Una persona se retiró") es de front-juan: se avisa, no se exige todavía.
    if (e13) {
      await L.reload(); await tab(L, 'Historial'); await tab(T, 'Historial')
      for (const [p, quien] of [[L, 'Luna'], [T, 'Tomi']]) {
        const historial = await p.locator('main').innerText()
        comprobar(!/(?:Tomi|Luna|Mati|Caro|Fede|Sofi) se (?:bajó|retiró)/.test(historial), `UI E13: historial de ${quien} sin el nombre de quien se retiró`)
        if (/El sistema se bajó/.test(historial)) log(`AVISO E13 (${quien}): el historial dice "El sistema se bajó"; debería decir "Una persona se bajó"`)
        else if (!/Una persona se (?:bajó|retiró)/.test(historial)) log(`AVISO E13 (${quien}): el historial todavía no dice "Una persona se bajó"`)
      }
      await tab(T, 'Plan')
    } else log('E13 pendiente: el servidor no trae mi_opinion/opiniones_totales; la baja sin nombre se comprueba sola cuando llegue.')
    await condiciones(T, 'No puedo', 'No puedo')
    await tab(T, 'Plan')
    const r = await accion(T, 'propose_repair', () => tocar(T, 'Buscar alternativa'), false)
    comprobar(r.error.codigo === 'sin_alternativa', 'Servidor rechaza alternativa')
    await texto(T, 'Sin opción compatible'); await texto(L, 'Sin opción compatible')
    await estado(T, 'En revisión'); await estado(L, 'En revisión')
    await texto(L, 'Versión 1 (en revisión, no confirmada)')
    comprobar(!/Opción vigente · Versión 2/.test(await L.locator('main').innerText()), 'UI: no inventa v2 ni reparación')
    comprobar(!/Tomi.{0,30}(?:no puede|no está disponible)/i.test(await L.locator('main').innerText()), 'UI: no revela causa de falta de alternativa')
    await foto(L, 'V2b-sin-alternativa')
  })

  await variante('V3 máximo 4: reserva al anfitrión, rechaza Sofi desde pantalla vieja', async () => {
    await preparar(4, 4, true, false)
    const ev = await evaluar('B')
    comprobar(ev.propuesta.opcion.cupos.pendientes === 5 && ev.propuesta.opcion.cupos.libres_para_otros === 3, 'Cinco elegibles para cuatro lugares')
    await aceptar('Luna'); await aceptar('Mati')
    // T2 comparte la identidad de Tomi; no crea un tercer usuario. Deja de recibir lecturas,
    // mientras T completa el tercer cupo ajeno. El botón viejo envía una escritura REAL.
    const vieja = await ctxT.newPage(); await observar(vieja, 'Tomi-viejo')
    const retenidas = new Set()
    try {
      await vieja.goto(T.url()); await tab(vieja, 'Simulación')
      await boton(vieja, 'Aceptar versión 1 por Sofi').waitFor()
      await vieja.route('**/rest/v1/rpc/**', route => {
        const fn = new URL(route.request().url()).pathname.split('/').at(-1)
        if (['get_proposal_state', 'get_simulation_panel'].includes(fn)) { retenidas.add(route); return }
        return route.fallback()
      })
      await aceptar('Fede')
      await tab(T, 'Plan'); await estado(T, 'Esperando compromisos')
      await texto(T, 'Libres para el resto: 0')
      const r = await accion(vieja, 'simulate_accept', () => tocar(vieja, 'Aceptar versión 1 por Sofi'), false)
      comprobar(r.error.codigo === 'cupo_completo' && r.error.detalle === 'reservado_imprescindible', 'Servidor revalida y reserva a Tomi')
      await texto(vieja, 'reservado')
      await tab(T, 'Simulación')
      const tarjeta = T.getByRole('region', { name: 'Simulación de Sofi', exact: true })
      await tarjeta.waitFor()
      comprobar(await tarjeta.getByRole('button', { name: 'Aceptar versión 1 por Sofi', exact: true }).count() === 0, 'UI actualizada no ofrece aceptación a Sofi')
      const fin = await aceptar('Tomi')
      comprobar(fin.propuesta.confirmados === 4 && fin.propuesta.estado === 'grupo_confirmado' && fin.propuesta.opcion.cupos.disponibles === 0, 'Tomi confirma último: cuatro, sin sobrecupo')
      await estado(T, 'Grupo confirmado'); await estado(L, 'Grupo confirmado')
      comprobar(/4 de 4/.test(await L.locator('.opcion').innerText()), 'UI: cuatro de cuatro en la sesión de Luna')
      await foto(L, 'V3-cupo-reservado-confirmado')
    } finally {
      for (const route of retenidas) await route.abort().catch(() => {})
      await vieja.close()
    }
  })

  await Promise.all([...lecturasPendientes])
  assert.deepEqual(privados, [], 'Privacidad también en las respuestas de cancelación')
  assert.deepEqual(jsErrores, [], 'Sin errores JS durante todo el recorrido')
  assert.deepEqual(erroresRPC.sort(), ['propose_repair:sin_alternativa/sin_alternativa', 'simulate_accept:cupo_completo/reservado_imprescindible'].sort(), 'Solo los dos rechazos esperados')
  assert.equal(modelos, 0, 'Ninguna llamada a funciones/modelos')
  assert.equal(sesiones.size, 2, 'Sin identidades extra')
  log(`RPC observadas: ${rpcObservadas}; privacidad de sobres compartidos sin hallazgos; 2 rechazos esperados; 0 llamadas al modelo. Enmienda 13: ${e13 ? 'detectada y comprobada (baja sin nombre, totales solo al organizador)' : 'pendiente en el servidor'}.`)
} catch (e) {
  if (!fallidas) { fallidas++; log(`FAIL preparación/cierre: ${String(e.message).split('\n')[0]}`) }
  await foto(L, 'fallo-preparacion-Luna').catch(() => {})
} finally {
  await browser.close(); if (server) await server.close()
  log(`#17 navegador: ${aprobadas} PASS, ${fallidas} FAIL; ${comprobadas} comprobaciones; ${propuestas.filter(p => p.cancelada).length}/${propuestas.length} propuestas propias canceladas.`)
}
if (fallidas) process.exitCode = 1
