// (h) La guía interactiva de tres pasos (main 4e90813/9a15539): primera visita a la portada, 320/375 px, teclado, «Ayuda», idioma.
//   node tests/qa-gente/h-guia.mjs [url]
import { BASE, conTurno, lanzar, Informe, Persona, dormir, textoMain } from './lib.mjs'
const inf = new Informe('h-guia'); const todas = []
await conTurno('qa-gente (h) guía de tres pasos en la primera visita', async () => {
  const browser = await lanzar()
  try {
    for (const [w, h] of [[375, 812], [320, 568]]) {
      const a = await new Persona(browser, `Guia ${w}`, { intro: true, ancho: w, alto: h }).abrir(); todas.push(a)
      await a.ctx.addInitScript(() => { try { localStorage.setItem('cruxe:entrada-vista', '1') } catch {} }) // la intro ya se probó en (f)
      const t0 = Date.now(); await a.page.goto(`${BASE}/#/`)
      const g = a.page.locator('dialog.cruxe-guia[open]')
      const sale = await g.waitFor({ timeout: 10000 }).then(() => true, () => false)
      inf.ok(`h1 @${w}: la primera visita a la portada abre la guía`, sale, `${Date.now() - t0} ms`)
      if (!sale) continue
      const textos = []
      for (let paso = 0; paso < 3; paso++) {
        textos.push((await g.innerText()).replace(/\s+/g, ' '))
        const dd = await a.page.evaluate(() => { const d = document.querySelector('dialog.cruxe-guia'); return d.scrollWidth - d.clientWidth })
        const sig = a.page.locator('.cruxe-guia__siguiente'); const bb = await sig.boundingBox(); const visible = bb && bb.y + bb.height <= h + 1
        inf.ok(`h2 @${w} paso ${paso + 1}: sin desborde lateral y el botón «Siguiente/Empezar» cabe en pantalla`, dd <= 0 && !!visible, `desborde ${dd}px; botón y=${bb ? Math.round(bb.y) : '?'}+${bb ? Math.round(bb.height) : '?'} de ${h}`)
        if (w === 320 || paso === 0) await a.captura(`h-guia-${w}-paso${paso + 1}`)
        if (paso === 0) { // ¿deja avanzar sin elegir?
          await sig.click(); await dormir(400); const en2 = /Vos decís|Cuándo/.test((await g.innerText()))
          inf.ok(`h3 @${w}: se puede avanzar sin haber tocado el ejemplo (no obliga)`, en2, en2 ? 'avanzó' : 'no avanzó sin elegir')
          if (!en2) { await a.page.locator('.cruxe-guia__opcion').first().click(); await sig.click() }
          paso = 0 + 0; textos.pop(); textos.push((await g.innerText()).replace(/\s+/g, ' ')); // ya estamos en el paso 2
          // saltamos la iteración: el for aumenta a 1, que es el paso 2 ya mostrado
          continue
        }
        if (paso === 1) { await a.page.locator('.cruxe-guia__horario').first().click(); await sig.click(); await dormir(300) }
        if (paso === 2) { await a.page.locator('.cruxe-guia__confirmar').click(); await sig.click() }
      }
      await g.waitFor({ state: 'detached', timeout: 5000 }).catch(() => {})
      inf.ok(`h4 @${w}: tras el tercer paso la guía se cierra y la portada es usable`, (await a.page.locator('dialog.cruxe-guia').count()) === 0 && (await a.page.getByRole('link', { name: /Crear/ }).or(a.page.getByRole('button', { name: /Probar la demo/ })).count()) > 0, `desborde portada ${await a.desborde()}px`)
      await a.page.reload(); await dormir(1500)
      inf.ok(`h5 @${w}: en la segunda visita no vuelve`, (await a.page.locator('dialog.cruxe-guia').count()) === 0, '')
      // Ayuda
      const ay = a.page.getByRole('button', { name: /^Ayuda/ })
      inf.ok(`h6 @${w}: existe el botón «Ayuda» visible`, await ay.isVisible().catch(() => false), '')
      if (await ay.isVisible().catch(() => false)) { await ay.click(); await dormir(3500); const ab = await a.page.locator('dialog.cruxe-guia[open], dialog.cruxe-intro[open]').count(); await a.page.keyboard.press('Escape'); await dormir(800)
        inf.ok(`h6 @${w}: «Ayuda» reabre el recorrido y Escape lo cierra`, ab > 0 && (await a.page.locator('dialog[open]').count()) === 0, `abiertos tras Ayuda: ${ab}; tras Escape: ${await a.page.locator('dialog[open]').count()}`) }
      if (w === 375) {
        const voseo = textos.join(' ').match(/\b(Elegí|Probá|Tocá|Vos|decís|Mirá|Pedí|Sumá)\b/g) ?? []
        inf.ok('h7: el texto de la guía usa el mismo trato que el resto de la app (tú), no voseo', voseo.length === 0, `voseo en la guía: ${[...new Set(voseo)].join(', ') || 'ninguno'}`)
        await a.page.goto(`${BASE}/#/crear`); await a.page.getByRole('heading', { name: 'Crear un grupo' }).waitFor({ timeout: 20000 })
        const resto = (await textoMain(a.page)).match(/\b(Elegí|Probá|Tocá|Agregá|Escribí|Poné)\b/g) ?? []
        inf.ok('h7b: «Crear un grupo» usa «tú» (control: sin voseo)', resto.length === 0, resto.join(', '))
      }
    }
    // Invitación nueva: sin guía (va directo).
    const b = await new Persona(browser, 'Guia inv', { intro: true }).abrir(); todas.push(b)
    await b.ctx.addInitScript(() => { try { localStorage.setItem('cruxe:entrada-vista', '1') } catch {} })
    await b.page.goto(`${BASE}/#/unirse/XXXXXXXX`); await dormir(2500)
    inf.ok('h8: un enlace de invitación no abre la guía (va directo a su destino)', (await b.page.locator('dialog.cruxe-guia').count()) === 0, (await textoMain(b.page)).replace(/\s+/g, ' ').slice(0, 120))
    // Con «reducir movimiento» la guía igual aparece.
    const c = await new Persona(browser, 'Guia rm', { intro: true, reducedMotion: 'reduce' }).abrir(); todas.push(c)
    await c.page.goto(`${BASE}/#/`); inf.ok('h9: con «reducir movimiento» la guía aparece igual (y sin intro)', await c.page.locator('dialog.cruxe-guia[open]').waitFor({ timeout: 8000 }).then(() => true, () => false), '')
  } finally {
    const consola = todas.flatMap((p) => p.errores.map((e) => `${p.nombre}: ${e}`)).slice(0, 4)
    inf.ok('sin errores de consola', consola.length === 0, consola.join(' | '))
    for (const p of todas) await p.cerrar(); await browser.close()
  }
})
inf.fin()
