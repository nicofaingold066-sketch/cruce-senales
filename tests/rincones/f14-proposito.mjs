// Fase 14: propósito del grupo (enmienda 14, la última función). Grupo propio "Los del fútbol" con propósito Fútbol:
// selector "¿Para qué es este grupo?", frase en "¿Quién eres?", atajos de la familia deporte en Nueva propuesta,
// propuesta fuera del propósito (sin actividad) → mensaje del servidor, propuesta dentro de la familia (Pádel) → crea.
// Todo ficticio; un grupo propio; sin ráfagas.
import { abrir, actor, BASE, rincon, nota, guardar, boton, esperarTexto, errores, CARPETA, hora, revisar } from './lib.mjs'
import { rinconA11y, anunciado, guardarA11y } from './a11y.mjs'
import { escribir, guardarSesion } from './estado.mjs'

const b = await abrir()
const T = (p, ms = 1500) => p.waitForTimeout(ms)
const txt = async (p, sel = 'main') => (await p.locator(sel).innerText()).replace(/\s+/g, ' ').trim()
const corto = async (id, p, f) => {
  try { await f() } catch (e) {
    nota(id, `ERROR DEL GUION: ${String(e).split('\n')[0].slice(0, 240)}`)
    await p?.screenshot({ path: `${CARPETA}/${id}-error.png` })?.catch?.(() => {})
  }
}
const o = await actor(b, 'orge')
await o.goto(BASE); await T(o, 4300)
await o.getByPlaceholder('Tu nombre').fill('Orga Efe'); await boton(o, 'Entrar').click(); await T(o, 2000)
await o.goto(`${BASE}/#/crear`); await T(o, 2800)
const sel = o.getByLabel('¿Para qué es este grupo?')
await corto('R400', o, async () => {
  nota('R400', 'opciones del selector: ' + (await sel.locator('option').allInnerTexts()).join(' | '))
  nota('R400', 'valor por defecto: ' + (await sel.inputValue()) + ' · ayuda: ' + (await o.locator('.proposito small').innerText()))
  await rincon(o, 'R400', 'Crear grupo: "¿Para qué es este grupo?" con Libre por defecto', { foco: true })
  await rinconA11y(o, 'R400', 'Crear grupo con propósito (accesibilidad)', { anchos: [320, 375] })
})
await o.getByLabel('Nombre del grupo').fill(`Los del fútbol ${hora().slice(0, 5)}`)
await o.getByLabel('Agregar a alguien del grupo').fill('Ana'); await o.getByLabel('Agregar a alguien del grupo').press('Enter')
await corto('R401', o, async () => {
  await sel.selectOption({ label: 'Fútbol' }); await T(o, 300)
  nota('R401', 'tras elegir Fútbol, ayuda: ' + (await o.locator('.proposito small').innerText()))
  await rincon(o, 'R401', 'Crear grupo con propósito Fútbol elegido', { anchos: [{ n: '375', w: 375, h: 812 }, { n: '320', w: 320, h: 640 }] })
})
await boton(o, 'Crear grupo').click(); await o.waitForURL(/#\/e\//, { timeout: 40000 }); await T(o, 3500)
const espacioE = o.url().split('/e/')[1].split('/')[0]
const codigoE = ((await o.locator('.codigo').first().textContent()) || '').trim()
escribir({ espacioE, codigoE }); await guardarSesion(o)
await corto('R402', o, async () => {
  nota('R402', 'espacio del grupo con propósito: ' + (await txt(o)).slice(0, 380))
  await rincon(o, 'R402', 'Espacio de un grupo con propósito Fútbol')
})
// "¿Quién eres?" muestra el propósito
const ana = await actor(b, 'anae')
await corto('R403', ana, async () => {
  await ana.goto(`${BASE}/#/unirse/${codigoE}`); await T(ana, 4200)
  nota('R403', 'invitación: ' + (await txt(ana)).slice(0, 360))
  await rincon(ana, 'R403', '"¿Quién eres?" con el propósito del grupo ("Este grupo es para jugar fútbol")', { foco: false })
  await ana.getByRole('button', { name: /^Ana/ }).click(); await T(ana, 600)
  await ana.getByRole('button', { name: /Sí, soy Ana/ }).click(); await ana.waitForURL(/#\/e\//, { timeout: 40000 }); await T(ana, 3000)
  await guardarSesion(ana)
})
// Nueva propuesta dentro de la familia
await corto('R404', o, async () => {
  await o.goto(`${BASE}/#/e/${espacioE}/nueva`); await T(o, 3000)
  const atajos = (await o.locator('[aria-label="Atajos de actividad"] button').allInnerTexts()).map((t) => t.trim())
  nota('R404', 'atajos en un grupo de fútbol: ' + atajos.join(' · '))
  nota('R404', 'ejemplo de título: ' + await o.getByLabel('Propósito de la propuesta').getAttribute('placeholder'))
  await rincon(o, 'R404', 'Nueva propuesta en un grupo con propósito Fútbol: atajos de la familia deporte', { foco: true })
  await rinconA11y(o, 'R404', 'Nueva propuesta con atajos de familia (accesibilidad)', { anchos: [320, 375] })
})
// fuera de propósito: título libre sin atajo (no hay actividad)
await corto('R405', o, async () => {
  await o.getByLabel('Propósito de la propuesta').fill('Cena de fin de año')
  await revisar(o); await T(o, 900)
  await boton(o, 'Crear y abrir al grupo').click(); await T(o, 4500)
  nota('R405', 'sin atajo en un grupo con propósito: ' + (await txt(o)).slice(0, 520))
  await anunciado(o, 'R405', 'Fuera de propósito', 'Este grupo se armó para otro tipo de plan')
  await rincon(o, 'R405', 'Propuesta fuera del propósito: mensaje del servidor', { foco: true })
})
// dentro de la familia: Pádel
await corto('R406', o, async () => {
  await o.goto(`${BASE}/#/e/${espacioE}/nueva`); await T(o, 3000)
  const pad = o.locator('[aria-label="Atajos de actividad"] button', { hasText: 'Pádel' }).first()
  if (!(await pad.isVisible().catch(() => false))) await o.getByRole('button', { name: /^Más…?$/ }).click().catch(() => {}) // el mockup muestra cuatro atajos y «Más…»
  await pad.click(); await T(o, 400)
  nota('R406', 'título tras elegir el atajo Pádel: ' + await o.getByLabel('Propósito de la propuesta').inputValue())
  await revisar(o); await T(o, 900)
  nota('R406', 'paso 2: ' + (await txt(o)).slice(0, 300))
  await boton(o, 'Crear y abrir al grupo').click(); await o.waitForURL(/\/p\//, { timeout: 40000 }); await T(o, 3500)
  await rincon(o, 'R406', 'Propuesta de Pádel dentro de un grupo de fútbol (misma familia): se crea', { foco: false })
  nota('R406', (await txt(o)).slice(0, 360))
})
// agente en un grupo con propósito
await corto('R407', o, async () => {
  await o.goto(`${BASE}/#/e/${espacioE}`); await T(o, 3500)
  await o.locator('details.agente-plegable summary').click(); await T(o, 3500)
  nota('R407', 'panel del agente en grupo con propósito: ' + (await txt(o, 'details.agente-plegable')).slice(0, 700))
  await rincon(o, 'R407', 'Agente del círculo abierto en un grupo de fútbol (sin llamarlo)', { foco: false })
})
console.log('ERRORES', JSON.stringify(errores).slice(0, 500))
console.log(guardar('f14')); console.log(guardarA11y('a11y-f14')); await b.close()
