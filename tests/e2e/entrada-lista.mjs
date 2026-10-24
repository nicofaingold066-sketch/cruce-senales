// Guarda de la entrada «tipo Tricount» (pedido de front-juan): quien abre el enlace de invitación ve «¿Quién eres?» con la LISTA
// del grupo, elige su nombre y entra; y si ya no queda ningún nombre libre, nunca queda ante una lista sin salida.
//
//   node tests/e2e/entrada-lista.mjs [url]      (URL: argumento, CRUXE_URL o producción)
//
// Falla si «¿Quién eres?» no muestra los nombres del grupo. Crea un grupo ficticio (Orga con Ana y Beto), sin propuesta, y
// reclama Ana y Beto desde dos contextos propios para probar el caso «lista agotada». Sin agente ni modelo.
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { baseLibre } from './base-libre.mjs'
baseLibre()
const require = createRequire(import.meta.url)
let pw
try { pw = require('playwright') } catch {
  pw = require(process.env.CRUXE_PLAYWRIGHT_DIR || '/Users/macair/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
}
const DIR = fileURLToPath(new URL('.', import.meta.url))
const BASE = (process.argv[2] || process.env.CRUXE_URL || 'https://cruce-senales.vercel.app').replace(/\/+$/, '')
const hora = () => new Date().toLocaleTimeString('es-CL', { timeZone: 'America/Santiago', hour: '2-digit', minute: '2-digit', second: '2-digit' })
const paso = (t) => console.log(`[${hora()}] ${t}`)
let aprobadas = 0, fallidas = 0
const pendientes = []
const verificar = (nombre, cond, detalle = '') => {
  if (cond) aprobadas++; else fallidas++
  paso(`${cond ? 'OK ' : 'MAL'} ${nombre}${detalle ? ' → ' + detalle : ''}`)
}
const g = JSON.parse(execFileSync('node', [`${DIR}preparar-grupo.mjs`], { encoding: 'utf8', env: { ...process.env, SIN_PROPUESTA: '1' } }))
const browser = await pw.chromium.launch({ headless: true,
  executablePath: process.env.CRUXE_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' })
const opts = { viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'es-CL' }
const nueva = async () => { const c = await browser.newContext(opts); return { c, p: await c.newPage() } }
const errores = []

paso(`Entrada por lista contra ${BASE} (grupo ficticio, código ${g.codigo.slice(0, 2)}…)`)
try {
  // 1. Un invitado ve la lista del grupo y puede elegir su nombre.
  const A = await nueva()
  A.p.on('pageerror', (e) => errores.push(e.message))
  await A.p.goto(`${BASE}/#/unirse/${g.codigo}`)
  const ana = A.p.getByRole('button', { name: 'Ana', exact: true })
  const llego = await ana.waitFor({ timeout: 25000 }).then(() => true, () => false)
  verificar('«¿Quién eres?» muestra la lista del grupo (Ana)', llego)
  const nombres = await A.p.locator('.quien-lista .quien-nombre').allInnerTexts().catch(() => [])
  verificar('La lista trae a Ana y Beto, libres y elegibles', ['Ana', 'Beto'].every((n) => nombres.map((x) => x.trim()).includes(n)) && await ana.isEnabled() && await A.p.getByRole('button', { name: 'Beto', exact: true }).isEnabled(), nombres.join(', '))
  verificar('Hay una salida si no está en la lista («No estoy en la lista»)', (await A.p.getByRole('button', { name: 'No estoy en la lista', exact: true }).count()) === 1)
  await ana.click()
  await A.p.getByRole('button', { name: 'Sí, soy Ana', exact: true }).click()
  const entro = await A.p.getByRole('heading', { name: /Prueba fricción/ }).waitFor({ timeout: 25000 }).then(() => true, () => false)
  verificar('Elegir «Ana» y confirmar entra al grupo', entro)

  // 2. Beto entra desde otro teléfono; la lista queda agotada para un tercero.
  const B = await nueva()
  await B.p.goto(`${BASE}/#/unirse/${g.codigo}`)
  await B.p.getByRole('button', { name: 'Beto', exact: true }).click()
  await B.p.getByRole('button', { name: 'Sí, soy Beto', exact: true }).click()
  await B.p.getByRole('heading', { name: /Prueba fricción/ }).waitFor({ timeout: 25000 })

  const C = await nueva()
  C.p.on('pageerror', (e) => errores.push(e.message))
  await C.p.goto(`${BASE}/#/unirse/${g.codigo}`)
  await C.p.getByText(/Tu nombre en el espacio|Escribe tu nombre|Ya no queda ning/).first().waitFor({ timeout: 25000 })
  const campo = C.p.getByLabel('Tu nombre en el espacio')
  const directo = await campo.isVisible().catch(() => false)
  const titulo = (await C.p.getByText('Escribe tu nombre para entrar').count()) > 0
  if (directo && titulo) verificar('Lista agotada: se ve directo «Escribe tu nombre para entrar» con el campo de nombre', true)
  else if (directo) verificar('Lista agotada: el campo «Tu nombre en el espacio» está a la vista (sin pasar por un botón)', true, 'sin el título «Escribe tu nombre para entrar»')
  else {
    pendientes.push('lista agotada sin salida visible')
    paso('PENDIENTE Lista agotada: el campo de nombre no está a la vista (hay que tocar «No estoy en la lista»); fix de friccion en QuienEres.tsx')
    verificar('Lista agotada: hay una salida alcanzable («No estoy en la lista»)', (await C.p.getByRole('button', { name: 'No estoy en la lista', exact: true }).count()) === 1)
  }
  verificar('Sin desborde horizontal a 375 px', !(await C.p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)))
} catch (e) {
  fallidas++
  paso(`ERROR: ${String(e?.message ?? e).split('\n')[0]}`)
} finally {
  verificar('Sin errores de la app en consola', errores.length === 0, errores.slice(0, 2).join(' | '))
  await browser.close()
  console.log(`${fallidas === 0 ? 'ENTRADA OK' : 'ENTRADA CON FALLAS'}: ${aprobadas} aprobadas, ${fallidas} fallidas${pendientes.length ? `, ${pendientes.length} pendiente(s) (${pendientes.join('; ')})` : ''}`)
  process.exitCode = fallidas === 0 ? 0 : 1
}
