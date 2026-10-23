// Fila de capturas de un mismo ancho. Uso: node fila.mjs <ancho> <salida.png> <carpeta:id> [carpeta:id...]  (usa <id>-<ancho>-ini.png)
import { abrir } from './lib.mjs'
import { readFileSync, existsSync } from 'node:fs'
const [ancho, out, ...pares] = process.argv.slice(2)
const b = await abrir(); const p = await (await b.newContext({ viewport: { width: 1900, height: 700 } })).newPage()
const imgs = pares.map((x) => { const [c, id] = x.split(':'); const f = `/Users/macair/cruse/rincones-capturas/${c}/${id}-${ancho}${process.env.SUF ?? '-ini'}.png`; return existsSync(f) ? `<div><small>${id}</small><img style="height:${process.env.ALTO ?? 640}px;display:block" src="data:image/png;base64,${readFileSync(f).toString('base64')}"></div>` : '' }).join('')
await p.setContent(`<body style="margin:4px;background:#777;font:11px sans-serif;color:#fff"><div style="display:flex;gap:6px">${imgs}</div></body>`)
await p.screenshot({ path: out, fullPage: true }); await b.close()
