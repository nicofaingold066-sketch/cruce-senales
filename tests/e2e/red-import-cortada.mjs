// Origen: guion de friccion. #82: corte de red sobre la parte de una pantalla (route.abort) contra el build propio.
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'
import { baseLibre } from './base-libre.mjs'
baseLibre() // el caso C crea un grupo en la base
const require = createRequire(import.meta.url)
let pw
try { pw = require('playwright') } catch {
  pw = require(process.env.CRUXE_PLAYWRIGHT_DIR || '/Users/macair/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
}
const DIR = fileURLToPath(new URL('.', import.meta.url))
const BASE = process.argv[2] ?? 'http://localhost:4185'
const browser = await pw.chromium.launch({ headless: true, executablePath: process.env.CRUXE_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' })
let ok = 0, mal = 0
const ver = (n, c, d = '') => { c ? ok++ : mal++; console.log(`${c ? 'OK ' : 'MAL'} ${n}${d ? ' → ' + d : ''}`) }
const nueva = async () => {
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true, locale: 'es-CL' })
  const p = await ctx.newPage(); const pedidos = []
  p.on('request', (r) => { if (/\/assets\/(Planes|Espacio)-/.test(r.url())) pedidos.push(new URL(r.url()).pathname.replace(/-[\w-]+\.js/, '.js') + new URL(r.url()).search) })
  return { ctx, p, pedidos }
}
// A) Se corta UNA vez la parte de "Mis planes": el reintento con ?r=1 la abre sin que la persona haga nada.
{
  const { ctx, p, pedidos } = await nueva()
  let cortes = 0
  await p.route(/\/assets\/Planes-[\w-]+\.js(\?.*)?$/, (r) => (cortes++ === 0 ? r.abort('internetdisconnected') : r.continue()))
  await p.goto(`${BASE}/#/planes`)
  const abre = await p.getByRole('heading', { name: /^(Tus|Mis) planes$/ }).waitFor({ timeout: 15000 }).then(() => true, () => false)
  ver('A: un corte → reintento con ?r=1 abre la pantalla', abre && pedidos.some((x) => x.includes('?r=1')), pedidos.join(', '))
  await ctx.close()
}
// B) Corte persistente: barrera con "Recargar"; al volver la red, "Recargar" la abre.
{
  const { ctx, p, pedidos } = await nueva()
  let red = false
  await p.route(/\/assets\/Planes-[\w-]+\.js(\?.*)?$/, (r) => (red ? r.continue() : r.abort('internetdisconnected')))
  await p.goto(`${BASE}/#/planes`)
  const barrera = await p.getByText('No se pudo abrir esta pantalla').waitFor({ timeout: 15000 }).then(() => true, () => false)
  const boton = await p.getByRole('button', { name: 'Recargar', exact: true }).count()
  ver('B: dos cortes → aviso "No se pudo abrir esta pantalla" con "Recargar" (no página en blanco)', barrera && boton === 1, pedidos.join(', '))
  await p.screenshot({ path: `${process.env.CRUXE_CAPTURAS || tmpdir()}/red-import-barrera.png` })
  red = true
  await p.getByRole('button', { name: 'Recargar', exact: true }).click()
  const abre = await p.getByRole('heading', { name: /^(Tus|Mis) planes$/ }).waitFor({ timeout: 15000 }).then(() => true, () => false)
  ver('B: con la red de vuelta, "Recargar" abre la pantalla', abre)
  await ctx.close()
}
// C) Precarga: se corta UNA vez la parte del espacio mientras se precarga; después el espacio abre igual.
{
  const g = JSON.parse(execFileSync('node', [`${DIR}preparar-grupo.mjs`], { encoding: 'utf8', env: { ...process.env, SIN_PROPUESTA: '1' } }))
  const { ctx, p, pedidos } = await nueva()
  let cortes = 0
  await p.route(/\/assets\/Espacio-[\w-]+\.js(\?.*)?$/, (r) => (cortes++ === 0 ? r.abort('internetdisconnected') : r.continue()))
  await p.goto(`${BASE}/#/unirse/${g.codigo}`)
  await p.getByRole('button', { name: 'Ana', exact: true }).waitFor({ timeout: 20000 })
  await p.waitForTimeout(1500) // la precarga corre a los 800 ms
  await p.getByRole('button', { name: 'Ana', exact: true }).click()
  await p.getByRole('button', { name: 'Sí, soy Ana', exact: true }).click()
  const abre = await p.getByRole('heading', { name: /Prueba fricción/ }).waitFor({ timeout: 20000 }).then(() => true, () => false)
  ver('C: corte en la precarga → el espacio abre igual', abre && cortes >= 2, pedidos.join(', '))
  await ctx.close()
}
console.log(`#82 red: ${ok} OK, ${mal} MAL`)
await browser.close()
process.exit(mal ? 1 : 0)
