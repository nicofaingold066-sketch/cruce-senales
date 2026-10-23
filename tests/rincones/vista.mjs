// Capturas de viewport real a varias posiciones de scroll. Uso: node vista.mjs <actor> <hash> <ancho> <salida-prefijo> [scrolls...]
import { abrir, actor, BASE } from './lib.mjs'
import { rutaSesion } from './estado.mjs'
const [quien, hash, ancho, pre, ...sc] = process.argv.slice(2)
const b = await abrir(); const p = await actor(b, quien, { storageState: rutaSesion(quien) })
await p.setViewportSize({ width: Number(ancho), height: 812 })
await p.goto(`${BASE}/${hash}`); await p.waitForTimeout(4500)
for (const y of (sc.length ? sc : ['0'])) { await p.evaluate((y) => window.scrollTo(0, Number(y)), y); await p.waitForTimeout(400); await p.screenshot({ path: `${pre}-${y}.png` }) }
await b.close()
