// Origen: guion de friccion. Mide toques desde el enlace de invitación hasta la primera respuesta guardada (condiciones), a 375 px.
// Uso: node tests/e2e/toques-invitacion.mjs <url-base> <etiqueta>   (prepara un grupo ficticio nuevo con preparar-grupo.mjs; usa la base)
// Capturas en CRUXE_CAPTURAS (o la carpeta temporal del sistema).
import { execFileSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { baseLibre } from './base-libre.mjs'
baseLibre()
const require = createRequire(import.meta.url)
let pw
try { pw = require('playwright') } catch {
  pw = require(process.env.CRUXE_PLAYWRIGHT_DIR || '/Users/macair/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
}
const DIR = new URL('.', import.meta.url).pathname
const BASE = process.argv[2] ?? 'http://localhost:4185', ETQ = process.argv[3] ?? 'antes'
const caps = `${process.env.CRUXE_CAPTURAS || tmpdir()}/toques-${ETQ}`; mkdirSync(caps, { recursive: true })
const g = JSON.parse(execFileSync('node', [`${DIR}preparar-grupo.mjs`], { encoding: 'utf8' }))
const browser = await pw.chromium.launch({ headless: true, executablePath: process.env.CRUXE_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' })
const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'es-CL' })
const p = await ctx.newPage()
const errores = []
p.on('pageerror', (e) => errores.push(e.message))
p.on('console', (m) => { if (m.type() === 'error') errores.push(m.text().slice(0, 160)) })
let toques = 0, n = 0
const log = []
const toque = async (desc, loc) => { await loc.scrollIntoViewIfNeeded(); await loc.click(); toques++; log.push(`${toques}. ${desc}`) }
const foto = async (nombre) => p.screenshot({ path: `${caps}/${String(++n).padStart(2, '0')}-${nombre}.png` })
const t0 = Date.now()
toques++; log.push('1. enlace de WhatsApp'); await p.goto(`${BASE}/#/unirse/${g.codigo}`)
await p.getByRole('button', { name: 'Ana', exact: true }).waitFor({ timeout: 20000 }); await foto('quien-eres')
await toque('nombre "Ana"', p.getByRole('button', { name: 'Ana', exact: true }))
await foto('eres-ana')
await toque('"Sí, soy Ana"', p.getByRole('button', { name: 'Sí, soy Ana', exact: true }))
// Después de unirse: o la respuesta rápida (#88) o el espacio.
const rapida = p.getByRole('button', { name: /^Puedo los dos días/ })
const tarjeta = p.getByText('Asado de prueba', { exact: false }).first()
await Promise.race([rapida.waitFor({ timeout: 20000 }), p.getByRole('heading', { name: /Prueba fricción/ }).waitFor({ timeout: 20000 })])
await p.waitForTimeout(400); await foto('despues-de-unirse')
if (await rapida.count()) {
  await toque('"Puedo los dos días"', rapida)
  await p.getByText('Guardado', { exact: false }).first().waitFor({ timeout: 15000 })
} else {
  await tarjeta.waitFor({ timeout: 15000 })
  await toque('tarjeta del plan', tarjeta)
  await toque('pestaña "Mi respuesta"', p.getByRole('tab', { name: 'Mi respuesta' }))
  await toque('Sí puedo franja A', p.locator('fieldset', { hasText: 'Franja A' }).getByText('Sí puedo', { exact: true }))
  await toque('Sí puedo franja B', p.locator('fieldset', { hasText: 'Franja B' }).getByText('Sí puedo', { exact: true }))
  await toque('"Guardar condiciones"', p.getByRole('button', { name: 'Guardar condiciones', exact: true }))
  await p.getByText('Guardado. Solo tú ves estas condiciones.').waitFor({ timeout: 15000 })
}
await p.waitForTimeout(900); await foto('respuesta-guardada')
const mi = p.getByRole('button', { name: 'Me interesa', exact: true })
if (await mi.count()) { await mi.click(); await p.getByText('Marcaste "Me interesa"', { exact: false }).first().waitFor({ timeout: 15000 }); log.push('(extra, opcional) "Me interesa" → marcado'); await p.waitForTimeout(500); await foto('me-interesa') }
const desborde = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
console.log(`[${ETQ}] ${BASE} grupo ${g.codigo.slice(0, 2)}…  TOQUES = ${toques}  (${((Date.now() - t0) / 1000).toFixed(1)} s)`)
console.log(log.join('\n'))
console.log(`desborde 375 px: ${desborde ? 'SÍ' : 'no'} · errores en página: ${errores.length ? errores.join(' | ') : 'ninguno'} · capturas: ${caps}`)
await browser.close()
