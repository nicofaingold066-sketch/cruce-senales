// Auditoría de la galería de piezas de ux-flujo (src/componentes-nuevos/prueba/galeria.html, sin red ni base):
// página entera en 320/375/768/1280 con la auditoría visual y el módulo de accesibilidad, una captura por sección,
// el texto de cada caso (tono y erratas) y todos los enlaces (que no lleven nombres de personas).
// Uso: node galeria-ux.mjs http://localhost:4199/src/componentes-nuevos/prueba/galeria.html
import { abrir, actor, BASE, rincon, nota, guardar, errores, CARPETA, log } from './lib.mjs'
import { rinconA11y, guardarA11y } from './a11y.mjs'
import { writeFileSync } from 'node:fs'
const b = await abrir(); const p = await actor(b, 'galeria')
const red = []
p.on('request', (r) => { const u = r.url(); if (!u.startsWith('http://localhost')) red.push(`${r.method()} ${new URL(u).host}${new URL(u).pathname.slice(0, 40)}`) })
// Los errores de consola traen la URL del recurso (los pedidos del navegador, como el favicon, no pasan por los eventos de red de la página).
p.on('console', (m) => { if (m.type() === 'error') nota('G00', `consola: ${m.text().slice(0, 80)} ← ${(m.location().url || '').replace('http://localhost:4199', '') || '(sin url)'}`) })
await p.goto(BASE); await p.waitForTimeout(2500)
nota('G00', `pedidos fuera de localhost al cargar: ${red.length ? red.join(' · ') : 'ninguno'}`)
await rincon(p, 'G00', 'Galería ux-flujo: página entera (auditoría visual)', { foco: false })
await rinconA11y(p, 'G00', 'Galería ux-flujo: página entera (accesibilidad)')
// Secciones y casos
const secciones = await p.locator('section[aria-labelledby]').all()
let salida = `# Galería ux-flujo (${BASE}) · ${new Date().toLocaleString('es-CL', { timeZone: 'America/Santiago' })}\n`
for (const w of [375, 320]) {
  await p.setViewportSize({ width: w, height: 900 }); await p.waitForTimeout(300)
  for (const s of secciones) {
    const id = await s.getAttribute('aria-labelledby')
    await s.scrollIntoViewIfNeeded(); await p.waitForTimeout(150)
    await s.screenshot({ path: `${CARPETA}/${id}-${w}.png` }).catch((e) => nota(id, `captura ${w}: ${String(e).slice(0, 80)}`))
    if (w === 375) {
      const titulo = (await s.locator('h2').first().innerText()).trim()
      salida += `\n## ${titulo} (${id})\n`
      const casos = await s.locator(':scope > div, :scope > article, :scope > section').all()
      for (const c of casos.length ? casos : [s]) {
        const t = (await c.innerText()).replace(/\s+/g, ' ').trim()
        salida += `- ${t.slice(0, 700)}\n`
      }
      for (const a of await s.locator('a[href], button').all()) {
        const href = await a.getAttribute('href'); const txt = (await a.innerText()).replace(/\s+/g, ' ').trim()
        const al = await a.getAttribute('aria-label')
        salida += `  · ${href ? 'enlace' : 'botón'} "${txt || al || '(sin texto)'}"${al && txt ? ` [aria-label: ${al}]` : ''}${href ? ` → ${decodeURIComponent(href).slice(0, 260)}` : ''}\n`
      }
    }
  }
}
writeFileSync(`${CARPETA}/galeria-texto.md`, salida)
log(`${secciones.length} secciones; texto en ${CARPETA}/galeria-texto.md`)
console.log('ERRORES', JSON.stringify(errores).slice(0, 400))
console.log(guardar('galeria')); console.log(guardarA11y('a11y-galeria')); await b.close()
