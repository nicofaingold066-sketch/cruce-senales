// Re-revisión de la pestaña Simulación del demo con los chequeos de recorte (vertical y pestañas) en los 4 anchos.
import { abrir, actor, BASE, rincon, nota, guardar, errores } from './lib.mjs'
import { leer, rutaSesion } from './estado.mjs'
const g = leer(); const b = await abrir(); const t = await actor(b, 'tomi', { storageState: rutaSesion('tomi') })
await t.goto(`${BASE}/#/e/${g.demoEspacio}`); await t.waitForTimeout(3500)
await t.getByText('Asado en casa de Tomi').first().click(); await t.waitForTimeout(3000)
await t.getByRole('tab', { name: 'Simulación' }).click(); await t.waitForTimeout(1500)
await rincon(t, 'R104b', 'Demo: Simulación en los 4 anchos (con chequeos de recorte)')
await t.getByRole('tab', { name: 'Plan' }).click(); await t.waitForTimeout(1200)
await rincon(t, 'R104c', 'Demo: Plan con las 4 pestañas (incluye Simulación)')
console.log(guardar('f5c')); await b.close()
