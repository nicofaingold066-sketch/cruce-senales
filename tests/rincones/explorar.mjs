// Utilidad: abre una ruta y vuelca texto, controles y errores. Uso: node explorar.mjs <ruta-hash> [ancho]
import { abrir, actor, BASE, errores } from './lib.mjs'
const ruta = process.argv[3] ?? ''
const b = await abrir()
const p = await actor(b, 'explorador')
await p.setViewportSize({ width: Number(process.argv[4] ?? 375), height: 812 })
await p.goto(`${BASE}/${ruta}`)
await p.waitForTimeout(4500)
console.log('URL', p.url())
console.log((await p.locator('body').innerText()).slice(0, 2500))
console.log('--- controles')
for (const e of await p.locator('button, a[href], input, select, textarea, [role=tab]').all()) {
  console.log(await e.evaluate((x) => `${x.tagName.toLowerCase()}[${x.type || x.getAttribute('role') || ''}] "${(x.getAttribute('aria-label') || x.innerText || x.placeholder || '').trim().slice(0, 50)}" href=${x.getAttribute('href') || ''}`))
}
console.log('--- errores', JSON.stringify(errores))
await p.screenshot({ path: '/private/tmp/claude-502/-Users-macair-cruse-cruce-rincones/6e1da67c-8fb8-4110-8856-ed3d6f02ca66/scratchpad/explora.png', fullPage: true })
await b.close()
