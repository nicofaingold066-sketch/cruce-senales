// (e) Rendimiento visual, en producción: tiempo hasta la lista de planes y hasta el hero del plan con 20 y 30 integrantes,
// a 320/375/768/1280 px, sin desborde horizontal ni errores de consola.
//   node tests/qa-gente/e-visual.mjs [url]
import { BASE, conTurno, lanzar, Informe, Persona, crearPlan, leerCodigo, entrarPorEnlace, esperarDestino, enLotes, NOMBRES, pct, textoMain, resumenLat } from './lib.mjs'
const sello = new Date().toLocaleString('sv-SE', { timeZone: 'America/Santiago' }).replace(/\D/g, '').slice(8, 12)
const inf = new Informe('e-visual'); const todas = []
const ANCHOS = [[320, 640], [375, 812], [768, 1024], [1280, 800]]
const REPS = 3
async function grupo(browser, N, tag) {
  const org = await new Persona(browser, `Org ${tag}${sello}`).abrir(); todas.push(org)
  const nombres = Array.from({ length: N - 1 }, (_, i) => `${NOMBRES[i % NOMBRES.length]}${i >= NOMBRES.length ? i : ''} ${tag}${sello}`)
  await org.page.goto(`${BASE}/#/crear`); await org.page.getByRole('heading', { name: 'Crear un grupo' }).waitFor({ timeout: 30000 })
  await org.page.getByLabel('Nombre del grupo').fill(`Visual ${N} ${sello}`); await org.page.getByLabel('Tu nombre en el grupo').fill(org.nombre)
  const campo = org.page.locator('#quienes-nuevo'); await campo.fill(nombres.slice(0, 12).join(', ')); await campo.press('Enter')
  await org.page.getByRole('button', { name: 'Crear grupo', exact: true }).click()
  await org.page.getByRole('heading', { name: 'Nuevo plan' }).waitFor({ timeout: 30000 })
  const espacioId = org.page.url().match(/#\/e\/([^/?#]+)/)[1]
  const urlPlan = await crearPlan(org, { titulo: `Plan de ${N}`, minimo: 2, maximo: 20 })
  const codigo = await leerCodigo(org, `${BASE}/#/e/${espacioId}`)
  const res = await enLotes(nombres, 10, async (n) => { const p = await new Persona(browser, n).abrir(); todas.push(p); await entrarPorEnlace(p, codigo, n, { timeout: 90000 }); await esperarDestino(p, 90000); return 1 })
  const fallos = res.filter((r) => r?.error).length
  return { org, espacioId, urlPlan, fallos }
}
await conTurno('qa-gente (e) rendimiento visual con 20 y 30 integrantes a 4 anchos', async () => {
  const browser = await lanzar()
  try {
    for (const N of [20, 30]) {
      const g = await grupo(browser, N, N === 20 ? 'V' : 'W')
      inf.ok(`e${N}.0: grupo de ${N} armado`, g.fallos === 0, g.fallos ? `${g.fallos} no entraron` : '')
      const p = g.org.page
      for (const [w, h] of ANCHOS) {
        await p.setViewportSize({ width: w, height: h })
        const tl = [], th = [], ts = []
        for (let i = 0; i < REPS; i++) {
          let t = Date.now(); await p.goto(`${BASE}/#/planes`); await p.reload(); await p.getByText(`Plan de ${N}`).first().waitFor({ timeout: 40000 }); tl.push(Date.now() - t)
          t = Date.now(); await p.goto(`${BASE}/#/e/${g.espacioId}`); await p.reload(); await p.getByText(`Plan de ${N}`).first().waitFor({ timeout: 40000 }); ts.push(Date.now() - t)
          t = Date.now(); await p.goto(g.urlPlan); await p.reload(); await p.locator('.estado-hero-etiqueta').first().waitFor({ timeout: 40000 }); th.push(Date.now() - t)
        }
        const desb = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
        await p.waitForTimeout(500)
        inf.ok(`e${N} @${w}px: lista de planes ${resumenLat(tl)}; espacio ${resumenLat(ts)}; hero del plan ${resumenLat(th)}`, pct(tl, 95) < 4000 && pct(th, 95) < 4000, `desborde=${desb}px`)
        inf.ok(`e${N} @${w}px: sin desborde horizontal en el plan`, desb <= 0, `${desb}px`)
        if (N === 30 || w === 320) await g.org.captura(`e${N}-plan-${w}`)
        await p.goto(`${BASE}/#/e/${g.espacioId}`); await p.reload(); await p.getByText(`Plan de ${N}`).first().waitFor({ timeout: 40000 }); await p.waitForTimeout(500)
        const d2 = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
        inf.ok(`e${N} @${w}px: sin desborde horizontal en el espacio del grupo (${N} personas)`, d2 <= 0, `${d2}px`)
        if (N === 30 && (w === 320 || w === 1280)) await g.org.captura(`e${N}-espacio-${w}`)
        // Lista completa de personas
        const per = p.getByRole('link', { name: /Personas/ }).or(p.getByRole('button', { name: /Personas/ })).first()
        if (N === 30 && w === 320 && await per.count()) { await per.click().catch(() => {}); await p.waitForTimeout(1500); const d3 = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); inf.ok('e30 @320px: la pantalla «Personas» con 30 integrantes sin desborde', d3 <= 0, `${d3}px; ${(await textoMain(p)).replace(/\s+/g, ' ').slice(0, 100)}`); await g.org.captura('e30-personas-320') }
      }
    }
  } finally {
    const consola = todas.flatMap((p) => p.errores.map((e) => `${p.nombre}: ${e}`)).slice(0, 6)
    inf.ok('sin errores de consola en todo el bloque', consola.length === 0, consola.join(' | '))
    for (const p of todas) await p.cerrar(); await browser.close()
  }
})
inf.fin()
