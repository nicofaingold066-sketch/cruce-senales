// Guion de la demo (apertura, docs/guion-demo.md §8, punto 5): PLAN B CON UN SOLO APARATO. Una sola sesión (Tomi, quien
// organiza) recorre el caso entero con las herramientas de Simulación: sin segunda persona real y sin llamar al agente.
//
//   node tests/e2e/plan-b-un-aparato.mjs [url]      (URL: argumento, CRUXE_URL o producción)
//
// Informa, con el sobre del servidor y no solo con la pantalla: si el caso carga a Luna como simulada (si no, el plan B
// no sirve), la versión 1 (franja y cuántos pueden), quiénes aparecen en "Aceptar versión N por …", la baja de Caro,
// la versión 2 desde cero y los segundos totales de máquina. Datos ficticios: un demo propio por corrida. No borra nada.
import { createRequire } from 'node:module'
import { baseLibre } from './base-libre.mjs'
import { irA } from './nav.mjs'
baseLibre()
const require = createRequire(import.meta.url)
let pw
try { pw = require('playwright') } catch {
  pw = require(process.env.CRUXE_PLAYWRIGHT_DIR || '/Users/macair/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
}
const BASE = (process.argv[2] || process.env.CRUXE_URL || 'https://cruce-senales.vercel.app').replace(/\/+$/, '')
const hora = () => new Date().toLocaleTimeString('es-CL', { timeZone: 'America/Santiago', hour: '2-digit', minute: '2-digit', second: '2-digit' })
const paso = (t) => console.log(`[${hora()}] ${t}`)
let aprobadas = 0, fallidas = 0
const verificar = (nombre, cond, detalle = '') => {
  if (cond) aprobadas++; else fallidas++
  paso(`${cond ? 'OK ' : 'MAL'} ${nombre}${detalle ? ' → ' + detalle : ''}`)
}

const browser = await pw.chromium.launch({ headless: true,
  executablePath: process.env.CRUXE_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' })
const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'es-CL' })
const T = await ctx.newPage()
const errores = []
T.on('pageerror', (e) => errores.push(e.message))
T.on('console', (m) => { if (m.type() === 'error') errores.push(m.text().slice(0, 160)) })
const boton = (texto) => T.getByRole('button', { name: texto, exact: true })
const tocar = async (texto) => { const b = boton(texto); await b.scrollIntoViewIfNeeded(); await b.click() }
const esperarTexto = (texto, ms = 20000) => T.getByText(texto, { exact: false }).first().waitFor({ timeout: ms })
const pestana = (nombre) => irA(T, nombre)
const siPuedo = (franja) => T.locator('fieldset', { hasText: `Franja ${franja}` }).getByText('Sí puedo', { exact: true }).click()
// La pantalla no es autoridad: cada clic se lee junto con el sobre de la RPC que dispara.
async function accion(fn, clic) {
  const espera = T.waitForResponse((r) => new URL(r.url()).pathname === `/rest/v1/rpc/${fn}`, { timeout: 30000 })
  await clic()
  return (await espera).json()
}
const resumen = (r) => `${r.resultado?.tipo ?? r.error?.codigo ?? '?'} franja ${r.resultado?.franja ?? '-'}; pueden ${r.propuesta?.opcion?.cupos?.pendientes ?? '-'}`
const quienesAceptan = async (version) => {
  const b = T.getByRole('button', { name: new RegExp(`^Aceptar versión ${version} por `) }).first()
  await b.waitFor({ timeout: 15000 })
  return [b, (await b.innerText()).replace(new RegExp(`^Aceptar versión ${version} por `), '').trim()]
}

paso(`Plan B de un solo aparato contra ${BASE}`)
const t0 = Date.now()
try {
  // 1. Demo fresco con una sesión nueva. Nadie reclama a Luna.
  await T.goto(BASE)
  const seed = await accion('seed_demo_space', () => tocar(/^Probar la demo «Los del (asado|finde)»$/))
  await T.getByRole('heading', { name: /^Los del (asado|finde)$/ }).waitFor({ timeout: 20000 })
  const luna = (seed.espacio?.miembros ?? []).find((m) => m.nombre === 'Luna')
  verificar('Demo fresco; Luna figura como persona simulada (reclamable, sin reclamar)', seed.ok === true && luna?.simulado === true,
    luna ? `simulado ${luna.simulado}${'reclamable' in luna ? `, reclamable ${luna.reclamable}` : ''}` : 'Luna no está en el espacio')

  // 2. Propuesta del caso, creada y abierta; Tomi responde Sí/Sí.
  await T.getByRole('link', { name: /^(Crear propuesta|\+? ?Nuevo plan)$/ }).first().click()
  // El mockup (S3) deja un solo primario («Crear y abrir al grupo»): el paso «Revisar antes de crear» es opcional.
  { const revisar = T.getByRole('button', { name: 'Revisar antes de crear', exact: true }); if (await revisar.isVisible().catch(() => false)) await revisar.click() }
  const creada = await accion('create_proposal', () => tocar('Crear y abrir al grupo'))
  await T.waitForURL(/\/p\//, { timeout: 20000 })
  verificar('Propuesta creada y abierta al grupo', creada.ok === true && await esperarTexto('Reuniendo interés').then(() => true, () => false))
  await pestana('Mi respuesta')
  await siPuedo('A'); await siPuedo('B')
  const cond = await accion('save_my_conditions', () => tocar('Guardar condiciones'))
  verificar('Tomi guarda Sí/Sí', cond.ok === true && await esperarTexto('Guardado. Solo tú ves estas condiciones.').then(() => true, () => false))

  // 3. El caso a las personas simuladas: ¿incluye a Luna? Sin ella, el sábado no llega a 4 y el plan B no sirve.
  await pestana('Simulación')
  const carga = await accion('simulate_load_case', () => tocar('Cargar condiciones del caso a las personas simuladas'))
  await esperarTexto('cargadas las condiciones de', 20000)
  const cargados = (carga.resultado?.cargados ?? []).map((m) => m.nombre)
  verificar('El caso carga a Luna como simulada (condición del plan B)', carga.ok === true && cargados.includes('Luna'), `cargados: ${cargados.join(', ') || '(ninguno)'}`)

  // 4. Versión 1: sábado (franja A) con cuatro que pueden (Tomi, Luna, Mati, Caro).
  await pestana('Plan')
  const ev = await accion('evaluate_and_publish', () => tocar('Buscar opción compatible'))
  const v1 = ev.ok === true && ev.resultado?.franja === 'A' && await esperarTexto('Confirmar versión 1').then(() => true, () => false)
  verificar('Versión 1 el sábado (franja A) con 4 que pueden', v1 && ev.propuesta?.opcion?.cupos?.pendientes === 4, resumen(ev))
  const conf1 = await accion('accept_version', () => tocar('Confirmar versión 1'))
  verificar('Tomi confirma la versión 1', conf1.ok === true && await esperarTexto('Ya confirmaste la versión 1').then(() => true, () => false))
  await pestana('Simulación')
  const [aceptar1, quienes1] = await quienesAceptan(1)
  verificar('Simulación ofrece "Aceptar versión 1 por …" con Luna, Mati y Caro', /Luna/.test(quienes1) && /Mati/.test(quienes1) && /Caro/.test(quienes1), quienes1)
  await aceptar1.click()
  await esperarTexto('Confirmaron la versión 1:', 30000)
  await pestana('Plan')
  verificar('Grupo confirmado (versión 1)', await esperarTexto('Grupo confirmado').then(() => true, () => false))

  // 5. Baja de Caro → En revisión → versión 2 (domingo, franja B) desde cero → confirmada otra vez.
  await pestana('Simulación'); await tocar('Se baja: Caro')
  const baja = await accion('simulate_withdraw', () => tocar('Sí, Caro se baja'))
  await pestana('Plan')
  verificar('Baja de Caro: En revisión', baja.propuesta?.estado === 'en_revision' && await esperarTexto('En revisión').then(() => true, () => false))
  const rep = await accion('propose_repair', () => tocar('Buscar alternativa'))
  const v2 = rep.ok === true && rep.resultado?.version === 2 && rep.resultado?.franja === 'B' && await esperarTexto('Confirmar versión 2').then(() => true, () => false)
  verificar('Versión 2 el domingo (franja B), desde cero', v2 && /Nadie confirmó todavía/.test(await T.locator('main').innerText()), resumen(rep))
  const conf2 = await accion('accept_version', () => tocar('Confirmar versión 2'))
  verificar('Tomi confirma la versión 2', conf2.ok === true && await esperarTexto('Ya confirmaste la versión 2').then(() => true, () => false))
  await pestana('Simulación')
  const [aceptar2, quienes2] = await quienesAceptan(2)
  verificar('Simulación ofrece "Aceptar versión 2 por …" con Luna, Mati y Fede, sin Caro', /Luna/.test(quienes2) && /Mati/.test(quienes2) && /Fede/.test(quienes2) && !/Caro/.test(quienes2), quienes2)
  await aceptar2.click()
  await esperarTexto('Confirmaron la versión 2:', 30000)
  await pestana('Plan')
  verificar('Grupo confirmado otra vez (versión 2)', await esperarTexto('Grupo confirmado').then(() => true, () => false))
  verificar('Sin desborde horizontal a 375 px', !(await T.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)))
} catch (e) {
  fallidas++
  paso(`ERROR: ${String(e?.message ?? e).split('\n')[0]}`)
} finally {
  verificar('Sin errores de la app en consola', errores.length === 0, errores.slice(0, 3).join(' | '))
  paso(`Segundos totales de máquina: ${((Date.now() - t0) / 1000).toFixed(1)} s`)
  await browser.close()
  console.log(`${fallidas === 0 ? 'PLAN B OK' : 'PLAN B CON FALLAS'}: ${aprobadas} aprobadas, ${fallidas} fallidas`)
  process.exitCode = fallidas === 0 ? 0 : 1
}
