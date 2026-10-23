// Arma una hoja de contacto con los 4 anchos de cada rincón. Uso: node contacto.mjs <carpeta> <id> [id...]
import { abrir } from './lib.mjs'
import { readFileSync } from 'node:fs'
const [carpeta, ...ids] = process.argv.slice(2)
const b = await abrir(); const p = await (await b.newContext({ viewport: { width: 1500, height: 1000 } })).newPage()
for (const id of ids) {
  const img = (n, h) => { try { return `<div><small>${n}</small><img style="height:${h}px;display:block" src="data:image/png;base64,${readFileSync(`${carpeta}/${id}-${n}.png`).toString('base64')}"></div>` } catch { return '' } }
  await p.setContent(`<body style="margin:6px;background:#888;font:12px sans-serif;color:#fff"><div style="display:flex;gap:8px;align-items:flex-start">${img('320', 900)}${img('375', 900)}${img('768', 500)}${img('1280', 330)}</div></body>`)
  await p.waitForTimeout(300)
  await p.screenshot({ path: `${carpeta}/${id}-hoja.png`, fullPage: true })
}
await b.close()
