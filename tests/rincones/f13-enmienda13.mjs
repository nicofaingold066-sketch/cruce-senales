// Fase 13: la enmienda 13 de punta a punta en un grupo real propio (cuatro personas, una sesión cada una):
// "Respuesta en un paso" → v1 → "Si no llegan N, nadie queda comprometido" → "Así no puedo, pero sigo" (Ana y Beto, sin retirarse) →
// "Algunos no pueden así" / "Rearmar con lo nuevo" (organizador) → v2 sin confirmaciones heredadas → grupo confirmado →
// "Avisar al grupo" (version_nueva, reparacion, confirmado) y "Buscar el lugar en el mapa" → baja SIN NOMBRE.
// Todo ficticio; un grupo propio ("Rincones D hh:mm"); sin ráfagas.
import { abrir, actor, BASE, rincon, nota, guardar, boton, esperarTexto, errores, CARPETA, hora, log } from './lib.mjs'
import { rinconA11y, anunciado, focoTrasNavegar, guardarA11y } from './a11y.mjs'
import { escribir, guardarSesion } from './estado.mjs'

const b = await abrir()
const T = (p, ms = 1500) => p.waitForTimeout(ms)
const txt = async (p, sel = 'main') => (await p.locator(sel).innerText()).replace(/\s+/g, ' ').trim()
const corto = async (id, p, f) => {
  try { await f() } catch (e) {
    nota(id, `ERROR DEL GUION: ${String(e).split('\n')[0].slice(0, 240)}`)
    await p.screenshot({ path: `${CARPETA}/${id}-error.png` }).catch(() => {})
  }
}
const pestana = async (p, n) => { await p.getByRole('tab', { name: n }).click(); await T(p, 1500) }
const siNo = (p, franja, v) => p.locator('fieldset', { hasText: `Franja ${franja}` }).getByText(v, { exact: true }).click()
const guardarCond = async (p) => { await boton(p, 'Guardar condiciones').click(); await esperarTexto(p, 'Guardado', 15000) }

// ---- organizador crea el grupo D con tres integrantes anotados y una propuesta de mínimo 3 ----
const o = await actor(b, 'orgd')
await o.goto(BASE); await T(o, 4300)
await o.getByPlaceholder('Tu nombre').fill('Orga Dé'); await boton(o, 'Entrar').click(); await T(o, 2000)
await o.goto(`${BASE}/#/crear`); await T(o, 2800)
await corto('R300', o, async () => {
  await rincon(o, 'R300', 'Crear grupo con el campo "¿Quién viene?" y el ejemplo de nombre que rota', { foco: true })
  nota('R300', await txt(o))
})
await o.getByLabel('Nombre del grupo').fill(`Rincones D ${hora().slice(0, 5)}`)
for (const n of ['Ana', 'Beto', 'Caro']) { await o.getByLabel('Agregar a alguien del grupo').fill(n); await o.getByLabel('Agregar a alguien del grupo').press('Enter') }
await corto('R301', o, async () => {
  await o.getByRole('radio', { name: /Con parejas/ }).check({ force: true }); await T(o, 300)
  await rincon(o, 'R301', 'Crear grupo: "¿Quién viene?" = Con parejas (la invitación lo dirá)', { anchos: [{ n: '375', w: 375, h: 812 }, { n: '320', w: 320, h: 640 }] })
  nota('R301', await txt(o))
})
await boton(o, 'Crear grupo').click(); await o.waitForURL(/#\/e\//, { timeout: 40000 }); await T(o, 3500)
const espacioD = o.url().split('/e/')[1].split('/')[0]
const codigoD = ((await o.locator('.codigo').first().textContent()) || '').trim()
await corto('R302', o, async () => {
  nota('R302', 'nombre del grupo en pantalla: ' + (await o.locator('h1').first().innerText()).trim())
  await rincon(o, 'R302', 'Espacio del grupo con modalidad "con parejas" (nombre sin el sufijo)')
})
await corto('R303', o, async () => {
  await o.getByRole('link', { name: /Crear propuesta/ }).click(); await T(o, 2800)
  const atajos = (await o.locator('[aria-label="Atajos de actividad"] button').allInnerTexts()).map((t) => t.trim())
  nota('R303', 'atajos de actividad del grupo: ' + atajos.join(' · '))
  await rincon(o, 'R303', 'Nueva propuesta: atajos por grupo y ejemplo que rota', { foco: false })
  await o.getByLabel('Propósito de la propuesta').fill('Pádel y algo después')
  await o.getByRole('button', { name: 'Sumar uno al mínimo' }).click()
  nota('R303', 'mínimo ahora: ' + await o.locator('input[inputmode=numeric], .paso-num, [aria-live]').first().innerText().catch(() => '?'))
  await o.getByRole('button', { name: /Revisar antes de crear/ }).click(); await T(o, 800)
  nota('R303', 'paso 2: ' + (await txt(o)).slice(0, 360))
  await boton(o, 'Crear y abrir al grupo').click(); await o.waitForURL(/\/p\//, { timeout: 40000 }); await T(o, 3500)
})
const propuestaD = o.url().split('/p/')[1]
escribir({ espacioD, codigoD, propuestaD }); await guardarSesion(o)
const urlP = `${BASE}/#/e/${espacioD}/p/${propuestaD}`

// ---- Ana, Beto y Caro entran por el enlace y responden en un paso (los dos días) ----
const P = { orgd: o }
for (const n of ['Ana', 'Beto', 'Caro']) {
  const p = await actor(b, n.toLowerCase() + 'd'); P[n.toLowerCase() + 'd'] = p
  await corto(`R31${n[0]}`, p, async () => {
    await p.goto(`${BASE}/#/unirse/${codigoD}`); await T(p, 4200)
    if (n === 'Ana') {
      nota('R310', 'invitación (texto de la pantalla): ' + (await txt(p)).slice(0, 420))
      await rinconA11y(p, 'R310', '"¿Quién eres?" de un grupo con modalidad y con el plegable "¿Qué guarda CRUXE de mí?"', { anchos: [320, 375] })
    }
    await p.getByRole('button', { name: new RegExp(`^${n}`) }).click(); await T(p, 600)
    await p.getByRole('button', { name: new RegExp(`Sí, soy ${n}`) }).click()
    await p.waitForURL(/#\/e\/.*\/responder/, { timeout: 40000 }); await T(p, 3500)
    if (n === 'Ana') {
      await focoTrasNavegar(p, 'R311', 'Responder en un paso')
      await rincon(p, 'R311', 'Responder en un paso en un grupo real (sin calendario simulado; con "¿Qué guarda CRUXE de mí?")', { foco: true })
      await rinconA11y(p, 'R311', 'Responder en un paso (accesibilidad)', { anchos: [320, 375] })
      nota('R311', await txt(p))
      nota('R311', 'calendario simulado visible en un grupo real: ' + ((await p.getByRole('button', { name: /Tomar de mi calendario/ }).count()) > 0))
    }
    await p.getByRole('button', { name: /Puedo los dos días/ }).click(); await T(p, 3500)
    await esperarTexto(p, 'Respuesta guardada', 15000)
    await guardarSesion(p)
    log(`${n} respondió en un paso`)
  })
}
// el organizador carga sus condiciones y busca opción
await corto('R320', o, async () => {
  await o.goto(urlP); await T(o, 3500)
  await rincon(o, 'R320', 'Plan abierto, organizador: "Avisar al grupo" (recordatorio por WhatsApp), aviso "primero marca tu disponibilidad"', { foco: true })
  nota('R320', await txt(o))
  await anunciado(o, 'R320', 'Plan', 'Primero marca')
  await pestana(o, 'Mi respuesta')
  await rincon(o, 'R321', 'Mi respuesta del organizador en un grupo real (ayuda de retiro, sin calendario simulado)', { foco: false })
  nota('R321', await txt(o))
  await siNo(o, 'A', 'Sí puedo'); await siNo(o, 'B', 'Sí puedo'); await guardarCond(o)
  await pestana(o, 'Plan')
  await boton(o, 'Buscar opción compatible').click(); await T(o, 6500)
  await rincon(o, 'R322', 'v1 publicada, organizador: aviso "Si no llegan 3…", "Avisar al grupo" de versión nueva, mapa, así no puedo', { foco: true })
  await rinconA11y(o, 'R322', 'v1 publicada, organizador (accesibilidad)', { anchos: [320, 375] })
  nota('R322', await txt(o))
})
// Ana ve v1 y marca "Así no puedo, pero sigo"
const ana = P.anad, beto = P.betod, caro = P.carod
await corto('R330', ana, async () => {
  await ana.goto(urlP); await T(ana, 3500)
  await rincon(ana, 'R330', 'v1 publicada, vista de Ana: "Así no puedo, pero sigo" junto a confirmar', { foco: true })
  await rinconA11y(ana, 'R330', 'v1 publicada, vista de Ana (accesibilidad)', { anchos: [320, 375] })
  nota('R330', await txt(ana))
  const asi = ana.getByRole('button', { name: /Así no puedo, pero sigo/ })
  nota('R330', 'botón "Así no puedo, pero sigo": ' + await asi.count())
  await asi.click(); await T(ana, 2500)
  await anunciado(ana, 'R331', 'Así no puedo', 'Marcaste')
  await rincon(ana, 'R331', 'Ana marcó "Así no puedo, pero sigo" (no se retira, puede actualizar cuándo puede)', { foco: true })
  nota('R331', await txt(ana))
})
await corto('R332', ana, async () => {
  await pestana(ana, 'Mi respuesta')
  await rincon(ana, 'R332', 'Mi respuesta de Ana tras "así no puedo": puede cambiar sus condiciones', { foco: false })
  nota('R332', await txt(ana))
  await siNo(ana, 'A', 'No puedo'); await siNo(ana, 'B', 'Sí puedo'); await guardarCond(ana)
})
await corto('R333', o, async () => {
  await o.goto(urlP); await T(o, 3500)
  nota('R333', 'con UNA opinión, el organizador ve "Algunos no pueden así": ' + ((await o.getByText('Algunos no pueden así').count()) > 0) + ' (debe ser false: delataría a Ana)')
  await rincon(o, 'R333', 'Organizador con UNA sola opinión "así no puedo": no debe aparecer nada que delate', { foco: false })
})
await corto('R334', beto, async () => {
  await beto.goto(urlP); await T(beto, 3500)
  await beto.getByRole('button', { name: /Así no puedo, pero sigo/ }).click(); await T(beto, 2500)
  await pestana(beto, 'Mi respuesta')
  await siNo(beto, 'A', 'No puedo'); await siNo(beto, 'B', 'Sí puedo'); await guardarCond(beto)
})
await corto('R340', o, async () => {
  await o.goto(urlP); await T(o, 3500)
  await rincon(o, 'R340', 'Organizador con DOS "así no puedo": "Algunos no pueden así" y "Rearmar con lo nuevo" (sin nombres)', { foco: true })
  await rinconA11y(o, 'R340', 'Organizador con "Rearmar con lo nuevo" (accesibilidad)', { anchos: [320, 375] })
  nota('R340', await txt(o))
  nota('R340', '¿aparece algún nombre de quien opinó (Ana/Beto) cerca del aviso?: ' + /Algunos no pueden así[^]{0,400}(Ana|Beto)/.test(await txt(o)))
})
// organizador y Caro confirman v1 (2 de 3: no llega), luego se rearma
await corto('R341', o, async () => {
  await boton(o, 'Confirmar versión 1').click(); await esperarTexto(o, 'Ya confirmaste la versión 1', 20000)
  await caro.goto(urlP); await T(caro, 3500)
  await boton(caro, 'Confirmar versión 1').click(); await esperarTexto(caro, 'Ya confirmaste la versión 1', 20000)
  await o.reload(); await T(o, 3500)
  nota('R341', 'v1 con 2 de 3: ' + (await txt(o)).slice(0, 300))
})
await corto('R342', o, async () => {
  await boton(o, 'Rearmar con lo nuevo').click(); await T(o, 800)
  await rincon(o, 'R342', 'Tras tocar "Rearmar con lo nuevo" (confirmación o resultado)', { foco: true })
  nota('R342', (await txt(o)).slice(0, 500))
  const seguro = o.getByRole('button', { name: /Sí, rearmar|Rearmar/ })
  if (await o.getByText('Será la última versión').count() === 0 && await seguro.count() > 1) await seguro.last().click()
  await T(o, 6500)
  await anunciado(o, 'R343', 'v2', 'versión 2')
  await rincon(o, 'R343', 'Versión 2 publicada tras rearmar: cero aceptaciones, comparación con la v1', { foco: true })
  await rinconA11y(o, 'R343', 'v2 tras rearmar (accesibilidad)', { anchos: [320, 375] })
  nota('R343', await txt(o))
})
for (const [n, id] of [['ana', 'R350'], ['beto', 'R351'], ['caro', 'R352'], ['orgd', 'R353']]) {
  await corto(id, P[n], async () => {
    await P[n].goto(urlP); await T(P[n], 3500)
    if (n === 'ana') { await rincon(P[n], id, 'v2 vista de Ana (su "así no puedo" ya no vale: la versión es nueva)', { foco: false }); nota(id, await txt(P[n])) }
    await boton(P[n], 'Confirmar versión 2').click(); await esperarTexto(P[n], 'Ya confirmaste la versión 2', 20000); await T(P[n], 800)
  })
}
await corto('R360', o, async () => {
  await o.reload(); await T(o, 3500)
  await rincon(o, 'R360', 'GRUPO CONFIRMADO v2: "¡Se juntan!", "Avisar al grupo" con cupos libres, mapa', { foco: true })
  await rinconA11y(o, 'R360', 'Grupo confirmado (accesibilidad)', { anchos: [320, 375] })
  nota('R360', await txt(o))
  const enlaces = await o.locator('a[href^="https://wa.me"], a[href^="https://www.google.com/maps"]').evaluateAll((as) => as.map((a) => decodeURIComponent(a.getAttribute('href')).slice(0, 230)))
  nota('R360', 'enlaces externos: ' + enlaces.join(' || '))
  nota('R360', '¿algún enlace nombra a una persona (Ana/Beto/Caro/Orga)?: ' + enlaces.some((e) => /Ana|Beto|Caro|Orga/.test(e)))
})
// baja sin nombre: Caro se retira del grupo confirmado
await corto('R370', caro, async () => {
  await caro.goto(urlP); await T(caro, 3500); await pestana(caro, 'Mi respuesta')
  nota('R370', 'ayuda de retiro (ya confirmó): ' + (await txt(caro)).match(/No voy[^]{0,260}/)?.[0])
  await boton(caro, 'Retirarme de esta propuesta').click(); await T(caro, 600)
  nota('R370', 'confirmación: ' + (await txt(caro)).match(/¿Retirarte[^]{0,260}/)?.[0])
  await boton(caro, 'Sí, no voy').click(); await T(caro, 4500)
  await anunciado(caro, 'R371', 'Retiro', 'Gracias por avisar')
  await rincon(caro, 'R371', 'Caro tras retirarse: "Gracias por avisar. No hace falta contar por qué."', { foco: true })
  nota('R371', await txt(caro))
})
await corto('R372', o, async () => {
  await o.goto(urlP); await T(o, 3500)
  const t = await txt(o)
  await rincon(o, 'R372', 'Organizador tras la baja: "Una persona se retiró" sin nombre (historial, bajas, siguiente acción)', { foco: false })
  nota('R372', t.slice(0, 600))
  const fuga = [...t.matchAll(/[^.]{0,60}Caro[^.]{0,80}/g)].map((m) => m[0].trim())
  nota('R372', 'menciones de "Caro" en el texto del plan (el nodo del cruce puede nombrarlo; el texto de baja no): ' + (fuga.join(' || ') || 'ninguna'))
  nota('R372', 'frases con "se bajó"/"se retiró" y nombre: ' + ([...t.matchAll(/(Ana|Beto|Caro|Orga Dé) (se bajó|se retiró)/g)].map((m) => m[0]).join(' || ') || 'ninguna'))
  await pestana(o, 'Historial'); await T(o, 1500)
  const h = await txt(o)
  nota('R372', 'Historial: ' + (h.match(/Historial[^]{0,500}/)?.[0] ?? ''))
  await rincon(o, 'R373', 'Historial tras la baja sin nombre', { foco: false })
})
for (const n of Object.keys(P)) await guardarSesion(P[n])
console.log('ERRORES', JSON.stringify(errores).slice(0, 500))
console.log(guardar('f13')); console.log(guardarA11y('a11y-f13')); await b.close()
