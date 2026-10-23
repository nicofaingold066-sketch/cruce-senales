// Biblioteca de los usuarios sintéticos de CRUXE. Playwright y Chrome como en tests/e2e/recorrido-dos-sesiones.mjs
// (CRUXE_PLAYWRIGHT_DIR, CRUXE_CHROME); no instala nada. Todo ficticio.
//
// Una Persona = un contexto de navegador propio (almacenamiento y sesión anónima separados) con su ancho de pantalla.
// Cuenta toques (cada click que hace), pantallas distintas que ve, el tiempo desde que abre el enlace hasta su primera
// respuesta guardada, y guarda capturas y observaciones (hallazgos) con el paso exacto.
import { createRequire } from 'node:module'
import { mkdirSync, writeFileSync } from 'node:fs'
const require = createRequire(import.meta.url)
let pw
try { pw = require('playwright') } catch {
  pw = require(process.env.CRUXE_PLAYWRIGHT_DIR || '/Users/macair/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
}
export const chromium = pw.chromium

export const hora = () => new Date().toLocaleTimeString('es-CL', { timeZone: 'America/Santiago', hour: '2-digit', minute: '2-digit', second: '2-digit' })
export const sello = () => new Date().toLocaleString('sv-SE', { timeZone: 'America/Santiago' }).replace(/\D/g, '').slice(0, 14)
export const log = (t) => console.log(`[${hora()}] ${t}`)

export const hallazgos = []
export const lecturas = [] // cosas medidas que no son fallas (tiempos, toques)

export class Persona {
  constructor(browser, { nombre, perfil, ancho = 375, alto = 812 }, carpeta) {
    this.nombre = nombre
    this.perfil = perfil
    this.ancho = ancho
    this.carpeta = carpeta
    this.toques = 0
    this.pantallas = []
    this.ultimaClave = ''
    this.errores = []
    this.respuestasMalas = []
    this.nCaptura = 0
    this.t0 = null
    this.opts = { viewport: { width: ancho, height: alto }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, locale: 'es-CL' }
    this.browser = browser
  }

  async abrir() {
    this.ctx = await this.browser.newContext(this.opts)
    this.page = await this.ctx.newPage()
    this.page.on('pageerror', (e) => this.errores.push(`pageerror: ${e.message}`.slice(0, 200)))
    this.page.on('console', (m) => { if (m.type() === 'error') this.errores.push(`consola: ${m.text().slice(0, 160)}`) })
    this.page.on('response', (r) => { if (r.status() >= 400) this.respuestasMalas.push(`${r.status()} ${r.request().method()} ${new URL(r.url()).pathname}`) })
    return this
  }

  async cerrar() { await this.ctx?.close() }

  // Anota la pantalla actual (ruta + título + primer subtítulo) si cambió desde la última.
  async mirar() {
    const clave = await this.page.evaluate(() => {
      const h1 = document.querySelector('h1')?.innerText?.replace(/\s+/g, ' ').trim() ?? ''
      const h2 = document.querySelector('main h2, .hoja h2')?.innerText?.replace(/\s+/g, ' ').trim() ?? ''
      const tab = document.querySelector('[role=tab][aria-selected=true]')?.innerText?.trim() ?? ''
      return `${location.hash} | ${h1} | ${h2}${tab ? ' | pestaña ' + tab : ''}`
    }).catch(() => '')
    if (clave && clave !== this.ultimaClave) { this.ultimaClave = clave; this.pantallas.push(clave) }
  }

  // Un toque: se cuenta, se hace y se anota la pantalla a la que se llega.
  async tocar(locator, etiqueta) {
    await locator.scrollIntoViewIfNeeded().catch(() => {})
    await locator.click()
    this.toques++
    this.ultimoToque = etiqueta
    await this.page.waitForTimeout(350)
    await this.mirar()
  }

  boton(nombre, exact = true) { return this.page.getByRole('button', { name: nombre, exact }) }
  enlace(nombre, exact = true) { return this.page.getByRole('link', { name: nombre, exact }) }
  async tocarBoton(nombre, exact = true) { await this.tocar(this.boton(nombre, exact), `botón «${nombre}»`) }
  async tocarEnlace(nombre, exact = true) { await this.tocar(this.enlace(nombre, exact), `enlace «${nombre}»`) }
  async tocarPestana(nombre) { await this.tocar(this.page.getByRole('tab', { name: nombre }), `pestaña «${nombre}»`); await this.page.waitForTimeout(500) }
  async esperar(texto, ms = 20000) { await this.page.getByText(texto, { exact: false }).first().waitFor({ timeout: ms }); await this.mirar() }
  async hay(texto, ms = 1500) { return this.page.getByText(texto, { exact: false }).first().waitFor({ timeout: ms }).then(() => true, () => false) }
  async escribir(locator, texto) { await locator.fill(texto); }
  async main() { return (await this.page.locator('main').first().innerText().catch(() => this.page.locator('body').innerText())).replace(/[ \t]+\n/g, '\n') }
  async todo() { return (await this.page.locator('body').innerText()).replace(/[ \t]+\n/g, '\n') }
  async desborde() { return this.page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth) }

  async captura(nombre) {
    this.nCaptura++
    const f = `${this.carpeta}/${this.nombre.toLowerCase()}-${String(this.nCaptura).padStart(2, '0')}-${nombre}.png`
    await this.page.screenshot({ path: f }).catch(() => {})
    return f.split('/').slice(-2).join('/')
  }

  // Marca el comienzo / el fin de "tardó N segundos en responder" (de abrir el enlace a guardar la primera respuesta).
  inicio() { this.t0 = Date.now(); this.toquesIni = this.toques }
  fin(que) {
    const seg = ((Date.now() - this.t0) / 1000).toFixed(1)
    lecturas.push({ persona: this.nombre, ancho: this.ancho, que, segundos: Number(seg), toques: this.toques - this.toquesIni, pantallas: this.pantallas.length })
    log(`${this.nombre}: ${que} en ${seg} s, ${this.toques - this.toquesIni} toques`)
  }
}

// gravedad: 'alta' (se pierde la gente o el dato) · 'media' (confunde y puede responder mal) · 'baja' (pulido).
// destinatario: friccion | front-juan | backend | ux-flujo | apertura | coordinador
export function hallazgo({ id, persona, gravedad, destinatario, titulo, paso, vio, esperaba, captura }) {
  if (hallazgos.some((h) => h.id === id)) return
  hallazgos.push({ id, persona: persona?.nombre ?? persona, gravedad, destinatario, titulo, paso, vio, esperaba, captura })
  log(`HALLAZGO [${gravedad}] ${id}: ${titulo}`)
}

export function guardarResultados(carpeta, extra = {}) {
  writeFileSync(`${carpeta}/resultados.json`, JSON.stringify({ hallazgos, lecturas, ...extra }, null, 2))
}

export function carpetaDeSalida(base) {
  const carpeta = `${base}/${sello()}`
  mkdirSync(carpeta, { recursive: true })
  return carpeta
}

export async function lanzar() {
  return chromium.launch({ headless: true,
    executablePath: process.env.CRUXE_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' })
}
