// Fase 3: sobre la propuesta con v1 publicada (f2): vistas de cada persona, confirmación, grupo confirmado, baja, revisión,
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

// Vistas de v1
await corto('R51', P.ana, async () => { await rincon(P.ana, 'R51', 'v1 publicada: vista de Ana (elegible, le toca confirmar)', { foco: true }); nota('R51', await txt(P.ana)) })
await corto('R52', P.beto, async () => { await rincon(P.beto, 'R52', 'v1 publicada: vista de Beto (NO elegible en la franja A)', { foco: true }); nota('R52', await txt(P.beto)) })
await corto('R53', P.beto, async () => { await pestana(P.beto, 'Mi respuesta'); await rincon(P.beto, 'R53', 'v1 publicada: Mi respuesta de Beto (no elegible)'); nota('R53', await txt(P.beto)); await pestana(P.beto, 'Historial'); await rincon(P.beto, 'R54', 'Historial con v1 publicada'); nota('R54', await txt(P.beto)); await pestana(P.beto, 'Plan') })

// Confirmaciones
await corto('R55', P.ana, async () => {
  await boton(P.ana, 'Confirmar versión 1').click(); await esperarTexto(P.ana, 'Ya confirmaste la versión 1', 20000); await T(P.ana, 1500)
  await rincon(P.ana, 'R55', 'Ana confirmó v1 (falta el imprescindible)', { foco: true }); nota('R55', await txt(P.ana))
})
await corto('R56', P.org, async () => {
  await P.org.reload(); await T(P.org, 3500)
  await boton(P.org, 'Confirmar versión 1').click(); await esperarTexto(P.org, 'Ya confirmaste la versión 1', 20000); await T(P.org, 2000)
  await rincon(P.org, 'R56', 'Grupo CONFIRMADO v1: vista del organizador (¡Se juntan!, confeti, calendario)', { foco: true }); nota('R56', await txt(P.org))
})
await corto('R57', P.ana, async () => { await P.ana.reload(); await T(P.ana, 3500); await rincon(P.ana, 'R57', 'Grupo CONFIRMADO v1: vista de Ana'); nota('R57', await txt(P.ana)) })
await corto('R58', P.caro, async () => { await P.caro.reload(); await T(P.caro, 3500); await rincon(P.caro, 'R58', 'Grupo CONFIRMADO v1: vista de Caro (no entró en v1)'); nota('R58', await txt(P.caro)) })
// Calendario (.ics)
await corto('R59', P.org, async () => {
  const [d] = await Promise.all([P.org.waitForEvent('download', { timeout: 8000 }).catch(() => null), P.org.getByRole('button', { name: /calendario/i }).first().click().catch(() => {})])
  nota('R59', 'botón Calendario → descarga: ' + (d ? d.suggestedFilename() : 'no hubo descarga'))
})

// Baja: Ana se baja (queda 1 de 2 mínimo) → en revisión
await corto('R60', P.ana, async () => {
  await pestana(P.ana, 'Mi respuesta')
  await rincon(P.ana, 'R60', 'Mi respuesta de Ana, ya confirmada (antes de bajarse)'); nota('R60', await txt(P.ana))
  await P.ana.getByRole('button', { name: /No voy|Bajarme|Me bajo/ }).first().click(); await T(P.ana, 800)
  await rincon(P.ana, 'R61', 'Confirmación antes de "No voy" (baja definitiva)', { foco: true }); nota('R61', await txt(P.ana))
})
// cancelar la confirmación primero para probar el "volver"
await corto('R61b', P.ana, async () => {
  const cancelar = P.ana.getByRole('button', { name: /Cancelar|Volver|Mejor no/ }).first()
  nota('R61b', 'botón para arrepentirse visible: ' + (await cancelar.count() > 0))
  await cancelar.click(); await T(P.ana, 600)
  await P.ana.getByRole('button', { name: /No voy|Bajarme|Me bajo/ }).first().click(); await T(P.ana, 500)
  await P.ana.getByRole('button', { name: /Sí, me bajo|Confirmar baja|Bajarme definitivamente|Sí, no voy/ }).first().click()
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
