// (g) Carreras: acciones simultáneas sobre lo mismo, en producción. Mismo lugar de la lista reclamado por 5 teléfonos a la vez, mismo nombre
// escrito por 5 a la vez, doble toque en «Confirmar», la misma persona desde dos aparatos, doble toque en «Buscar opción compatible»,
// y «Cancelar la propuesta» mientras alguien confirma.
//   node tests/qa-gente/g-carreras.mjs [url]
import { BASE, conTurno, lanzar, Informe, Persona, crearPlan, leerCodigo, entrarPorEnlace, esperarDestino, responderRapido, montar, estadoPlan, textoMain, tablaRpc } from './lib.mjs'
import { irA } from '../e2e/nav.mjs'
const sello = new Date().toLocaleString('sv-SE', { timeZone: 'America/Santiago' }).replace(/\D/g, '').slice(8, 12)
const inf = new Informe('g-carreras'); const todas = []
const plano = async (p) => (await textoMain(p)).replace(/\s+/g, ' ')
const verPlan = async (p, url) => { await p.goto(url); await p.reload(); await p.locator('.estado-hero-etiqueta').first().waitFor({ timeout: 30000 }) }
const cuenta = (per, fn, desde = 0) => { const m = {}; for (const r of per.rpc.slice(desde).filter((x) => x.fn === fn)) { const k = `${r.status}:${r.codigo ?? 'ok'}`; m[k] = (m[k] ?? 0) + 1 } return m }
const suma = (lista) => lista.reduce((a, m) => { for (const [k, v] of Object.entries(m)) a[k] = (a[k] ?? 0) + v; return a }, {})
async function escenario(nombre, f) {
  if (process.env.QA_SOLO && !new RegExp(process.env.QA_SOLO).test(nombre)) return
  const ab = []
  try { await f(ab); inf.ok(nombre, true) } catch (e) { inf.ok(nombre, false, String(e.message).split('\n')[0].slice(0, 220)); for (const p of ab) await p.captura(`g-fallo-${nombre.split(' ')[0]}-${p.nombre.split(' ')[0]}`) }
  finally { todas.push(...ab) }
}
await conTurno('qa-gente (g) carreras: mismo nombre, doble toque, dos aparatos, cancelar mientras confirman', async () => {
  const browser = await lanzar()
  try {
    await escenario('g1/g2 cinco teléfonos reclaman el mismo lugar y escriben el mismo nombre a la vez', async (ab) => {
      const g = await montar(browser, { grupo: `Carrera ${sello}`, organiza: 'Olga G', nombres: ['Rosa G'], minimo: 2, maximo: 6, entrar: false }); ab.push(g.org)
      const cinco = await Promise.all([1, 2, 3, 4, 5].map((i) => new Persona(browser, `Rosa G`).abrir())); ab.push(...cinco)
      // g1: todos abren el enlace; barrera; todos tocan «Rosa G» (y «Sí, soy Rosa G») a la vez.
      await Promise.all(cinco.map((p) => p.page.goto(`${BASE}/#/unirse/${g.codigo}`)))
      await Promise.all(cinco.map((p) => p.page.getByRole('button', { name: 'Rosa G', exact: true }).waitFor({ timeout: 40000 })))
      await Promise.all(cinco.map(async (p) => { await p.page.getByRole('button', { name: 'Rosa G', exact: true }).click(); const si = p.page.getByRole('button', { name: 'Sí, soy Rosa G', exact: true }); if (await si.isVisible({ timeout: 1200 }).catch(() => false)) await si.click() }))
      await Promise.all(cinco.map((p) => p.page.waitForTimeout(5000)))
      const j = suma(cinco.map((p) => cuenta(p, 'join_space')))
      const entraron = await Promise.all(cinco.map(async (p) => (await p.page.getByRole('heading', { name: '¿Cuándo puedes?' }).count()) + (await p.page.getByRole('heading', { name: `Carrera ${sello}` }).count()) > 0))
      inf.ok('g1: cinco toques simultáneos en «Rosa G»: exactamente un teléfono la reclama', entraron.filter(Boolean).length === 1, `join_space ${JSON.stringify(j)}; ${entraron.filter(Boolean).length} dentro`)
      const perdedor = cinco[entraron.findIndex((x) => !x)]; if (perdedor) { await perdedor.captura('g1-quien-pierde-la-carrera'); inf.ok('g1: quien pierde ve un mensaje claro', !/Falla temporal|undefined/.test(await plano(perdedor.page)), (await plano(perdedor.page)).slice(0, 220)) }
      // g2: los 5 (ya con sesión propia o no) escriben el mismo nombre nuevo a la vez
      const otros = await Promise.all([1, 2, 3, 4, 5].map(() => new Persona(browser, 'Zeta G').abrir())); ab.push(...otros)
      await Promise.all(otros.map((p) => p.page.goto(`${BASE}/#/unirse/${g.codigo}`)))
      await Promise.all(otros.map(async (p) => { await p.page.getByRole('heading', { name: /^(¿Quién eres\?|Escribe tu nombre para entrar)$/ }).waitFor({ timeout: 40000 }); const no = p.page.getByRole('button', { name: /No estoy en la lista/ }); if (await no.isVisible().catch(() => false)) await no.click(); await p.page.getByLabel(/Tu nombre/).first().fill('Zeta G') }))
      await Promise.all(otros.map((p) => p.page.getByRole('button', { name: /^(Unirme|Entrar)$/ }).first().click()))
      await Promise.all(otros.map((p) => p.page.waitForTimeout(5000)))
      const j2 = suma(otros.map((p) => cuenta(p, 'join_space')))
      inf.ok('g2: cinco teléfonos escriben «Zeta G» a la vez: entra uno y los demás reciben «nombre en uso»', (j2['200:ok'] ?? 0) === 1 && (j2['200:entrada_incompleta:nombre_en_uso'] ?? 0) === 4, JSON.stringify(j2))
      await g.org.page.goto(g.urlEspacio); await g.org.page.reload(); await g.org.page.locator('.codigo').first().waitFor()
      inf.ok('g1/g2: el grupo termina con 3 personas (organizadora, Rosa, Zeta), sin duplicados', /3 personas/.test(await plano(g.org.page)), (await plano(g.org.page)).match(/\d+ personas/)?.[0])
    })

    await escenario('g3 doble toque en «Confirmar» y g4 la misma persona desde dos aparatos', async (ab) => {
      const g = await montar(browser, { grupo: `Doble ${sello}`, organiza: 'Ivo G', nombres: ['Juana G', 'Karl G'], minimo: 3, maximo: 3 }); ab.push(g.org, ...g.invitados)
      const [juana, karl] = g.invitados; for (const i of g.invitados) await responderRapido(i, 'dos')
      const p = g.org.page; await verPlan(p, g.urlPlan); await irA(p, 'Mi respuesta'); await responderRapido(g.org, 'dos'); await irA(p, 'Plan')
      // g5: doble toque en «Buscar opción compatible»
      const b = p.getByRole('button', { name: /^Buscar opción compatible/ }); await b.waitFor({ timeout: 20000 })
      const a0 = g.org.rpc.length
      await Promise.all([b.click(), b.click({ delay: 10 }).catch(() => {})]); await p.waitForTimeout(3500)
      const ev = cuenta(g.org, 'evaluate_and_publish', a0)
      const tp = await plano(p)
      inf.ok('g5: doble toque en «Buscar opción compatible» deja una sola versión (v1) y sin error', /Confirmar versión 1/.test(tp) && !/versión 2/i.test(tp) && !/Falla temporal/.test(tp), `evaluate_and_publish ${JSON.stringify(ev)}`)
      // g3: Juana toca dos veces seguidas
      await verPlan(juana.page, g.urlPlan); const bj = juana.page.getByRole('button', { name: /^Confirmar versión 1/ }); await bj.waitFor({ timeout: 30000 })
      const j0 = juana.rpc.length; await Promise.all([bj.click(), bj.click({ delay: 20, timeout: 3000 }).catch(() => {})]); await juana.page.waitForTimeout(3500)
      const ac = cuenta(juana, 'accept_version', j0)
      inf.ok('g3: doble toque en «Confirmar»: una sola confirmación, la segunda no rompe nada', /Ya confirmaste/.test(await plano(juana.page)) && !/Falla temporal/.test(await plano(juana.page)), `accept_version ${JSON.stringify(ac)}`)
      // g4: Karl abre el plan en dos aparatos (misma sesión) y confirma en ambos a la vez
      const estado = await karl.ctx.storageState()
      const k2c = await browser.newContext({ storageState: estado, viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true, locale: 'es-CL' })
      const k2 = new Persona(browser, 'Karl G (aparato 2)'); k2.ctx = k2c; k2.page = await k2c.newPage(); k2.rpc = []; k2.errores = []; k2.malas = []
      k2.page.on('response', async (r) => { if (!r.url().includes('/rest/v1/rpc/')) return; let c = null; try { const jj = await r.json(); if (jj && jj.ok === false) c = jj.error?.codigo + ':' + jj.error?.detalle } catch {} k2.rpc.push({ fn: r.url().split('/').pop().split('?')[0], status: r.status(), codigo: c, ms: null }) })
      ab.push(k2)
      await verPlan(karl.page, g.urlPlan); await verPlan(k2.page, g.urlPlan)
      const b1 = karl.page.getByRole('button', { name: /^Confirmar versión 1/ }), b2 = k2.page.getByRole('button', { name: /^Confirmar versión 1/ })
      await Promise.all([b1.waitFor({ timeout: 30000 }), b2.waitFor({ timeout: 30000 })])
      const k0 = karl.rpc.length
      await Promise.all([b1.click(), b2.click()]); await Promise.all([karl.page.waitForTimeout(4000), k2.page.waitForTimeout(4000)])
      const c1 = cuenta(karl, 'accept_version', k0), c2 = cuenta(k2, 'accept_version')
      await verPlan(p, g.urlPlan)
      const det = p.locator('details', { has: p.locator('summary', { hasText: /Quién confirmó/ }) }).first(); if (await det.count()) { await det.locator('summary').first().click().catch(() => {}); await p.waitForTimeout(500) }
      const t = await plano(p)
      const n = Number((t.match(/(\d+) de \d+ confirmaron/) ?? t.match(/(\d+) confirmaron/) ?? t.match(/Confirmaron (\d+)/))?.[1] ?? NaN)
      // Confirmaron Juana y Karl (2); la organizadora todavía no. Si dice 3, Karl se contó dos veces.
      inf.ok('g4: la misma persona confirmando desde dos aparatos a la vez cuenta UNA vez (2 de 3: Juana y Karl)', n === 2, `aparato1 ${JSON.stringify(c1)} aparato2 ${JSON.stringify(c2)}; dice «${t.match(/\d+ de \d+ confirmaron[^.]{0,60}|Confirmaron:[^.]{0,80}/g)?.join(' | ')}»; estado «${await estadoPlan(p)}»`)
      await k2.captura('g4-segundo-aparato')
    })

    // g4b: consecuencia del g4. Tres intentos: Karl confirma desde dos aparatos a la vez; luego confirma la organizadora (la que no puede faltar).
    // Con mínimo 3 y máximo 3 el grupo real son 3 personas: tiene que llegar a «¡Se juntan!» con 3, no quedar sin cupo para la organizadora.
    for (const intento of [1, 2, 3]) await escenario(`g4b intento ${intento}: carrera de la misma persona y luego confirma la organizadora`, async (ab) => {
      const g = await montar(browser, { grupo: `Dup${intento} ${sello}`, organiza: 'Ivo H', nombres: ['Juana H', 'Karl H'], minimo: 3, maximo: 3 }); ab.push(g.org, ...g.invitados)
      const [juana, karl] = g.invitados; for (const i of g.invitados) await responderRapido(i, 'dos')
      const p = g.org.page; await verPlan(p, g.urlPlan); await irA(p, 'Mi respuesta'); await responderRapido(g.org, 'dos'); await irA(p, 'Plan')
      await p.getByRole('button', { name: /^Buscar opción compatible/ }).click(); await p.getByRole('button', { name: /^Confirmar versión 1/ }).waitFor({ timeout: 30000 })
      const estado = await karl.ctx.storageState()
      const c2 = await browser.newContext({ storageState: estado, viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true, locale: 'es-CL' })
      await c2.addInitScript(() => { try { localStorage.setItem('cruxe:entrada-vista', '1') } catch {} })
      const pg2 = await c2.newPage(); const r2 = []
      pg2.on('response', async (r) => { if (!r.url().includes('/rest/v1/rpc/accept_version')) return; let c = 'ok'; try { const jj = await r.json(); if (jj && jj.ok === false) c = jj.error?.codigo + ':' + jj.error?.detalle } catch {} r2.push(c) })
      ab.push({ nombre: 'k2', cerrar: () => c2.close(), captura: async () => {}, rpc: [], errores: [], page: pg2 })
      await verPlan(karl.page, g.urlPlan); await pg2.goto(g.urlPlan); await pg2.reload(); await pg2.locator('.estado-hero-etiqueta').first().waitFor({ timeout: 30000 })
      const b1 = karl.page.getByRole('button', { name: /^Confirmar versión 1/ }), b2 = pg2.getByRole('button', { name: /^Confirmar versión 1/ })
      await Promise.all([b1.waitFor({ timeout: 30000 }), b2.waitFor({ timeout: 30000 })])
      const k0 = karl.rpc.length
      await Promise.all([b1.click(), b2.click()]); await karl.page.waitForTimeout(4000)
      const r1 = cuenta(karl, 'accept_version', k0)
      await verPlan(p, g.urlPlan); const antes = await plano(p)
      const nAntes = antes.match(/(\d+) de \d+ confirmaron/)?.[1]
      inf.ok(`g4b.${intento}: tras la carrera el plan dice «1 de 3 confirmaron» (Karl una vez)`, nAntes === '1', `aparato1 ${JSON.stringify(r1)} aparato2 ${JSON.stringify(r2)}; dice «${antes.match(/\d+ de \d+ confirmaron[^.]{0,70}/)?.[0]}»`)
      // Juana confirma (otra persona) y la organizadora confirma al final: el plan debe cerrar.
      await verPlan(juana.page, g.urlPlan); await juana.page.getByRole('button', { name: /^Confirmar versión 1/ }).click(); await juana.page.waitForTimeout(2500)
      await verPlan(p, g.urlPlan); const b = p.getByRole('button', { name: /^Confirmar versión 1/ })
      if (await b.count()) { const o0 = g.org.rpc.length; await b.first().click(); await p.waitForTimeout(3000); inf.ok(`g4b.${intento}: la organizadora puede confirmar al final (hay cupo para ella)`, true, JSON.stringify(cuenta(g.org, 'accept_version', o0))) }
      await verPlan(p, g.urlPlan); const fin = await plano(p)
      inf.ok(`g4b.${intento}: el plan termina en «¡Se juntan!» con 3 reales (no «4 confirmaron» ni sin cupo)`, /Se juntan|Grupo confirmado/.test(await estadoPlan(p)) && !/\b4 de \d+ confirmaron/.test(fin), `estado «${await estadoPlan(p)}»; «${fin.match(/\d+ de \d+ confirmaron[^.]{0,60}|Cupos disponibles: \d+|No se pudo completar[^.]*\./g)?.join(' | ')}»`)
      await g.org.captura(`g4b-${intento}-final`)
    })

    await escenario('g7 la organizadora cancela mientras otros responden', async (ab) => {
      const g = await montar(browser, { grupo: `Cancela ${sello}`, organiza: 'Lia G', nombres: ['Marc G', 'Nora G', 'Omar G'], minimo: 3, maximo: 4 }); ab.push(g.org, ...g.invitados)
      const p = g.org.page; await verPlan(p, g.urlPlan)
      // Se abre «¿Cuándo puedes?» en los tres teléfonos y se deja listo el toque.
      for (const q of g.invitados) { await q.page.goto(g.urlPlan.replace(/\/p\/.*/, '/responder/' + g.urlPlan.split('/p/')[1])); await q.page.getByRole('heading', { name: '¿Cuándo puedes?' }).waitFor({ timeout: 30000 }) }
      await p.getByRole('button', { name: /^Cancelar la propuesta$/ }).click()
      const si = p.getByRole('button', { name: 'Sí, cancelar', exact: true }); await si.waitFor({ timeout: 10000 })
      const pre = g.invitados.map((q) => q.rpc.length)
      await Promise.all([si.click(), ...g.invitados.map((q) => q.page.getByRole('button', { name: /^Puedo (los dos|en los dos)/ }).first().click().catch(() => {}))])
      await Promise.all(g.invitados.map((q) => q.page.waitForTimeout(4500)))
      const res = suma(g.invitados.map((q, i) => cuenta(q, 'save_my_conditions', pre[i])))
      await verPlan(p, g.urlPlan)
      const est = await estadoPlan(p)
      inf.ok('g7: queda «Cancelado»; lo que alguien alcanzó a responder se guarda o se rechaza con código claro (nada de 500)', /Cancelad/i.test(est) && Object.keys(res).every((k) => k.startsWith('200:')), `estado «${est}»; save_my_conditions ${JSON.stringify(res)}`)
      const q0 = g.invitados[0]; await q0.page.waitForTimeout(500)
      inf.ok('g7: quien respondía en ese instante no queda con una pantalla rota', !/Falla temporal|undefined/.test(await plano(q0.page)), (await plano(q0.page)).slice(0, 200))
      await q0.captura('g7-invitado-al-cancelarse')
    })

    // g8 (H2 de la vuelta 1): ¿puede la organizadora cancelar el plan con una versión publicada y con ¡Se juntan!? (QA_SOLO=g8 para correr solo este)
    await escenario('g8 la organizadora cancela con versión publicada y con ¡Se juntan!', async (ab) => {
      const g = await montar(browser, { grupo: `Cancela2 ${sello}`, organiza: 'Pia G', nombres: ['Quin G'], minimo: 2, maximo: 3 }); ab.push(g.org, ...g.invitados)
      const quin = g.invitados[0]; const p = g.org.page
      await responderRapido(quin, 'dos'); await verPlan(p, g.urlPlan); await irA(p, 'Mi respuesta'); await responderRapido(g.org, 'dos'); await irA(p, 'Plan')
      await p.getByRole('button', { name: /^Buscar opción compatible$/ }).click(); await p.getByRole('button', { name: /^Confirmar versión 1/ }).waitFor({ timeout: 30000 }); await p.waitForTimeout(1200)
      const botones = async (q) => (await q.getByRole('button').allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim()).filter((t) => /cancel|retir|no puedo|no voy/i.test(t)).join(' | ')
      const hay1 = await p.getByRole('button', { name: /^Cancelar la propuesta$/ }).count()
      inf.ok('g8: con la versión publicada («Esperando confirmaciones») la organizadora tiene «Cancelar la propuesta»', hay1 > 0, `estado «${await estadoPlan(p)}»; controles de salida: ${await botones(p) || 'ninguno'}`)
      await g.org.captura('g8-esperando-confirmaciones')
      await p.getByRole('button', { name: /^Confirmar versión 1/ }).click(); await p.waitForTimeout(1800)
      await verPlan(quin.page, g.urlPlan); await quin.page.getByRole('button', { name: /^Confirmar versión 1/ }).click()
      await quin.page.locator('.estado-hero-etiqueta').filter({ hasText: /¡Se juntan!|Grupo confirmado/ }).first().waitFor({ timeout: 30000 })
      await verPlan(p, g.urlPlan)
      const hay2 = await p.getByRole('button', { name: /^Cancelar la propuesta$/ }).count()
      inf.ok('g8: con ¡Se juntan! la organizadora tiene «Cancelar la propuesta»', hay2 > 0, `estado «${await estadoPlan(p)}»; controles de salida: ${await botones(p) || 'ninguno'}`)
      await g.org.captura('g8-se-juntan')
    })
  } finally {
    const t = tablaRpc(todas); console.log('RPC:\n' + t.texto); console.log('Errores RPC: ' + JSON.stringify(t.errores))
    const consola = todas.flatMap((p) => p.errores.map((e) => `${p.nombre}: ${e}`)).slice(0, 6)
    inf.ok('sin errores de consola', consola.length === 0, consola.join(' | '))
    for (const p of todas) await p.cerrar(); await browser.close()
  }
})
inf.fin()
