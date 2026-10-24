// Enmienda 14 por la PANTALLA (complemento de `proposito.mjs`, que prueba el servidor por RPC): una sola sesión (organizador)
// crea un grupo «para jugar fútbol» con el selector «¿Para qué es este grupo?», entra a «Crear propuesta» y comprueba que los
// atajos de actividad son de ESA familia, que la propuesta se crea con una actividad de deporte, y que un grupo libre sigue
// ofreciendo de todo. Cada paso se lee junto con lo que viaja al servidor (p_proposito, p_actividad) y su respuesta.
//
//   node tests/e2e/proposito-pantalla.mjs [url]      (URL: argumento, CRUXE_URL o producción)
//
// Datos ficticios: dos grupos nuevos y una propuesta por corrida (se cancela al final). Sin agente ni modelo.
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
const DEPORTE = ['futbol', 'padel', 'tenis', 'basquet']

const browser = await pw.chromium.launch({ headless: true,
  executablePath: process.env.CRUXE_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' })
const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'es-CL' })
const T = await ctx.newPage()
const errores = []
T.on('pageerror', (e) => errores.push(e.message))
T.on('console', (m) => { if (m.type() === 'error') errores.push(m.text().slice(0, 160)) })
// Lo que viaja al servidor y lo que responde, por RPC.
const rpc = []
T.on('request', (r) => {
  const u = new URL(r.url())
  if (u.pathname.startsWith('/rest/v1/rpc/') && r.method() === 'POST') rpc.push({ fn: u.pathname.split('/').at(-1), args: (() => { try { return r.postDataJSON() } catch { return {} } })(), resp: null })
})
T.on('response', async (r) => {
  const u = new URL(r.url())
  if (!u.pathname.startsWith('/rest/v1/rpc/')) return
  const fn = u.pathname.split('/').at(-1)
  const e = [...rpc].reverse().find((x) => x.fn === fn && x.resp === null)
  if (e) e.resp = await r.json().catch(() => null)
})
const ultimo = (fn) => [...rpc].reverse().find((x) => x.fn === fn)
const boton = (texto) => T.getByRole('button', { name: texto, exact: true })
const chips = async () => (await T.getByRole('group', { name: 'Atajos de actividad' }).getByRole('button').allInnerTexts()).map((t) => t.trim())
let propuestaCreada = null

async function crearGrupo(nombre, etiquetaProposito) {
  await T.goto(`${BASE}/#/crear`)
  await T.getByRole('heading', { name: 'Crear un grupo' }).waitFor({ timeout: 25000 })
  await T.getByLabel('Nombre del grupo').fill(nombre)
  await T.getByLabel('Tu nombre en el grupo').fill('Orga')
  // S2 (mockup): el propósito vive plegado en «Opciones · ¿para qué es el grupo? · ¿quién viene?».
  { const opciones = T.locator('details.s2-fila-opciones'); if (await opciones.count() && !(await opciones.evaluate((d) => d.open))) await opciones.locator('summary').click() }
  const selector = T.getByLabel('¿Para qué es este grupo?')
  const porDefecto = await selector.evaluate((s) => s.options[s.selectedIndex].text)
  if (etiquetaProposito) await selector.selectOption({ label: etiquetaProposito })
  await T.getByRole('button', { name: 'Crear grupo', exact: true }).scrollIntoViewIfNeeded()
  await boton('Crear grupo').click()
  // Con la lista de nombres vacía, el rediseño pregunta «¿Crear sin la lista del grupo?» (o «sin el nombre que escribiste»):
  // se confirma con «Crear sin lista» / «Crear sin agregarlo». Si el aviso no aparece, se sigue (versiones anteriores).
  const sinLista = T.getByRole('button', { name: /^Crear sin (?:lista|agregarlo)$/ })
  if (await sinLista.waitFor({ timeout: 2500 }).then(() => true, () => false)) await sinLista.click()
  await T.getByRole('heading', { name: nombre }).waitFor({ timeout: 25000 })
  return { porDefecto, enviado: ultimo('create_space') }
}

paso(`Propósito del grupo por la pantalla contra ${BASE}`)
try {
  // 1. Grupo «para jugar fútbol».
  const g1 = await crearGrupo('Los del fútbol QA', 'Fútbol')
  verificar('Selector «¿Para qué es este grupo?»: por defecto «Libre» (el comportamiento de siempre)', /^Libre/.test(g1.porDefecto), g1.porDefecto)
  verificar('Crear grupo con «Fútbol» manda p_proposito = futbol y el servidor responde ok', g1.enviado?.args?.p_proposito === 'futbol' && g1.enviado?.resp?.ok === true,
    `${g1.enviado?.args?.p_proposito} / ok ${g1.enviado?.resp?.ok}`)
  const familia = g1.enviado?.resp?.espacio?.familia ?? g1.enviado?.resp?.resultado?.familia
  if (familia !== undefined) verificar('El grupo queda con familia deporte', familia === 'deporte', String(familia))

  // 2. Nueva propuesta: atajos de la familia.
  await T.getByRole('link', { name: /Crear propuesta|Nueva propuesta|Nuevo plan/ }).first().click()
  await T.getByRole('group', { name: 'Atajos de actividad' }).waitFor({ timeout: 25000 })
  const a1 = await chips()
  verificar('Atajos del grupo de fútbol: hay al menos uno y NINGUNO es de comida (sin «Asado», «Cena», «Café»)', a1.length > 0 && !a1.some((t) => /asado|cena|caf[eé]|brunch/i.test(t)), a1.join(' · '))
  await T.getByRole('group', { name: 'Atajos de actividad' }).getByRole('button').first().click()
  { const r = boton('Revisar antes de crear'); if (await r.isVisible().catch(() => false)) await r.click() } // el mockup (S3) la deja opcional
  await boton('Crear y abrir al grupo').click()
  await T.waitForURL(/\/p\//, { timeout: 25000 })
  const c1 = ultimo('create_proposal')
  propuestaCreada = c1?.resp?.resultado?.propuesta_id ?? null
  verificar('La propuesta se crea con una actividad de deporte (p_actividad) y el servidor la acepta', DEPORTE.includes(c1?.args?.p_actividad) && c1?.resp?.ok === true,
    `${c1?.args?.p_actividad} / ok ${c1?.resp?.ok}`)
  const act = c1?.resp?.propuesta?.actividad
  verificar('La respuesta trae la actividad {clave, etiqueta, familia deporte}', act?.familia === 'deporte' && DEPORTE.includes(act?.clave), JSON.stringify(act))
  verificar('Sin desborde horizontal a 375 px (propuesta del grupo de fútbol)', !(await T.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)))

  // 3. Un grupo libre sigue ofreciendo de todo.
  const g2 = await crearGrupo('Los de siempre QA', null)
  verificar('Grupo sin elegir propósito: se manda libre (o no se manda) y el servidor responde ok', [undefined, 'libre'].includes(g2.enviado?.args?.p_proposito) && g2.enviado?.resp?.ok === true, `${g2.enviado?.args?.p_proposito ?? '(no se manda)'}`)
  await T.getByRole('link', { name: /Crear propuesta|Nueva propuesta|Nuevo plan/ }).first().click()
  await T.getByRole('group', { name: 'Atajos de actividad' }).waitFor({ timeout: 25000 })
  const a2 = await chips()
  verificar('Grupo libre: ofrece más atajos que el de fútbol y de más de una familia', a2.length > a1.length, `${a2.length} vs ${a1.length}: ${a2.join(' · ')}`)
} catch (e) {
  fallidas++
  paso(`ERROR: ${String(e?.message ?? e).split('\n')[0]}`)
  try { if (process.env.CRUXE_CAPTURAS) await T.screenshot({ path: `${process.env.CRUXE_CAPTURAS}/proposito-pantalla-error.png`, fullPage: true }) } catch { /* sin captura */ }
} finally {
  if (propuestaCreada) { try { await T.evaluate(() => 0); await T.goto(`${BASE}/#/`) } catch { /* sigue */ } }
  verificar('Sin errores de la app en consola', errores.length === 0, errores.slice(0, 3).join(' | '))
  await browser.close()
  console.log(`${fallidas === 0 ? 'PANTALLA PROPÓSITO OK' : 'PANTALLA PROPÓSITO CON FALLAS'}: ${aprobadas} aprobadas, ${fallidas} fallidas`)
  process.exitCode = fallidas === 0 ? 0 : 1
}
