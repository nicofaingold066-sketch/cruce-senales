// Fase 8: agente del círculo en un grupo real: preferencias de Ana y del organizador, UNA llamada a "Que el agente proponga"
// (sin clima simulado: no es demo), "Usar esta opción". Sin clave del modelo o con ella: se anota qué fuente respondió.
import { abrir, actor, BASE, rincon, nota, guardar, boton, esperarTexto, errores, CARPETA } from './lib.mjs'
import { leer, guardarSesion, rutaSesion } from './estado.mjs'
const g = leer()
const b = await abrir()
const txt = async (p, sel = 'main') => (await p.locator(sel).innerText()).replace(/\s+/g, ' ').slice(0, 900)
const T = (p, ms = 1500) => p.waitForTimeout(ms)
const corto = async (id, p, f) => { try { await f() } catch (e) { nota(id, `ERROR DEL GUION: ${String(e).split('\n')[0].slice(0, 220)}`); await p.screenshot({ path: `${CARPETA}/${id}-error.png` }).catch(() => {}) } }
const abrirAgente = async (p) => { await p.goto(`${BASE}/#/e/${g.espacioId}`); await T(p, 3500); await p.locator('details.agente-plegable summary').click(); await T(p, 3500) }
const prefs = async (p, acts) => { for (const a of acts) await p.locator('.agente-plegable label', { hasText: new RegExp(`^\\s*${a}\\s*$`) }).first().click(); await p.getByRole('button', { name: /(Guardar|Actualizar) mis preferencias/ }).click(); await T(p, 3000) }
const ana = await actor(b, 'ana', { storageState: rutaSesion('ana') })
await corto('R150', ana, async () => {
  await abrirAgente(ana); await rincon(ana, 'R150', 'Agente: preferencias de una invitada (sin guardar)', { foco: false })
  await prefs(ana, ['Pádel', 'Asado'])
  await rincon(ana, 'R151', 'Agente: preferencias guardadas por Ana'); nota('R151', await txt(ana, 'details.agente-plegable'))
})
const o = await actor(b, 'org', { storageState: rutaSesion('org') })
await corto('R152', o, async () => {
  await abrirAgente(o); await prefs(o, ['Pádel'])
  await rincon(o, 'R152', 'Agente: preferencias del organizador guardadas; botón "Que el agente proponga" visible'); nota('R152', await txt(o, 'details.agente-plegable'))
})
await corto('R153', o, async () => {
  await boton(o, 'Que el agente proponga').click(); await T(o, 1200)
  await rincon(o, 'R153', 'Agente: "El agente está pensando…"', { anchos: [{ n: '375', w: 375, h: 812 }] })
  await o.getByText(/Usar esta opción/).first().waitFor({ timeout: 60000 }).catch(() => {}); await T(o, 1500)
  await rincon(o, 'R154', 'Agente: resultado (candidatas, clima, mensaje para el grupo)', { foco: true }); nota('R154', await txt(o, 'details.agente-plegable'))
})
await corto('R155', o, async () => {
  const usar = o.getByRole('button', { name: 'Usar esta opción' })
  if (await usar.count()) { await usar.click(); await o.waitForURL(/\/nueva/, { timeout: 15000 }); await T(o, 2500); await rincon(o, 'R155', 'Nueva propuesta precargada desde el agente'); nota('R155', await txt(o)) }
})
console.log('ERRORES', JSON.stringify(errores)); console.log(guardar('f8')); await b.close()
