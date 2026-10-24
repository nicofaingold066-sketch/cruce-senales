// Fase 1: organizador nuevo → portada con nombre, Planes, Perfil, Crear grupo (validaciones), espacio vacío,
// Nueva propuesta (2 pasos), borrador, abrir propuesta. Crea un GRUPO NUEVO propio ("Rincones <hora>").
import { abrir, actor, BASE, rincon, nota, guardar, log, boton, esperarTexto, errores, hora, revisar } from './lib.mjs'
import { escribir, guardarSesion } from './estado.mjs'
const b = await abrir()
const o = await actor(b, 'org')
const T = async (ms = 1200) => o.waitForTimeout(ms)
const txt = async () => (await o.locator('main').innerText()).replace(/\s+/g, ' ').slice(0, 320)
const corto = async (id, f) => { try { await f() } catch (e) { nota(id, `ERROR DEL GUION: ${String(e).split('\n')[0].slice(0, 200)}`); await o.screenshot({ path: `${(await import('./lib.mjs')).CARPETA}/${id}-error.png` }).catch(() => {}) } }

await o.goto(BASE); await o.waitForTimeout(4200)
await o.getByPlaceholder('Tu nombre').fill('Rincon Org')
await boton(o, 'Entrar').click(); await T(2500)
await rincon(o, 'R20', 'Portada con nombre y sin grupos ("Hola, X")', { foco: true })
nota('R20', await txt())

await o.goto(`${BASE}/#/planes`); await T(2500)
await rincon(o, 'R21', 'Planes vacío, con nombre'); nota('R21', await txt())
await o.goto(`${BASE}/#/perfil`); await T(2500)
await rincon(o, 'R22', 'Perfil con nombre, sin grupos', { foco: true }); nota('R22', await txt())

// Crear grupo
await o.goto(`${BASE}/#/crear`); await T(2500)
await rincon(o, 'R23', 'Crear grupo: formulario precargado con el nombre local', { foco: true })
nota('R23', `Crear grupo con nombre del grupo vacío: deshabilitado=${await boton(o, 'Crear grupo').isDisabled()}`)
const grupo = `Rincones ${hora().slice(0, 5)}`
await o.getByLabel('Nombre del grupo').fill(grupo)
await o.getByLabel('Tu nombre en el grupo').fill('Rincon Org')
// Entrada como Tricount: sin lista (o con un nombre escrito sin «Agregar») "Crear grupo" pregunta una vez.
await corto('R23b', async () => {
  await boton(o, 'Crear grupo').click(); await o.waitForTimeout(600)
  nota('R23b', 'pregunta al crear sin lista: ' + ((await o.getByText('¿Crear sin la lista del grupo?').count()) > 0))
  await rincon(o, 'R23b', 'Crear grupo sin la lista: pregunta "¿Crear sin la lista del grupo?" (Agregar nombres / Crear sin lista)', { foco: true })
  await o.getByRole('button', { name: 'Agregar nombres' }).click(); await o.waitForTimeout(500)
  nota('R23b', 'tras "Agregar nombres" el foco queda en: ' + await o.evaluate(() => document.activeElement?.tagName + ' ' + (document.activeElement?.closest('label')?.innerText || '').slice(0, 40)))
})
const agregar = async (n) => { await o.getByLabel('Agregar a alguien del grupo').fill(n); await boton(o, 'Agregar').click(); await o.waitForTimeout(150) }
await agregar('Ana'); await agregar('Beto'); await agregar('Caro')
await agregar('Ana'); nota('R24', 'duplicado "Ana": lista = ' + (await o.locator('.quien-integrantes li').allInnerTexts()).join('|').replace(/\n/g, ' '))
await agregar('Rincon Org'); nota('R24', 'integrante igual al organizador: lista = ' + (await o.locator('.quien-integrantes li').allInnerTexts()).join('|').replace(/\n/g, ' ') + ' | aviso: ' + (await o.locator('fieldset.form-seccion p[aria-live]').last().textContent()))
await rincon(o, 'R24', 'Crear grupo con 3 integrantes anotados, duplicado y nombre propio probados', { foco: false })
// quitar el del organizador si quedó
if (await o.getByRole('button', { name: 'Quitar a Rincon Org' }).count()) await o.getByRole('button', { name: 'Quitar a Rincon Org' }).click()
await o.getByLabel('Agregar a alguien del grupo').fill('')
await boton(o, 'Crear grupo').click()
await o.waitForURL(/#\/e\//, { timeout: 30000 }); await T(3000)
const espacioUrl = o.url(); const espacioId = espacioUrl.split('/e/')[1].split('/')[0]
await rincon(o, 'R25', 'Espacio recién creado: aviso, invitación, sin propuestas, personas por entrar', { foco: true })
nota('R25', await txt())
const codigo = ((await o.locator('.codigo').first().textContent()) || '').trim()
log(`grupo "${grupo}" creado, código ${codigo.slice(0, 2)}…`)
escribir({ grupo, espacioId, codigo })
await guardarSesion(o)

// Copiar / compartir
await corto('R26', async () => {
  const c = o.getByRole('button', { name: /Copiar/ }).first()
  await o.context().grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {})
  await c.scrollIntoViewIfNeeded(); await c.click(); await T(500)
  nota('R26', 'tras Copiar: ' + (await o.locator('.codigo').first().locator('xpath=ancestor::*[3]').innerText()).replace(/\s+/g, ' ').slice(0, 200))
  await rincon(o, 'R26', 'Espacio: código tras tocar Copiar')
})
// Agente plegado, sin preferencias (organizador solo)
await corto('R27', async () => {
  await o.locator('details.agente-plegable summary').click(); await T(3500)
  await rincon(o, 'R27', 'Agente del círculo abierto, organizador sin preferencias, grupo de 1 persona', { foco: false })
  nota('R27', (await o.locator('details.agente-plegable').innerText()).replace(/\s+/g, ' ').slice(0, 500))
  await o.locator('details.agente-plegable summary').click()
})

// Nueva propuesta
await o.goto(`${BASE}/#/e/${espacioId}/nueva`); await T(2500)
await rincon(o, 'R30', 'Nueva propuesta, paso 1 (valores iniciales)', { foco: true })
nota('R30', await txt())
await corto('R31', async () => {
  // título vacío → intentar revisar
  const rev = o.getByRole('button', { name: /Revisar antes de crear|Crear y abrir al grupo/ }).first() // S3 del mockup: el primario está en el formulario
  nota('R31', `Revisar con título vacío: deshabilitado=${await rev.isDisabled().catch(() => 'n/a')}`)
  await rev.click({ timeout: 3000 }).catch(() => {}); await T(600)
  nota('R31', 'texto tras intentar revisar sin título: ' + (await txt()).slice(0, 200))
  await rincon(o, 'R31', 'Nueva propuesta: intento de revisar sin título')
})
await o.getByLabel('Propósito de la propuesta').fill('Partido de pádel el sábado'); await T(300)
await corto('R32', async () => {
  await revisar(o); await T(800)
  await rincon(o, 'R32', 'Nueva propuesta, paso 2 (revisar y crear)', { foco: true }); nota('R32', await txt())
})
// S3 del mockup (frontend 03:05): «Crear solo el borrador» ya no existe; el estado Borrador (R33–R35) no se alcanza desde la pantalla.
const hayBorrador = (await o.getByRole('button', { name: 'Crear solo el borrador' }).count()) > 0
await corto('R33', async () => {
  if (hayBorrador) await boton(o, 'Crear solo el borrador').click()
  else { await boton(o, 'Crear y abrir al grupo').click(); nota('R33', 'no aplica (mockup S3): no hay forma de crear solo el borrador; se creó y abrió directo') }
  await o.waitForURL(/\/p\//, { timeout: 30000 }); await T(3500)
  const pid = o.url().split('/p/')[1]; escribir({ propuestaId: pid })
  if (hayBorrador) { await rincon(o, 'R33', 'Propuesta en BORRADOR, pestaña Plan (organizador)', { foco: true }); nota('R33', await txt()) }
})
if (hayBorrador) await corto('R34', async () => {
  await o.getByRole('tab', { name: 'Mi respuesta' }).click(); await T(1800)
  await rincon(o, 'R34', 'Borrador, pestaña Mi respuesta (no se puede responder aún)'); nota('R34', await txt())
  await o.getByRole('tab', { name: 'Historial' }).click(); await T(1800)
  await rincon(o, 'R35', 'Borrador, pestaña Historial'); nota('R35', await txt())
  await o.getByRole('tab', { name: 'Plan' }).click(); await T(800)
})
await corto('R36', async () => {
  if (hayBorrador) await boton(o, 'Abrir propuesta').click(); await T(3500)
  await rincon(o, 'R36', 'Propuesta ABIERTA (reuniendo interés), Plan, organizador, 1 sola persona', { foco: true }); nota('R36', await txt())
})
await guardarSesion(o)
console.log('ERRORES', JSON.stringify(errores))
console.log(guardar('f1'))
await b.close()
