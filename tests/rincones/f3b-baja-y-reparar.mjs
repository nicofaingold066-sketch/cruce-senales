// Fase 3b (continuación de f3 desde la baja): sobre la propuesta con v1 publicada (f2): vistas de cada persona, confirmación, grupo confirmado, baja, revisión,
// reparación a v2, y segunda propuesta (sin opción y cancelada).
import { abrir, actor, BASE, rincon, nota, guardar, log, boton, esperarTexto, errores, CARPETA } from './lib.mjs'
import { leer, escribir, guardarSesion, rutaSesion } from './estado.mjs'
const g = leer()
const b = await abrir()
const P = {}
for (const n of ['org', 'ana', 'beto', 'caro']) P[n] = await actor(b, n, { storageState: rutaSesion(n) })
const urlP = `${BASE}/#/e/${g.espacioId}/p/${g.propuestaId}`
const txt = async (p) => (await p.locator('main').innerText()).replace(/\s+/g, ' ').slice(0, 520)
const T = (p, ms = 1500) => p.waitForTimeout(ms)
const corto = async (id, p, f) => { try { await f() } catch (e) { nota(id, `ERROR DEL GUION: ${String(e).split('\n')[0].slice(0, 220)}`); await p.screenshot({ path: `${CARPETA}/${id}-error.png` }).catch(() => {}) } }
const pestana = async (p, n) => { await p.getByRole('tab', { name: n }).click(); await T(p, 1500) }
for (const n of Object.keys(P)) { await P[n].goto(urlP); await T(P[n], 3500) }

for (const n of Object.keys(P)) { await P[n].goto(urlP); await T(P[n], 3500) }
// Baja: Ana se baja (queda 1 de 2 mínimo) → en revisión
await corto('R60', P.ana, async () => {
  await pestana(P.ana, 'Mi respuesta')
  await rincon(P.ana, 'R60', 'Mi respuesta de Ana, ya confirmada (antes de bajarse)'); nota('R60', await txt(P.ana))
  await boton(P.ana, 'Retirarme de esta propuesta').click(); await T(P.ana, 800)
  await rincon(P.ana, 'R61', 'Confirmación antes de "No voy" (baja definitiva)', { foco: true }); nota('R61', await txt(P.ana))
})
// cancelar la confirmación primero para probar el "volver"
await corto('R61b', P.ana, async () => {
  await boton(P.ana, 'Volver').click(); await T(P.ana, 600)
  nota('R61b', 'tras Volver, reaparece "Retirarme de esta propuesta": ' + (await boton(P.ana, 'Retirarme de esta propuesta').count() > 0))
  await boton(P.ana, 'Retirarme de esta propuesta').click(); await T(P.ana, 500)
  await boton(P.ana, 'Sí, no voy').click()
  await T(P.ana, 4000)
  await rincon(P.ana, 'R62', 'Después de bajarse: vista de Ana', { foco: false }); nota('R62', await txt(P.ana))
})
await corto('R63', P.org, async () => {
  await P.org.reload(); await T(P.org, 3500)
  await rincon(P.org, 'R63', 'EN REVISIÓN tras la baja: vista del organizador (Buscar alternativa)', { foco: true }); nota('R63', await txt(P.org))
})
await corto('R64', P.beto, async () => { await P.beto.reload(); await T(P.beto, 3500); await rincon(P.beto, 'R64', 'EN REVISIÓN: vista de Beto (no organizador)'); nota('R64', await txt(P.beto)) })
// Reparar
await corto('R65', P.org, async () => {
  await boton(P.org, 'Buscar alternativa').click(); await T(P.org, 5500)
  await rincon(P.org, 'R65', 'Versión 2 publicada tras reparar: vista del organizador (comparación v1→v2)', { foco: true }); nota('R65', await txt(P.org))
})
await corto('R66', P.beto, async () => {
  await P.beto.reload(); await T(P.beto, 3500)
  await rincon(P.beto, 'R66', 'v2: vista de Beto (ahora elegible, le toca confirmar)', { foco: true }); nota('R66', await txt(P.beto))
})
await corto('R67', P.ana, async () => {
  await P.ana.reload(); await T(P.ana, 3500)
  await rincon(P.ana, 'R67', 'v2: vista de Ana (se bajó; no puede volver)'); nota('R67', await txt(P.ana))
})
for (const [n, id] of [['beto', 'R68'], ['caro', 'R69'], ['org', 'R70']]) {
  await corto(id, P[n], async () => {
    await P[n].reload(); await T(P[n], 3000)
    await boton(P[n], 'Confirmar versión 2').click(); await esperarTexto(P[n], 'Ya confirmaste la versión 2', 20000); await T(P[n], 2000)
    if (n === 'org') { await rincon(P[n], id, 'Grupo CONFIRMADO v2 (después de reparar): vista del organizador', { foco: true }); nota(id, await txt(P[n])) }
  })
}
for (const n of Object.keys(P)) await guardarSesion(P[n])
console.log('ERRORES', JSON.stringify(errores))
console.log(guardar('f3'))
await b.close()
