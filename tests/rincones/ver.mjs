// Vuelca el texto de una pantalla con la sesión de un actor. Uso: node ver.mjs <actor> <hash> [pestaña]
import { abrir, actor, BASE } from './lib.mjs'
import { rutaSesion, leer } from './estado.mjs'
const [quien, hash, tab] = process.argv.slice(2)
const b = await abrir(); const p = await actor(b, quien, { storageState: rutaSesion(quien) })
await p.goto(`${BASE}/${hash}`); await p.waitForTimeout(4500)
if (tab) { await p.getByRole('tab', { name: tab }).click(); await p.waitForTimeout(1500) }
console.log((await p.locator('main').innerText()).replace(/\n+/g, ' | ').slice(0, 1800)); await b.close()
