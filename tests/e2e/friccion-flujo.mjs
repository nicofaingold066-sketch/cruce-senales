// Origen: guion de friccion. Guion de friccion (#88, #90, volver con el mismo enlace) contra un build: node tests/e2e/friccion-flujo.mjs [url]
// Datos ficticios: crea con preparar-grupo.mjs grupos nuevos (Orga + Ana y Beto). No borra nada.
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { baseLibre } from './base-libre.mjs'
import { respuestaGuardada, sinIntro } from './nav.mjs'
baseLibre()
const require = createRequire(import.meta.url)
let pw
try { pw = require('playwright') } catch {
  pw = require(process.env.CRUXE_PLAYWRIGHT_DIR || '/Users/macair/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
}
const DIR = fileURLToPath(new URL('.', import.meta.url))
const BASE = (process.argv[2] || 'http://localhost:4185').replace(/\/+$/, '')
const preparar = (env = {}) => JSON.parse(execFileSync('node', [`${DIR}preparar-grupo.mjs`], { encoding: 'utf8', env: { ...process.env, ...env } }))
const browser = await pw.chromium.launch({ headless: true, executablePath: process.env.CRUXE_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' })
const opts = { viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'es-CL' }
let ok = 0, mal = 0
const hora = () => new Date().toLocaleTimeString('es-CL', { timeZone: 'America/Santiago', hour12: false })
const ver = (n, c, d = '') => { c ? ok++ : mal++; console.log(`[${hora()}] ${c ? 'OK ' : 'MAL'} ${n}${d ? ' → ' + d : ''}`) }
const errores = []
const pagina = async () => {
sinIntro(browser) // la intro de primera visita no es lo que se prueba
  const ctx = await browser.newContext(opts); const p = await ctx.newPage()
  p.on('pageerror', (e) => errores.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errores.push(m.text().slice(0, 160)) })
  return { ctx, p }
}
const boton = (p, n) => p.getByRole('button', { name: n, exact: true })
const elegir = async (p, codigo, nombre) => {
  await p.goto(`${BASE}/#/unirse/${codigo}`)
  // S1 exacto al mockup: pantalla 10 entra en UN toque; «¿Eres X?» / «Sí, soy X» solo si otro teléfono ya tomó el nombre.
  await boton(p, nombre).click()
  const confirmar = boton(p, `Sí, soy ${nombre}`)
  if (await confirmar.isVisible({ timeout: 1500 }).catch(() => false)) await confirmar.click()
}
const desborde = (p) => p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
try {
  const g = preparar()
  // 1. Ana: enlace → nombre → "Sí, soy Ana" → "¿Cuándo puedes?" → un toque.
  const A = await pagina()
  await elegir(A.p, g.codigo, 'Ana')
  const titulo = await A.p.getByRole('heading', { name: '¿Cuándo puedes?' }).waitFor({ timeout: 20000 }).then(() => true, () => false)
  ver('#88: después de "Sí, soy Ana" llega a "¿Cuándo puedes?"', titulo && A.p.url().endsWith('/responder'))
  ver('#88: dice "Entraste como Ana"', (await A.p.getByText('Entraste como Ana', { exact: false }).count()) > 0)
  ver('#88: cuatro respuestas de un toque', (await A.p.locator('.rapida-opcion').count()) === 4)
  ver('#88: sin desborde a 375 px', !(await desborde(A.p)))
  await A.p.getByRole('button', { name: /^Puedo los dos días/ }).click()
  ver('#88: un toque guarda', await respuestaGuardada(A.p).then(() => true, () => false))
  // Enmienda 15 (friccion d471641): con «puedo en los dos» aparecen dos botones «Prefiero «…»» (privado; solo desempata con
  // «la que más Sí»). Guardado por presencia: en un build sin E15 en pantalla se anota y se sigue.
  const prefiero = A.p.getByRole('button', { name: /^Prefiero «/ })
  if (await prefiero.first().waitFor({ timeout: 3000 }).then(() => true, () => false)) {
    ver('E15: ofrece «Prefiero «…»» para los dos planes, sin elegir ninguno por defecto', (await prefiero.count()) === 2 && (await A.p.getByText(/^Prefieres «/).count()) === 0)
    const espera = A.p.waitForResponse((r) => new URL(r.url()).pathname === '/rest/v1/rpc/save_my_conditions', { timeout: 15000 })
    await prefiero.first().click()
    const r = await (await espera).json()
    const pref = r?.condiciones?.disponibilidad?.prefiero ?? null
    const nota = await A.p.getByText(/^Prefieres «/).first().waitFor({ timeout: 10000 }).then(() => true, () => false)
    ver('E15: elegir un plan guarda «prefiero» (A o B) en lo propio y lo dice como privado', r?.ok === true && ['A', 'B'].includes(pref) && nota, `prefiero=${pref}`)
  } else console.log(`[${hora()}] E15 pendiente en este build: sin «Prefiero «…»» tras responder`)
  // S5 exacto al mockup: la fila dice «Avisar que me interesa (opcional · lo ve el grupo)» y aclara que no es confirmar.
  ver('#88: "Me interesa" es opcional y aparte', (await A.p.getByRole('button', { name: /^(Me interesa|Avisar que me interesa)/ }).count()) === 1 && (await A.p.getByText(/Interés no es confirmación|no es confirmar|no es una confirmación|opcional/).count()) > 0)
  await A.p.getByRole('link', { name: /^(Ver el plan|Listo)$/ }).first().click() // S5: tras responder, el primario es «Listo»
  // Rediseño S4: sin pestaña «Mi respuesta»; el plan muestra la fila «Tu respuesta: … · Cambiar ›» con lo respondido.
  const filaRespuesta = A.p.locator('a.fila[href*="/responder/"]').first()
  const completas = await filaRespuesta.waitFor({ timeout: 15000 }).then(() => true, () => false)
  const textoFila = completas ? (await filaRespuesta.innerText()).replace(/\s+/g, ' ').trim() : ''
  ver('#88: en el plan la fila «Tu respuesta» muestra lo respondido', completas && /Tu respuesta: \S/.test(textoFila), textoFila)
  // 2. Ana vuelve a abrir el mismo enlace.
  await A.p.goto(`${BASE}/#/unirse/${g.codigo}`)
  const seguir = boton(A.p, 'Seguir como Ana')
  ver('Volver: "Ya estás en este grupo como Ana"', await seguir.waitFor({ timeout: 15000 }).then(() => true, () => false))
  await seguir.click()
  ver('Volver: ya respondió → entra al grupo', await A.p.getByRole('heading', { name: /Prueba fricción/ }).waitFor({ timeout: 20000 }).then(() => true, () => false))
  // 3. Beto, en un grupo real: "Solo el …" avisa que el otro día queda como No; sin agenda ficticia.
  const B = await pagina()
  await elegir(B.p, g.codigo, 'Beto')
  await B.p.getByRole('heading', { name: '¿Cuándo puedes?' }).waitFor({ timeout: 20000 })
  ver('"Solo el …" dice qué día queda como No', (await B.p.getByText('queda como No', { exact: false }).count()) === 2)
  // S5 exacto al mockup (friccion 03:10): la fila «Tomar de mi calendario (simulación)» va siempre en Opcional; lo que no
  // puede pasar es que se ofrezca como calendario real.
  { const agenda = B.p.getByRole('button', { name: /Tomar de mi calendario/ }); const n = await agenda.count()
    ver('#90: en un grupo real la agenda, si aparece, se rotula simulación', n === 0 || /simulación/i.test(await agenda.first().innerText())) }
  await B.p.getByRole('button', { name: /^No puedo ninguno/ }).click()
  await respuestaGuardada(B.p)
  ver('"No puedo ninguno": no habla de confirmar ni ofrece "Me interesa"', (await B.p.getByText('la confirmas en el plan', { exact: false }).count()) === 0 && (await B.p.getByRole('button', { name: /^(Me interesa|Avisar que me interesa)/ }).count()) === 0)
  // 3b. Demo: Luna desde la lista, con la agenda ficticia que solo SUGIERE.
  const gd = preparar({ DEMO: '1' })
  const L = await pagina()
  await elegir(L.p, gd.codigo, 'Luna')
  await L.p.getByRole('heading', { name: '¿Cuándo puedes?' }).waitFor({ timeout: 20000 })
  await L.p.getByRole('button', { name: /Tomar de mi calendario|mi agenda|agenda ficticia/i }).first().click()
  ver('#90: la agenda dice que es ficticia', (await L.p.getByText(/Agenda ficticia/).count()) >= 1)
  await L.p.getByRole('button', { name: /^(?:Marcar lo que dice mi agenda|Ver qué sugiere mi agenda)$/ }).click() // rótulo viejo y nuevo (psico, 21:21)
  const sug = L.p.locator('.rapida-sugerida')
  ver('#90: la agenda resalta una opción y NO guarda', (await sug.count()) === 1 && (await L.p.getByText('Guardado.', { exact: false }).count()) === 0, (await sug.innerText().catch(() => '')).replace(/\s+/g, ' '))
  await sug.click()
  ver('#90: tocar la sugerida guarda', await respuestaGuardada(L.p).then(() => true, () => false))
  ver('#90: sin desborde a 375 px', !(await desborde(L.p)))
  await L.p.screenshot({ path: DIR + 'e2e-luna-guardado.png' })
  // 4. Sin propuesta: después de elegir el nombre, entra al grupo con el aviso.
  const g2 = preparar({ SIN_PROPUESTA: '1' })
  const C = await pagina()
  await elegir(C.p, g2.codigo, 'Ana')
  ver('Sin propuesta: entra al grupo', await C.p.getByRole('heading', { name: /Prueba fricción/ }).waitFor({ timeout: 20000 }).then(() => true, () => false))
  ver('Sin propuesta: con el aviso "Entraste como Ana"', (await C.p.getByText('Entraste como Ana', { exact: false }).count()) > 0)
  ver('Sin errores de la app en consola', errores.length === 0, errores.join(' | '))
} catch (e) {
  ver('el guion terminó sin excepción', false, e instanceof Error ? e.message.split('\n')[0] : String(e))
  // Captura de cada página abierta al fallar (CRUXE_CAPTURAS), para ver en qué pantalla se trabó.
  try {
    if (process.env.CRUXE_CAPTURAS) for (const [i, c] of browser.contexts().entries()) for (const [j, pg] of c.pages().entries()) await pg.screenshot({ path: `${process.env.CRUXE_CAPTURAS}/friccion-error-${i}-${j}.png`, fullPage: true }).catch(() => {})
  } catch { /* sin captura */ }
}
console.log(`FRICCION ${mal ? 'CON FALLAS' : 'OK'}: ${ok} aprobadas, ${mal} fallidas`)
await browser.close()
process.exit(mal ? 1 : 0)
