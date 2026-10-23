// Fase 10: fallas simuladas del servidor en el navegador (sin tocar la base): contrato incompatible, 500 en get_space,
// respuesta lenta (esqueleto de carga), falla de la sesión anónima. Se intercepta la red del navegador de prueba.
import { abrir, actor, BASE, rincon, nota, guardar, boton, errores, CARPETA } from './lib.mjs'
import { leer, rutaSesion } from './estado.mjs'
const g = leer(); const b = await abrir()
const txt = async (p) => (await p.locator('body').innerText()).replace(/\s+/g, ' ').slice(0, 500)
const T = (p, ms = 1500) => p.waitForTimeout(ms)
const corto = async (id, p, f) => { try { await f() } catch (e) { nota(id, `ERROR DEL GUION: ${String(e).split('\n')[0].slice(0, 220)}`); await p.screenshot({ path: `${CARPETA}/${id}-error.png` }).catch(() => {}) } }
const nueva = async () => actor(b, 'org2', { storageState: rutaSesion('org2') })
// R170 contrato incompatible
let p = await nueva()
await corto('R170', p, async () => {
  await p.route('**/rest/v1/rpc/get_space', async (r) => { const res = await r.fetch(); const j = await res.json(); j.contrato = 99; await r.fulfill({ response: res, json: j }) })
  await p.goto(`${BASE}/#/e/${g.espacioB}`); await T(p, 5000)
  nota('R170', await txt(p)); await rincon(p, 'R170', 'Contrato incompatible: "Versión incompatible" y acciones bloqueadas', { foco: true })
  nota('R170', 'botón Crear propuesta deshabilitado/aria-disabled: ' + await p.getByRole('link', { name: /Nueva propuesta|Crear propuesta/ }).first().getAttribute('aria-disabled').catch(() => 'n/a'))
})
// R171 500 en get_space
p = await nueva()
await corto('R171', p, async () => {
  await p.route('**/rest/v1/rpc/get_space', (r) => r.fulfill({ status: 500, contentType: 'application/json', body: '{"message":"boom"}' }))
  await p.goto(`${BASE}/#/e/${g.espacioB}`); await T(p, 6000)
  nota('R171', await txt(p)); await rincon(p, 'R171', 'Falla del servidor (500) al abrir un espacio: error con Reintentar', { foco: true })
  await p.unroute('**/rest/v1/rpc/get_space'); const r = p.getByRole('button', { name: /Reintentar/ }).first()
  if (await r.count()) { await r.click(); await T(p, 4000); nota('R171', 'tras Reintentar con servidor sano: ' + (await txt(p)).slice(0, 160)) }
})
// R172 lento
p = await nueva()
await corto('R172', p, async () => {
  await p.route('**/rest/v1/rpc/get_space', async (r) => { await new Promise((s) => setTimeout(s, 7000)); await r.continue() })
  await p.goto(`${BASE}/#/e/${g.espacioB}`); await T(p, 2500)
  await rincon(p, 'R172', 'Espacio cargando lento (esqueleto "Cargando…")', { anchos: [{ n: '375', w: 375, h: 812 }, { n: '1280', w: 1280, h: 800 }] }); nota('R172', await txt(p))
})
// R173 falla de sesión anónima
const ctx = await b.newContext({ viewport: { width: 375, height: 812 }, locale: 'es-CL' }); p = await ctx.newPage(); p.actor = 'sin-sesion'
await corto('R173', p, async () => {
  await p.route('**/auth/v1/signup**', (r) => r.fulfill({ status: 500, contentType: 'application/json', body: '{"msg":"boom"}' }))
  await p.goto(`${BASE}/`); await T(p, 6000)
  nota('R173', await txt(p)); await rincon(p, 'R173', 'No se pudo iniciar la sesión anónima (500): mensaje y Reintentar', { foco: true })
})
console.log('ERRORES (esperadas por las fallas inyectadas)', JSON.stringify(errores).slice(0, 400)); console.log(guardar('f10')); await b.close()
