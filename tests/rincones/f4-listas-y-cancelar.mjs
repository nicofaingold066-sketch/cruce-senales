// Fase 4: Inicio/Planes/Perfil con grupos y planes en distintos estados; segunda propuesta: sin opción y cancelada.
import { abrir, actor, BASE, rincon, nota, guardar, log, boton, esperarTexto, errores, CARPETA, revisar } from './lib.mjs'
import { leer, escribir, guardarSesion, rutaSesion } from './estado.mjs'
const g = leer()
const b = await abrir()
const o = await actor(b, 'org', { storageState: rutaSesion('org') })
const c = await actor(b, 'caro', { storageState: rutaSesion('caro') })
const txt = async (p) => (await p.locator('main').innerText()).replace(/\s+/g, ' ').slice(0, 520)
const T = (p, ms = 1500) => p.waitForTimeout(ms)
const corto = async (id, p, f) => { try { await f() } catch (e) { nota(id, `ERROR DEL GUION: ${String(e).split('\n')[0].slice(0, 220)}`); await p.screenshot({ path: `${CARPETA}/${id}-error.png` }).catch(() => {}) } }
for (const [id, h, n, foco] of [['R80', '#/', 'Portada con grupo y plan confirmado (tarjeta "Tu plan")', true], ['R81', '#/planes', 'Planes con un plan confirmado', true], ['R82', '#/perfil', 'Perfil con un grupo', true]]) {
  await corto(id, o, async () => { await o.goto(`${BASE}/${h}`); await T(o, 4200); await rincon(o, id, n, { foco }); nota(id, await txt(o)) })
}
// Segunda propuesta (sin respuestas): no hay opción
await corto('R83', o, async () => {
  await o.goto(`${BASE}/#/e/${g.espacioId}`); await T(o, 3500)
  await rincon(o, 'R83', 'Espacio con una propuesta confirmada (lista de planes)', { foco: true }); nota('R83', await txt(o))
  await o.getByRole('link', { name: /Nueva propuesta/ }).click(); await T(o, 2500)
  await o.getByLabel('Propósito de la propuesta').fill('Cine el viernes'); await revisar(o); await T(o, 800)
  await boton(o, 'Crear y abrir al grupo').click(); await o.waitForURL(/\/p\//, { timeout: 30000 }); await T(o, 3500)
  escribir({ propuesta2: o.url().split('/p/')[1] })
  await rincon(o, 'R84', 'Segunda propuesta abierta, nadie respondió (Buscar opción aún no sale)'); nota('R84', await txt(o))
})
// Una sola persona con condiciones → no alcanza el mínimo
await corto('R85', o, async () => {
  await o.getByRole('tab', { name: 'Mi respuesta' }).click(); await T(o, 1500)
  for (const f of ['A', 'B']) await o.locator('fieldset', { hasText: `Franja ${f}` }).getByText('No puedo', { exact: true }).click()
  await boton(o, 'Guardar condiciones').click(); await esperarTexto(o, 'Guardado', 15000)
  await o.getByRole('tab', { name: 'Plan' }).click(); await T(o, 1500)
  await rincon(o, 'R85', 'Segunda propuesta: organizador dijo No a todo'); nota('R85', await txt(o))
  const buscar = o.getByRole('button', { name: /opción|Buscar/i }).first()
  nota('R85', 'botón de buscar visible: ' + (await buscar.count() > 0))
})
await corto('R86', c, async () => {
  await c.goto(`${BASE}/#/e/${g.espacioId}`); await T(c, 3500)
  await c.getByText('Cine el viernes').first().click(); await T(c, 3000)
  await c.getByRole('tab', { name: 'Mi respuesta' }).click(); await T(c, 1200)
  for (const f of ['A', 'B']) await c.locator('fieldset', { hasText: `Franja ${f}` }).getByText('No puedo', { exact: true }).click()
  await boton(c, 'Guardar condiciones').click(); await esperarTexto(c, 'Guardado', 15000)
})
await corto('R87', o, async () => {
  await o.reload(); await T(o, 3500)
  const buscar = o.getByRole('button', { name: /Buscar una opción|Buscar opción|opción compatible/i }).first()
  nota('R87', 'botón buscar (2 con condiciones, todos No): ' + (await buscar.count()))
  await buscar.click(); await T(o, 5000)
  await rincon(o, 'R87', 'SIN OPCIÓN compatible: resultado tras buscar', { foco: true }); nota('R87', await txt(o))
})
// Cancelar
await corto('R88', o, async () => {
  await boton(o, 'Cancelar propuesta').click(); await T(o, 800)
  await rincon(o, 'R88', 'Confirmación de cancelar propuesta', { foco: true }); nota('R88', await txt(o))
  const si = o.getByRole('button', { name: /Sí, cancelar|Cancelar propuesta/ }).last()
  await si.click(); await T(o, 4000)
  await rincon(o, 'R89', 'Propuesta CANCELADA, vista organizador', { foco: true }); nota('R89', await txt(o))
})
await corto('R90', c, async () => { await c.reload(); await T(c, 3500); await rincon(c, 'R90', 'Propuesta CANCELADA, vista de invitada'); nota('R90', await txt(c)); await c.goto(`${BASE}/#/planes`); await T(c, 3500); await rincon(c, 'R91', 'Planes de Caro con un plan confirmado y uno cancelado'); nota('R91', await txt(c)) })
await corto('R92', o, async () => { await o.goto(`${BASE}/#/e/${g.espacioId}`); await T(o, 3500); await rincon(o, 'R92', 'Espacio con una propuesta confirmada y una cancelada', { foco: false }); nota('R92', await txt(o)) })
console.log('ERRORES', JSON.stringify(errores)); console.log(guardar('f4')); await b.close()
