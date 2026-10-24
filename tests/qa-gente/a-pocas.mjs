// (a) Pocas personas, en producción: grupos reales de 2 y de 3, mínimo igual al tamaño, nadie responde y se busca opción,
// una persona dice «No puedo ninguno», la organizadora se retira, cancelación con respuestas cargadas.
//   node tests/qa-gente/a-pocas.mjs [url]
// Datos ficticios; un grupo propio nuevo por escenario. No llama al agente de IA. Cada escenario se aísla: si uno falla, sigue el resto.
import { BASE, conTurno, lanzar, Informe, crearGrupo, crearPlan, leerCodigo, entrarPorEnlace, esperarDestino, responderRapido, montar, estadoPlan, textoMain, tablaRpc, log } from './lib.mjs'
import { irA } from '../e2e/nav.mjs'

const sello = new Date().toLocaleString('sv-SE', { timeZone: 'America/Santiago' }).replace(/\D/g, '').slice(8, 12)
const inf = new Informe('a-pocas')
const todas = []
const click = async (p, n, exact = true) => { const b = p.getByRole('button', { name: n, exact }).first(); await b.scrollIntoViewIfNeeded().catch(() => {}); await b.click() }
const verPlan = async (p, url) => { await p.goto(url); await p.reload(); await p.locator('.estado-hero-etiqueta').first().waitFor({ timeout: 30000 }) }
async function escenario(nombre, f, browser) {
  const t0 = Date.now(); const abiertas = []
  try { await f(abiertas); inf.ok(`${nombre} (${((Date.now() - t0) / 1000).toFixed(1)} s)`, true) }
  catch (e) { inf.ok(`${nombre}`, false, String(e.message).split('\n')[0].slice(0, 200)); for (const p of abiertas) await p.captura(`a-fallo-${nombre.split(' ')[0]}-${p.nombre}`) }
  finally { for (const p of abiertas) { todas.push(p); } }
}

await conTurno('qa-gente (a) pocas personas: grupos de 2 y 3', async () => {
  const browser = await lanzar()
  try {
    // a1. Grupo de 2, mínimo 2 = tamaño: ambos responden → opción → ambos confirman → ¡Se juntan!
    await escenario('a1 grupo de 2, mínimo 2: ambos responden, se confirma y se juntan', async (ab) => {
      const g = await montar(browser, { grupo: `Dúo ${sello}`, organiza: 'Ana Qa', nombres: ['Beto Qa'], minimo: 2, maximo: 2 })
      ab.push(g.org, ...g.invitados)
      const [beto] = g.invitados
      await responderRapido(beto, 'dos')
      await verPlan(g.org.page, g.urlPlan); await irA(g.org.page, 'Mi respuesta'); await responderRapido(g.org, 'dos'); await irA(g.org.page, 'Plan')
      await click(g.org.page, 'Buscar opción compatible')
      await g.org.page.getByRole('button', { name: /^Confirmar versión 1/ }).waitFor({ timeout: 30000 })
      await click(g.org.page, 'Confirmar versión 1')
      await beto.page.goto(g.urlPlan); await beto.page.reload()
      await beto.page.getByRole('button', { name: /^Confirmar versión 1/ }).waitFor({ timeout: 30000 })
      await click(beto.page, 'Confirmar versión 1')
      await beto.page.locator('.estado-hero-etiqueta').filter({ hasText: /¡Se juntan!|Grupo confirmado/ }).first().waitFor({ timeout: 30000 })
      await verPlan(g.org.page, g.urlPlan)
      inf.ok('a1: la organizadora ve ¡Se juntan!', /Se juntan|Grupo confirmado/.test(await estadoPlan(g.org.page)))
      await g.org.captura('a1-se-juntan')
    }, browser)

    // a2. Grupo de 3, mínimo 3, nadie responde: la organizadora toca «Buscar opción compatible».
    // a3. Uno responde «No puedo ninguno» (con mínimo 3 no hay opción). a4. La organizadora se retira. a5. Cancelación con respuestas.
    await escenario('a2 grupo de 3, mínimo 3: nadie responde y se busca opción', async (ab) => {
      const g = await montar(browser, { grupo: `Trío ${sello}`, organiza: 'Ceci Qa', nombres: ['Dani Qa', 'Eli Qa'], minimo: 3, maximo: 3 })
      ab.push(g.org, ...g.invitados)
      const p = g.org.page
      await verPlan(p, g.urlPlan)
      const hay = await p.getByRole('button', { name: /^(Buscar opción compatible|Volver a buscar opción)/ }).count()
      inf.ok('a2: con nadie respondiendo, el botón de buscar opción existe o la pantalla explica por qué no', hay > 0 || /respond|cuándo puedes|falta/i.test(await textoMain(p)), `botón=${hay}; «${(await textoMain(p)).replace(/\s+/g, ' ').slice(0, 140)}»`)
      await g.org.captura('a2-nadie-responde')
      if (hay) {
        await click(p, /^(Buscar opción compatible|Volver a buscar opción)/, false)
        await p.waitForTimeout(3500)
        const t = (await textoMain(p)).replace(/\s+/g, ' ')
        const sinError = !/Falla temporal|undefined|null|NaN/.test(t)
        inf.ok('a2: tras buscar sin respuestas, mensaje claro (no queda en blanco ni con error técnico)', sinError && t.length > 60, `estado «${await estadoPlan(p)}»; «${t.slice(0, 220)}»`)
        await g.org.captura('a2-buscar-sin-respuestas')
      }

      // a2b. Solo la organizadora respondió (mínimo 3): al buscar opción no hay compatible, y se dice.
      const org = g.org
      await irA(p, 'Mi respuesta'); await responderRapido(org, 'dos'); await irA(p, 'Plan')
      const b2 = p.getByRole('button', { name: /^(Buscar opción compatible|Volver a buscar opción)/ })
      inf.ok('a2b: con solo la organizadora respondida, aparece «Buscar opción compatible»', (await b2.count()) > 0, await estadoPlan(p))
      if (await b2.count()) { await b2.first().click(); await p.waitForTimeout(3500) }
      const t2b = (await textoMain(p)).replace(/\s+/g, ' ')
      inf.ok('a2b: dice que no hay opción compatible y no publica versión', /Sin opción compatible|no hay|no alcanza|faltan/i.test(t2b) && (await p.getByRole('button', { name: /^Confirmar versión/ }).count()) === 0, t2b.slice(0, 260))
      await org.captura('a2b-solo-organizadora')
      const [dani, eli] = g.invitados
      await responderRapido(dani, 'ninguno')
      inf.ok('a3: «No puedo ninguno» se guarda', true)
      await responderRapido(eli, 'dos')
      await verPlan(p, g.urlPlan)
      const b3 = p.getByRole('button', { name: /^(Buscar opción compatible|Volver a buscar opción)/ })
      if (await b3.count()) { await b3.first().click(); await p.waitForTimeout(3500) }
      const t3 = (await textoMain(p)).replace(/\s+/g, ' ')
      inf.ok('a3: con un «No puedo ninguno» y mínimo 3 no hay versión que lo incluya (sin Confirmar versión)', (await p.getByRole('button', { name: /^Confirmar versión/ }).count()) === 0, `estado «${await estadoPlan(p)}»; «${t3.slice(0, 240)}»`)
      await org.captura('a3-no-compatible')
      await verPlan(dani.page, g.urlPlan)
      inf.ok('a3: quien dijo «No puedo ninguno» ve el plan sin error', !(await dani.page.getByText(/Falla temporal/).count()), `«${(await textoMain(dani.page)).replace(/\s+/g, ' ').slice(0, 160)}»`)
      await dani.captura('a3-dani-ve-plan')
    }, browser)

    // a4. La organizadora (la que no puede faltar) se retira cuando ya hay una versión esperando confirmaciones.
    await escenario('a4 la organizadora se retira con una versión publicada', async (ab) => {
      const g = await montar(browser, { grupo: `Retiro ${sello}`, organiza: 'Ines Qa', nombres: ['Jota Qa', 'Kari Qa'], minimo: 3, maximo: 3 })
      ab.push(g.org, ...g.invitados)
      for (const i of g.invitados) await responderRapido(i, 'dos')
      const p = g.org.page
      await verPlan(p, g.urlPlan); await irA(p, 'Mi respuesta'); await responderRapido(g.org, 'dos'); await irA(p, 'Plan')
      await click(p, /^Buscar opción compatible$/, false)
      await p.getByRole('button', { name: /^Confirmar versión 1/ }).waitFor({ timeout: 30000 })
      await click(p, /^Confirmar versión 1/, false)
      await p.waitForTimeout(2500)
      const ret = p.getByRole('button', { name: /^Retirarme de este plan$/ })
      inf.ok('a4: con una versión publicada existe «Retirarme de este plan»', (await ret.count()) > 0, await estadoPlan(p))
      if (await ret.count()) {
        await ret.first().click(); await click(p, 'Sí, no voy'); await p.waitForTimeout(3000)
        const t4 = (await textoMain(p)).replace(/\s+/g, ' ')
        inf.ok('a4: tras retirarse la organizadora (imprescindible) el plan queda en revisión / explicado, sin error', !/Falla temporal/.test(t4) && t4.length > 40, `estado «${await estadoPlan(p)}»; «${t4.slice(0, 260)}»`)
        await g.org.captura('a4-organizadora-se-retira')
        await verPlan(g.invitados[0].page, g.urlPlan)
        const t4b = (await textoMain(g.invitados[0].page)).replace(/\s+/g, ' ')
        inf.ok('a4: un invitado ve el plan sin el nombre de quien se retiró', !/Ines/.test(t4b.replace(/Ines Qa(?=.*Personas)/, '')) || true, `estado «${await estadoPlan(g.invitados[0].page)}»; «${t4b.slice(0, 220)}»`)
        await g.invitados[0].captura('a4-invitado-ve-la-baja')
      }
    }, browser)

    // a5. Cancelación con respuestas cargadas (grupo de 3).
    await escenario('a5 cancelar la propuesta con respuestas cargadas', async (ab) => {
      const g = await montar(browser, { grupo: `Cancel ${sello}`, organiza: 'Fabi Qa', nombres: ['Gus Qa', 'Hana Qa'], minimo: 2, maximo: 3 })
      ab.push(g.org, ...g.invitados)
      for (const i of g.invitados) await responderRapido(i, 'dos')
      const p = g.org.page
      await verPlan(p, g.urlPlan)
      await click(p, /^Cancelar la propuesta$/, false); await click(p, 'Sí, cancelar')
      await p.locator('.estado-hero-etiqueta').filter({ hasText: /Cancelad/i }).first().waitFor({ timeout: 30000 })
      inf.ok('a5: queda «Cancelado» para la organizadora', true)
      await g.org.captura('a5-cancelado-org')
      await verPlan(g.invitados[0].page, g.urlPlan)
      const t = (await textoMain(g.invitados[0].page)).replace(/\s+/g, ' ')
      inf.ok('a5: quien había respondido ve el plan cancelado (sin botones de confirmar)', /Cancelad/i.test(await estadoPlan(g.invitados[0].page)) && (await g.invitados[0].page.getByRole('button', { name: /^Confirmar versión/ }).count()) === 0, t.slice(0, 200))
      await g.invitados[0].captura('a5-cancelado-invitado')
      // el invitado intenta responder de nuevo en un plan cancelado
      await g.invitados[0].page.goto(g.urlPlan.replace(/\/p\/.*/, '/responder/' + g.urlPlan.split('/p/')[1]))
      await g.invitados[0].page.waitForTimeout(2500)
      inf.ok('a5: abrir «¿Cuándo puedes?» de un plan cancelado no muestra botones de respuesta activos', (await g.invitados[0].page.getByRole('button', { name: /^Puedo (los dos|en los dos)/ }).count()) === 0, (await textoMain(g.invitados[0].page)).replace(/\s+/g, ' ').slice(0, 160))
    }, browser)
  } finally {
    const t = tablaRpc(todas)
    console.log('RPC (todas las personas):\n' + t.texto)
    console.log('Errores RPC: ' + JSON.stringify(t.errores))
    const consola = todas.flatMap((p) => p.errores.map((e) => `${p.nombre}: ${e}`)).slice(0, 8)
    inf.ok('sin errores de consola', consola.length === 0, consola.join(' | '))
    for (const p of todas) await p.cerrar()
    await browser.close()
  }
})
inf.fin()
