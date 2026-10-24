// Accesibilidad a fondo (sin dependencias nuevas): estructura y nombres para lector de pantalla, recorrido completo con
// teclado (indicador de foco comparando con y sin foco, foco tapado por barras fijas), contraste medido sobre los
// píxeles de la captura (sirve también sobre fondos con degradé), espaciado de texto (WCAG 1.4.12), tamaño de objetivos
// (WCAG 2.5.8) y anuncios de estado (aria-live). Guarda el árbol accesible (ariaSnapshot) de cada rincón.
import { writeFileSync } from 'node:fs'
import { CARPETA, log } from './lib.mjs'

export const a11y = [] // { id, rincon, ancho, nivel: 'falla'|'aviso'|'info', regla, detalle }
const anotar = (id, rincon, ancho, nivel, regla, detalle) => a11y.push({ id, rincon, ancho, nivel, regla, detalle })

// ---------------------------------------------------------------- estructura (lo que oye un lector de pantalla)
const ESTRUCTURA = () => {
  const out = []
  const add = (nivel, regla, detalle) => out.push({ nivel, regla, detalle })
  const visible = (e) => {
    const r = e.getBoundingClientRect(); const s = getComputedStyle(e)
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'
  }
  const enCerrado = (e) => { const d = e.closest('details:not([open])'); return !!d && !e.closest('summary') }
  const oculto = (e) => !!e.closest('[aria-hidden="true"]') || enCerrado(e)
  const desc = (e) => `${e.tagName.toLowerCase()}${e.id ? '#' + e.id : ''}${typeof e.className === 'string' && e.className.trim() ? '.' + e.className.trim().split(/\s+/).slice(0, 2).join('.') : ''}`
  const nombre = (e) => {
    const al = e.getAttribute('aria-label'); if (al && al.trim()) return al.trim()
    const lb = e.getAttribute('aria-labelledby')
    if (lb) { const t = lb.split(/\s+/).map((id) => document.getElementById(id)?.textContent || '').join(' ').trim(); if (t) return t }
    if (e.labels && e.labels.length) { const t = [...e.labels].map((l) => l.textContent).join(' ').trim(); if (t) return t }
    const t = (e.innerText || e.textContent || '').trim(); if (t) return t
    const ti = e.getAttribute('title'); if (ti) return ti
    if (e.placeholder) return `(placeholder) ${e.placeholder}` // lo reporta la regla "etiqueta", no "nombre"
    return ''
  }
  // idioma y título
  if (!/^es/.test(document.documentElement.lang || '')) add('falla', 'idioma', `<html lang="${document.documentElement.lang}">: el lector puede leer en inglés`)
  if (!document.title.trim()) add('falla', 'titulo', 'la página no tiene <title>')
  // regiones
  const mains = [...document.querySelectorAll('main, [role=main]')]
  if (mains.length !== 1) add('falla', 'regiones', `${mains.length} regiones main`)
  if (!document.querySelector('header, [role=banner]')) add('aviso', 'regiones', 'sin cabecera (banner)')
  // encabezados
  const hs = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6,[role=heading]')].filter((h) => visible(h) && !oculto(h))
  const niveles = hs.map((h) => Number(h.getAttribute('aria-level') || h.tagName.slice(1)))
  const h1 = niveles.filter((n) => n === 1).length
  if (h1 === 0) add('falla', 'encabezados', 'sin h1 visible: el lector no anuncia en qué pantalla estás')
  if (h1 > 1) add('aviso', 'encabezados', `${h1} h1 visibles: ${hs.filter((h, i) => niveles[i] === 1).map((h) => `"${h.textContent.trim().slice(0, 30)}"`).join(', ')}`)
  for (let i = 1; i < niveles.length; i++) if (niveles[i] > niveles[i - 1] + 1) add('aviso', 'encabezados', `salta de h${niveles[i - 1]} a h${niveles[i]} en "${hs[i].textContent.trim().slice(0, 40)}"`)
  // pestañas
  for (const tl of document.querySelectorAll('[role=tablist]')) {
    const tabs = [...tl.querySelectorAll('[role=tab]')]
    const sel = tabs.filter((t) => t.getAttribute('aria-selected') === 'true')
    if (sel.length !== 1) add('falla', 'pestanas', `${sel.length} pestañas seleccionadas en "${tl.getAttribute('aria-label') || ''}"`)
    for (const t of tabs) {
      const c = t.getAttribute('aria-controls')
      if (t.getAttribute('aria-selected') === 'true' && (!c || !document.getElementById(c))) add('falla', 'pestanas', `la pestaña "${nombre(t)}" apunta a un panel que no existe (${c})`)
    }
    const conTab = tabs.filter((t) => t.tabIndex >= 0).length
    if (conTab > 1) add('aviso', 'pestanas', `${conTab} de ${tabs.length} pestañas en el orden de Tab (el patrón ARIA usa flechas y una sola parada)`)
  }
  // controles sin nombre, solo placeholder, role=button no enfocable
  for (const e of document.querySelectorAll('button, a[href], input:not([type=hidden]), select, textarea, [role=button], [role=tab], [role=checkbox], [role=radio], [role=switch], summary')) {
    if (!visible(e) || oculto(e)) continue
    const n = nombre(e)
    if (!n) add('falla', 'nombre', `${desc(e)} sin nombre accesible`)
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.tagName) && !['radio', 'checkbox', 'submit', 'button'].includes(e.type)) {
      const etiquetado = (e.labels && e.labels.length) || e.getAttribute('aria-label') || e.getAttribute('aria-labelledby')
      if (!etiquetado) add('falla', 'etiqueta', `${desc(e)} sin etiqueta (solo placeholder "${e.placeholder || ''}")`)
    }
    if (e.getAttribute('role') === 'button' && e.tabIndex < 0 && e.tagName !== 'BUTTON') add('falla', 'teclado', `${desc(e)} "${n.slice(0, 30)}" tiene role=button pero no se alcanza con Tab`)
    if (e.tabIndex > 0) add('aviso', 'teclado', `${desc(e)} con tabindex=${e.tabIndex} (altera el orden)`)
  }
  // radios agrupados
  const grupos = {}
  for (const r of document.querySelectorAll('input[type=radio]')) if (visible(r.closest('label') || r) && r.name) (grupos[r.name] ||= []).push(r)
  for (const [n, rs] of Object.entries(grupos)) {
    const g = rs[0].closest('fieldset, [role=radiogroup], [role=group]')
    const nom = g ? (g.tagName === 'FIELDSET' ? g.querySelector('legend')?.textContent : nombre(g)) : ''
    if (!g || !nom || !nom.trim()) add('aviso', 'grupo', `grupo de opciones "${n}" sin nombre de grupo (el lector dice "Sí puedo" sin decir de qué)`)
  }
  // aria-hidden con cosas enfocables
  for (const h of document.querySelectorAll('[aria-hidden="true"]')) {
    const f = h.querySelector('a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])')
    if (f && visible(f)) add('falla', 'aria-hidden', `${desc(h)} oculto al lector contiene un control enfocable (${desc(f)})`)
  }
  // svg sin nombre ni aria-hidden (fuera de un control con nombre)
  let svgs = 0
  for (const s of document.querySelectorAll('svg')) {
    if (!visible(s) || oculto(s)) continue
    if (s.getAttribute('role') === 'img' && (s.getAttribute('aria-label') || s.querySelector('title'))) continue
    const control = s.closest('button, a, [role=button], [role=tab], label')
    if (control && nombre(control)) continue
    svgs++
  }
  if (svgs) add('aviso', 'imagenes', `${svgs} svg sin nombre ni aria-hidden (el lector puede anunciar "imagen" sin más)`)
  for (const i of document.querySelectorAll('img')) if (visible(i) && !i.hasAttribute('alt')) add('falla', 'imagenes', `img sin alt (${i.src.slice(-40)})`)
  // ids repetidos
  const ids = {}
  for (const e of document.querySelectorAll('[id]')) ids[e.id] = (ids[e.id] || 0) + 1
  for (const [k, v] of Object.entries(ids)) if (v > 1) add('falla', 'ids', `id "${k}" repetido ${v} veces (rompe aria-labelledby/controls)`)
  // a sin href con texto (parece enlace pero no es enfocable)
  for (const a of document.querySelectorAll('a:not([href])')) if (visible(a) && a.textContent.trim()) add('aviso', 'teclado', `<a> sin href "${a.textContent.trim().slice(0, 30)}" (no se alcanza con Tab)`)
  // tamaño de objetivo (WCAG 2.5.8: 24×24 mínimo, salvo enlaces dentro de un texto)
  const objetivos = [...document.querySelectorAll('button, a[href], input, select, textarea, [role=tab], [role=button], summary, label')].filter((x) => visible(x) && !oculto(x))
  for (const e of document.querySelectorAll('button, a[href], input[type=checkbox], input[type=radio], [role=tab], [role=button], summary, select')) {
    if (!visible(e) || oculto(e)) continue
    const obj = e.matches('input[type=checkbox], input[type=radio]') ? (e.closest('label') || e) : e
    const r = obj.getBoundingClientRect()
    const enTexto = e.tagName === 'A' && e.parentElement && /^(P|LI|SPAN|SMALL)$/.test(e.parentElement.tagName) && e.parentElement.textContent.trim().length > e.textContent.trim().length + 8
    if (!enTexto && (r.width < 24 || r.height < 24)) {
      // Excepción de espaciado (WCAG 2.5.8): pasa si un cuadrado de 24 px centrado en el objetivo no toca otro objetivo.
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2
      const vecino = objetivos.some((o) => {
        if (o === obj || o.contains(obj) || obj.contains(o)) return false
        const q = o.getBoundingClientRect()
        return q.width > 0 && Math.max(q.left, cx - 12) < Math.min(q.right, cx + 12) && Math.max(q.top, cy - 12) < Math.min(q.bottom, cy + 12)
      })
      add(vecino ? 'falla' : 'aviso', 'objetivo', `${desc(e)} "${nombre(e).slice(0, 30)}" mide ${Math.round(r.width)}×${Math.round(r.height)} (< 24×24; ${vecino ? 'con otro objetivo pegado' : 'pasa por espaciado'})`)
    }
  }
  // regiones vivas
  const vivas = document.querySelectorAll('[aria-live]:not([aria-live=off]), [role=status], [role=alert], [role=log]').length
  add('info', 'vivas', `${vivas} regiones que anuncian cambios (aria-live/status/alert)`)
  add('info', 'titulo', `título: "${document.title}" · h1: ${hs.filter((h, i) => niveles[i] === 1).map((h) => `"${h.textContent.trim().slice(0, 40)}"`).join(', ')}`)
  return out
}

// ---------------------------------------------------------------- teclado
async function recorridoTeclado(page, max = 90) {
  const out = []
  // Punto de partida: un centinela al inicio del body (no entra al orden de Tab).
  await page.evaluate(() => {
    window.scrollTo(0, 0)
    let s = document.getElementById('__inicio_a11y')
    if (!s) { s = document.createElement('span'); s.id = '__inicio_a11y'; s.tabIndex = -1; document.body.prepend(s) }
    s.focus()
  })
  const orden = []
  const vistos = new Set()
  for (let i = 0; i < max; i++) {
    await page.keyboard.press('Tab')
    await page.waitForTimeout(320) // deja terminar el desplazamiento suave del carrusel y las transiciones de 150–300 ms
    const info = await page.evaluate(async () => {
      const e = document.activeElement
      if (!e || e === document.body || e.id === '__inicio_a11y') return null
      const estilo = (x) => { const s = getComputedStyle(x); return [s.outlineStyle, s.outlineWidth, s.outlineColor, s.boxShadow, s.borderColor, s.backgroundColor, s.color, s.textDecorationLine].join('|') }
      const con = estilo(e)
      const nombre = (e.getAttribute('aria-label') || e.innerText || e.value || e.getAttribute('title') || e.getAttribute('placeholder') || '').trim().replace(/\s+/g, ' ').slice(0, 50)
      const clave = `${e.tagName}|${e.id}|${e.className}|${nombre}|${Math.round(e.getBoundingClientRect().top + scrollY)}`
      e.blur()
      await new Promise((r) => setTimeout(r, 380)) // las transiciones de borde/sombra duran 0,15–0,3 s: sin esperar, "sin foco" se lee igual que "con foco"
      const sin = estilo(e)
      e.focus({ preventScroll: true })
      // ¿Queda tapado por algo fijo/pegajoso? Cinco puntos dentro del elemento.
      const medir = () => {
        const r = e.getBoundingClientRect()
        const pts = [[0.5, 0.5], [0.15, 0.2], [0.85, 0.2], [0.15, 0.8], [0.85, 0.8]].map(([fx, fy]) => [r.left + r.width * fx, r.top + r.height * fy])
        let tapados = 0, fuera = 0, tapa = ''
        for (const [x, y] of pts) {
          if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) { fuera++; continue }
          const top = document.elementFromPoint(x, y)
          if (top && !(top === e || e.contains(top) || top.contains(e))) { tapados++; tapa = (top.closest('.nav-inferior, .barra, .barra-accion, header, nav') || top).className || top.tagName }
        }
        return { tapados, fuera, tapa, r }
      }
      let m = medir()
      // Un carrusel con desplazamiento suave tarda en traer el elemento: se vuelve a medir antes de darlo por tapado o fuera.
      if (m.tapados + m.fuera >= 2) { await new Promise((x) => setTimeout(x, 600)); m = medir() }
      const { tapados, fuera, tapa, r } = m
      return { clave, tag: e.tagName.toLowerCase(), nombre, indicador: con !== sin, tapados, fuera, tapa: String(tapa).slice(0, 40), top: Math.round(r.top), alto: innerHeight }
    })
    if (!info) continue
    if (vistos.has(info.clave)) break
    vistos.add(info.clave)
    orden.push(`${info.tag} "${info.nombre}"`)
    if (!info.indicador) out.push({ nivel: 'falla', regla: 'foco-visible', detalle: `${info.tag} "${info.nombre}" no cambia de aspecto al recibir el foco` })
    if (info.tapados + info.fuera >= 5) out.push({ nivel: 'falla', regla: 'foco-tapado', detalle: `${info.tag} "${info.nombre}" recibe el foco pero queda ${info.fuera >= 5 ? 'fuera de la pantalla' : 'tapado por ' + info.tapa}` })
    else if (info.tapados >= 2) out.push({ nivel: 'aviso', regla: 'foco-tapado', detalle: `${info.tag} "${info.nombre}" queda tapado en parte por ${info.tapa}` })
  }
  await page.evaluate(() => document.getElementById('__inicio_a11y')?.remove())
  if (orden.length && !/Saltar al contenido/i.test(orden[0])) out.push({ nivel: 'aviso', regla: 'saltar', detalle: `la primera parada no es "Saltar al contenido" sino ${orden[0]}` })
  out.push({ nivel: 'info', regla: 'orden', detalle: `${orden.length} paradas: ${orden.join(' → ').slice(0, 1500)}` })
  return out
}

// ---------------------------------------------------------------- contraste sobre píxeles reales
async function contrastePixeles(page) {
  const vp = page.viewportSize()
  const alto = await page.evaluate(() => { window.scrollTo(0, 0); return document.documentElement.scrollHeight })
  const h = Math.min(alto, 6000)
  await page.setViewportSize({ width: vp.width, height: h })
  await page.mouse.move(0, 0) // sin pasar el mouse por encima de nada (los hover cambian colores)
  await page.waitForTimeout(900) // transiciones y animaciones de entrada (0,15–0,3 s) terminadas
  const buf = await page.screenshot({ type: 'png' })
  const png = buf.toString('base64')
  const res = await page.evaluate(async (b64) => {
    const img = new Image(); img.src = `data:image/png;base64,${b64}`; await img.decode()
    const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height
    const cx = cv.getContext('2d', { willReadFrequently: true }); cx.drawImage(img, 0, 0)
    const escala = img.width / document.documentElement.clientWidth
    const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b) }
    const ratio = (a, b) => { const l1 = lum(a), l2 = lum(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05) }
    const parse = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p[3] ?? 1] }
    const out = []
    const vistos = new Set()
    const els = [...document.querySelectorAll('body *')].filter((e) => {
      if (e.closest('[aria-hidden="true"], .visualmente-oculto, svg, button:disabled, [disabled], [aria-disabled="true"], .saltar')) return false
      { const d = e.closest('details:not([open])'); if (d && !e.closest('summary')) return false }
      const s = getComputedStyle(e); const r = e.getBoundingClientRect()
      if (r.width < 2 || r.height < 2 || s.visibility === 'hidden' || s.display === 'none' || parseFloat(s.opacity) === 0) return false
      return [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1)
    })
    for (const e of els) {
      const s = getComputedStyle(e)
      const fg = parse(s.color); if (!fg) continue
      const rg = document.createRange(); rg.selectNodeContents(e)
      const cajas = [...rg.getClientRects()].filter((r) => r.width > 3 && r.height > 3)
      if (!cajas.length) continue
      // Muestras alrededor y dentro de las líneas de texto; el fondo es el color más frecuente que no se parece al del texto.
      const cuenta = new Map()
      for (const r of cajas.slice(0, 6)) {
        const x0 = Math.max(0, Math.floor((r.left - 2) * escala)), y0 = Math.max(0, Math.floor((r.top - 2) * escala))
        const w = Math.min(cv.width - x0, Math.ceil((r.width + 4) * escala)), hh = Math.min(cv.height - y0, Math.ceil((r.height + 4) * escala))
        if (w <= 0 || hh <= 0) continue
        const d = cx.getImageData(x0, y0, w, hh).data
        const paso = Math.max(1, Math.floor((w * hh) / 1500))
        for (let i = 0; i < w * hh; i += paso) {
          const k = i * 4; const c = [d[k], d[k + 1], d[k + 2]]
          const clave = c.map((v) => v >> 3).join(',')
          const prev = cuenta.get(clave); if (prev) prev.n++; else cuenta.set(clave, { n: 1, c })
        }
      }
      const texto = [fg[0], fg[1], fg[2]]
      const cand = [...cuenta.values()].filter((x) => ratio(x.c, texto) > 1.25).sort((a, b) => b.n - a.n)
      if (!cand.length) continue
      const bg = cand[0].c
      // Color de texto efectivo: si tiene transparencia, se mezcla con el fondo medido.
      const a = fg[3] * (parseFloat(s.opacity) || 1)
      const ef = texto.map((v, i) => Math.round(v * a + bg[i] * (1 - a)))
      const rt = ratio(ef, bg)
      const px = parseFloat(s.fontSize); const grueso = parseInt(s.fontWeight) >= 700
      const min = px >= 24 || (px >= 18.66 && grueso) ? 3 : 4.5
      if (rt < min) {
        const k = `${s.color}|${bg.join(',')}|${px}`
        if (vistos.has(k)) continue
        vistos.add(k)
        out.push({ texto: e.textContent.trim().replace(/\s+/g, ' ').slice(0, 40), ratio: Math.round(rt * 100) / 100, min, px, color: `rgb(${ef.join(',')})`, fondo: `rgb(${bg.join(',')})`, sel: `${e.tagName.toLowerCase()}${typeof e.className === 'string' && e.className.trim() ? '.' + e.className.trim().split(/\s+/)[0] : ''}` })
      }
    }
    // placeholders
    for (const i of document.querySelectorAll('input[placeholder], textarea[placeholder]')) {
      if (i.value) continue
      const r = i.getBoundingClientRect(); if (r.width < 2) continue
      const ph = parse(getComputedStyle(i, '::placeholder').color); if (!ph) continue
      const x = Math.floor((r.left + 3) * escala), y = Math.floor((r.top + 3) * escala)
      const d = cx.getImageData(x, y, 1, 1).data; const bg = [d[0], d[1], d[2]]
      const ef = [0, 1, 2].map((k) => Math.round(ph[k] * ph[3] + bg[k] * (1 - ph[3])))
      const rt = ratio(ef, bg)
      if (rt < 4.5) out.push({ texto: `(placeholder) ${i.placeholder.slice(0, 30)}`, ratio: Math.round(rt * 100) / 100, min: 4.5, px: parseFloat(getComputedStyle(i).fontSize), color: `rgb(${ef.join(',')})`, fondo: `rgb(${bg.join(',')})`, sel: 'input' })
    }
    return out
  }, png)
  await page.setViewportSize(vp)
  await page.waitForTimeout(200)
  // Evidencia: si hay fallas de contraste se guarda la captura sobre la que se midió (así se distingue una falla real de un artefacto de medición).
  if (res.length && globalThis.__rincon_id) { try { writeFileSync(`${CARPETA}/${globalThis.__rincon_id}-contraste-${vp.width}.png`, buf) } catch {} }
  return res
}

// ---------------------------------------------------------------- espaciado de texto (WCAG 1.4.12)
async function espaciado(page) {
  // La hoja lleva una marca propia: NUNCA se busca por contenido (el CSS de la app también usa letter-spacing: 0.12em).
  await page.evaluate(() => { const s = document.createElement('style'); s.dataset.a11yEspaciado = '1'; s.textContent = '* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; } p { margin-bottom: 2em !important; }'; document.head.append(s) })
  await page.waitForTimeout(300)
  const r = await page.evaluate(() => {
    const out = []
    for (const e of document.querySelectorAll('body *')) {
      const s = getComputedStyle(e); const rc = e.getBoundingClientRect()
      if (rc.width === 0 || s.display === 'none' || e.closest('.visualmente-oculto, [aria-hidden="true"]')) continue
      if (!(e.textContent || '').trim() || e.children.length > 2) continue
      const oculta = s.overflow === 'hidden' || s.overflowX === 'hidden' || s.overflowY === 'hidden' || s.textOverflow === 'ellipsis'
      if (oculta && (e.scrollWidth > e.clientWidth + 2 || e.scrollHeight > e.clientHeight + 2)) out.push(`"${e.textContent.trim().slice(0, 40)}" se corta (${e.tagName.toLowerCase()}.${String(e.className).split(' ')[0]})`)
    }
    if (document.scrollingElement.scrollWidth > document.documentElement.clientWidth + 1) out.push('aparece scroll horizontal')
    return out.slice(0, 8)
  })
  // Se quita el estilo para no contaminar lo que sigue.
  await page.evaluate(() => { for (const s of document.querySelectorAll('style[data-a11y-espaciado]')) s.remove() })
  await page.waitForTimeout(200)
  return r
}

/** Audita un rincón en los anchos pedidos. Guarda el árbol accesible a 375. */
export async function rinconA11y(page, id, rincon, { anchos = [320, 375, 1280], teclado = true } = {}) {
  globalThis.__rincon_id = id
  const previo = page.viewportSize()
  for (const w of anchos) {
    await page.setViewportSize({ width: w, height: w >= 1000 ? 800 : w >= 700 ? 1024 : 740 })
    await page.waitForTimeout(400)
    for (const x of await page.evaluate(ESTRUCTURA).catch((e) => [{ nivel: 'falla', regla: 'guion', detalle: String(e).slice(0, 120) }])) anotar(id, rincon, w, x.nivel, x.regla, x.detalle)
    for (const c of await contrastePixeles(page).catch(() => [])) anotar(id, rincon, w, 'falla', 'contraste', `"${c.texto}" ${c.ratio}:1 (mín ${c.min}, ${c.px}px) ${c.color} sobre ${c.fondo} [${c.sel}]`)
    if (teclado && (w === 375 || w === 1280)) for (const x of await recorridoTeclado(page)) anotar(id, rincon, w, x.nivel, x.regla, x.detalle)
    if (w === 320) for (const t of await espaciado(page)) anotar(id, rincon, w, 'aviso', 'espaciado', t)
    if (w === 375) {
      const yml = await page.locator('body').ariaSnapshot().catch((e) => `(sin árbol: ${e})`)
      writeFileSync(`${CARPETA}/${id}-aria.yml`, yml)
      await page.evaluate(() => window.scrollTo(0, 0)).catch(() => {})
      await page.screenshot({ path: `${CARPETA}/${id}-375.png`, fullPage: true }).catch(() => {})
    }
  }
  await page.setViewportSize(previo)
  await page.waitForTimeout(150)
  log(`a11y ${id} · ${rincon}`)
}

/** ¿El texto que aparece tras una acción lo anuncia un lector de pantalla (región viva, status o alert, o el foco)? */
export async function anunciado(page, id, rincon, texto) {
  const r = await page.evaluate((t) => {
    const todos = [...document.querySelectorAll('body *')].filter((e) => (e.textContent || '').includes(t))
    const e = todos[todos.length - 1]
    if (!e) return { hay: false }
    const viva = e.closest('[aria-live]:not([aria-live=off]), [role=status], [role=alert], [role=log]')
    const foco = document.activeElement && (document.activeElement === e || document.activeElement.contains(e) || e.contains(document.activeElement))
    return { hay: true, viva: !!viva, foco: !!foco, rol: viva ? (viva.getAttribute('role') || 'aria-live=' + viva.getAttribute('aria-live')) : '' }
  }, texto)
  if (!r.hay) anotar(id, rincon, 375, 'aviso', 'anuncio', `no apareció "${texto}"`)
  else if (!r.viva && !r.foco) anotar(id, rincon, 375, 'falla', 'anuncio', `"${texto}" aparece en pantalla pero el lector no lo anuncia (sin aria-live/status/alert ni foco)`)
  else anotar(id, rincon, 375, 'info', 'anuncio', `"${texto}" se anuncia (${r.viva ? r.rol : 'foco'})`)
}

/** Después de cambiar de pantalla: ¿dónde queda el foco? (en body, el lector no sabe que cambió la pantalla) */
export async function focoTrasNavegar(page, id, rincon) {
  await page.waitForTimeout(900)
  const r = await page.evaluate(() => { const e = document.activeElement; return e ? `${e.tagName.toLowerCase()}${e.id ? '#' + e.id : ''} "${(e.innerText || e.getAttribute('aria-label') || '').trim().slice(0, 40)}"` : 'nada' })
  anotar(id, rincon, 375, /^body/.test(r) ? 'aviso' : 'info', 'foco-pantalla', `al llegar, el foco queda en ${r}`)
}

export function guardarA11y(nombre = 'a11y') {
  writeFileSync(`${CARPETA}/${nombre}.json`, JSON.stringify(a11y, null, 1))
  return `${CARPETA}/${nombre}.json`
}
