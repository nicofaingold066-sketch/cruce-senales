// Re-revisión de O-02, O-06 y O-08 contra un build de wip/friccion (CRUXE_URL=http://localhost:4197).
import { abrir, actor, BASE, rincon, nota, guardar, errores } from './lib.mjs'
import { leer, rutaSesion } from './estado.mjs'
const g = leer(); const b = await abrir()
const txt = async (p) => (await p.locator('main').innerText()).replace(/\s+/g, ' ').slice(0, 450)
const p = await actor(b, 'f0')
await p.goto(`${BASE}/#/unirse/ZZZZ9999`); await p.waitForTimeout(4000); nota('R04', await txt(p)); await rincon(p, 'R04', 'Enlace con código inexistente (re-revisión)')
await p.goto(`${BASE}/#/e/no-es-uuid`); await p.waitForTimeout(4500); nota('R07b', await txt(p)); await rincon(p, 'R07b', 'Espacio con id que no es uuid (re-revisión)')
const d = await actor(b, 'dani', { storageState: rutaSesion('dani') })
await d.goto(`${BASE}/#/unirse/${g.codigo}`); await d.waitForTimeout(4500); nota('R123', await txt(d)); await rincon(d, 'R123', 'Enlace abierto en un navegador que ya es miembro (re-revisión)', { foco: true })
console.log(JSON.stringify(errores)); console.log(guardar('reverificar-friccion')); await b.close()
