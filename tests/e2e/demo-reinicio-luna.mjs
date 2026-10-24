// Guion de la demo (apertura, docs/guion-demo.md §8, punto 4): LUNA RECLAMABLE DESPUÉS DE «REINICIAR DEMO».
// Tomi (ventana normal) crea su demo y abre una propuesta; Luna (ventana privada) reclama su lugar por el enlace; Tomi
// reinicia la demo y abre una propuesta nueva. Después:
//   (a) una sesión NUEVA abre el enlace: Luna sale «no disponible» (el reclamo no se deshace con el reinicio);
//   (b) la MISMA sesión de Luna abre el enlace: «Ya estás en este grupo como Luna» → «Seguir como Luna» → «¿Cuándo
//       puedes?» → «Puedo los dos días» → «Respuesta guardada». Se cuentan los toques de (b).
//
//   node tests/e2e/demo-reinicio-luna.mjs [url]      (URL: argumento, CRUXE_URL o producción)
//
// Datos ficticios: un demo propio y tres identidades anónimas por corrida. No llama al agente. No borra nada fuera del
// reinicio de su propio demo (que es lo que se prueba).
import { createRequire } from 'node:module'
import { baseLibre } from './base-libre.mjs'
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
const enmascarar = (codigo) => (codigo ? `${codigo.slice(0, 2)}…` : '(sin código)')

const browser = await pw.chromium.launch({ headless: true,
  executablePath: process.env.CRUXE_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' })
const opts = { viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'es-CL' }
const T = await (await browser.newContext(opts)).newPage() // Tomi, ventana normal
const L = await (await browser.newContext(opts)).newPage() // Luna, ventana privada
const N = await (await browser.newContext(opts)).newPage() // sesión nueva, después del reinicio
const errores = []
for (const [n, p] of [['Tomi', T], ['Luna', L], ['Nueva', N]]) {
  p.on('pageerror', (e) => errores.push(`${n}: ${e.message}`))
  p.on('console', (m) => { if (m.type() === 'error') errores.push(`${n} consola: ${m.text().slice(0, 160)}`) })
}
const boton = (p, texto) => p.getByRole('button', { name: texto, exact: true })
const tocar = async (p, texto) => { const b = boton(p, texto); await b.scrollIntoViewIfNeeded(); await b.click() }
const esperarTexto = (p, texto, ms = 20000) => p.getByText(texto, { exact: false }).first().waitFor({ timeout: ms })
async function accion(p, fn, clic) {
  const espera = p.waitForResponse((r) => new URL(r.url()).pathname === `/rest/v1/rpc/${fn}`, { timeout: 30000 })
  await clic()
  return (await espera).json()
}
async function crearYAbrir(urlEspacio) {
  await T.goto(urlEspacio)
  await T.getByRole('link', { name: /^(Crear propuesta|\+? ?Nuevo plan)$/ }).first().click()
  { const r = T.getByRole('button', { name: 'Revisar antes de crear', exact: true }); if (await r.isVisible().catch(() => false)) await r.click() } // el mockup (S3) la deja opcional
  const r = await accion(T, 'create_proposal', () => tocar(T, 'Crear y abrir al grupo'))
  await T.waitForURL(/\/p\//, { timeout: 20000 })
  await esperarTexto(T, 'Reuniendo interés').catch(() => {})
  return r.ok === true
}

paso(`Luna reclamable después de reiniciar, contra ${BASE}`)
try {
  // 1. Tomi: demo propio y primera propuesta abierta.
  await T.goto(BASE)
  const seed = await accion(T, 'seed_demo_space', () => tocar(T, /^Probar la demo «Los del (asado|finde)»$/))
  await T.getByRole('heading', { name: /^Los del (asado|finde)$/ }).waitFor({ timeout: 20000 })
  const urlEspacio = T.url(), codigo = seed.espacio?.codigo_invitacion
  verificar('Tomi crea su demo', seed.ok === true && !!codigo, `código ${enmascarar(codigo)}`)
  verificar('Primera propuesta creada y abierta', await crearYAbrir(urlEspacio))

  // 2. Luna reclama su lugar por el enlace (lista de «¿Quién eres?»).
  await L.goto(`${BASE}/#/unirse/${codigo}`)
  await tocar(L, 'Luna')
  const unir = await accion(L, 'join_space', () => tocar(L, 'Sí, soy Luna'))
  // Con una propuesta abierta, la entrada lleva directo a responder (#88); si no, al grupo.
  await Promise.race([L.getByRole('heading', { name: '¿Cuándo puedes?' }).waitFor({ timeout: 20000 }), L.getByRole('heading', { name: /^Los del (asado|finde)$/ }).waitFor({ timeout: 20000 })])
  verificar('Luna reclama su asiento desde su propio teléfono', unir.ok === true && unir.resultado?.reclamo_asiento_simulado === true)

  // 3. Tomi reinicia la demo y abre una propuesta nueva.
  await T.goto(urlEspacio)
  await tocar(T, 'Reiniciar demo')
  const reset = await accion(T, 'reset_demo', () => tocar(T, 'Sí, reiniciar'))
  verificar('Reiniciar demo borra las propuestas y conserva a las personas', reset.ok === true && reset.resultado?.propuestas_eliminadas >= 1 && await esperarTexto(T, 'Demo reiniciada').then(() => true, () => false),
    `propuestas eliminadas: ${reset.resultado?.propuestas_eliminadas ?? '-'}`)
  verificar('Propuesta nueva creada y abierta después del reinicio', await crearYAbrir(urlEspacio))

  // (a) Sesión nueva: Luna sigue reclamada.
  await N.goto(`${BASE}/#/unirse/${codigo}`)
  const lunaN = boton(N, 'Luna')
  await lunaN.waitFor({ timeout: 20000 })
  // Lo que se exige es que el nombre no se pueda elegir (botón deshabilitado); el rótulo («no disponible» hoy) solo se informa.
  const filaLuna = (await N.locator('li', { has: lunaN }).innerText()).replace(/\s+/g, ' ')
  verificar('(a) Sesión nueva: Luna no se puede elegir después del reinicio (el reclamo no se deshace)', await lunaN.isDisabled(), `la lista dice: "${filaLuna}"`)
  verificar('(a) Los demás nombres siguen libres (Mati)', await boton(N, 'Mati').isEnabled())

  // (b) La misma sesión de Luna vuelve a abrir el enlace: un toque para seguir, otro para responder.
  const toques = ['enlace de invitación']
  await L.goto(`${BASE}/#/unirse/${codigo}`)
  const yaEstoy = await L.getByRole('heading', { name: 'Ya estás en este grupo como Luna', exact: true }).waitFor({ timeout: 20000 }).then(() => true, () => false)
  const sigue = yaEstoy && (await L.getByText('Este teléfono ya entró como Luna. Sigue para responder', { exact: false }).count()) > 0
  verificar('(b) Luna, misma sesión: «Ya estás en este grupo como Luna» y «Sigue para responder»', sigue)
  await tocar(L, 'Seguir como Luna'); toques.push('Seguir como Luna')
  verificar('(b) Un toque lleva a «¿Cuándo puedes?»', await L.getByRole('heading', { name: '¿Cuándo puedes?' }).waitFor({ timeout: 20000 }).then(() => true, () => false))
  const guardado = await accion(L, 'save_my_conditions', () => L.getByRole('button', { name: /^Puedo los dos días/ }).click()); toques.push('Puedo los dos días')
  verificar('(b) «Puedo los dos días» → «Respuesta guardada»', guardado.ok === true && await L.getByRole('heading', { name: /^(Respuesta guardada|Respondiste)$/ }).waitFor({ timeout: 20000 }).then(() => true, () => false))
  paso(`(b) Toques: ${toques.length} (${toques.join(' → ')})`)
  verificar('Sin desborde horizontal a 375 px (Luna)', !(await L.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)))
} catch (e) {
  fallidas++
  paso(`ERROR: ${String(e?.message ?? e).split('\n')[0]}`)
} finally {
  verificar('Sin errores de la app en consola', errores.length === 0, errores.slice(0, 3).join(' | '))
  await browser.close()
  console.log(`${fallidas === 0 ? 'REINICIO OK' : 'REINICIO CON FALLAS'}: ${aprobadas} aprobadas, ${fallidas} fallidas`)
  process.exitCode = fallidas === 0 ? 0 : 1
}
