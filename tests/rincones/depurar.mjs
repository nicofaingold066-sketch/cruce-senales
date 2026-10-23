// Depuración: imprime los pares de textos que la auditoría ve encimados en la página actual. Uso: node depurar.mjs <actor> <hash>
import { abrir, actor, BASE } from './lib.mjs'
import { rutaSesion } from './estado.mjs'
const [quien, hash, ancho = '375'] = process.argv.slice(2)
const b = await abrir(); const p = await actor(b, quien, { storageState: rutaSesion(quien) })
await p.setViewportSize({ width: Number(ancho), height: 812 })
await p.goto(`${BASE}/${hash}`); await p.waitForTimeout(4000)
const r = await p.evaluate(() => {
  const out = []
  const visible = (e) => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' }
  const hojas = [...document.querySelectorAll('main *')].filter((e) => visible(e) && !e.closest('.visualmente-oculto') && [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1))
  const info = hojas.map((e) => { const rg = document.createRange(); rg.selectNodeContents(e); return { e, rs: [...rg.getClientRects()].filter((r) => r.width > 4 && r.height > 4) } })
  for (let i = 0; i < info.length; i++) for (let j = i + 1; j < info.length; j++) {
    const a = info[i], c = info[j]; if (a.e.contains(c.e) || c.e.contains(a.e)) continue
    for (const ra of a.rs) for (const rb of c.rs) {
      const w = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left), h = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top)
      if (w > 6 && h > Math.min(ra.height, rb.height) * 0.4) out.push(`"${a.e.textContent.trim().slice(0, 30)}" [${Math.round(ra.left)},${Math.round(ra.top)},${Math.round(ra.width)}x${Math.round(ra.height)}] vs "${c.e.textContent.trim().slice(0, 30)}" [${Math.round(rb.left)},${Math.round(rb.top)},${Math.round(rb.width)}x${Math.round(rb.height)}] pos ${getComputedStyle(a.e).position}/${getComputedStyle(c.e).position}`)
    }
  }
  return out
})
console.log(r.join('\n') || 'sin choques'); await b.close()
