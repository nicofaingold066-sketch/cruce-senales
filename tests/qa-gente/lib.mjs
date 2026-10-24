// Biblioteca común de los guiones de qa-gente (QA de gente y rendimiento). Todo ficticio, solo producción/URL por argumento.
// - turno de base (protocolo de la ficha `agentes/qa-gente.md` en la rama `coordinacion`): una corrida a la vez, ≤10 min.
// - Persona: un contexto de navegador aislado, con medición de cada RPC (latencia, estado, código de error).
// - utilidades de pantalla para el flujo (crear grupo, entrar por el enlace, responder, crear plan).
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'
import { mkdirSync, appendFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
const require = createRequire(import.meta.url)
let pw
try { pw = require('playwright') } catch {
  pw = require(process.env.CRUXE_PLAYWRIGHT_DIR || '/Users/macair/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
}
export const aqui = dirname(fileURLToPath(import.meta.url))
export const RAIZ = resolve(aqui, '../..')
export const CAPTURAS = resolve(RAIZ, 'docs/qa/capturas/v2')  // vuelta 2 (main 018215d)
export const BASE = (process.argv[2] || process.env.CRUXE_URL || 'https://cruce-senales.vercel.app').replace(/\/+$/, '')
export const hora = () => new Date().toLocaleTimeString('es-CL', { timeZone: 'America/Santiago', hour: '2-digit', minute: '2-digit', second: '2-digit' })
export const log = (t) => console.log(`[${hora()}] ${t}`)
export const dormir = (ms) => new Promise((r) => setTimeout(r, ms))
mkdirSync(CAPTURAS, { recursive: true })

// ---------- corte y turno de base ----------
const corteHHMM = process.env.QA_CORTE || '12:15'
export function pasoElCorte() {
  const h = new Date().toLocaleTimeString('es-CL', { timeZone: 'America/Santiago', hour12: false, hour: '2-digit', minute: '2-digit' })
  return h >= corteHHMM && h < '20:00'
}
const C = '/Users/macair/cruse/cruce-coord'
const git = (...a) => execFileSync('git', ['-C', C, ...a], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
const ABRE = /^\s*-\s*(?:\[\d{2}:\d{2}\]\s*)?(?:\*\*)?(?:CORRIENDO PRUEBA \(|MIGRACION EN CURSO)/m
function ocupadoPor() {
  git('fetch', '-q', 'origin', 'coordinacion')
  const out = []
  for (const f of git('ls-tree', '--name-only', 'origin/coordinacion', 'agentes/').split('\n').filter((f) => f.endsWith('.md'))) {
    if (f === 'agentes/qa-gente.md') continue
    const t = git('show', `origin/coordinacion:${f}`)
    const tocando = t.match(/## Tocando ahora\s*\n([\s\S]*?)(?=\n## |$)/)?.[1] ?? ''
    if (ABRE.test(tocando)) out.push(f.replace('agentes/', '').replace('.md', ''))
  }
  return out
}
function editarFicha(linea) {
  git('fetch', '-q', 'origin', 'coordinacion'); git('rebase', '-q', 'origin/coordinacion')
  const fs = require('node:fs'); const p = `${C}/agentes/qa-gente.md`
  let s = fs.readFileSync(p, 'utf8')
  s = s.replace(/\n- (?:\[[0-9:]+\] )?CORRIENDO PRUEBA \([^\n]*/g, '')
  if (linea) s = s.replace('## Tocando ahora\n', `## Tocando ahora\n- ${linea}\n`)
  fs.writeFileSync(p, s)
  git('add', 'agentes/qa-gente.md'); git('commit', '-q', '-m', linea ? 'qa-gente: turno de base' : 'qa-gente: suelta el turno')
  git('push', '-q', 'origin', 'HEAD:coordinacion')
}
export async function tomarTurno(que) {
  // Marca pedida por la coordinación: «qa-gente vuelta 2 bloque X (qa-gente)»; X = letra del guion (a-pocas → a).
  const bloque = (process.argv[1] ?? '').split('/').pop().replace(/\.mjs$/, '').split('-')[0] || que
  que = `qa-gente vuelta 2 bloque ${bloque}`
  for (;;) {
    if (pasoElCorte()) { log(`Pasó la hora de corte (${corteHHMM}): no se corre.`); process.exit(4) }
    let o; while ((o = ocupadoPor()).length) { log(`esperando turno: ${o.join(', ')}`); await dormir(20000) }
    const h = new Date().toLocaleTimeString('es-CL', { timeZone: 'America/Santiago', hour12: false, hour: '2-digit', minute: '2-digit' })
    try { editarFicha(`CORRIENDO PRUEBA (${h}) ${que} (qa-gente)`) } catch (e) {
      log('push de la marca falló, reintento'); try { git('fetch', '-q', 'origin', 'coordinacion'); git('reset', '-q', '--hard', 'origin/coordinacion') } catch {} ; await dormir(4000); continue }
    await dormir(4000)
    const otros = ocupadoPor()
    if (otros.length) { log(`choque con ${otros.join(', ')}: suelto`); try { editarFicha(null) } catch {} ; await dormir(30000); continue }
    log(`turno tomado ${h}: ${que}`)
    return
  }
}
export function soltarTurno() { for (let i = 0; i < 3; i++) { try { editarFicha(null); log('turno liberado'); return } catch { try { git('fetch', '-q', 'origin', 'coordinacion'); git('reset', '-q', '--hard', 'origin/coordinacion') } catch {} } } }
// Envoltura: toma turno, corre `f`, suelta siempre; tope duro de 10 min.
export async function conTurno(que, f) {
  await tomarTurno(que)
  const tope = setTimeout(() => { log('TOPE DE 10 MIN: se corta'); soltarTurno(); process.exit(5) }, 9.5 * 60 * 1000)
  try { return await f() } finally { clearTimeout(tope); soltarTurno() }
}

// ---------- resultados ----------
export class Informe {
  constructor(nombre) { this.nombre = nombre; this.filas = []; this.defectos = [] }
  ok(nombre, cond, detalle = '') { this.filas.push({ nombre, cond: !!cond, detalle }); log(`${cond ? 'PASS' : 'FAIL'} ${nombre}${detalle ? ' → ' + detalle : ''}`); return !!cond }
  defecto(d) { this.defectos.push(d); log(`DEFECTO [${d.gravedad}] ${d.titulo}`) }
  fin() {
    const f = this.filas.filter((x) => !x.cond).length
    console.log(`${this.nombre}: ${this.filas.length - f} PASS, ${f} FAIL`)
    console.log('JSON ' + JSON.stringify({ guion: this.nombre, filas: this.filas, defectos: this.defectos }))
    process.exitCode = f === 0 ? 0 : 1
  }
}
export const pct = (v, p) => { if (!v.length) return null; const s = [...v].sort((a, b) => a - b); return Math.round(s[Math.min(s.length - 1, Math.ceil(p / 100 * s.length) - 1)]) }
export const resumenLat = (v) => (v.length ? `n=${v.length} p50=${pct(v, 50)}ms p95=${pct(v, 95)}ms max=${Math.round(Math.max(...v))}ms` : 'sin datos')

// ---------- navegador y personas ----------
export const lanzar = () => pw.chromium.launch({ headless: true, executablePath: process.env.CRUXE_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' })

export class Persona {
  constructor(browser, nombre, { ancho = 375, alto = 812, intro = false, reducedMotion = 'no-preference' } = {}) { this.intro = intro; this.reducedMotion = reducedMotion; this.browser = browser; this.nombre = nombre; this.ancho = ancho; this.alto = alto
    this.rpc = []; this.errores = []; this.malas = [] }
  async abrir() {
    this.ctx = await this.browser.newContext({ viewport: { width: this.ancho, height: this.alto }, isMobile: this.ancho < 700, hasTouch: this.ancho < 700, locale: 'es-CL', reducedMotion: this.reducedMotion })
    // La primera visita muestra la intro (2,6 s, `cruxe:entrada-vista`) y la guía de tres pasos (`cruxe:guia-vista:v1`), ambas diálogos modales:
    // se marcan como vistas (igual que `sinIntro` en tests/e2e/nav.mjs) salvo que se pruebe la intro/guía (f-intro, h-guia).
    if (!this.intro) await this.ctx.addInitScript(() => {
      for (const tipo of ['localStorage', 'sessionStorage']) for (const clave of ['cruxe:entrada-vista', 'cruxe:guia-vista:v1']) { try { window[tipo].setItem(clave, '1') } catch {} }
    })
    this.page = await this.ctx.newPage()
    const ini = new Map()
    this.page.on('pageerror', (e) => this.errores.push(`pageerror: ${e.message}`.slice(0, 200)))
    this.page.on('console', (m) => { if (m.type() === 'error') this.errores.push(`consola: ${m.text().slice(0, 160)}`) })
    this.page.on('request', (r) => { if (r.url().includes('/rest/v1/rpc/')) ini.set(r, Date.now()) })
    this.page.on('requestfailed', (r) => { if (ini.has(r)) this.rpc.push({ fn: r.url().split('/').pop().split('?')[0], ms: Date.now() - ini.get(r), status: 0, codigo: 'fallo_red:' + (r.failure()?.errorText ?? '') }) })
    this.page.on('response', async (r) => {
      const u = r.url()
      if (r.status() >= 400) this.malas.push(`${r.status()} ${r.request().method()} ${new URL(u).pathname}${new URL(u).pathname.includes('rpc') ? '' : ''}`)
      if (!u.includes('/rest/v1/rpc/')) return
      const t0 = ini.get(r.request()); const fn = u.split('/').pop().split('?')[0]
      let codigo = null
      try { const j = await r.json(); if (j && j.ok === false) codigo = j.error?.codigo + (j.error?.detalle ? ':' + j.error.detalle : ''); else if (j?.code) codigo = j.code } catch {}
      this.rpc.push({ fn, ms: t0 ? Date.now() - t0 : null, status: r.status(), codigo })
    })
    return this
  }
  async cerrar() { await this.ctx?.close().catch(() => {}) }
  async captura(nombre) { const p = `${CAPTURAS}/${nombre}.png`; await this.page.screenshot({ path: p }).catch(() => {}); return p }
  async desborde() { return this.page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth).catch(() => 0) }
}
// Reúne las medidas RPC de varias personas: { fn: [ms...] } y códigos de error.
export function agregarRpc(personas) {
  const lat = {}, errores = {}
  for (const p of personas) for (const r of p.rpc) {
    if (r.ms != null) (lat[r.fn] ??= []).push(r.ms)
    if (r.status >= 400 || r.codigo) { const k = `${r.fn}:${r.status}:${r.codigo ?? ''}`; errores[k] = (errores[k] ?? 0) + 1 }
  }
  return { lat, errores }
}
export function tablaRpc(personas, fns) {
  const { lat, errores } = agregarRpc(personas)
  const lineas = Object.keys(lat).filter((f) => !fns || fns.includes(f)).map((f) => `  ${f.padEnd(26)} ${resumenLat(lat[f])}`)
  return { texto: lineas.join('\n'), lat, errores }
}

// ---------- acciones de pantalla ----------
const boton = (p, n, exact = true) => p.getByRole('button', { name: n, exact })
// Organizador: portada → Crear un grupo → nombre, tu nombre, lista de integrantes (hasta 12 en la pantalla) → Crear grupo.
// Devuelve { codigo, urlEspacio, espacioId }.
export async function crearGrupo(per, { grupo, yo, integrantes = [], sinLista = false }) {
  const p = per.page
  await p.goto(`${BASE}/#/crear`)
  await p.getByRole('heading', { name: 'Crear un grupo' }).waitFor({ timeout: 30000 })
  await p.getByLabel('Nombre del grupo').fill(grupo)
  await p.getByLabel('Tu nombre en el grupo').fill(yo)
  if (integrantes.length) {
    const campo = p.locator('#quienes-nuevo')
    for (let i = 0; i < integrantes.length; i += 4) {
      await campo.fill(integrantes.slice(i, i + 4).join(', ')); await campo.press('Enter')
    }
  }
  await boton(p, 'Crear grupo').click()
  if (!integrantes.length || sinLista) { const b = boton(p, 'Crear sin lista'); await b.waitFor({ timeout: 8000 }).then(() => b.click(), () => {}) }
  // Tras crear, el flujo lleva directo a «Nuevo plan».
  await p.getByRole('heading', { name: 'Nuevo plan' }).waitFor({ timeout: 30000 })
  const espacioId = p.url().match(/#\/e\/([^/?#]+)/)?.[1]
  return { urlNuevo: p.url(), espacioId }
}
// En «Nuevo plan» ya abierta: título, mínimo/máximo y «Crear y abrir al grupo». Devuelve la URL del plan.
export async function crearPlan(per, { titulo = 'Cena de prueba', minimo, maximo } = {}) {
  const p = per.page
  const t = p.getByLabel(/^Qué plan|Nombre del plan|Qué hacen/i)
  const caja = p.locator('input[placeholder]').first()
  if (titulo) { const v = await caja.inputValue().catch(() => ''); if (!v) await caja.fill(titulo) }
  if (minimo != null) await p.locator('#cupo-minimo').fill(String(minimo))
  if (maximo != null) await p.locator('#cupo-maximo').fill(String(maximo))
  const rev = boton(p, 'Revisar antes de crear'); if (await rev.isVisible().catch(() => false)) await rev.click()
  await boton(p, 'Crear y abrir al grupo').click()
  await p.waitForURL(/\/p\//, { timeout: 30000 })
  await p.locator('.estado-hero-etiqueta').first().waitFor({ timeout: 30000 })
  return p.url()
}
// Código de invitación visible en la pantalla del grupo.
export async function leerCodigo(per, urlEspacio) {
  const p = per.page
  if (urlEspacio) await p.goto(urlEspacio)
  await p.locator('.codigo').first().waitFor({ timeout: 30000 })
  return (await p.locator('.codigo').first().textContent()).trim()
}
// Invitado: abre el enlace y entra con su nombre (fila de la lista o «No estoy en la lista» + «Tu nombre»).
// Devuelve 'lista' | 'escrito' y deja a la persona en ¿Cuándo puedes? o en el grupo.
export async function entrarPorEnlace(per, codigo, nombre, { timeout = 45000 } = {}) {
  const p = per.page
  await p.goto(`${BASE}/#/unirse/${codigo}`)
  // Con la lista agotada la pantalla cambia a «Escribe tu nombre para entrar» (sin lista).
  await p.getByRole('heading', { name: /^(¿Quién eres\?|Escribe tu nombre para entrar)$/ }).waitFor({ timeout })
  const fila = p.getByRole('button', { name: nombre, exact: true })
  let via
  if (await fila.waitFor({ timeout: 6000 }).then(() => true, () => false)) {
    await fila.click(); via = 'lista'
    const si = boton(p, `Sí, soy ${nombre}`); if (await si.isVisible({ timeout: 1500 }).catch(() => false)) await si.click()
  } else {
    const no = p.getByRole('button', { name: /No estoy en la lista/ }); if (await no.isVisible().catch(() => false)) await no.click()
    await p.getByLabel(/Tu nombre/).first().fill(nombre)
    await p.getByRole('button', { name: /^(Unirme|Entrar)$/ }).first().click(); via = 'escrito'
  }
  return via
}
export async function esperarDestino(per, timeout = 45000) {
  await per.page.locator('h1').first().waitFor({ timeout })
  return per.page.getByRole('heading', { name: '¿Cuándo puedes?' }).waitFor({ timeout }).then(() => 'responder', () => 'otro')
}
export async function responderRapido(per, op = 'dos', timeout = 30000) {
  const p = per.page
  await p.getByRole('heading', { name: '¿Cuándo puedes?' }).waitFor({ timeout })
  const cambiar = p.getByRole('button', { name: /^Cambiar mi respuesta/ }); if (await cambiar.isVisible().catch(() => false)) await cambiar.click()
  const re = op === 'dos' ? /^Puedo (los dos|en los dos)/ : op === 'ninguno' ? /^No puedo (ninguno|en ninguno)/ : op === 'sab' ? /^Solo (el|de) s/i : /^Solo (el|de) d/i
  const b = p.getByRole('button', { name: re }).first()
  await b.waitFor({ timeout }); await b.scrollIntoViewIfNeeded().catch(() => {}); await b.click()
  await p.getByRole('status').filter({ hasText: /Respuesta guardada|Guardado/ }).first().waitFor({ state: 'attached', timeout })
}
export const estadoPlan = (p) => p.locator('.estado-hero-etiqueta').first().innerText().catch(() => '')

// Monta un grupo completo: organizador crea grupo con lista, crea el plan; los invitados entran por el enlace (cada uno en su contexto).
// nombres: invitados (sin el organizador). Devuelve { org, invitados:[Persona], codigo, espacioId, urlPlan, urlEspacio }.
export async function montar(browser, { grupo, organiza, nombres, minimo, maximo, enLista = nombres.length, titulo = 'Cena de prueba', ancho = 375, entrar = true }) {
  const org = await new Persona(browser, organiza, { ancho }).abrir()
  const { espacioId } = await crearGrupo(org, { grupo, yo: organiza, integrantes: nombres.slice(0, enLista) })
  const urlPlan = await crearPlan(org, { titulo, minimo, maximo })
  const urlEspacio = `${BASE}/#/e/${espacioId}`
  const codigo = await leerCodigo(org, urlEspacio)
  const invitados = []
  if (entrar) for (const n of nombres) {
    const p = await new Persona(browser, n, { ancho }).abrir(); invitados.push(p)
    await entrarPorEnlace(p, codigo, n); await esperarDestino(p)
  }
  return { org, invitados, codigo, espacioId, urlPlan, urlEspacio }
}
export const textoMain = (p) => p.locator('main').first().innerText().catch(() => '')

// Corre fn sobre los items con a lo sumo k a la vez; devuelve los resultados en orden (errores como {error}).
export async function enLotes(items, k, fn) {
  const res = new Array(items.length); let i = 0
  await Promise.all(Array.from({ length: Math.min(k, items.length) }, async () => {
    for (;;) { const j = i++; if (j >= items.length) return; try { res[j] = await fn(items[j], j) } catch (e) { res[j] = { error: String(e.message).split('\n')[0].slice(0, 200) } } }
  }))
  return res
}
export const NOMBRES = ['Abi','Beto','Cami','Dani','Eli','Fran','Gabi','Hugo','Ivan','Juli','Kari','Lalo','Mari','Nico','Omar','Pau','Quique','Rafa','Sofi','Tomi','Uri','Vale','Wen','Xime','Yago','Zoe','Ari','Bruno','Cleo','Dante','Emi','Fede']
