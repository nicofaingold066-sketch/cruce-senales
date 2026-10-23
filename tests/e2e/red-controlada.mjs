// #34. Sin base, Auth, modelos ni escrituras reales. Intercepta TODA salida de red externa.
// node tests/e2e/red-controlada.mjs
// Playwright debe estar disponible previamente; no instala paquetes ni navegadores.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { createServer } from 'vite'
const require = createRequire(import.meta.url)
let pw
try { pw = require('playwright') } catch {
  pw = require(process.env.CRUXE_PLAYWRIGHT_DIR || '/Users/macair/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
}
const server = await createServer({ server: { host: '127.0.0.1', port: 4189, strictPort: true } })
await server.listen()
const browser = await pw.chromium.launch({ headless: true,
  executablePath: process.env.CRUXE_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' })
const MOMENTO = { utc: '2026-10-23T17:00:00Z', local: '2026-10-23T14:00', zona: 'America/Santiago' }
const sobre = data => ({ ok: true, contrato: 2, servidor_ahora: MOMENTO, ...data })
const propuesta = (rev, titulo = `REV_${rev}`) => ({ id: 'propuesta-red', espacio_id: 'espacio-red',
  titulo, state_rev: rev, estado: 'esperando_compromisos', estado_etiqueta: 'Esperando compromisos',
  confirmados: 0, minimo: 4, maximo: 6, opcion: null, plazo: MOMENTO, plazo_vencido: false,
  version: 1, mi_situacion: { retirado: false }, siguiente_accion: { codigo: 'te_toca_aceptar', texto: 'Confirmá esta versión' } })
const lectura = (rev = 5, extra = {}) => sobre({ propuesta: propuesta(rev), rev_vista: rev * 100, ...extra })
const espacio = gen => sobre({ espacio: { id: 'espacio-red', nombre: `ESPACIO_GEN_${gen}`,
  generacion: gen, mi_rol: 'miembro', codigo_invitacion: 'PRUEBA34', demo: true, miembros: [] } })
const panel = (rev, nombres = []) => sobre({ state_rev: rev, simulacion: { miembros: nombres.map(nombre => ({
  miembro: { miembro_id: nombre, nombre, simulado: true }, interesado: false,
  condiciones: { disponibilidad: {}, estado: 'sin_cargar' }, retirado: false,
  elegible_en_version: null, acepte_version: false,
  puede: { marcar_interes: false, guardar_condiciones: false, aceptar: false, retirarme: false },
})) } })
const fulfill = (route, json) => route.fulfill({ status: 200, contentType: 'application/json',
  headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(json) })
const esperar = ms => new Promise(r => setTimeout(r, ms))
async function hasta(fn, mensaje, ms = 4000) {
  const fin = Date.now() + ms
  while (Date.now() < fin) { if (await fn()) return; await esperar(30) }
  throw new Error(mensaje)
}
let aprobadas = 0, fallidas = 0
async function caso(nombre, mock, prueba, modo = 'hooks') {
  const context = await browser.newContext()
  const page = await context.newPage()
  const errores = [], inesperadas = [], pendientes = new Set()
  page.on('pageerror', e => errores.push(e.message))
  await page.route('**/*', async route => {
    const url = new URL(route.request().url())
    if (url.hostname === '127.0.0.1') return route.continue()
    // Nunca route.continue() a Supabase ni a otros hosts.
    if (url.pathname.startsWith('/rest/v1/rpc/')) {
      pendientes.add(route)
      try { await mock({ route, fn: url.pathname.split('/').at(-1), args: route.request().postDataJSON(), page }) }
      catch (e) { if (!page.isClosed()) errores.push(String(e)) }
      finally { pendientes.delete(route) }
      return
    }
    inesperadas.push(url.hostname + url.pathname)
    await route.abort('blockedbyclient')
  })
  const inicio = Date.now()
  try {
    await page.goto(`http://127.0.0.1:4189/tests/e2e/red-controlada.html?modo=${modo}`)
    await prueba(page, context)
    assert.deepEqual(errores, [], 'Errores JS o del interceptor')
    assert.deepEqual(inesperadas, [], 'Salida externa inesperada bloqueada')
    console.log(`PASS ${nombre} (${Date.now() - inicio} ms)`); aprobadas++
  } catch (e) { console.log(`FAIL ${nombre}: ${e.message}`); fallidas++ }
  finally {
    for (const route of pendientes) await route.abort().catch(() => {})
    await context.close()
  }
}
const snapshot = page => page.evaluate(() => window.red?.snapshot?.())
const cargado = page => hasta(async () => (await snapshot(page))?.rev === 5, 'No llegó la lectura inicial')

try {
  await caso('N1 lectura colgada: aborta a 10 s y se recupera', async ({ route, args }) => {
    if (args.p_propuesta_id !== 'lectura-colgada') await fulfill(route, lectura())
  }, async page => {
    await cargado(page)
    const inicio = Date.now()
    const r = await page.evaluate(() => window.red.api.getProposalState('lectura-colgada'))
    assert.equal(r.ok, false); assert.equal(r.error.detalle, 'tope_de_espera')
    assert.equal(r.error.resultadoIncierto, undefined)
    assert.ok(Date.now() - inicio >= 9500, 'No esperó el tope real de 10 s')
    assert.ok(Date.now() - inicio < 12500, 'El tope no liberó la lectura')
    await page.evaluate(() => window.red.viva.refrescar())
    assert.equal((await snapshot(page)).rev, 5)
  })

  let aceptarLlamadas = 0
  const ids = [], registros = new Set()
  let liberarPerdida
  await caso('N2 doble clic + respuesta perdida: un intento, un registro, reintento seguro', async ({ route, fn, args }) => {
    if (fn !== 'accept_version') return fulfill(route, lectura(aceptarLlamadas ? 6 : 5))
    aceptarLlamadas++; ids.push(args.p_intento_id); registros.add(args.p_intento_id)
    if (aceptarLlamadas === 1) { liberarPerdida = () => route.abort('failed'); return }
    return fulfill(route, sobre({ propuesta: propuesta(6), resultado: { repetido: true } }))
  }, async page => {
    await cargado(page)
    await page.evaluate(() => { window.intentosRed = [window.red.aceptar(), window.red.aceptar()] })
    await hasta(() => aceptarLlamadas === 1, 'No salió la aceptación')
    assert.equal((await snapshot(page)).ocupado, true)
    await liberarPerdida()
    await page.evaluate(() => Promise.all(window.intentosRed))
    await hasta(async () => (await snapshot(page))?.error?.resultadoIncierto === true, 'No informó resultado incierto')
    await page.evaluate(() => window.red.aceptar())
    assert.equal(aceptarLlamadas, 2); assert.equal(ids[0], ids[1]); assert.equal(registros.size, 1)
    assert.equal((await snapshot(page)).ocupado, false)
    // Un clic NUEVO después del éxito recibe un intento nuevo.
    await page.evaluate(() => window.red.aceptar())
    assert.notEqual(ids[2], ids[0])
  })

  let escritura = 0
  await caso('N3 escritura colgada: libera botón a 10 s y conserva el intento', async ({ route, fn, args }) => {
    if (fn !== 'accept_version') return fulfill(route, lectura())
    ids.push(args.p_intento_id)
    if (++escritura > 1) await fulfill(route, sobre({ propuesta: propuesta(6) }))
  }, async page => {
    await cargado(page)
    await page.evaluate(() => { window.colgada = window.red.aceptar() })
    await hasta(async () => (await snapshot(page))?.error?.detalle === 'tope_de_espera', 'Escritura quedó congelada', 12500)
    assert.equal((await snapshot(page)).error.resultadoIncierto, true)
    assert.equal((await snapshot(page)).ocupado, false)
    const primero = ids.at(-1)
    await page.evaluate(() => window.red.aceptar())
    assert.equal(ids.at(-1), primero)
  })

  let lecturas = 0, lecturaVieja
  await caso('N4 lectura vieja no pisa la mutación nueva', async ({ route, fn }) => {
    if (fn === 'accept_version') return fulfill(route, sobre({ propuesta: propuesta(7) }))
    if (++lecturas === 2) { lecturaVieja = route; return }
    await fulfill(route, lectura())
  }, async page => {
    await cargado(page)
    await page.evaluate(() => { window.lecturaDemorada = window.red.viva.refrescar() })
    await hasta(() => !!lecturaVieja, 'No se retuvo lectura')
    await page.evaluate(() => window.red.aceptar())
    await hasta(async () => (await snapshot(page))?.rev === 7, 'No aplicó mutación nueva')
    await fulfill(lecturaVieja, lectura(6))
    await page.evaluate(() => window.lecturaDemorada)
    assert.equal((await snapshot(page)).rev, 7)
  })

  let vistas = [], paso = 0
  await caso('N5 sondeo liviano y cambio privado con igual state_rev', async ({ route, args }) => {
    vistas.push(args.p_desde_rev ?? null)
    paso++
    await fulfill(route, paso === 1 ? lectura() : paso === 2 ? lectura(5, { propuesta: propuesta(5, 'MISMA_REV_VISTA_NUEVA'), rev_vista: 501 })
      : sobre({ sin_cambios: true, state_rev: 5, rev_vista: 501 }))
  }, async page => {
    await cargado(page)
    await page.evaluate(() => window.red.viva.refrescar())
    assert.equal((await snapshot(page)).titulo, 'MISMA_REV_VISTA_NUEVA')
    await page.evaluate(() => window.red.viva.refrescar())
    assert.equal((await snapshot(page)).titulo, 'MISMA_REV_VISTA_NUEVA')
    assert.deepEqual(vistas.slice(0, 3), [null, 500, 501])
  })

  let escriturasOffline = 0
  await caso('N6 sin conexión antes del envío: cero escrituras y borrador conservado', async ({ route, fn }) => {
    if (fn === 'accept_version') escriturasOffline++
    await fulfill(route, lectura())
  }, async (page, context) => {
    await cargado(page)
    await page.evaluate(() => window.red.borrador.poner('A', 'si'))
    await hasta(async () => (await snapshot(page))?.draft.A === 'si', 'No cambió el borrador')
    await context.setOffline(true)
    const r = await page.evaluate(() => window.red.aceptar())
    assert.equal(r.error.sinConexion, true); assert.equal(r.error.resultadoIncierto, undefined)
    assert.equal(escriturasOffline, 0); assert.equal((await snapshot(page)).draft.A, 'si')
    await context.setOffline(false)
    await page.evaluate(() => window.red.viva.refrescar())
    assert.equal((await snapshot(page)).draft.A, 'si')
  })

  let gen = 1, listaCalls = 0, listaVieja
  await caso('N7 reinicio: lista vieja no resucita propuestas de otra generación', async ({ route, fn }) => {
    if (fn === 'get_space') return fulfill(route, espacio(gen))
    if (fn === 'list_proposals') {
      listaCalls++
      if (listaCalls === 3) { listaVieja = route; return }
      // La primera puede descartarse al establecer la generación; se recarga por visibilitychange.
      await esperar(80)
      return fulfill(route, sobre({ propuestas: gen === 1 ? [propuesta(5, 'PROPUESTA_VIEJA')] : [] }))
    }
    throw new Error(`RPC inesperada ${fn}`)
  }, async page => {
    await page.getByRole('heading', { name: 'ESPACIO_GEN_1' }).waitFor()
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
    await page.getByText('PROPUESTA_VIEJA', { exact: true }).waitFor()
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
    await hasta(() => !!listaVieja, 'No retuvo lista vieja')
    gen = 2
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
    await page.getByRole('heading', { name: 'ESPACIO_GEN_2' }).waitFor()
    await page.getByText('Todavía no hay propuestas', { exact: true }).waitFor()
    await fulfill(listaVieja, sobre({ propuestas: [propuesta(5, 'PROPUESTA_VIEJA')] }))
    await esperar(200)
    assert.equal(await page.getByText('PROPUESTA_VIEJA', { exact: true }).count(), 0)
  }, 'espacio')

  let panelCalls = 0, panelViejo
  await caso('N8 simulación: panel demorado no pisa la revisión nueva del padre', async ({ route }) => {
    panelCalls++
    if (panelCalls === 2) { panelViejo = route; return }
    await fulfill(route, panel(panelCalls === 1 ? 10 : 12))
  }, async page => {
    await page.getByText('No hay personas simuladas', { exact: true }).waitFor()
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
    await hasta(() => !!panelViejo, 'No retuvo panel')
    await page.evaluate(() => window.red.padre(12))
    await hasta(() => panelCalls >= 3, 'No recargó al cambiar el padre')
    await fulfill(panelViejo, panel(11, ['SIM_VIEJA']))
    await esperar(200)
    assert.equal(await page.getByText('SIM_VIEJA', { exact: true }).count(), 0)
    assert.equal(await page.getByText('No hay personas simuladas', { exact: true }).count(), 1)
  }, 'simulacion')

  // #53: F1 pasó de reproducción a regresión positiva cuando #52 lo arregló (Espacio.tsx, cargarTodo).
  // Mismas demoras que la reproducción: get_space llega primero y fija la generación.
  let espacios = 0, listas = 0
  await caso('F1 primera lista válida aparece sin refresco ni sondeo', async ({ route, fn }) => {
    if (fn === 'get_space') { espacios++; await esperar(20); return fulfill(route, espacio(1)) }
    if (fn === 'list_proposals') {
      listas++
      await esperar(180)
      return fulfill(route, sobre({ propuestas: [propuesta(5, 'LISTA_INICIAL_VALIDA')] }))
    }
    throw new Error(`RPC inesperada ${fn}`)
  }, async page => {
    await page.getByRole('heading', { name: 'ESPACIO_GEN_1' }).waitFor()
    // El sondeo es de 10 s: si la lista aparece antes de 2 s, no hizo falta refrescar.
    await page.getByText('LISTA_INICIAL_VALIDA', { exact: true }).waitFor({ timeout: 2000 })
    assert.equal(await page.getByText('Cargando propuestas…', { exact: true }).count(), 0)
    await esperar(300)
    assert.deepEqual({ espacios, listas }, { espacios: 1, listas: 1 }, 'Una lectura de cada una, sin refresco ni sondeo')
  }, 'espacio')

  // #53, caso aparte: latencias invertidas. El arreglo serializa la primera carga,
  // así que la lista rápida se pide recién después de conocer la generación del espacio lento.
  let espaciosLentos = 0, listasRapidas = 0
  await caso('F1b espacio lento / lista rápida: lista inicial sin refresco ni sondeo', async ({ route, fn }) => {
    if (fn === 'get_space') {
      espaciosLentos++; await esperar(180)
      await fulfill(route, espacio(1)); return
    }
    if (fn === 'list_proposals') {
      listasRapidas++; await esperar(20)
      await fulfill(route, sobre({ propuestas: [propuesta(5, 'LISTA_INICIAL_VALIDA')] }))
      return
    }
    throw new Error(`RPC inesperada ${fn}`)
  }, async page => {
    await page.getByRole('heading', { name: 'ESPACIO_GEN_1' }).waitFor()
    await page.getByText('LISTA_INICIAL_VALIDA', { exact: true }).waitFor({ timeout: 2000 })
    assert.equal(await page.getByText('Cargando propuestas…', { exact: true }).count(), 0)
    await esperar(300)
    assert.deepEqual({ espaciosLentos, listasRapidas }, { espaciosLentos: 1, listasRapidas: 1 })
  }, 'espacio')

} finally {
  await browser.close(); await server.close()
  console.log(`#34: ${aprobadas} PASS, ${fallidas} FAIL. Incluye 10 regresiones: N1 a N8, F1 y F1b (latencias invertidas; #53, arreglo #52). Red externa interceptada; cero llamadas reales a Supabase.`)
}
if (fallidas) process.exitCode = 1
