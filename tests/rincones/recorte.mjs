// Recorta una zona de una captura y la amplía. Uso: node recorte.mjs <png> <x> <y> <w> <h> <salida.png>
import { abrir } from './lib.mjs'
import { readFileSync } from 'node:fs'
const [png, x, y, w, h, out] = process.argv.slice(2)
const b = await abrir(); const p = await (await b.newContext({ viewport: { width: Number(w) * 2, height: Number(h) * 2 } })).newPage()
await p.setContent(`<body style="margin:0;overflow:hidden"><div style="width:${w * 2}px;height:${h * 2}px;overflow:hidden;position:relative"><img style="position:absolute;left:${-x * 2}px;top:${-y * 2}px;width:auto;zoom:2;image-rendering:pixelated" src="data:image/png;base64,${readFileSync(png).toString('base64')}"></div></body>`)
await p.screenshot({ path: out }); await b.close()
