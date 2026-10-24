// Fase 8: agente del círculo en un grupo real: preferencias de Ana y del organizador, UNA llamada a "Que el agente proponga"
// (sin clima simulado: no es demo), "Usar esta opción". Sin clave del modelo o con ella: se anota qué fuente respondió.
import { abrir, actor, BASE, rincon, nota, guardar, boton, esperarTexto, errores, CARPETA } from './lib.mjs'
import { rinconA11y, guardarA11y } from './a11y.mjs'
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
// v13: "Que el agente arme un plan" (con herramientas) y "Lo que hizo el agente": UNA llamada, textos fijos del servidor sin nombres
await corto('R156', o, async () => {
  await abrirAgente(o)
  const arme = o.getByRole('button', { name: 'Que el agente arme un plan' })
  nota('R156', 'botón "Que el agente arme un plan": ' + await arme.count())
  if (await arme.count()) {
    await arme.click(); await T(o, 1500)
    await rincon(o, 'R156', 'Agente v13: "El agente está pensando…" (arme un plan)', { anchos: [{ n: '375', w: 375, h: 812 }] })
    await o.getByText(/Lo que hizo el agente|No se pudo|no pudo/i).first().waitFor({ timeout: 90000 }).catch(() => {}); await T(o, 1500)
    await rincon(o, 'R157', 'Agente v13: resultado de "arme un plan" y "Lo que hizo el agente"', { foco: true })
    await rinconA11y(o, 'R157', 'Agente v13: resultado (accesibilidad)', { anchos: [320, 375] })
    const t = await txt(o, 'details.agente-plegable')
    nota('R157', t.slice(0, 900))
    const hizo = t.match(/Lo que hizo el agente[^]{0,500}/)?.[0] ?? ''
    nota('R157', '¿nombres de integrantes en "Lo que hizo el agente"?: ' + /(Ana|Beto|Caro|Rincon Org)/.test(hizo))
  }
})
console.log('ERRORES', JSON.stringify(errores)); console.log(guardar('f8')); console.log(guardarA11y('a11y-f8')); await b.close()
