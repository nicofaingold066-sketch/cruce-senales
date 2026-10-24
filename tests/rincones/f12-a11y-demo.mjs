// Fase 12: accesibilidad a fondo en los rincones de la DEMO, en el orden en que los vería el jurado: portada, demo de Tomi,
// nueva propuesta, plan, un jurado que entra por el enlace y responde en un paso con el calendario simulado, condiciones,
// Simulación, v1, confirmación, grupo confirmado, baja, alternativa, historial. Para cada rincón: estructura para lector de
// pantalla (árbol accesible guardado en <id>-aria.yml), recorrido con Tab, contraste sobre píxeles, 320 px y espaciado.
// Además: qué anuncia el lector tras cada acción y dónde queda el foco al cambiar de pantalla; movimiento reducido.
// Crea su propio demo (no toca el de nadie) y no llama al agente.
import { abrir, actor, BASE, nota, guardar, boton, esperarTexto, errores, CARPETA, log, revisar } from './lib.mjs'
import { rinconA11y, anunciado, focoTrasNavegar, guardarA11y } from './a11y.mjs'
import { escribir, guardarSesion } from './estado.mjs'

const b = await abrir()
const t = await actor(b, 'tomi-a11y')
const T = (p, ms = 1500) => p.waitForTimeout(ms)
const txt = async (p) => (await p.locator('main').innerText()).replace(/\s+/g, ' ').slice(0, 300)
const corto = async (id, p, f) => {
  try { await f() } catch (e) {
    nota(id, `ERROR DEL GUION: ${String(e).split('\n')[0].slice(0, 220)}`)
    await p.screenshot({ path: `${CARPETA}/${id}-error.png` }).catch(() => {})
  }
}
const pestana = async (p, n) => { await p.getByRole('tab', { name: n }).click(); await T(p, 1500) }

// A00 portada
await t.goto(BASE); await T(t, 4300)
await rinconA11y(t, 'A00', 'Portada sin nombre (lo primero que ve el jurado)')

// A01 demo
let codigo = ''
await corto('A01', t, async () => {
  await boton(t, /^Probar la demo «Los del (asado|finde)»$/).click()
  await t.waitForURL(/#\/e\//, { timeout: 40000 }); await T(t, 4500)
  await focoTrasNavegar(t, 'A01', 'Demo recién creado')
  codigo = ((await t.locator('.codigo').first().textContent()) || '').trim()
  escribir({ demoA11y: t.url().split('/e/')[1].split('/')[0] }); await guardarSesion(t)
  await rinconA11y(t, 'A01', 'Demo: espacio "Los del finde" recién creado (Tomi)')
})

// A02-A04 nueva propuesta y plan
await corto('A02', t, async () => {
  await t.getByRole('link', { name: /Crear propuesta/ }).first().click(); await T(t, 2500)
  await focoTrasNavegar(t, 'A02', 'Nueva propuesta')
  await rinconA11y(t, 'A02', 'Demo: Nueva propuesta precargada, paso 1')
  await revisar(t); await T(t, 900)
  await focoTrasNavegar(t, 'A03', 'Paso 2')
  await rinconA11y(t, 'A03', 'Demo: Nueva propuesta, paso 2 (revisar y crear)', { anchos: [320, 375] })
  await boton(t, 'Crear y abrir al grupo').click()
  await t.waitForURL(/\/p\//, { timeout: 40000 }); await T(t, 3500)
  await focoTrasNavegar(t, 'A04', 'Plan')
  await rinconA11y(t, 'A04', 'Demo: propuesta abierta, pestaña Plan (reuniendo interés)')
})

// A10-A14 jurado entra por el enlace ANTES de cargar el caso (Luna sin actividad → reclamable) y responde en un paso
const j = await actor(b, 'jurado-a11y')
await corto('A10', j, async () => {
  await j.goto(`${BASE}/#/unirse/${codigo}`); await T(j, 4500)
  await focoTrasNavegar(j, 'A10', '¿Quién eres? demo')
  await rinconA11y(j, 'A10', 'Jurado: "¿Quién eres?" del demo (personas simuladas reclamables)')
  await j.getByRole('button', { name: /^Luna/ }).first().click(); await T(j, 700)
  await rinconA11y(j, 'A11', 'Jurado: "¿Eres Luna?"', { anchos: [375], teclado: true })
  await j.getByRole('button', { name: /Sí, soy Luna/ }).click()
  await j.waitForURL(/#\/e\//, { timeout: 40000 }); await T(j, 3500)
  nota('A12', 'URL al entrar: ' + j.url().replace(BASE, ''))
  await focoTrasNavegar(j, 'A12', 'Responder en un paso')
  await guardarSesion(j)
  await rinconA11y(j, 'A12', 'Jurado: "Respuesta en un paso" en el demo, con "Tomar de mi calendario (Simulación)"')
})
await corto('A13', j, async () => {
  await j.getByRole('button', { name: /Tomar de mi calendario/ }).click(); await T(j, 600)
  await rinconA11y(j, 'A13', 'Jurado: agenda ficticia desplegada', { anchos: [320, 375] })
  await j.getByRole('button', { name: /Ver qué sugiere mi agenda|Marcar lo que dice mi agenda|Usar esta agenda/ }).click(); await T(j, 900) // el rótulo cambió el 24/10 (friccion)
  await anunciado(j, 'A13', 'Agenda', 'Tu agenda ficticia sugiere')
  const enfocado = await j.evaluate(() => { const e = document.activeElement; return e && e.id && e.id.startsWith('rapida-') ? e.id : '' })
  nota('A13', 'tras "Marcar lo que dice mi agenda", el foco va a la opción sugerida: ' + (enfocado || 'no'))
  if (enfocado) await j.keyboard.press('Enter'); else await j.locator('[id^=rapida-]').first().click()
  await T(j, 3500)
  await focoTrasNavegar(j, 'A14', 'Respuesta guardada')
  await anunciado(j, 'A14', 'Respuesta guardada', 'Respuesta guardada')
  await rinconA11y(j, 'A14', 'Jurado: "Respuesta guardada" (interés opcional, ver el plan, cambiar)')
  nota('A14', await txt(j))
})

// A05 Tomi: Mi respuesta y anuncio de guardado
await corto('A05', t, async () => {
  await pestana(t, 'Mi respuesta')
  await rinconA11y(t, 'A05', 'Demo: Mi respuesta (interés y condiciones por franja)')
  for (const f of ['A', 'B']) await t.locator('fieldset', { hasText: `Franja ${f}` }).getByText('Sí puedo', { exact: true }).click()
  await boton(t, 'Guardar condiciones').click(); await esperarTexto(t, 'Guardado', 15000); await T(t, 500)
  await anunciado(t, 'A05', 'Mi respuesta', 'Guardado. Solo tú ves estas condiciones.')
  await boton(t, 'Me interesa').click(); await esperarTexto(t, 'Marcaste "Me interesa"', 15000); await T(t, 400)
  await anunciado(t, 'A05', 'Mi respuesta', 'Marcaste "Me interesa"')
})

// A06 Simulación: cargar el caso (Luna ya es real)
await corto('A06', t, async () => {
  await pestana(t, 'Simulación')
  await rinconA11y(t, 'A06', 'Demo: pestaña Simulación (atajos y personas simuladas)')
  await t.getByRole('button', { name: /Cargar condiciones del caso/ }).click(); await T(t, 5500)
  nota('A06', 'tras cargar el caso con Luna real: ' + await txt(t))
  await anunciado(t, 'A06', 'Simulación', 'con condiciones')
})

// A07 buscar opción → v1
await corto('A07', t, async () => {
  await pestana(t, 'Plan')
  await t.getByRole('button', { name: /Buscar opción compatible|Volver a buscar opción/ }).first().click(); await T(t, 6500)
  await anunciado(t, 'A07', 'v1', 'Te toca confirmar la versión 1')
  await rinconA11y(t, 'A07', 'Demo: opción v1 publicada (esperando compromisos), organizador')
})

// A15 Luna (jurado) ve v1 y confirma
await corto('A15', j, async () => {
  await j.getByRole('link', { name: /Ver el plan/ }).first().click().catch(async () => { await j.goto(t.url()) })
  await T(j, 3500)
  await focoTrasNavegar(j, 'A15', 'Plan v1 (jurado)')
  await rinconA11y(j, 'A15', 'Jurado (Luna): plan con v1, "Te toca confirmar"', { anchos: [320, 375] })
  await boton(j, 'Confirmar versión 1').click(); await esperarTexto(j, 'Ya confirmaste la versión 1', 20000); await T(j, 500)
  await anunciado(j, 'A15', 'Confirmó', 'Ya confirmaste la versión 1')
})

// A08 Tomi confirma, los simulados aceptan → grupo confirmado
await corto('A08', t, async () => {
  await boton(t, 'Confirmar versión 1').click(); await esperarTexto(t, 'Ya confirmaste la versión 1', 20000); await T(t, 500)
  await anunciado(t, 'A08', 'Confirmó', 'Ya confirmaste la versión 1')
  await pestana(t, 'Simulación')
  await t.getByRole('button', { name: /^Aceptar versión 1 por / }).first().click(); await T(t, 5000)
  await pestana(t, 'Plan'); await T(t, 1500)
  nota('A08', await txt(t))
  await anunciado(t, 'A08', 'Grupo confirmado', 'Grupo confirmado')
  const confeti = await t.evaluate(() => [...document.querySelectorAll('canvas, .confeti, [class*=confeti]')].map((e) => `${e.tagName.toLowerCase()}.${e.className} aria-hidden=${e.getAttribute('aria-hidden')}`).join('; '))
  nota('A08', 'confeti: ' + (confeti || 'sin elemento de confeti'))
  await rinconA11y(t, 'A08', 'Demo: GRUPO CONFIRMADO ("¡Se juntan!", Calendario, WhatsApp)')
})

// A09 baja simulada → revisión → alternativa
await corto('A09', t, async () => {
  await pestana(t, 'Simulación')
  const baja = t.getByRole('button', { name: /^Se baja: (Mati|Caro)/ }).first()
  // S7: el botón visible dice «Se baja»; el nombre de la persona está en el nombre accesible («Se baja: Caro»).
  const quien = ((await baja.getAttribute('aria-label')) ?? (await baja.innerText())).replace('Se baja: ', '').trim()
  await baja.click(); await T(t, 500)
  await rinconA11y(t, 'A09a', `Demo: confirmación "¿Dar de baja a ${quien}?"`, { anchos: [375] })
  await t.getByRole('button', { name: new RegExp(`Sí, ${quien} se baja`) }).click(); await T(t, 5000)
  await pestana(t, 'Plan'); await T(t, 1000)
  nota('A09', await txt(t))
  await anunciado(t, 'A09', 'Revisión', 'En revisión')
  await rinconA11y(t, 'A09', 'Demo: EN REVISIÓN tras una baja simulada (aviso, Buscar alternativa, bajas registradas)')
  const alt = t.getByRole('button', { name: /Buscar alternativa/ })
  if (await alt.count()) {
    await alt.click(); await T(t, 6500)
    nota('A09b', await txt(t))
    await rinconA11y(t, 'A09b', 'Demo: resultado de "Buscar alternativa" (v2 o sin alternativa)')
  }
})

// A16 historial
await corto('A16', t, async () => {
  await pestana(t, 'Historial')
  await rinconA11y(t, 'A16', 'Demo: Historial (acciones con rótulo Simulación)', { anchos: [320, 375] })
})

// A20 movimiento reducido: entrada, órbita y confeti quietos
await corto('A20', t, async () => {
  const ctx = await b.newContext({ viewport: { width: 375, height: 812 }, locale: 'es-CL', reducedMotion: 'reduce' })
  const r = await ctx.newPage(); r.actor = 'reducido'
  await r.goto(BASE); await T(r, 1200)
  const estado = await r.evaluate(() => ({
    intro: !!document.querySelector('.entrada, .intro, [class*=entrada]'),
    animaciones: document.getAnimations().filter((a) => a.playState === 'running').length,
    orbita: (() => { const o = document.querySelector('.orbita'); if (!o) return 'sin órbita'; const s = getComputedStyle(o); const hijos = [...o.querySelectorAll('*')].filter((e) => getComputedStyle(e).animationName !== 'none').length; return `animación propia: ${s.animationName}, hijos animados: ${hijos}` })(),
  }))
  nota('A20', `con prefers-reduced-motion: intro visible=${estado.intro}, animaciones corriendo=${estado.animaciones}, órbita → ${estado.orbita}`)
  await r.screenshot({ path: `${CARPETA}/A20-375.png` }).catch(() => {})
  await ctx.close()
})

console.log('ERRORES', JSON.stringify(errores).slice(0, 600))
console.log(guardar('f12'))
console.log(guardarA11y('a11y-demo'))
await b.close()
