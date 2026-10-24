// Auditoría de los bancos sin base de friccion (enmienda 13: "Así no puedo, pero sigo" y "¿Quién viene?"). Usa el servidor de
// desarrollo propio (puerto 4188). Pasa por cada estado del banco: sin opinión → con opinión → deshacer, y cada opción de
// "¿Quién viene?". Captura, auditoría visual y de accesibilidad en 320/375/768/1280, texto y anuncios.
import { abrir, actor, rincon, nota, guardar, errores, CARPETA, log } from './lib.mjs'
import { rinconA11y, anunciado, guardarA11y } from './a11y.mjs'
const URL = process.argv[2] || 'http://localhost:4188/src/friccion/prueba/enmienda13.html'
const b = await abrir(); const p = await actor(b, 'banco')
const txt = async () => (await p.locator('main').innerText()).replace(/\s+/g, ' ').trim().slice(0, 700)
await p.goto(URL); await p.waitForTimeout(1500)
nota('B00', 'estado inicial: ' + await txt())
await rincon(p, 'B00', 'Banco enmienda 13: "Así no puedo" y "¿Quién viene?" sin tocar nada', { foco: true })
await rinconA11y(p, 'B00', 'Banco enmienda 13: estado inicial')
// "Así no puedo, pero sigo"
const asi = p.getByRole('button', { name: /Así no puedo/ })
nota('B01', `botón "Así no puedo…" presente: ${await asi.count()}`)
if (await asi.count()) {
  await asi.first().click(); await p.waitForTimeout(100)
  nota('B01', 'mientras guarda: ' + await txt())
  await p.waitForTimeout(700)
  nota('B01', 'después de opinar: ' + await txt())
  await anunciado(p, 'B01', 'Así no puedo', 'Marcaste')
  await rincon(p, 'B01', 'Banco: tras marcar "Así no puedo, pero sigo"', { foco: true })
  await rinconA11y(p, 'B01', 'Banco: con opinión marcada')
  const deshacer = p.getByRole('button', { name: /Cambié de idea|Deshacer|Retirar|Volver|puedo/i })
  nota('B02', 'botones tras opinar: ' + (await p.locator('main button').allInnerTexts()).map((t) => t.replace(/\s+/g, ' ')).join(' | '))
}
// ¿Quién viene?
const opciones = p.getByRole('radio')
nota('B03', `opciones de "¿Quién viene?": ${await opciones.count()} → ${(await p.locator('fieldset label, [role=radiogroup] label').allInnerTexts()).map((t) => t.replace(/\s+/g, ' ')).join(' | ')}`)
for (let i = 0; i < await opciones.count(); i++) {
  await opciones.nth(i).check({ force: true }).catch(() => opciones.nth(i).click())
  await p.waitForTimeout(150)
  nota('B03', `opción ${i + 1} → título del grupo: "${(await p.locator('#titulo').innerText()).trim()}"`)
}
await rincon(p, 'B03', 'Banco: "¿Quién viene?" con una opción elegida', { foco: true })
await rinconA11y(p, 'B03', 'Banco: "¿Quién viene?"')
nota('B04', 'llamadas simuladas: ' + JSON.stringify(await p.evaluate(() => window.llamadas)))
console.log('ERRORES', JSON.stringify(errores).slice(0, 300)); console.log(guardar('banco')); console.log(guardarA11y('a11y-banco')); await b.close()
