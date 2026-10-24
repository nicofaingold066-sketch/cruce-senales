// Origen: guion de ux-flujo (#98). Recorrido "convencer a uno".
// Organizador crea un grupo con 5 nombres ficticios, crea y abre una propuesta, y 5 contextos entran por el enlace.
// Cuenta toques y pantallas por persona y saca capturas a 375 px.
//   node tests/e2e/convencer-uno.mjs [url]   (crea 6 sesiones por corrida; usa la base)
import { createRequire } from 'node:module'
import { mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { baseLibre } from './base-libre.mjs'
baseLibre()
const require = createRequire(import.meta.url)
let pw
try { pw = require('playwright') } catch {
  pw = require(process.env.CRUXE_PLAYWRIGHT_DIR || '/Users/macair/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
}
const BASE = (process.argv[2] || 'http://localhost:4185').replace(/\/+$/, '')
const sello = new Date().toLocaleString('sv-SE', { timeZone: 'America/Santiago' }).replace(/\D/g, '').slice(0, 12)
const DIR = `${process.env.CRUXE_CAPTURAS || tmpdir()}/convencer-uno/${sello}/`
mkdirSync(DIR, { recursive: true })
const hora = () => new Date().toLocaleTimeString('es-CL', { timeZone: 'America/Santiago', hour12: false })
const log = (t) => console.log(`[${hora()}] ${t}`)

const browser = await pw.chromium.launch({ headless: true, executablePath: process.env.CRUXE_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' })
const opts = { viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'es-CL' }

const registro = {} // persona -> {toques:[], pantallas:Set, dudas:[]}
function persona(nombre) {
  registro[nombre] ??= { toques: [], pantallas: [], dudas: [], escrito: [] }
  return registro[nombre]
}
let n = 0
async function foto(p, quien, nombre) {
  n++
  const f = `${String(n).padStart(3, '0')}-${quien}-${nombre}.png`
  await p.screenshot({ path: DIR + f })
  return f
}
async function pantalla(p, quien) {
  const h1 = await p.locator('h1').first().textContent({ timeout: 8000 }).catch(() => '(sin h1)')
  const ruta = new URL(p.url()).hash || '/'
  const r = persona(quien)
  const clave = `${ruta.replace(/[0-9a-f-]{36}/g, ':id').replace(/unirse\/\w+/, 'unirse/:codigo')} · ${h1?.trim()}`
  if (r.pantallas.at(-1) !== clave) r.pantallas.push(clave)
  return clave
}
async function toque(p, quien, loc, desc) {
  await loc.waitFor({ state: 'visible', timeout: 15000 })
  await loc.scrollIntoViewIfNeeded()
  await loc.tap()
  persona(quien).toques.push(desc)
  log(`${quien} toque ${persona(quien).toques.length}: ${desc}`)
  await p.waitForTimeout(400)
}
async function escribir(p, quien, loc, texto, desc) {
  await loc.waitFor({ state: 'visible', timeout: 15000 })
  await loc.fill(texto)
  persona(quien).escrito.push(desc)
}
const btn = (p, name, exact = true) => p.getByRole('button', { name, exact })
const duda = (quien, t) => { persona(quien).dudas.push(t); log(`${quien} DUDA: ${t}`) }

// ---------- Organizador ----------
const ORG = 'Vale'
const INVITADOS = ['Ana', 'Beto', 'Coni', 'Diego', 'Ema']
const ctxO = await browser.newContext(opts)
const O = await ctxO.newPage()
const errores = []
O.on('pageerror', (e) => errores.push(`O: ${e.message}`))
await O.goto(BASE + '/')
await O.waitForTimeout(800)
await foto(O, ORG, 'portada-intro')
// La entrada animada se salta con un toque.
const intro = O.getByText('Toca para saltar')
if (await intro.isVisible().catch(() => false)) {
  await toque(O, ORG, intro, 'saltar entrada animada (opcional: dura 2,9 s)')
  await intro.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {})
}
await O.getByText('Entrar a CRUXE').waitFor({ timeout: 15000 })
await pantalla(O, ORG)
await foto(O, ORG, 'portada')
await escribir(O, ORG, O.getByLabel('¿Cómo te llaman tus amigos?'), ORG, 'nombre en portada')
await toque(O, ORG, btn(O, 'Entrar'), 'Entrar (nombre local)')
await foto(O, ORG, 'portada-con-nombre')
await toque(O, ORG, O.getByRole('link', { name: /Crear un grupo/ }), 'Crear un grupo')
await pantalla(O, ORG)
await escribir(O, ORG, O.getByLabel('Nombre del grupo'), 'Los del pádel', 'nombre del grupo')
const campoInt = O.getByLabel('Agregar a alguien del grupo')
for (const nombre of INVITADOS) {
  await escribir(O, ORG, campoInt, nombre, `integrante ${nombre}`)
  await toque(O, ORG, btn(O, 'Agregar'), `Agregar ${nombre}`)
}
await foto(O, ORG, 'crear-grupo')
await toque(O, ORG, btn(O, 'Crear grupo'), 'Crear grupo')
await O.waitForURL(/#\/e\//, { timeout: 15000 })
await O.waitForTimeout(1500)
await pantalla(O, ORG)
await foto(O, ORG, 'espacio-recien-creado')
const textoEspacio = await O.locator('body').innerText()
const codigo = (textoEspacio.match(/\b[A-Z0-9]{8}\b/) || [])[0]
log(`código detectado: ${codigo ? codigo.slice(0, 2) + '…' : 'NO'}`)
writeFileSync(DIR + 'espacio.txt', textoEspacio)

// Crear propuesta
const crearProp = O.getByRole('link', { name: /Crear propuesta|Nueva propuesta|Nuevo plan|Proponer/ }).first()
const crearPropBtn = O.getByRole('button', { name: /Crear propuesta|Nueva propuesta|Nuevo plan|Proponer/ }).first()
if (await crearProp.isVisible().catch(() => false)) await toque(O, ORG, crearProp, 'Crear propuesta')
else await toque(O, ORG, crearPropBtn, 'Crear propuesta (botón)')
await O.waitForURL(/nueva/, { timeout: 15000 })
await O.waitForTimeout(800)
await pantalla(O, ORG)
await foto(O, ORG, 'nueva-propuesta')
writeFileSync(DIR + 'nueva.txt', await O.locator('body').innerText())
// Atajo de actividad: el primero del carrusel
const atajos = O.getByRole('group', { name: 'Atajos de actividad' }).getByRole('button')
const nAtajos = await atajos.count()
log(`atajos: ${await atajos.allInnerTexts()}`)
const padel = O.getByRole('group', { name: 'Atajos de actividad' }).getByRole('button', { name: /pádel|padel|Pádel/i }).first()
if (await padel.isVisible().catch(() => false)) await toque(O, ORG, padel, 'atajo pádel')
else if (nAtajos) await toque(O, ORG, atajos.first(), 'primer atajo')
const titulo = O.getByLabel('Propósito de la propuesta')
if (!(await titulo.inputValue())) await escribir(O, ORG, titulo, 'Pádel y algo después', 'título')
await foto(O, ORG, 'nueva-propuesta-llena')
if (await btn(O, 'Revisar antes de crear').isVisible().catch(() => false)) await toque(O, ORG, btn(O, 'Revisar antes de crear'), 'Revisar antes de crear') // el mockup (S3) la deja opcional
await pantalla(O, ORG)
await foto(O, ORG, 'nueva-propuesta-revisar')
writeFileSync(DIR + 'revisar.txt', await O.locator('body').innerText())
await toque(O, ORG, btn(O, 'Crear y abrir al grupo'), 'Crear y abrir al grupo')
await O.waitForURL(/\/p\//, { timeout: 15000 })
await O.waitForTimeout(1500)
await pantalla(O, ORG)
await foto(O, ORG, 'propuesta-abierta')
writeFileSync(DIR + 'propuesta-org.txt', await O.locator('body').innerText())
const urlProp = O.url()

// ¿Hay forma de avisar al grupo desde la propuesta?
const wa = O.getByRole('link', { name: /WhatsApp/i })
log(`enlaces WhatsApp en la propuesta: ${await wa.count()}`)

// ---------- Invitados ----------
const enlace = `${BASE}/#/unirse/${codigo}`
const respuestas = { Ana: ['si', 'si'], Beto: ['si', 'no'], Coni: ['no', 'si'], Diego: ['si', 'si'], Ema: ['si', null] }
const paginas = {}
for (const nombre of INVITADOS) {
  const ctx = await browser.newContext(opts)
  const p = await ctx.newPage()
  paginas[nombre] = p
  p.on('pageerror', (e) => errores.push(`${nombre}: ${e.message}`))
  persona(nombre).toques.push('enlace en WhatsApp')
  await p.goto(enlace)
  await p.getByRole('heading', { level: 1 }).first().waitFor({ timeout: 15000 })
  await p.waitForTimeout(1200)
  await pantalla(p, nombre)
  if (nombre === 'Ana') await foto(p, nombre, 'quien-eres')
  await toque(p, nombre, btn(p, nombre), `su nombre "${nombre}" en la lista`)
  await pantalla(p, nombre)
  if (nombre === 'Ana') await foto(p, nombre, 'eres-tu')
  await toque(p, nombre, p.getByRole('button', { name: new RegExp(`^Sí, soy ${nombre}`) }), `"Sí, soy ${nombre}"`)
  await p.waitForURL(/#\/e\//, { timeout: 15000 })
  await p.waitForTimeout(1500)
  await pantalla(p, nombre)
  if (nombre === 'Ana') { await foto(p, nombre, 'espacio'); writeFileSync(DIR + 'espacio-invitado.txt', await p.locator('body').innerText()) }
  // Tarjeta del plan
  const tarjeta = p.locator(`a[href*="/p/"]`).first()
  await toque(p, nombre, tarjeta, 'tarjeta del plan')
  await p.waitForURL(/\/p\//, { timeout: 15000 })
  await p.waitForTimeout(1200)
  await pantalla(p, nombre)
  if (nombre === 'Ana') { await foto(p, nombre, 'propuesta-plan'); writeFileSync(DIR + 'plan-invitado.txt', await p.locator('body').innerText()) }
  const irResp = p.getByRole('button', { name: /Ir a Mi respuesta/ })
  if (await irResp.isVisible().catch(() => false)) await toque(p, nombre, irResp, 'Ir a Mi respuesta')
  else await toque(p, nombre, p.getByRole('tab', { name: /Mi respuesta/ }), 'pestaña Mi respuesta')
  await p.waitForTimeout(1200)
  await pantalla(p, nombre)
  if (nombre === 'Ana') { await foto(p, nombre, 'mi-respuesta'); writeFileSync(DIR + 'respuesta-invitado.txt', await p.locator('body').innerText()) }
  // Condiciones por franja
  const [a, b] = respuestas[nombre]
  const grupos = p.getByRole('radiogroup')
  log(`${nombre}: radiogroups ${await grupos.count()} → ${(await grupos.evaluateAll((gs) => gs.map((g) => g.getAttribute('aria-label')))).join(' | ')}`)
  const elegir = async (idx, v) => {
    if (!v) return
    const g = p.locator('fieldset, [role=radiogroup]').filter({ hasText: /Sí puedo|No puedo/ }).nth(idx)
    const op = g.getByText(v === 'si' ? 'Sí puedo' : 'No puedo', { exact: false }).first()
    await toque(p, nombre, op, `franja ${idx ? 'B' : 'A'}: ${v === 'si' ? 'Sí' : 'No'}`)
  }
  await elegir(0, a)
  await elegir(1, b)
  if (nombre === 'Ana' || nombre === 'Ema') await foto(p, nombre, 'condiciones-marcadas')
  await toque(p, nombre, p.getByRole('button', { name: /Guardar condiciones/ }), 'Guardar condiciones')
  await p.waitForTimeout(1500)
  if (nombre === 'Ana' || nombre === 'Ema') { await foto(p, nombre, 'condiciones-guardadas'); writeFileSync(DIR + `guardado-${nombre}.txt`, await p.locator('body').innerText()) }
}

// ---------- Organizador vuelve ----------
await O.goto(urlProp)
await O.waitForTimeout(2500)
await foto(O, ORG, 'propuesta-tras-respuestas')
writeFileSync(DIR + 'propuesta-org-2.txt', await O.locator('body').innerText())
// Lo que la pantalla le sugiere: "Busca una opción compatible", aunque Vale (imprescindible) no respondió.
await toque(O, ORG, btn(O, 'Buscar opción compatible'), 'Buscar opción compatible (sin sus propias condiciones)')
await O.waitForTimeout(2000)
await foto(O, ORG, 'buscar-sin-imprescindible')
writeFileSync(DIR + 'buscar-sin-imprescindible.txt', await O.locator('body').innerText())
// «Ir a Mi respuesta» se fue de S4 (ux-flujo 02:49: ahora «Responder en un toque», que lleva a otra pantalla): para llegar al
// formulario completo de condiciones se usa la pestaña «Mi respuesta», que siempre existe.
const irRespO = O.getByRole('button', { name: /Ir a Mi respuesta/ })
if (await irRespO.isVisible().catch(() => false)) await toque(O, ORG, irRespO, 'Ir a Mi respuesta')
else await toque(O, ORG, O.getByRole('tab', { name: /Mi respuesta/ }), 'pestaña Mi respuesta')
await O.waitForTimeout(1000)
for (const [i, letra] of [[0, 'A'], [1, 'B']]) {
  const g = O.locator('fieldset, [role=radiogroup]').filter({ hasText: /Sí puedo|No puedo/ }).nth(i)
  await toque(O, ORG, g.getByText('Sí puedo').first(), `franja ${letra}: Sí`)
}
await toque(O, ORG, O.getByRole('button', { name: /Guardar condiciones/ }), 'Guardar condiciones')
await O.waitForTimeout(1200)
await toque(O, ORG, O.getByRole('tab', { name: /^Plan/ }), 'pestaña Plan')
await O.waitForTimeout(1500)
const otraVez = O.getByRole('button', { name: /Volver a buscar opción|Buscar opción compatible/ })
await toque(O, ORG, otraVez, 'Volver a buscar opción')
await O.waitForTimeout(2500)
await pantalla(O, ORG)
await foto(O, ORG, 'opcion-publicada')
writeFileSync(DIR + 'opcion-publicada.txt', await O.locator('body').innerText())
const confirmarO = O.getByRole('button', { name: /^Confirmar versión/ })
if (await confirmarO.isVisible().catch(() => false)) await toque(O, ORG, confirmarO, 'Confirmar versión (propia)')
await O.waitForTimeout(1500)
log(`WhatsApp tras publicar opción (organizador): ${await O.getByRole('link', { name: /WhatsApp/i }).count()}`)

// Los invitados vuelven a abrir la app (sin aviso: en la vida real alguien les tiene que decir).
for (const nombre of INVITADOS) {
  const p = paginas[nombre]
  persona(nombre).toques.push('— vuelve a abrir la app (alguien le avisó por fuera) —')
  await p.goto(BASE + '/')
  await p.waitForTimeout(2500)
  await pantalla(p, nombre)
  if (nombre === 'Ana') { await foto(p, nombre, 'portada-vuelve'); writeFileSync(DIR + 'portada-vuelve.txt', await p.locator('body').innerText()) }
  if (nombre === 'Ema') { await foto(p, nombre, 'portada-vuelve'); writeFileSync(DIR + 'portada-vuelve-ema.txt', await p.locator('body').innerText()) }
  const directo = p.getByRole('button', { name: /^Confirmar versión/ })
  if (!(await directo.isVisible().catch(() => false))) {
    const tarjeta = p.locator('a[href*="/p/"]').first()
    if (await tarjeta.isVisible().catch(() => false)) {
      await toque(p, nombre, tarjeta, 'tarjeta "Tu plan" en la portada')
      await p.waitForTimeout(1500)
    }
  }
  const conf = p.getByRole('button', { name: /^Confirmar versión/ })
  if (await conf.isVisible().catch(() => false)) {
    await toque(p, nombre, conf, 'Confirmar versión')
    await p.waitForTimeout(1500)
  } else {
    duda(nombre, 'no ve "Confirmar versión" (no elegible o no llegó)')
    writeFileSync(DIR + `sin-confirmar-${nombre}.txt`, await p.locator('body').innerText())
    await foto(p, nombre, 'sin-confirmar')
  }
  await pantalla(p, nombre)
  if (nombre === 'Ana' || nombre === 'Diego') { await foto(p, nombre, 'tras-confirmar'); writeFileSync(DIR + `tras-confirmar-${nombre}.txt`, await p.locator('body').innerText()) }
}
await O.reload()
await O.waitForTimeout(2500)
await foto(O, ORG, 'final-organizador')
writeFileSync(DIR + 'final-organizador.txt', await O.locator('body').innerText())

writeFileSync(DIR + 'registro.json', JSON.stringify({ registro, errores }, null, 2))
for (const [q, r] of Object.entries(registro)) {
  console.log(`\n== ${q}: ${r.toques.length} toques, ${r.pantallas.length} pantallas, ${r.escrito.length} campos escritos`)
  r.toques.forEach((t, i) => console.log(`  ${i + 1}. ${t}`))
  r.pantallas.forEach((t) => console.log(`  [pantalla] ${t}`))
}
console.log('errores:', errores)
console.log('capturas:', DIR)
await browser.close()
