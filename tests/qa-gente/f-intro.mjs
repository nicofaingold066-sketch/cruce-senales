// (f) La intro de la primera visita (diálogo modal de 2,6 s). Desde main 018215d es de la portada; las invitaciones la saltan (H7 de la vuelta 1).
//   node tests/qa-gente/f-intro.mjs [url]
import { BASE, conTurno, lanzar, Informe, Persona, crearPlan, leerCodigo, esperarDestino, dormir } from './lib.mjs'
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

    // Desde main 018215d la intro es de la portada (`#/`, `#/entrar`, `#/crear`): quien llega por una invitación (`#/unirse`, `#/e/…`) va directo a lo suyo.
    // Estas personas no tienen la guía de tres pasos vista... pero la guía solo sale en la portada; aquí se marca vista para que no tape la intro.
    const guiaVista = () => { for (const t of ['localStorage', 'sessionStorage']) { try { window[t].setItem('cruxe:guia-vista:v1', '1') } catch {} } }
    const nueva = async (nombre, o = {}) => { const x = await new Persona(browser, nombre, { intro: true, ...o }).abrir(); todas.push(x); await x.ctx.addInitScript(guiaVista); return x }

    // f1: primera visita por la invitación: NO hay intro (H7 de la vuelta 1: antes retenía ≈3,5 s).
    const a = await nueva('Ana F')
    const t0 = Date.now(); await a.page.goto(enlace)
    await a.page.getByRole('heading', { name: /^(¿Quién eres\?|Escribe tu nombre para entrar)$/ }).waitFor({ timeout: 15000 })
    const tapMs = Date.now() - t0
    inf.ok('f1 (H7): quien llega por una invitación en su primera visita NO ve la intro', (await a.page.locator('dialog.cruxe-intro').count()) === 0, `lista visible a los ${tapMs} ms; desborde ${await a.desborde()} px`)
    inf.ok('f1: puede tocar su nombre de inmediato (< 3 s desde el enlace)', tapMs < 3000 && await a.page.getByRole('button', { name: 'Ana F', exact: true }).isEnabled(), `${tapMs} ms`)
    await a.page.getByRole('button', { name: 'Ana F', exact: true }).click()
    const si = a.page.getByRole('button', { name: 'Sí, soy Ana F', exact: true }); if (await si.isVisible({ timeout: 1500 }).catch(() => false)) await si.click()
    await esperarDestino(a)
    inf.ok('f1: del enlace a ¿Cuándo puedes? sin intro', true, `${Date.now() - t0} ms en total`)
    await a.page.goto(`${BASE}/#/`); await a.page.reload(); await dormir(1500)
    inf.ok('f1: después de la invitación la intro ya no vuelve en la portada (queda marcada como vista)', (await a.page.locator('dialog.cruxe-intro').count()) === 0, '')

    // f2: primera visita a la portada: la intro dura ≈2,6 s y la portada queda usable.
    const b = await nueva('Beto F'); const tb = Date.now(); await b.page.goto(`${BASE}/#/`)
    const sale = await b.page.locator('dialog.cruxe-intro[open]').waitFor({ timeout: 8000 }).then(() => true, () => false)
    inf.ok('f2: la primera visita a la portada muestra la intro', sale, `${Date.now() - tb} ms hasta verla`)
    if (sale) {
      await dormir(1200); await b.captura('f2-intro-en-curso-375')
      const sk0 = b.page.getByRole('button', { name: /Saltar intro/ })
      inf.ok('f2: «Saltar intro» recibe el foco al abrir', await sk0.evaluate((e) => document.activeElement === e).catch(() => false), '')
      await b.page.locator('dialog.cruxe-intro').waitFor({ state: 'detached', timeout: 8000 }).catch(() => {})
      const dur = Date.now() - tb
      inf.ok('f2: la intro termina sola y dura ≲ 4,5 s (2,6 s + salida)', dur < 4500, `${dur} ms desde abrir`)
      inf.ok('f2: al terminar, la portada es usable (hay «Crear un grupo» o «Probar la demo») y sin desborde', (await b.page.getByRole('button', { name: /Probar la demo|Crear un grupo/ }).or(b.page.getByRole('link', { name: /Crear un grupo/ })).count()) > 0 && (await b.desborde()) <= 0, `desborde ${await b.desborde()} px`)
    }

    // f3: «Saltar intro» y Escape.
    const c = await nueva('Cami F'); await c.page.goto(`${BASE}/#/`)
    const sk = c.page.getByRole('button', { name: /Saltar intro/ }); await sk.waitFor({ timeout: 8000 })
    const ts = Date.now(); await sk.click(); await c.page.locator('dialog.cruxe-intro').waitFor({ state: 'detached', timeout: 4000 })
    inf.ok('f3: «Saltar intro» cierra en < 1 s', Date.now() - ts < 1000, `${Date.now() - ts} ms`)
    inf.ok('f3: el scroll de la página se restituye tras la intro', (await c.page.evaluate(() => getComputedStyle(document.body).overflow)) !== 'hidden', await c.page.evaluate(() => getComputedStyle(document.body).overflow))
    const d = await nueva('Dani F'); await d.page.goto(`${BASE}/#/`); await d.page.locator('dialog.cruxe-intro[open]').waitFor({ timeout: 8000 }); await d.page.keyboard.press('Escape')
    inf.ok('f3: Escape cierra la intro', await d.page.locator('dialog.cruxe-intro').waitFor({ state: 'detached', timeout: 3000 }).then(() => true, () => false), '')

    // f4: segunda visita (recarga): no vuelve.
    await c.page.reload(); await dormir(1500)
    inf.ok('f4: a la segunda visita la intro no vuelve', (await c.page.locator('dialog.cruxe-intro').count()) === 0, '')

    // f5: movimiento reducido: sin intro y la portada se ve de inmediato.
    const e = await nueva('Eli F', { reducedMotion: 'reduce' }); await e.page.goto(`${BASE}/#/`); await dormir(1200)
    inf.ok('f5: con «reducir movimiento» no hay intro', (await e.page.locator('dialog.cruxe-intro').count()) === 0, '')

    // f6: portada primera visita a 320 px: sin desborde durante la intro.
    const g6 = await nueva('Fran F', { ancho: 320, alto: 640 }); await g6.page.goto(`${BASE}/#/`); await g6.page.locator('dialog.cruxe-intro[open]').waitFor({ timeout: 8000 })
    await dormir(900); await g6.captura('f6-intro-320'); const dd = await g6.desborde()
    inf.ok('f6: la intro a 320 px no genera desborde', dd <= 0, `${dd} px`)

    // f7: sin almacenamiento (localStorage y sessionStorage bloqueados): la intro puede repetirse, pero nunca debe impedir entrar.
    const f7 = await nueva('Gabi F'); await f7.ctx.addInitScript(() => { const bloquear = () => { throw new DOMException('bloqueado', 'SecurityError') }; for (const k of ['localStorage', 'sessionStorage']) Object.defineProperty(window, k, { get: bloquear, configurable: true }) })
    const errs0 = f7.errores.length
    await f7.page.goto(`${BASE}/#/`); await f7.page.locator('dialog.cruxe-intro').waitFor({ state: 'detached', timeout: 12000 }).catch(() => {})
    const usable = (await f7.page.getByRole('button', { name: /Probar la demo|Crear un grupo/ }).or(f7.page.getByRole('link', { name: /Crear un grupo/ })).count()) > 0
    inf.ok('f7: con el almacenamiento bloqueado la intro termina y se puede usar la portada', usable, `errores de consola nuevos: ${f7.errores.length - errs0}`)
    await f7.page.goto(enlace); await f7.page.getByRole('button', { name: 'Gabi F', exact: true }).waitFor({ timeout: 20000 }).catch(() => {})
    inf.ok('f7: con el almacenamiento bloqueado, una invitación entra directo (sin intro)', (await f7.page.locator('dialog.cruxe-intro').count()) === 0, '')
  } finally {
    const consola = todas.flatMap((p) => p.errores.map((x) => `${p.nombre}: ${x}`)).slice(0, 4)
    inf.ok('sin errores de consola', consola.length === 0, consola.join(' | '))
    for (const p of todas) await p.cerrar(); await browser.close()
  }
})
inf.fin()
