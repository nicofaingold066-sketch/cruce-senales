// (f) La intro de la primera visita (main 9364cd8: diálogo modal de 2,6 s): qué le cuesta a quien llega por una invitación.
//   node tests/qa-gente/f-intro.mjs [url]
import { BASE, conTurno, lanzar, Informe, Persona, crearPlan, leerCodigo, esperarDestino, textoMain, dormir } from './lib.mjs'
const sello = new Date().toLocaleString('sv-SE', { timeZone: 'America/Santiago' }).replace(/\D/g, '').slice(8, 12)
const inf = new Informe('f-intro'); const todas = []
await conTurno('qa-gente (f) intro de primera visita desde una invitación', async () => {
  const browser = await lanzar()
  try {
    const org = await new Persona(browser, `Org F${sello}`).abrir(); todas.push(org)
    await org.page.goto(`${BASE}/#/crear`); await org.page.getByRole('heading', { name: 'Crear un grupo' }).waitFor({ timeout: 30000 })
    await org.page.getByLabel('Nombre del grupo').fill(`Intro ${sello}`); await org.page.getByLabel('Tu nombre en el grupo').fill(org.nombre)
    const campo = org.page.locator('#quienes-nuevo'); await campo.fill('Ana F, Beto F, Cami F, Dani F, Eli F, Fran F'); await campo.press('Enter')
    await org.page.getByRole('button', { name: 'Crear grupo', exact: true }).click()
    await org.page.getByRole('heading', { name: 'Nuevo plan' }).waitFor({ timeout: 30000 })
    const espacioId = org.page.url().match(/#\/e\/([^/?#]+)/)[1]
    await crearPlan(org, { titulo: 'Plan intro', minimo: 2, maximo: 6 })
    const codigo = await leerCodigo(org, `${BASE}/#/e/${espacioId}`)
    const enlace = `${BASE}/#/unirse/${codigo}`

    // f1: primera visita por la invitación, sin tocar nada: cuánto dura la intro y qué pasa al terminar.
    const a = await new Persona(browser, 'Ana F', { intro: true }).abrir(); todas.push(a)
    const t0 = Date.now(); await a.page.goto(enlace)
    const visible = await a.page.locator('dialog.cruxe-intro[open]').waitFor({ timeout: 8000 }).then(() => true, () => false)
    inf.ok('f1: la primera visita por una invitación muestra la intro', visible, `${Date.now() - t0} ms hasta verla`)
    await dormir(1200); await a.captura('f1-intro-en-curso-375')
    await a.page.locator('dialog.cruxe-intro').waitFor({ state: 'detached', timeout: 8000 }).catch(() => {})
    const dur = Date.now() - t0
    inf.ok('f1: la intro termina sola y dura ≲ 4,5 s (2,6 s + salida)', dur < 4500, `${dur} ms desde abrir el enlace`)
    await a.page.getByRole('heading', { name: /^(¿Quién eres\?|Escribe tu nombre para entrar)$/ }).waitFor({ timeout: 15000 })
    inf.ok('f1: al terminar, «¿Quién eres?» está usable (botón con el nombre)', await a.page.getByRole('button', { name: 'Ana F', exact: true }).isVisible(), `desborde ${await a.desborde()} px`)
    const tapMs = Date.now() - t0
    await a.page.getByRole('button', { name: 'Ana F', exact: true }).click()
    const si = a.page.getByRole('button', { name: 'Sí, soy Ana F', exact: true }); if (await si.isVisible({ timeout: 1500 }).catch(() => false)) await si.click()
    await esperarDestino(a)
    inf.ok('f1: de abrir el enlace a ¿Cuándo puedes? con la intro completa', true, `${Date.now() - t0} ms (primer toque posible a los ${tapMs} ms)`)

    // f2: «Saltar intro».
    const b = await new Persona(browser, 'Beto F', { intro: true }).abrir(); todas.push(b)
    await b.page.goto(enlace); const sk = b.page.getByRole('button', { name: /Saltar intro/ }); await sk.waitFor({ timeout: 8000 })
    inf.ok('f2: «Saltar intro» recibe el foco al abrir', await sk.evaluate((e) => document.activeElement === e).catch(() => false), '')
    const ts = Date.now(); await sk.click(); await b.page.locator('dialog.cruxe-intro').waitFor({ state: 'detached', timeout: 4000 })
    inf.ok('f2: «Saltar intro» cierra en < 1 s', Date.now() - ts < 1000, `${Date.now() - ts} ms`)
    await b.page.getByRole('button', { name: 'Beto F', exact: true }).waitFor({ timeout: 10000 }).catch(async () => { await b.captura('f2-sin-boton-beto'); throw new Error('sin botón Beto tras saltar: ' + (await textoMain(b.page)).replace(/\s+/g, ' ').slice(0, 300)) })
    inf.ok('f2: el scroll de la página se restituye tras la intro', (await b.page.evaluate(() => getComputedStyle(document.body).overflow)) !== 'hidden', await b.page.evaluate(() => getComputedStyle(document.body).overflow))

    // f3: Escape y clic en cualquier parte.
    const c = await new Persona(browser, 'Cami F', { intro: true }).abrir(); todas.push(c)
    await c.page.goto(enlace); await c.page.locator('dialog.cruxe-intro[open]').waitFor({ timeout: 8000 }); await c.page.keyboard.press('Escape')
    const cierraEsc = await c.page.locator('dialog.cruxe-intro').waitFor({ state: 'detached', timeout: 3000 }).then(() => true, () => false)
    inf.ok('f3: Escape cierra la intro', cierraEsc, '')

    // f4: segunda visita (recarga y otra ruta): no vuelve.
    await a.page.goto(`${BASE}/#/`); await a.page.reload(); await dormir(1500)
    inf.ok('f4: a la segunda visita la intro no vuelve', (await a.page.locator('dialog.cruxe-intro').count()) === 0, '')

    // f5: movimiento reducido: sin intro.
    const d = await new Persona(browser, 'Dani F', { intro: true, reducedMotion: 'reduce' }).abrir(); todas.push(d)
    await d.page.goto(enlace); await dormir(1200)
    inf.ok('f5: con «reducir movimiento» no hay intro y la invitación se ve de inmediato', (await d.page.locator('dialog.cruxe-intro').count()) === 0 && await d.page.getByRole('button', { name: 'Dani F', exact: true }).isVisible().catch(() => false), '')

    // f6: portada primera visita a 320 px + invitación a 320 px, sin desborde durante la intro.
    const e = await new Persona(browser, 'Eli F', { intro: true, ancho: 320, alto: 640 }).abrir(); todas.push(e)
    await e.page.goto(`${BASE}/#/`); await e.page.locator('dialog.cruxe-intro[open]').waitFor({ timeout: 8000 })
    await dormir(900); await e.captura('f6-intro-320'); const dd = await e.desborde()
    inf.ok('f6: la intro a 320 px no genera desborde', dd <= 0, `${dd} px`)
    // Sin almacenamiento: contexto con localStorage y sessionStorage bloqueados — la intro puede repetirse, pero nunca debe impedir entrar.
    const f = await new Persona(browser, 'Fran F', { intro: true }).abrir(); todas.push(f)
    await f.ctx.addInitScript(() => { const bloquear = () => { throw new DOMException('bloqueado', 'SecurityError') }; for (const k of ['localStorage', 'sessionStorage']) Object.defineProperty(window, k, { get: bloquear, configurable: true }) })
    const errs0 = f.errores.length
    await f.page.goto(enlace); await f.page.getByRole('button', { name: 'Fran F', exact: true }).waitFor({ timeout: 20000 })
    inf.ok('f7: con el almacenamiento del navegador bloqueado se puede entrar igual (la intro no traba)', true, `errores de consola nuevos: ${f.errores.length - errs0}`)
  } finally {
    const consola = todas.flatMap((p) => p.errores.map((x) => `${p.nombre}: ${x}`)).slice(0, 4)
    inf.ok('sin errores de consola', consola.length === 0, consola.join(' | '))
    for (const p of todas) await p.cerrar(); await browser.close()
  }
})
inf.fin()
