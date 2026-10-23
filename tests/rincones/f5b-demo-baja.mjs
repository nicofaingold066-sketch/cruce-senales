// Fase 5b: continúa el demo de f5: baja simulada (con su confirmación), revisión, alternativa, Historial y panel del agente (sin llamarlo).
import { abrir, actor, BASE, rincon, nota, guardar, boton, esperarTexto, errores, CARPETA } from './lib.mjs'
import { leer, guardarSesion, rutaSesion } from './estado.mjs'
const g = leer()
const b = await abrir(); const t = await actor(b, 'tomi', { storageState: rutaSesion('tomi') })
const txt = async () => (await t.locator('main').innerText()).replace(/\s+/g, ' ').slice(0, 520)
const T = (ms = 1500) => t.waitForTimeout(ms)
const corto = async (id, f) => { try { await f() } catch (e) { nota(id, `ERROR DEL GUION: ${String(e).split('\n')[0].slice(0, 220)}`); await t.screenshot({ path: `${CARPETA}/${id}-error.png` }).catch(() => {}) } }
await t.goto(`${BASE}/#/e/${g.demoEspacio}`); await T(4000)
await t.getByText('Asado en casa de Tomi').first().click(); await T(3000)
await corto('R109', async () => {
  await t.getByRole('tab', { name: 'Simulación' }).click(); await T(1200)
  await boton(t, 'Se baja: Luna').click(); await T(500)
  await rincon(t, 'R109a', 'Demo: confirmación "¿Dar de baja a Luna?" en Simulación', { foco: true })
  await boton(t, 'Sí, Luna se baja').click(); await T(5000)
  await t.getByRole('tab', { name: 'Plan' }).click(); await T(1500)
  await rincon(t, 'R109', 'Demo: tras baja simulada de una confirmada (Plan)', { foco: true }); nota('R109', await txt())
})
await corto('R110', async () => {
  await t.getByRole('tab', { name: 'Simulación' }).click(); await T(1200)
  await boton(t, 'Se baja: Mati').click(); await T(500); await boton(t, 'Sí, Mati se baja').click(); await T(5000)
  await t.getByRole('tab', { name: 'Plan' }).click(); await T(1500)
  await rincon(t, 'R110', 'Demo: EN REVISIÓN tras segunda baja simulada', { foco: true }); nota('R110', await txt())
  await boton(t, 'Buscar alternativa').click(); await T(6000)
  await rincon(t, 'R111', 'Demo: resultado de Buscar alternativa', { foco: true }); nota('R111', await txt())
})
await corto('R112', async () => {
  await t.getByRole('tab', { name: 'Historial' }).click(); await T(1500)
  await rincon(t, 'R112', 'Demo: Historial con acciones Simulación'); nota('R112', await txt())
})
await corto('R113', async () => {
  await t.goto(`${BASE}/#/e/${g.demoEspacio}`); await T(3500)
  await t.locator('details.agente-plegable summary').click(); await T(3500)
  await rincon(t, 'R113', 'Demo: Agente del círculo abierto (organizador, sin llamar al agente)', { foco: false }); nota('R113', (await t.locator('details.agente-plegable').innerText()).replace(/\s+/g, ' ').slice(0, 700))
})
console.log('ERRORES', JSON.stringify(errores)); console.log(guardar('f5b')); await b.close()
