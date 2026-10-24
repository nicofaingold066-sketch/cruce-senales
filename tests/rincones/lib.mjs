// Utilidades del recorrido de rincones: abre contextos, captura cada rincón en 4 anchos y audita lo básico
// (desborde horizontal, botones sin nombre, texto cortado, contraste, barra fija que tapa, foco con teclado).
// Todo ficticio. No guarda secretos: solo texto visible y rutas.
import { createRequire } from 'node:module'
import { mkdirSync, writeFileSync } from 'node:fs'
const require = createRequire(import.meta.url)
let pw
try { pw = require('playwright') } catch {
  pw = require(process.env.CRUXE_PLAYWRIGHT_DIR || '/Users/macair/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
}
export const BASE = ((/^https?:/.test(process.argv[2] || '') ? process.argv[2] : '') || process.env.CRUXE_URL || 'http://localhost:4187').replace(/\/+$/, '')
export const ANCHOS = [
  { n: '320', w: 320, h: 640 },
  { n: '375', w: 375, h: 812 },
  { n: '768', w: 768, h: 1024 },
  { n: '1280', w: 1280, h: 800 },
]
const sello = new Date().toLocaleString('sv-SE', { timeZone: 'America/Santiago' }).replace(/\D/g, '').slice(0, 12)
export const CARPETA = `${process.env.RINCONES_CAPTURAS || '/Users/macair/cruse/rincones-capturas'}/${process.env.RINCONES_CORRIDA || sello}`
mkdirSync(CARPETA, { recursive: true })
export const hora = () => new Date().toLocaleTimeString('es-CL', { timeZone: 'America/Santiago', hour: '2-digit', minute: '2-digit', second: '2-digit' })
export const log = (t) => console.log(`[${hora()}] ${t}`)

export const hallazgos = [] // { id, rincon, ancho, tipo, detalle }
export const veredictos = {} // id -> { rincon, veredicto, notas[] }
export const errores = [] // consola / página / red por actor

export async function abrir(headless = true) {
  return pw.chromium.launch({ headless, executablePath: process.env.CRUXE_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' })
}
export async function actor(browser, nombre, extra = {}) {
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 1, locale: 'es-CL', timezoneId: 'America/Santiago', ...extra })
  const page = await ctx.newPage()
  page.actor = nombre
  page.on('pageerror', (e) => errores.push({ actor: nombre, tipo: 'js', texto: String(e.message).slice(0, 200) }))
  page.on('console', (m) => { if (m.type() === 'error') errores.push({ actor: nombre, tipo: 'consola', texto: m.text().slice(0, 200) }) })
  page.on('response', (r) => { if (r.status() >= 400) errores.push({ actor: nombre, tipo: 'red', texto: `${r.status()} ${r.request().method()} ${new URL(r.url()).pathname}` }) })
  return page
}

// ---------- auditoría en el navegador ----------
const AUDITORIA = () => {
  window.scrollTo(0, 0)
  const out = []
  const vw = document.documentElement.clientWidth
  const vh = window.innerHeight
  const visible = (e) => {
    const r = e.getBoundingClientRect(); const s = getComputedStyle(e)
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && s.opacity !== '0'
  }
  const nombre = (e) => {
    const al = e.getAttribute('aria-label'); if (al && al.trim()) return al.trim()
    const lb = e.getAttribute('aria-labelledby')
    if (lb) { const t = lb.split(/\s+/).map((id) => document.getElementById(id)?.textContent || '').join(' ').trim(); if (t) return t }
    if (e.labels && e.labels.length) { const t = [...e.labels].map((l) => l.textContent).join(' ').trim(); if (t) return t }
    const t = (e.innerText || e.textContent || '').trim(); if (t) return t
    const ti = e.getAttribute('title'); if (ti) return ti
    const img = e.querySelector('img[alt]'); if (img && img.alt.trim()) return img.alt.trim()
    if (e.tagName === 'INPUT' && e.placeholder) return `(placeholder) ${e.placeholder}`
    return ''
  }
  const desc = (e) => `${e.tagName.toLowerCase()}${e.id ? '#' + e.id : ''}${e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).slice(0, 2).join('.') : ''}`
  // 1. desborde horizontal de la página
  const se = document.scrollingElement
  if (se.scrollWidth > vw + 1) {
    const culpables = [...document.querySelectorAll('body *')].filter((e) => visible(e) && e.getBoundingClientRect().right > vw + 1 && !e.closest('.visualmente-oculto'))
      .slice(0, 4).map((e) => `${desc(e)} (${Math.round(e.getBoundingClientRect().right)}px)`)
    out.push({ tipo: 'desborde-horizontal', detalle: `la página mide ${se.scrollWidth}px en ${vw}px: ${culpables.join('; ')}` })
  }
  // 1b. cabecera: marca, espacio y sesión no pueden pisarse entre sí
  const hijos = [...document.querySelectorAll('.barra > *')].filter(visible)
  for (let i = 0; i < hijos.length; i++) for (let j = i + 1; j < hijos.length; j++) {
    const a = hijos[i].getBoundingClientRect(), c = hijos[j].getBoundingClientRect()
    const w = Math.min(a.right, c.right) - Math.max(a.left, c.left)
    if (w > 2) out.push({ tipo: 'cabecera-encimada', detalle: `${desc(hijos[i])} y ${desc(hijos[j])} se pisan ${Math.round(w)}px en la barra superior` })
  }
  // 1c. dentro de la cabecera: el chip "Datos ficticios" contra la identidad
  const chip = document.querySelector('.chip-ficticio'), ident = document.querySelector('.barra-identidad')
  if (chip && ident && visible(chip) && visible(ident)) {
    const a = chip.getBoundingClientRect(), c = ident.getBoundingClientRect()
    const w = Math.min(a.right, c.right) - Math.max(a.left, c.left)
    if (w > 2) out.push({ tipo: 'cabecera-encimada', detalle: `el chip "Datos ficticios" y la identidad se pisan ${Math.round(w)}px` })
  }
  // 2. controles sin nombre accesible
  for (const e of document.querySelectorAll('button, a[href], input:not([type=hidden]), select, textarea, [role=button], [role=tab], [role=switch], [role=checkbox]')) {
    if (!visible(e) && !e.closest('.visualmente-oculto')) continue
    const n = nombre(e)
    if (!n) out.push({ tipo: 'sin-nombre', detalle: `${desc(e)} sin nombre accesible` })
    else if (n.startsWith('(placeholder)')) out.push({ tipo: 'solo-placeholder', detalle: `${desc(e)} solo tiene ${n}` })
  }
  // 3. texto cortado (overflow oculto con contenido más ancho/alto)
  for (const e of document.querySelectorAll('body *')) {
    if (!visible(e)) continue
    const s = getComputedStyle(e)
    if (e.children.length === 0 && (e.textContent || '').trim().length > 1 && !e.closest('.visualmente-oculto')) {
      const oculto = s.overflow === 'hidden' || s.overflowX === 'hidden' || s.textOverflow === 'ellipsis'
      if (oculto && e.scrollWidth > e.clientWidth + 2) out.push({ tipo: 'texto-cortado', detalle: `${desc(e)}: "${e.textContent.trim().slice(0, 50)}" (${e.scrollWidth}>${e.clientWidth})` })
    }
  }
  // 3b. texto cortado en vertical: una caja con overflow oculto cuyo TEXTO termina más abajo que su borde (un fondo
  // decorativo que sobra no cuenta: se miden los rectángulos de los nodos de texto, que se calculan aunque estén recortados).
  for (const e of document.querySelectorAll('body *')) {
    if (!visible(e) || e.closest('.visualmente-oculto') || e.clientHeight === 0) continue
    const s = getComputedStyle(e)
    if (!(s.overflowY === 'hidden' || s.overflow === 'hidden' || s.overflowY === 'clip') || e.scrollHeight <= e.clientHeight + 2) continue
    const caja = e.getBoundingClientRect()
    const andar = document.createTreeWalker(e, NodeFilter.SHOW_TEXT)
    let fondoTexto = -Infinity, nodo, muestra = ''
    while ((nodo = andar.nextNode())) {
      if (!nodo.textContent.trim() || nodo.parentElement.closest('.visualmente-oculto, [aria-hidden="true"]')) continue
      const rg = document.createRange(); rg.selectNodeContents(nodo)
      for (const r of rg.getClientRects()) if (r.height > 0 && r.bottom > fondoTexto) { fondoTexto = r.bottom; muestra = nodo.textContent.trim().slice(0, 40) }
    }
    if (fondoTexto > caja.bottom + 2) out.push({ tipo: 'texto-cortado-vertical', detalle: `${desc(e)}: "${muestra}" termina ${Math.round(fondoTexto - caja.bottom)}px por debajo del borde de la caja` })
  }
  for (const e of document.querySelectorAll('[role=tab]')) {
    const r = e.getBoundingClientRect()
    if (visible(e) && (r.right > vw + 1 || r.left < -1)) out.push({ tipo: 'pestana-recortada', detalle: `pestaña "${(e.innerText || '').trim()}" se sale de la pantalla (${Math.round(r.left)}–${Math.round(r.right)} de ${vw})` })
  }
  // 4. objetivos táctiles pequeños (solo informativo a ≤ 480 px)
  if (vw <= 480) {
    for (const e of document.querySelectorAll('button, a[href], [role=tab], input[type=checkbox], input[type=radio]')) {
      if (!visible(e) || e.closest('.visualmente-oculto')) continue
      const r = e.getBoundingClientRect()
      if ((r.height < 36 || r.width < 36) && !(e.tagName === 'A' && e.closest('p, li, span') && e.parentElement && e.parentElement.innerText.length > (e.innerText || '').length + 5))
        out.push({ tipo: 'objetivo-pequeno', detalle: `${desc(e)} "${nombre(e).slice(0, 30)}" ${Math.round(r.width)}x${Math.round(r.height)}` })
    }
  }
  // 5. contraste (aproximado: color de texto contra el primer fondo opaco hacia arriba)
  const parse = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p[3] ?? 1 } }
  const lum = ({ r, g, b }) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b) }
  const mezcla = (f, b) => ({ r: f.r * f.a + b.r * (1 - f.a), g: f.g * f.a + b.g * (1 - f.a), b: f.b * f.a + b.b * (1 - f.a), a: 1 })
  const fondo = (e) => {
    let capas = []
    for (let x = e; x; x = x.parentElement) {
      const s = getComputedStyle(x)
      if (s.backgroundImage && s.backgroundImage !== 'none' && /gradient|url/.test(s.backgroundImage)) return null // fondo complejo: no se juzga
      const c = parse(s.backgroundColor)
      if (c && c.a > 0) { capas.push(c); if (c.a >= 1) break }
    }
    let base = { r: 255, g: 255, b: 255, a: 1 }
    for (const c of capas.reverse()) base = mezcla(c, base)
    return base
  }
  const vistos = new Set()
  for (const e of document.querySelectorAll('body *')) {
    if (!visible(e) || e.closest('.visualmente-oculto') || e.closest('svg') || e.closest('button:disabled, [disabled], [aria-disabled=true]')) continue
    const propio = [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1)
    if (!propio) continue
    const s = getComputedStyle(e)
    const fg = parse(s.color); const bg = fondo(e)
    if (!fg || !bg) continue
    const f = mezcla({ ...fg, a: fg.a * (parseFloat(s.opacity) || 1) }, bg)
    const l1 = lum(f), l2 = lum(bg)
    const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)
    const px = parseFloat(s.fontSize); const grueso = parseInt(s.fontWeight) >= 700
    const minimo = px >= 24 || (px >= 18.66 && grueso) ? 3 : 4.5
    if (ratio < minimo) {
      const k = `${e.tagName}|${s.color}|${bg.r | 0},${bg.g | 0},${bg.b | 0}`
      if (vistos.has(k)) continue
      vistos.add(k)
      out.push({ tipo: 'contraste', detalle: `${desc(e)} "${e.textContent.trim().slice(0, 40)}" ${ratio.toFixed(2)}:1 (mín ${minimo}, ${px}px)` })
    }
  }
  // 6. fuente muy chica
  for (const e of document.querySelectorAll('body *')) {
    if (!visible(e) || e.children.length > 0 || e.closest('.visualmente-oculto') || e.closest('svg')) continue
    if ((e.textContent || '').trim().length < 2) continue
    const px = parseFloat(getComputedStyle(e).fontSize)
    if (px < 11) out.push({ tipo: 'fuente-chica', detalle: `${desc(e)} "${e.textContent.trim().slice(0, 30)}" ${px}px` })
  }
  // 7. textos que se pisan (hojas de texto cuyos rectángulos se cruzan de forma apreciable)
  const fijoOPegajoso = (e) => { for (let x = e; x && x !== document.body; x = x.parentElement) { const p = getComputedStyle(x).position; if (p === 'fixed' || p === 'sticky') return true } return false }
  const hojas = [...document.querySelectorAll('body *')].filter((e) => visible(e) && !e.closest('.visualmente-oculto') && !e.closest('svg') && !fijoOPegajoso(e) && !e.closest('details:not([open])') &&
    [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1))
  const rects = hojas.map((e) => {
    const rg = document.createRange(); rg.selectNodeContents(e); const rs = [...rg.getClientRects()].filter((r) => r.width > 4 && r.height > 4)
    return { e, rs }
  })
  let hallados = 0
  for (let i = 0; i < rects.length && hallados < 5; i++) {
    for (let j = i + 1; j < rects.length && hallados < 5; j++) {
      const a = rects[i], b = rects[j]
      if (a.e.contains(b.e) || b.e.contains(a.e)) continue
      let choque = false
      for (const ra of a.rs) for (const rb of b.rs) {
        const w = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left)
        const h = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top)
        if (w > 6 && h > Math.min(ra.height, rb.height) * 0.2) choque = true
      }
      if (choque) {
        // Se ignora si están en capas distintas (uno es de un diálogo/superposición que tapa a propósito).
        const pa = getComputedStyle(a.e).position, pb = getComputedStyle(b.e).position
        out.push({ tipo: 'texto-encimado', detalle: `"${a.e.textContent.trim().slice(0, 30)}" con "${b.e.textContent.trim().slice(0, 30)}"` }); hallados++
      }
    }
  }
  return out
}

// Barra fija: al final del scroll, el último control no puede quedar bajo la barra inferior ni la superior.
const TAPADO = () => {
  const fijos = [...document.querySelectorAll('body *')].filter((e) => {
    const s = getComputedStyle(e); const r = e.getBoundingClientRect()
    return s.position === 'fixed' && r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && r.width > innerWidth * 0.5 && r.height < innerHeight * 0.4
  })
  const out = []
  const ult = [...document.querySelectorAll('main button, main a[href], main input, main select, main textarea')].filter((e) => {
    const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden'
  })
  const abajo = ult.sort((a, b) => b.getBoundingClientRect().bottom - a.getBoundingClientRect().bottom)[0]
  if (abajo) {
    const r = abajo.getBoundingClientRect()
    for (const f of fijos) {
      const fr = f.getBoundingClientRect()
      if (fr.top > innerHeight / 2 && r.bottom > fr.top + 2 && r.top < fr.bottom) out.push({ tipo: 'tapado-por-barra', detalle: `último control "${(abajo.innerText || abajo.getAttribute('aria-label') || '').trim().slice(0, 30)}" (${Math.round(r.top)}–${Math.round(r.bottom)}) queda bajo ${f.className || f.tagName} (desde ${Math.round(fr.top)})` })
    }
  }
  const bajoTexto = document.querySelector('main')?.getBoundingClientRect()
  return out
}

export async function auditar(page) {
  let res = await page.evaluate(AUDITORIA).catch((e) => [{ tipo: 'auditoria-fallo', detalle: String(e).slice(0, 100) }])
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)).catch(() => {})
  await page.waitForTimeout(150)
  const tap = await page.evaluate(TAPADO).catch(() => [])
  await page.evaluate(() => window.scrollTo(0, 0)).catch(() => {})
  return [...res, ...tap]
}

// Foco con teclado: recorre hasta n elementos con Tab y mira si cada uno muestra un indicador y si queda dentro de la pantalla.
export async function probarFoco(page, n = 25) {
  const out = []
  await page.evaluate(() => { window.scrollTo(0, 0); document.activeElement?.blur?.() })
  const vistos = new Set()
  for (let i = 0; i < n; i++) {
    await page.keyboard.press('Tab')
    const info = await page.evaluate(() => {
      const e = document.activeElement
      if (!e || e === document.body) return null
      const s = getComputedStyle(e); const r = e.getBoundingClientRect()
      const nombre = (e.getAttribute('aria-label') || e.innerText || e.getAttribute('title') || e.getAttribute('placeholder') || '').trim().slice(0, 40)
      const ring = (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0) || (s.boxShadow && s.boxShadow !== 'none')
      return { tag: e.tagName.toLowerCase(), cls: typeof e.className === 'string' ? e.className.split(/\s+/)[0] : '', nombre, ring, outline: `${s.outlineStyle} ${s.outlineWidth}`, shadow: s.boxShadow !== 'none', top: Math.round(r.top), bottom: Math.round(r.bottom), alto: innerHeight, visible: r.width > 0 && r.height > 0 }
    })
    if (!info) continue
    const k = `${info.tag}|${info.cls}|${info.nombre}`
    if (vistos.has(k)) break // dio la vuelta
    vistos.add(k)
    if (!info.ring) out.push({ tipo: 'foco-sin-indicador', detalle: `${info.tag}.${info.cls} "${info.nombre}" no muestra anillo (outline ${info.outline})` })
    const bar = await page.evaluate(() => {
      const e = document.activeElement; const r = e.getBoundingClientRect()
      const nav = document.querySelector('.nav-inferior'); const nr = nav ? nav.getBoundingClientRect() : null
      return nr && !nav.contains(e) && r.bottom > nr.top + 2 && r.top < nr.bottom ? 'bajo-nav' : ''
    })
    if (bar) out.push({ tipo: 'foco-tapado', detalle: `${info.tag} "${info.nombre}" recibe foco pero queda bajo la barra inferior (${info.top}–${info.bottom})` })
  }
  out.push({ tipo: 'foco-recorrido', detalle: `${vistos.size} elementos alcanzables con Tab` , info: true })
  return out
}

/** Captura un rincón en los 4 anchos y audita. `id` estable (ej. "R12"), `rincon` descripción humana. */
export async function rincon(page, id, rincon, { foco = false, anchos = ANCHOS, completa = true } = {}) {
  const previo = page.viewportSize()
  for (const a of anchos) {
    await page.setViewportSize({ width: a.w, height: a.h })
    await page.waitForTimeout(350)
    await page.evaluate(() => window.scrollTo(0, 0)).catch(() => {})
    await page.waitForTimeout(120)
    // Lo que se ve al abrir (viewport real) y la página entera con el viewport estirado (así lo fijo y lo pegajoso queda donde estaría al final).
    await page.screenshot({ path: `${CARPETA}/${id}-${a.n}-ini.png` }).catch(() => {})
    if (completa) {
      const alto = await page.evaluate(() => document.documentElement.scrollHeight).catch(() => a.h)
      if (alto > a.h + 20) {
        await page.setViewportSize({ width: a.w, height: Math.min(alto, 6000) })
        await page.waitForTimeout(250)
        await page.screenshot({ path: `${CARPETA}/${id}-${a.n}.png` }).catch(() => {})
        await page.setViewportSize({ width: a.w, height: a.h })
        await page.waitForTimeout(250)
      } else {
        await page.screenshot({ path: `${CARPETA}/${id}-${a.n}.png` }).catch(() => {})
      }
    }
    const r = await auditar(page)
    if (a.n === '375') {
      const largo = await page.evaluate(() => document.documentElement.scrollHeight > innerHeight + 40).catch(() => false)
      if (largo) {
        await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)).catch(() => {})
        await page.waitForTimeout(120)
        await page.screenshot({ path: `${CARPETA}/${id}-375-fin.png` }).catch(() => {})
        await page.evaluate(() => window.scrollTo(0, 0)).catch(() => {})
      }
    }
    for (const h of r) hallazgos.push({ id, rincon, ancho: a.n, ...h })
    if (foco && (a.n === '375' || a.n === '1280')) {
      const f = await probarFoco(page)
      for (const h of f) hallazgos.push({ id, rincon, ancho: a.n, ...h })
    }
  }
  await page.setViewportSize(previo)
  await page.waitForTimeout(150)
  veredictos[id] ??= { rincon, notas: [] }
  log(`rincón ${id} · ${rincon}`)
}
export const nota = (id, texto) => { (veredictos[id] ??= { rincon: id, notas: [] }).notas.push(texto); log(`  nota ${id}: ${texto}`) }
export const marcar = (id, v, texto) => { (veredictos[id] ??= { rincon: id, notas: [] }).manual = v; if (texto) nota(id, texto) }

export function guardar(nombre = 'hallazgos') {
  writeFileSync(`${CARPETA}/${nombre}.json`, JSON.stringify({ hora: hora(), base: BASE, hallazgos, veredictos, errores }, null, 1))
  return `${CARPETA}/${nombre}.json`
}
export const boton = (p, texto) => p.getByRole('button', { name: texto, exact: true })
export const esperarTexto = (p, texto, ms = 20000) => p.getByText(texto, { exact: false }).first().waitFor({ timeout: ms })
