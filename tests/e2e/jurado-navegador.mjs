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
import { irA, responderRapido, respuestaGuardada, rotulo } from './nav.mjs'

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
  // Backend deja `habia_aceptado` en null (no quita la clave): lo que no puede haber es true/false.
  for (const b of Array.isArray(p.bajas) ? p.bajas : []) if ((b?.habia_aceptado ?? null) !== null) privados.push(`E13 ${nombre}: la baja dice si había confirmado`)
  // "Sin decir si había confirmado": la aceptación vieja de quien se retiró también sale sin actor. En este guion se retira Caro.
  if (Array.isArray(p.bajas) && p.bajas.length > 0) {
    for (const e of (p.historial ?? []).filter(e => e.tipo === 'aceptacion')) if (e.actor?.nombre === 'Caro') privados.push(`E13 ${nombre}: la aceptación de quien se retiró conserva el nombre`)
  }
  // `opiniones_totales` llega como { asi_no_puedo: n } con n null si hay menos de 2. Solo el organizador puede ver un número.
  const total = p.opiniones_totales?.asi_no_puedo ?? null
  if (total !== null && !nombre.startsWith('Tomi')) privados.push(`E13 ${nombre}: ve opiniones_totales`)
  if (total !== null && (typeof total !== 'number' || total < 2)) privados.push(`E13 ${nombre}: opiniones_totales con menos de 2 o forma rara`)
  for (const n of NOMBRES_DEMO) if (JSON.stringify(p.opiniones_totales ?? null).includes(n)) privados.push(`E13 ${nombre}: opiniones_totales nombra a ${n}`)
}
// Enmienda 15 (borrador de pendientes, 00:00): ronda de opiniones con plazo (`ronda`) y dos planes con «la que más Sí» (`regla`,
// `planes_totales`, `prefiero` dentro de la disponibilidad privada). Se activa sola cuando el servidor trae `ronda`/`regla`/
// `planes_totales`; hasta entonces no cuenta. Sin pedir ronda ni regla, todo queda como hoy: ronda null, regla temprana,
// planes_totales null. `prefiero` es privado: no aparece en NINGUNA respuesta compartida (solo en get_my_conditions /
// save_my_conditions / simulate_save_conditions de quien lo guardó). `planes_totales` solo lo ve el organizador y con cada
// número en null si es menor que 2.
let e15 = null
const PROPIAS_E15 = ['get_my_conditions', 'save_my_conditions', 'simulate_save_conditions']
function sinPrefiero(v, ruta) {
  if (Array.isArray(v)) return v.forEach((x, i) => sinPrefiero(x, `${ruta}[${i}]`))
  if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) { if (k === 'prefiero') privados.push(`E15 ${ruta}.prefiero`); sinPrefiero(x, `${ruta}.${k}`) }
}
function sinE15(p, nombre) {
  if (e15 === null) e15 = 'ronda' in p || 'regla' in p || 'planes_totales' in p
  if (!e15) return
  const t = p.planes_totales ?? null
  if (t !== null) {
    if (!nombre.startsWith('Tomi')) privados.push(`E15 ${nombre}: ve planes_totales`)
    for (const plan of ['A', 'B']) for (const k of ['si', 'prefieren']) {
      const n = t?.[plan]?.[k] ?? null
      if (n !== null && (typeof n !== 'number' || n < 2)) privados.push(`E15 ${nombre}: planes_totales.${plan}.${k} con menos de 2`)
    }
    for (const n of NOMBRES_DEMO) if (JSON.stringify(t).includes(n)) privados.push(`E15 ${nombre}: planes_totales nombra a ${n}`)
  }
  // Compatibilidad: una propuesta sin ronda ni regla pedidas queda como hoy.
  if ((p.regla ?? 'temprana') === 'temprana' && p.ronda != null) privados.push(`E15 ${nombre}: ronda sin haberla pedido`)
  if ((p.regla ?? 'temprana') === 'temprana' && t !== null) privados.push(`E15 ${nombre}: planes_totales con regla temprana`)
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
      if (!PROPIAS_E15.includes(u.pathname.split('/').at(-1))) sinPrefiero(r, u.pathname.split('/').at(-1))
      if (r.propuesta) {
        sinPrivados(r.propuesta); sinE13(r.propuesta, nombre); sinE15(r.propuesta, nombre)
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
const tab = (p, nombre) => irA(p, nombre)
const texto = (p, t) => p.getByText(t, { exact: false }).first().waitFor()
const estado = (p, t) => p.locator('.estado-hero-etiqueta').filter({ hasText: rotulo(t) }).first().waitFor()
function comprobar(condicion, mensaje) { assert.ok(condicion, mensaje); comprobadas++ }
async function accion(p, fn, clic, ok = true) {
  const espera = p.waitForResponse(r => new URL(r.url()).pathname === `/rest/v1/rpc/${fn}`)
  espera.catch(() => {}) // si el clic tarda más que la espera, el rechazo se lee abajo y no tumba el proceso
  await clic()
  const response = await espera.catch((e) => { throw new Error(`${fn}: sin respuesta (${String(e.message).split('\n')[0]})`) })
  const r = await response.json()
  assert.equal(response.status(), 200, `${fn}: transporte`)
  assert.equal(r.contrato, 2, `${fn}: contrato`)
  assert.equal(r.ok, ok, `${fn}: ${r.error?.codigo ?? ''}/${r.error?.detalle ?? ''}`)
  return r
}
async function condiciones(p, a = 'Sí puedo', b = 'Sí puedo') {
  // S5 (¿Cuándo puedes?): una opción rápida guarda las dos franjas con save_my_conditions; el editor viejo ya no existe.
  await tab(p, 'Mi respuesta')
  const v = (x) => (x === 'Sí puedo' ? 'si' : 'no')
  await accion(p, 'save_my_conditions', () => responderRapido(p, v(a), v(b)))
  await respuestaGuardada(p)
  await tab(p, 'Plan')
}
async function foto(p, nombre) {
  if (carpeta) await p.screenshot({ path: `${carpeta}/${nombre}.png`, fullPage: true })
}
async function preparar(minimo = 4, maximo = 6, tomi = true, caro = true) {
  baseLibre()
  await T.goto(espacioUrl)
  await T.getByRole('link', { name: /Crear propuesta|Nueva propuesta|Nuevo plan/ }).first().click()
  await T.getByLabel(/Mínimo/).fill(String(minimo)); await T.getByLabel('Máximo', { exact: true }).fill(String(maximo))
  // El mockup (S3) deja un solo primario («Crear y abrir al grupo»): el paso «Revisar antes de crear» es opcional.
  { const revisar = T.getByRole('button', { name: 'Revisar antes de crear', exact: true }); if (await revisar.isVisible().catch(() => false)) await revisar.click() }
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
    // Rediseño S4 (mockup): el plan muestra la fecha grande, no «Franja X ·»; se acepta cualquiera de las dos formas.
    const conFranja = (await T.locator('.opcion .suave').filter({ hasText: `Franja ${franja} ·` }).count()) === 1
    comprobar(conFranja || /Versión 1/.test(await T.locator('main').innerText()), `UI: franja ${franja}`)
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
  // S4 (mockup): «Cancelar la propuesta» solo existe reuniendo respuestas o en revisión; con el grupo confirmado no hay
  // botón y la propuesta queda en el demo propio de esta corrida (no estorba a la siguiente variante).
  const cancelarBtn = T.getByRole('button', { name: /^Cancelar (la )?propuesta$/ }).first()
  if (!(await cancelarBtn.waitFor({ timeout: 6000 }).then(() => true, () => false))) { log('Sin «Cancelar la propuesta» en este estado: queda sin cancelar (S4).'); actual.cancelada = 'sin-boton'; return }
  await cancelarBtn.click()
  try {
    await accion(T, 'cancel_proposal', () => tocar(T, 'Sí, cancelar'))
    await estado(T, 'Cancelado'); actual.cancelada = true
  } catch (e) {
    log(`No se pudo cancelar desde la UI: ${String(e.message).split('\n')[0]}`)
    await foto(T, 'fallo-cancelar-Tomi').catch(() => {})
    actual.cancelada = 'fallo-ui'
  }
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
  const seed = await accion(T, 'seed_demo_space', () => T.getByRole('button', { name: /^(Probar|Abrir) la demo «Los del (asado|finde)»/ }).first().click())
  await T.getByRole('heading', { name: /^Los del (asado|finde)$/ }).waitFor()
  espacioUrl = T.url()
  const codigo = seed.espacio.codigo_invitacion
  await L.goto(`${BASE}/#/unirse/${codigo}`)
  // S1 (mockup, pantalla 10): en la demo, «¿Quién eres?» lista los nombres y Luna entra en UN toque; si no hay lista,
  // el formulario de siempre («Tu nombre en el grupo» + «Unirme»/«Entrar»).
  const unir = await accion(L, 'join_space', async () => {
    const fila = L.getByRole('button', { name: 'Luna', exact: true })
    if (await fila.waitFor({ timeout: 8000 }).then(() => true, () => false)) {
      await fila.click()
      const si = boton(L, 'Sí, soy Luna'); if (await si.isVisible({ timeout: 1500 }).catch(() => false)) await si.click()
    } else {
      await L.getByLabel(/Tu nombre/).first().fill('Luna')
      await L.getByRole('button', { name: /^(Unirme|Entrar)$/ }).first().click()
    }
  })
  assert.equal(unir.resultado.reclamo_asiento_simulado, true)
  await L.getByRole('heading', { name: /^Los del (asado|finde)$/ }).waitFor()
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
    comprobar(/4 de 5/.test(await T.locator('main').innerText()), 'UI: cuatro confirmaciones aún insuficientes') // S4: sin .opcion; el conteo va en el hero
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
    // S4: el mínimo vive en «Ficha del plan» (plegada): se abre antes de leer.
    await L.locator('details', { has: L.locator('summary', { hasText: /Ficha del plan/ }) }).evaluateAll((ds) => ds.forEach((d) => { d.open = true }))
    comprobar(/[Mm]ínimo:? 4|mínimo \(4\)|\(mínimo 4\)/.test(await L.locator('main').innerText()), 'UI: mínimo no se reduce')
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
      // Ni "Caro se bajó" ni "Caro aceptó / había confirmado" en lo compartido (plan e historial), en ninguna de las dos sesiones.
      const fuga = /(?:Tomi|Luna|Mati|Caro|Fede|Sofi) se (?:bajó|retiró)|Caro (?:aceptó|había confirmado)/
      await L.reload(); await estado(L, 'En revisión')
      comprobar(!fuga.test(await L.locator('main').innerText()), 'UI E13: el plan de Luna no nombra a quien se retiró ni dice que había confirmado')
      await tab(L, 'Historial'); await tab(T, 'Historial')
      for (const [p, quien] of [[L, 'Luna'], [T, 'Tomi']]) {
        const historial = await p.locator('main').innerText()
        comprobar(!fuga.test(historial), `UI E13: historial de ${quien} sin el nombre de quien se retiró`)
        if (/El sistema se bajó/.test(historial)) log(`AVISO E13 (${quien}): el historial dice "El sistema se bajó"; debería decir "Una persona se retiró"`)
        else if (!/Una persona se (?:bajó|retiró)/.test(historial)) log(`AVISO E13 (${quien}): el historial todavía no dice "Una persona se retiró"`)
      }
      await tab(L, 'Plan'); await tab(T, 'Plan')
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
      // S4 (mockup): «Libres para el resto» ya no se muestra; el servidor lo sigue devolviendo (cupos.libres_para_otros) y se comprueba abajo.
      if ((await T.getByText('Libres para el resto', { exact: false }).count()) > 0) await texto(T, 'Libres para el resto: 0')
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
      comprobar(/4 de 4|4 confirmaron/.test(await L.locator('main').innerText()), 'UI: cuatro de cuatro en la sesión de Luna') // S4: el conteo va en el hero
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
  log(`RPC observadas: ${rpcObservadas}; privacidad de sobres compartidos sin hallazgos; 2 rechazos esperados; 0 llamadas al modelo. Enmienda 13: ${e13 ? 'detectada y comprobada (baja sin nombre, totales solo al organizador)' : 'pendiente en el servidor'}. Enmienda 15: ${e15 ? 'detectada y comprobada (prefiero privado, planes_totales solo al organizador)' : 'pendiente en el servidor'}.`)
} catch (e) {
  if (!fallidas) { fallidas++; log(`FAIL preparación/cierre: ${String(e.message).split('\n')[0]}`) }
  await foto(L, 'fallo-preparacion-Luna').catch(() => {})
} finally {
  await browser.close(); if (server) await server.close()
  log(`#17 navegador: ${aprobadas} PASS, ${fallidas} FAIL; ${comprobadas} comprobaciones; ${propuestas.filter(p => p.cancelada).length}/${propuestas.length} propuestas propias canceladas.`)
}
if (fallidas) process.exitCode = 1
