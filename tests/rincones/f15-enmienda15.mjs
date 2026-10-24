// Fase 15: la enmienda 15 en pantalla (la última función): dos planes con nombre, "Si sirven las dos, gana: la que pueden más",
// "Si te sirven los dos, ¿cuál prefieres?" (privado), "Cómo viene cada plan" (solo el organizador, sin nombres) y la ronda de
// opiniones con plazo ("Opiniones hasta…"). Grupo propio "Rincones G" con cuatro personas; sin ráfagas.
import { abrir, actor, BASE, rincon, nota, guardar, boton, esperarTexto, errores, CARPETA, hora, log, revisar } from './lib.mjs'
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
const siNo = (p, franja, v) => p.locator('fieldset', { hasText: `Franja ${franja}` }).getByText(v, { exact: true }).click()
const guardarCond = async (p) => { await boton(p, 'Guardar condiciones').click(); await esperarTexto(p, 'Guardado', 15000) }

const o = await actor(b, 'orgg')
await o.goto(BASE); await T(o, 4300)
await o.getByPlaceholder('Tu nombre').fill('Orga Gé'); await boton(o, 'Entrar').click(); await T(o, 2000)
await o.goto(`${BASE}/#/crear`); await T(o, 2800)
await o.getByLabel('Nombre del grupo').fill(`Rincones G ${hora().slice(0, 5)}`)
for (const n of ['Ana', 'Beto', 'Caro']) { await o.getByLabel('Agregar a alguien del grupo').fill(n); await o.getByLabel('Agregar a alguien del grupo').press('Enter') }
await boton(o, 'Crear grupo').click(); await o.waitForURL(/#\/e\//, { timeout: 40000 }); await T(o, 3500)
const espacioG = o.url().split('/e/')[1].split('/')[0]
const codigoG = ((await o.locator('.codigo').first().textContent()) || '').trim()
escribir({ espacioG, codigoG }); await guardarSesion(o)

// Nueva propuesta con nombres de plan, "La que pueden más" y ronda de 2 h
await corto('R500', o, async () => {
  await o.goto(`${BASE}/#/e/${espacioG}/nueva`); await T(o, 3000)
  await o.getByLabel('Propósito de la propuesta').fill('Plan del sábado')
  const nombres = o.getByLabel('Nombre de este plan (opcional)')
  nota('R500', 'campos "Nombre de este plan": ' + await nombres.count())
  await nombres.nth(0).fill('Asado en lo de Tomi'); await nombres.nth(1).fill('Picnic en el parque')
  // Antes era un <details class="mas-opciones">; en el mockup (S3) es un botón «Más opciones» dentro de «Cuándo» que abre un div.mas-opciones.
  const masBtn = o.getByRole('button', { name: 'Más opciones' }), masDet = o.locator('details.mas-opciones')
  nota('R500', '"Más opciones": ' + ((await masBtn.count()) ? 'botón' : (await masDet.count()) ? 'details' : 'no aparece'))
  if (await masBtn.count()) await masBtn.click(); else if (await masDet.count()) await masDet.locator('summary').click()
  await T(o, 400)
  await rincon(o, 'R500', 'Nueva propuesta: nombres de plan y "Más opciones" abierto (ronda y regla)', { foco: true })
  await rinconA11y(o, 'R500', 'Nueva propuesta con "Más opciones" (accesibilidad)', { anchos: [320, 375] })
  nota('R500', 'opciones de ronda: ' + (await o.locator('[aria-label="Ronda de opiniones"] label').allInnerTexts()).join(' | '))
  await o.locator('[aria-label="Ronda de opiniones"] label', { hasText: '2 h' }).click()
  await o.locator('[aria-label="Si sirven las dos, gana"] label', { hasText: 'La que pueden más' }).click(); await T(o, 300)
  nota('R500', 'nota de la sección "Cuándo": ' + (await o.locator('.nota-seccion').first().innerText()))
  await o.getByRole('button', { name: 'Sumar uno al mínimo' }).click()
  await revisar(o); await T(o, 900)
  nota('R501', 'paso 2: ' + (await txt(o)).slice(0, 560))
  await rincon(o, 'R501', 'Paso 2: planes con nombre, "Gana la que pueden más personas", "Ronda de opiniones: 2 h…"', { foco: false })
  await boton(o, 'Crear y abrir al grupo').click(); await o.waitForURL(/\/p\//, { timeout: 40000 }); await T(o, 3500)
})
const propuestaG = o.url().split('/p/')[1]; escribir({ propuestaG })
const urlP = `${BASE}/#/e/${espacioG}/p/${propuestaG}`
const P = { orgg: o }

// Ana, Beto y Caro: entran y responden. Ana y Beto pueden los dos días y prefieren planes distintos; Caro solo el sábado.
for (const [n, rapida] of [['Ana', 'dos'], ['Beto', 'dos'], ['Caro', 'sabado']]) {
  const p = await actor(b, n.toLowerCase() + 'g'); P[n.toLowerCase() + 'g'] = p
  await corto(`R51${n[0]}`, p, async () => {
    await p.goto(`${BASE}/#/unirse/${codigoG}`); await T(p, 4200)
    await p.getByRole('button', { name: new RegExp(`^${n}`) }).click(); await T(p, 600)
    await p.getByRole('button', { name: new RegExp(`Sí, soy ${n}`) }).click(); await p.waitForURL(/#\/e\//, { timeout: 40000 }); await T(p, 3500)
    if (n === 'Ana') {
      nota('R510', 'Responder en un paso con planes con nombre: ' + (await txt(p)).slice(0, 520))
      await rincon(p, 'R510', 'Responder en un paso con dos planes con nombre', { foco: false })
    }
    await p.goto(urlP); await T(p, 3500)
    await p.getByRole('tab', { name: 'Mi respuesta' }).click(); await T(p, 1500)
    if (rapida === 'dos') { await siNo(p, 'A', 'Sí puedo'); await siNo(p, 'B', 'Sí puedo') } else { await siNo(p, 'A', 'Sí puedo'); await siNo(p, 'B', 'No puedo') }
    await T(p, 500)
    if (n === 'Ana') {
      const leyenda = p.getByText('Si te sirven los dos, ¿cuál prefieres?')
      nota('R511', '"¿cuál prefieres?" visible con A y B en Sí: ' + await leyenda.count())
      await rincon(p, 'R511', 'Mi respuesta: "Si te sirven los dos, ¿cuál prefieres?" (opcional y privado)', { foco: true })
      await rinconA11y(p, 'R511', '"¿cuál prefieres?" (accesibilidad)', { anchos: [320, 375] })
      nota('R511', 'opciones: ' + (await p.locator('fieldset.prefiero label').allInnerTexts()).join(' | '))
      await p.locator('fieldset.prefiero label', { hasText: 'Picnic en el parque' }).click()
    }
    if (n === 'Beto') await p.locator('fieldset.prefiero label', { hasText: 'Asado en lo de Tomi' }).click()
    if (n === 'Caro') nota('R512', 'con B en No, "¿cuál prefieres?" NO se ofrece: ' + (await p.getByText('Si te sirven los dos, ¿cuál prefieres?').count() === 0))
    await guardarCond(p); await guardarSesion(p)
    log(`${n} respondió`)
  })
}
await corto('R520', o, async () => {
  await o.goto(urlP); await T(o, 3500)
  await o.getByRole('tab', { name: 'Mi respuesta' }).click(); await T(o, 1500)
  await siNo(o, 'A', 'Sí puedo'); await siNo(o, 'B', 'Sí puedo'); await guardarCond(o)
  await o.getByRole('tab', { name: 'Plan' }).click(); await T(o, 1200)
  await o.getByRole('button', { name: 'Buscar opción compatible' }).click(); await T(o, 7000)
  nota('R520', 'v1 con la regla "la que pueden más": ' + (await txt(o)).slice(0, 640))
  await rincon(o, 'R520', 'v1 publicada con dos planes con nombre y "la que pueden más" (qué plan ganó y por qué)', { foco: true })
  await rinconA11y(o, 'R520', 'v1 con ronda y planes (accesibilidad)', { anchos: [320, 375] })
  nota('R520', 'nota de la ronda: ' + ((await o.locator('p.nota-linea').allInnerTexts()).join(' | ') || 'sin nota de ronda'))
})
await corto('R521', o, async () => {
  const ficha = o.locator('details', { hasText: 'Ficha del plan' }).first()
  if (await ficha.count()) await ficha.locator('summary').click()
  await T(o, 500)
  const t = await txt(o)
  nota('R521', 'Cómo viene cada plan: ' + (t.match(/Cómo viene cada plan[^]{0,260}/)?.[0] ?? 'no aparece'))
  nota('R521', '¿nombres de personas junto a los totales?: ' + /Cómo viene cada plan[^]{0,260}(Ana|Beto|Caro)/.test(t) + ' (debe ser false)')
  await rincon(o, 'R521', 'Ficha del plan: "Cómo viene cada plan: pueden N · la prefieren N" solo para el organizador, sin nombres', { foco: false })
})
await corto('R522', P.anag, async () => {
  await P.anag.goto(urlP); await T(P.anag, 3500)
  const t = await txt(P.anag)
  nota('R522', 'Ana NO ve "Cómo viene cada plan": ' + !/Cómo viene cada plan/.test(t))
  await rincon(P.anag, 'R522', 'v1 vista de una invitada: sin totales de planes, con el nombre del plan elegido', { foco: false })
  nota('R522', t.slice(0, 480))
})
console.log('ERRORES', JSON.stringify(errores).slice(0, 500))
console.log(guardar('f15')); console.log(guardarA11y('a11y-f15')); await b.close()
