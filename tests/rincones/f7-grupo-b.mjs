// Fase 7: grupo B con integrantes PENDIENTES (Zoe, Lalo): Nueva propuesta con imprescindible pendiente, cierre elegido a mano,
// cupos, "Crear solo el borrador"; reclamo de un lugar pendiente por enlace; compartir con integrantes por entrar.
import { abrir, actor, BASE, rincon, nota, guardar, boton, esperarTexto, errores, CARPETA, hora } from './lib.mjs'
import { escribir, guardarSesion, rutaSesion, leer } from './estado.mjs'
const b = await abrir()
const o = await actor(b, 'org2')
const txt = async (p) => (await p.locator('main').innerText()).replace(/\s+/g, ' ').slice(0, 700)
const T = (p, ms = 1500) => p.waitForTimeout(ms)
const corto = async (id, p, f) => { try { await f() } catch (e) { nota(id, `ERROR DEL GUION: ${String(e).split('\n')[0].slice(0, 220)}`); await p.screenshot({ path: `${CARPETA}/${id}-error.png` }).catch(() => {}) } }
await o.goto(BASE); await T(o, 4200)
await o.getByPlaceholder('Tu nombre').fill('Orga Bé'); await boton(o, 'Entrar').click(); await T(o, 2000)
await o.goto(`${BASE}/#/crear`); await T(o, 2500)
await o.getByLabel('Nombre del grupo').fill(`Rincones B ${hora().slice(0, 5)}`)
for (const n of ['Zoe', 'Lalo']) { await o.getByLabel('Agregar a alguien del grupo').fill(n); await o.getByLabel('Agregar a alguien del grupo').press('Enter') }
await boton(o, 'Crear grupo').click(); await o.waitForURL(/#\/e\//, { timeout: 30000 }); await T(o, 3500)
const espacioB = o.url().split('/e/')[1].split('/')[0]
const codigoB = ((await o.locator('.codigo').first().textContent()) || '').trim()
escribir({ espacioB, codigoB }); await guardarSesion(o)
await rincon(o, 'R140', 'Grupo B: 3 personas, 2 "por entrar" (tarjeta Invita a tu grupo visible)'); nota('R140', await txt(o))
await corto('R141', o, async () => {
  await o.getByRole('link', { name: /Crear propuesta/ }).click(); await T(o, 2500)
  // imprescindible: elegir a Zoe (pendiente)
  await o.getByRole('radio', { name: /Zoe/ }).check({ force: true }).catch(async () => { await o.getByText('Zoe', { exact: false }).last().click() }); await T(o, 500)
  await rincon(o, 'R141', 'Nueva propuesta: "Quién no puede faltar" con integrante pendiente (Zoe) elegida', { foco: false }); nota('R141', await txt(o))
})
await corto('R142', o, async () => {
  await o.getByLabel('Propósito de la propuesta').fill('Cumple de Zoe'); await o.getByRole('button', { name: 'Elegir' }).last().click().catch(() => {}); await T(o, 800)
  await rincon(o, 'R142', 'Nueva propuesta: cierre con "Elegir" (selector de fecha)'); nota('R142', await txt(o))
})
await corto('R143', o, async () => {
  await o.getByRole('button', { name: /Revisar antes de crear/ }).click(); await T(o, 800)
  await rincon(o, 'R143', 'Paso 2 con imprescindible pendiente', { foco: false }); nota('R143', await txt(o))
  await boton(o, 'Crear y abrir al grupo').click(); await o.waitForURL(/\/p\//, { timeout: 30000 }); await T(o, 3500)
  await rincon(o, 'R144', 'Propuesta con imprescindible que todavía no entró (Zoe)', { foco: true }); nota('R144', await txt(o))
})
// Zoe entra por el enlace
const z = await actor(b, 'zoe')
await corto('R145', z, async () => {
  await z.goto(`${BASE}/#/unirse/${codigoB}`); await T(z, 4000)
  await rincon(z, 'R145', 'Invitación al grupo B: Zoe y Lalo libres para elegir', { foco: false }); nota('R145', await txt(z))
  await z.getByRole('button', { name: /^Zoe/ }).click(); await T(z, 600); await z.getByRole('button', { name: /Sí, soy Zoe/ }).click()
  await z.waitForURL(/#\/e\//, { timeout: 30000 }); await T(z, 3500); await guardarSesion(z)
  await rincon(z, 'R146', 'Zoe dentro del grupo B (propuesta abierta de la que es imprescindible)'); nota('R146', await txt(z))
})
console.log('ERRORES', JSON.stringify(errores)); console.log(guardar('f7')); await b.close()
