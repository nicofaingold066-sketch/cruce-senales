// Fase 9: acciones con la red cortada a mitad (guardar condiciones, "Hoy paso", abrir un plan) y vuelta de la red;
// Nueva propuesta con días/horas cambiados; Perfil "Entrar como otra persona".
import { abrir, actor, BASE, rincon, nota, guardar, boton, esperarTexto, errores, CARPETA, revisar } from './lib.mjs'
import { leer, rutaSesion } from './estado.mjs'
const g = leer(); const b = await abrir()
const txt = async (p) => (await p.locator('main').innerText()).replace(/\s+/g, ' ').slice(0, 600)
const T = (p, ms = 1500) => p.waitForTimeout(ms)
const corto = async (id, p, f) => { try { await f() } catch (e) { nota(id, `ERROR DEL GUION: ${String(e).split('\n')[0].slice(0, 220)}`); await p.screenshot({ path: `${CARPETA}/${id}-error.png` }).catch(() => {}) } }
const z = await actor(b, 'zoe', { storageState: rutaSesion('zoe') })
await z.goto(`${BASE}/#/e/${g.espacioB}`); await T(z, 3500)
await corto('R160', z, async () => {
  await z.getByText('Cumple de Zoe').first().click(); await T(z, 3000)
  await z.getByRole('tab', { name: 'Mi respuesta' }).click(); await T(z, 1500)
  await z.locator('fieldset', { hasText: 'Franja A' }).getByText('Sí puedo', { exact: true }).click()
  await z.locator('fieldset', { hasText: 'Franja B' }).getByText('Sí puedo', { exact: true }).click()
  await z.context().setOffline(true); await T(z, 800)
  await rincon(z, 'R160', 'Mi respuesta con la red cortada (aviso global + condiciones marcadas)', { foco: false })
  await boton(z, 'Guardar condiciones').click(); await T(z, 5000)
  nota('R161', 'tras Guardar sin red: ' + await txt(z))
  await rincon(z, 'R161', 'Guardar condiciones SIN red: mensaje de error y datos conservados')
  await z.context().setOffline(false); await T(z, 2500)
  nota('R162', 'tras volver la red, aviso global: ' + (await z.getByText('Sin conexión').count()))
  const reint = z.getByRole('button', { name: /Reintentar|Guardar condiciones/ }).first(); await reint.click(); await T(z, 4000)
  await rincon(z, 'R162', 'Red de vuelta: reintentar guardar'); nota('R162', await txt(z))
})
await corto('R163', z, async () => {
  await z.getByRole('button', { name: 'Hoy paso' }).click(); await T(z, 2500)
  await rincon(z, 'R163', 'Mi respuesta: "Hoy paso" marcado'); nota('R163', await txt(z))
  await z.getByRole('button', { name: 'Me interesa' }).click(); await T(z, 2000)
})
// Nueva propuesta: cambios de día/hora y duración, y navegación atrás
const o = await actor(b, 'org2', { storageState: rutaSesion('org2') })
await corto('R164', o, async () => {
  await o.goto(`${BASE}/#/e/${g.espacioB}/nueva`); await T(o, 2800)
  await o.getByLabel('Propósito de la propuesta').fill('Prueba de límites con un título muy largo que supera lo razonable para una tarjeta en una pantalla angosta de teléfono')
  await o.getByRole('button', { name: 'Sumar uno al mínimo' }).click().catch(() => {})
  await o.getByRole('button', { name: /Sumar uno al máximo/ }).click().catch(() => {})
  await rincon(o, 'R164', 'Nueva propuesta: título larguísimo y cupos cambiados', { foco: false })
  nota('R164', 'valor del título aceptado: ' + (await o.getByLabel('Propósito de la propuesta').inputValue()).length + ' caracteres')
  await revisar(o); await T(o, 800)
  await rincon(o, 'R165', 'Paso 2 con título largo (se corta o se parte bien)'); nota('R165', await txt(o))
})
// Perfil: entrar como otra persona
await corto('R166', o, async () => {
  await o.goto(`${BASE}/#/perfil`); await T(o, 3500)
  // S2b (mockup 13): el botón se llama «Salir de este teléfono»; se acepta también el nombre de antes.
  await o.getByRole('button', { name: /^(Entrar como otra persona|Salir de este teléfono)$/ }).click(); await T(o, 1000)
  await rincon(o, 'R166', 'Perfil: "Entrar como otra persona" (confirmación)', { foco: true }); nota('R166', await txt(o))
})
console.log('ERRORES', JSON.stringify(errores)); console.log(guardar('f9')); await b.close()
