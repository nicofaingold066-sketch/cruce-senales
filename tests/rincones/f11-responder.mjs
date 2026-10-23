// Fase 11: "Respuesta en un paso" (#88) y avisos nuevos. Grupo C propio: organizador crea y abre la propuesta; Ana y Beto entran
// por el enlace (lista) y llegan a #/e/<id>/responder; se prueban las opciones de un toque, el estado "hecho", "Me interesa",
// la tarjeta "Falta tu respuesta" y el calendario simulado (solo demo).
import { abrir, actor, BASE, rincon, nota, guardar, boton, esperarTexto, errores, CARPETA, hora } from './lib.mjs'
import { escribir, guardarSesion } from './estado.mjs'
const b = await abrir()
const txt = async (p) => (await p.locator('main').innerText()).replace(/\s+/g, ' ').slice(0, 700)
const T = (p, ms = 1500) => p.waitForTimeout(ms)
const corto = async (id, p, f) => { try { await f() } catch (e) { nota(id, `ERROR DEL GUION: ${String(e).split('\n')[0].slice(0, 220)}`); await p.screenshot({ path: `${CARPETA}/${id}-error.png` }).catch(() => {}) } }
const o = await actor(b, 'orgc')
await o.goto(BASE); await T(o, 4200)
await o.getByPlaceholder('Tu nombre').fill('Orga Cé'); await boton(o, 'Entrar').click(); await T(o, 2000)
await o.goto(`${BASE}/#/crear`); await T(o, 2500)
await o.getByLabel('Nombre del grupo').fill(`Rincones C ${hora().slice(0, 5)}`)
for (const n of ['Ana', 'Beto']) { await o.getByLabel('Agregar a alguien del grupo').fill(n); await o.getByLabel('Agregar a alguien del grupo').press('Enter') }
await boton(o, 'Crear grupo').click(); await o.waitForURL(/#\/e\//, { timeout: 30000 }); await T(o, 3500)
const espacioC = o.url().split('/e/')[1].split('/')[0]; const codigoC = ((await o.locator('.codigo').first().textContent()) || '').trim()
escribir({ espacioC, codigoC }); await guardarSesion(o)
await o.getByRole('link', { name: /Crear propuesta/ }).click(); await T(o, 2500)
await o.getByLabel('Propósito de la propuesta').fill('Cena el sábado'); await o.getByRole('button', { name: /Revisar antes de crear/ }).click(); await T(o, 800)
await boton(o, 'Crear y abrir al grupo').click(); await o.waitForURL(/\/p\//, { timeout: 30000 }); await T(o, 3000)
const ana = await actor(b, 'anac')
await corto('R200', ana, async () => {
  await ana.goto(`${BASE}/#/unirse/${codigoC}`); await T(ana, 4000)
  await rincon(ana, 'R200', 'Invitación: lista con integrantes (propuesta ya abierta)', { foco: true })
  await ana.getByRole('button', { name: /^Ana/ }).click(); await T(ana, 600)
  await ana.getByRole('button', { name: /Sí, soy Ana/ }).click(); await ana.waitForURL(/#\/e\//, { timeout: 40000 }); await T(ana, 3500)
  nota('R201', 'URL tras unirse: ' + ana.url().replace(BASE, '')); await guardarSesion(ana)
  await rincon(ana, 'R201', 'Responder en un paso: opciones de un toque ("Puedo los dos días", "Solo…", "No puedo")', { foco: true }); nota('R201', await txt(ana))
})
await corto('R202', ana, async () => {
  const opciones = ana.locator('main button').filter({ hasText: /Solo|Puedo/ })
  nota('R202', 'opciones de un toque: ' + (await opciones.count()))
  await opciones.nth(1).click(); await T(ana, 800)
  await rincon(ana, 'R202', 'Responder: opción elegida, pide confirmar o deshacer', { foco: true }); nota('R202', await txt(ana))
})
console.log('ERRORES', JSON.stringify(errores)); console.log(guardar('f11')); await b.close()
