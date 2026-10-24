// (i) Demo Makana «El plan que no deja a nadie afuera» (main 018215d): Ana organiza, 6 simulados, SIN respuestas precargadas.
//   portada → «Probar la demo…» → grupo de 7 → Nuevo plan (con «Sin hora de fin») → «Responder en un toque» → «Respondiste»
//   → el plan muestra «Tu respuesta» y «1 de 7 respondieron» → Camila entra por el enlace desde otro contexto y reclama su asiento
//   → «Participación del plan» y «Actividad del grupo» reflejan lo que pasó. Sin errores de consola, sin desborde a 320/375.
//   node tests/qa-gente/i-demo-makana.mjs [url]
// Datos ficticios; sin agente de IA; no borra nada (el grupo de la demo queda en la base).
import { BASE, conTurno, lanzar, Informe, Persona, crearPlan, leerCodigo, entrarPorEnlace, esperarDestino, responderRapido, textoMain, estadoPlan, tablaRpc, dormir, log } from './lib.mjs'
import { irA } from '../e2e/nav.mjs'
import { randomUUID } from 'node:crypto'

const inf = new Informe('i-demo-makana'); const todas = []
const NOMBRE = 'El plan que no deja a nadie afuera'
const limpio = (t) => t.replace(/\s+/g, ' ').trim()
async function paso(nombre, f) {
  try { await f() } catch (e) { inf.ok(nombre, false, String(e.message).split('\n')[0].slice(0, 220)) }
}
// Mide el desborde horizontal a 320 y a 375 sobre la pantalla actual y vuelve a 375.
async function anchos(per, etiqueta) {
  const r = {}
  for (const w of [320, 375]) { await per.page.setViewportSize({ width: w, height: w === 320 ? 640 : 812 }); await dormir(350); r[w] = await per.desborde() }
  inf.ok(`i desborde ${etiqueta}: 0 px a 320 y 375`, r[320] <= 0 && r[375] <= 0, `320: ${r[320]} px; 375: ${r[375]} px`)
}

await conTurno('qa-gente vuelta 2 bloque i', async () => {
  const browser = await lanzar()
  try {
    const ana = await new Persona(browser, 'Ana'); await ana.abrir(); todas.push(ana)
    const p = ana.page
    let espacioId, urlPlan, codigo, cab
    // Cabeceras de la sesión de Ana (solo en memoria, nunca se imprimen) para la llamada directa de i5.
    p.on('request', (r) => { if (!cab && r.url().includes('/rest/v1/rpc/') && r.headers().authorization) cab = { base: r.url().split('/rest/v1/')[0], apikey: r.headers().apikey, auth: r.headers().authorization } })

    // i1 · portada
    await paso('i1 portada', async () => {
      await p.goto(`${BASE}/#/`)
      const demo = p.getByRole('button', { name: new RegExp(`(Probar|Abrir) la demo «${NOMBRE}»`) })
      await demo.first().waitFor({ timeout: 30000 })
      const t = limpio(await p.locator('body').innerText())
      inf.ok('i1: la portada ofrece «Probar la demo «El plan que no deja a nadie afuera»»', await demo.first().isVisible(), '')
      inf.ok('i1: la portada ya no ofrece «Los del finde»', !/Los del finde/.test(t), /Los del finde/.test(t) ? 'todavía aparece' : '')
      inf.ok('i1: el detalle dice quién organiza y que los otros seis son simulados', /Serás Ana/.test(t) && /simulados/.test(t), t.match(/Serás Ana[^.]*\./)?.[0] ?? '')
      await anchos(ana, 'portada'); await ana.captura('i1-portada-375')
      await demo.first().click()
      await p.waitForURL(/#\/e\/[^/?#]+$/, { timeout: 45000 })
      espacioId = p.url().match(/#\/e\/([^/?#]+)/)[1]
    })
    if (!espacioId) return

    // i2 · el grupo con 7 personas
    await paso('i2 grupo', async () => {
      await p.getByRole('heading', { level: 1 }).first().waitFor({ timeout: 30000 })
      await p.getByText('Integrantes del grupo').first().waitFor({ timeout: 30000 })
      await dormir(800)
      const t = limpio(await textoMain(p))
      inf.ok(`i2: el grupo se llama «${NOMBRE}»`, t.includes(NOMBRE), '')
      inf.ok('i2: «Integrantes del grupo» dice 7 personas', /7 personas/.test(t), t.match(/Integrantes del grupo[^]{0,80}/)?.[0] ?? '')
      const faltan = ['Ana', 'Bruno', 'Camila', 'Diego', 'Elena', 'Felipe', 'Gabriela'].filter((n) => !t.includes(n))
      inf.ok('i2: se ven los siete nombres (Ana + 6 simulados)', faltan.length === 0, faltan.length ? `faltan ${faltan}` : '')
      inf.ok('i2: «Actividad del grupo» y «Personas simuladas» están en el grupo', /Actividad del grupo/.test(t) && /Personas simuladas/.test(t), '')
      codigo = await leerCodigo(ana)
      inf.ok('i2: hay código de invitación visible', /^[A-Z0-9]{4,}$/.test(codigo), `código de ${codigo.length} caracteres`)
      await anchos(ana, 'grupo'); await ana.captura('i2-grupo-375')
    })

    // i3 · Nuevo plan con «Sin hora de fin»
    await paso('i3 nuevo plan', async () => {
      await p.goto(`${BASE}/#/e/${espacioId}/nueva`)
      await p.getByRole('heading', { name: 'Nuevo plan' }).waitFor({ timeout: 30000 })
      const titulo = await p.locator('input[placeholder]').first().inputValue()
      inf.ok('i3: Nuevo plan viene precargado con el caso (Parque del Encuentro, ficticio)', /Parque del Encuentro/.test(titulo), titulo.slice(0, 60))
      const a = p.locator('details.s3-momento').first(); await a.locator('summary').click()
      const sin = a.getByRole('radio', { name: 'Sin hora de fin' })
      inf.ok('i3: la duración ofrece «Sin hora de fin»', await sin.count() > 0, '')
      await a.locator('label.opcion-radio', { hasText: 'Sin hora de fin' }).click()
      await dormir(300)
      const resumen = limpio(await p.locator('details.s3-momento').first().locator('summary').innerText())
      inf.ok('i3: el resumen de la opción A dice «sin hora de fin» (no «hasta las 04:00»)', /sin hora de fin/.test(resumen) && !/hasta/.test(resumen), resumen)
      await anchos(ana, 'Nuevo plan'); await ana.captura('i3-nuevo-plan-sin-fin-375')
      urlPlan = await crearPlan(ana, { titulo: null })
      espacioId = urlPlan.match(/#\/e\/([^/?#]+)/)?.[1] ?? espacioId
    })
    if (!urlPlan) return

    // i4 · el plan: «Sin hora de fin», «Responder en un toque»
    await paso('i4 plan y respuesta', async () => {
      await p.locator('.estado-hero-etiqueta').first().waitFor({ timeout: 30000 })
      let t = limpio(await textoMain(p))
      // Antes de publicar una versión el plan solo lista los inicios («sáb 31 oct 16:00 · dom 1 nov 16:00»): el fin aparece al abrir la versión (i8).
      inf.ok('i4: el plan lista las dos opciones con su inicio (sáb 31 oct 16:00 · dom 1 nov 16:00)', /sáb 31 oct 16:00/.test(t) && /dom 1 nov 16:00/.test(t), t.match(/sáb 31 oct[^.]{0,40}/)?.[0] ?? 'no aparece')
      inf.ok('i4: nunca inventa un fin (sin «a 04:00», «hasta las 04:00», «a 16:00»)', !/16:00 a 04:00|hasta las 04:00|16:00 a 16:00/.test(t), '')
      inf.ok('i4: antes de responder, el plan dice «0 de 7» o no cuenta aún', !/[1-9] de 7 respondieron/.test(t), t.match(/\d+ de \d+ respondieron/)?.[0] ?? 'sin conteo')
      await anchos(ana, 'plan sin responder'); await ana.captura('i4-plan-antes-375')
      const btn = p.getByRole('link', { name: /Responder en un toque/ }).or(p.getByRole('button', { name: /Responder en un toque/ })).first()
      await btn.waitFor({ timeout: 15000 })
      inf.ok('i4: el plan ofrece «Responder en un toque»', true, '')
      await btn.click()
      await p.getByRole('heading', { name: '¿Cuándo puedes?' }).waitFor({ timeout: 30000 })
      t = limpio(await textoMain(p))
      inf.ok('i4: las opciones de un toque leen «sin hora de fin» (no un fin inventado)', /sin hora de fin/.test(t) && !/16:00 a 04:00/.test(t), t.match(/Puedo[^.]{0,120}/)?.[0] ?? '')
      await anchos(ana, '¿Cuándo puedes?'); await ana.captura('i4-cuando-puedes-375')
      await responderRapido(ana, 'dos')
      await p.getByRole('heading', { name: 'Respondiste' }).waitFor({ timeout: 15000 })
      t = limpio(await textoMain(p))
      inf.ok('i4: tras tocar, «Respondiste» y «1 de 7 respondieron»', /1 de 7 respondieron/.test(t), t.match(/\d+ de \d+ respondieron/)?.[0] ?? 'sin conteo en esta pantalla')
      inf.ok('i4: «Respondiste» no dice qué eligió a nadie más y ofrece «Cambiar mi respuesta»', await p.getByRole('button', { name: /Cambiar mi respuesta/ }).isVisible(), '')
      await anchos(ana, 'Respondiste'); await ana.captura('i4-respondiste-375')
      await p.getByRole('link', { name: 'Listo', exact: true }).click()
      await p.locator('.estado-hero-etiqueta').first().waitFor({ timeout: 30000 })
      await dormir(800)
      t = limpio(await textoMain(p))
      inf.ok('i4: el plan muestra «Tu respuesta»', /Tu respuesta/.test(t), t.match(/Tu respuesta[^.]{0,60}/)?.[0] ?? '')
      inf.ok('i4: el plan muestra «1 de 7 respondieron»', /1 de 7 respondieron/.test(t), t.match(/\d+ de \d+ respondieron/)?.[0] ?? 'sin conteo')
      inf.ok('i4: «Participación del plan» está en el plan', /Participación del plan/.test(t), '')
      await anchos(ana, 'plan respondido'); await ana.captura('i4-plan-respondido-375')
    })

    // i5 · Simulación: sin atajo «Cargar condiciones del caso»
    await paso('i5 simulación sin atajo', async () => {
      await irA(p, 'Simulación')
      await p.getByRole('heading', { name: 'Personas simuladas' }).waitFor({ timeout: 20000 })
      const t = limpio(await textoMain(p))
      inf.ok('i5: la Simulación NO ofrece «Cargar condiciones del caso»', (await p.getByRole('button', { name: /Cargar condiciones del caso/ }).count()) === 0 && !/Cargar las respuestas de los/.test(t), '')
      inf.ok('i5: dice que cada respuesta se carga por separado y Gabriela sigue pendiente', /por separado/.test(t) && /Gabriela/.test(t), '')
      await anchos(ana, 'Simulación'); await ana.captura('i5-simulacion-375')
      // simulate_load_case debe responder caso_no_disponible en la demo Makana (el servidor rechaza el atajo del caso viejo).
      const propuestaId = urlPlan.match(/\/p\/([^/?#]+)/)?.[1]
      if (cab) {
        const r = await fetch(`${cab.base}/rest/v1/rpc/simulate_load_case`, { method: 'POST', headers: { apikey: cab.apikey, authorization: cab.auth, 'content-type': 'application/json' }, body: JSON.stringify({ p_propuesta_id: propuestaId, p_intento_id: randomUUID() }) })
        const j = await r.json().catch(() => ({}))
        inf.ok('i5: simulate_load_case responde caso_no_disponible en la demo Makana', j?.ok === false && (j?.error?.detalle === 'caso_no_disponible' || j?.error?.codigo === 'caso_no_disponible'), `HTTP ${r.status}; codigo=${j?.error?.codigo}; detalle=${j?.error?.detalle}`)
      } else inf.ok('i5: simulate_load_case responde caso_no_disponible en la demo Makana', false, 'no se capturó la sesión de la página')
    })

    // i6 · Camila entra por el enlace desde otro contexto y reclama su asiento
    const camila = await new Persona(browser, 'Camila').abrir(); todas.push(camila)
    await paso('i6 Camila reclama su asiento', async () => {
      const via = await entrarPorEnlace(camila, codigo, 'Camila')
      inf.ok('i6: Camila encuentra su nombre en «¿Quién eres?» (lista, no escrito)', via === 'lista', `entró por: ${via}`)
      await esperarDestino(camila)
      await dormir(800)
      const t = limpio(await camila.page.locator('body').innerText())
      inf.ok('i6: Camila ve el aviso «Reclamaste el lugar de Camila»', /Reclamaste el lugar de Camila|Entraste como Camila/.test(t), t.match(/(Reclamaste|Entraste)[^.]{0,80}/)?.[0] ?? limpio(t).slice(0, 120))
      inf.ok('i6: Camila queda en «¿Cuándo puedes?» o en el grupo, sin error', /¿Cuándo puedes\?|Integrantes del grupo/.test(t) && !/Falla temporal|undefined|NaN/.test(t), '')
      await anchos(camila, 'Camila tras reclamar'); await camila.captura('i6-camila-reclama-375')
      if (await camila.page.getByRole('heading', { name: '¿Cuándo puedes?' }).isVisible().catch(() => false)) {
        await responderRapido(camila, 'dos')
        await camila.page.getByRole('heading', { name: 'Respondiste' }).waitFor({ timeout: 15000 })
        inf.ok('i6: Camila responde en un toque y ve «Respondiste»', true, '')
      }
      // ¿Puede otra persona reclamar el mismo lugar? El nombre ya no aparece libre.
      const otra = await new Persona(browser, 'Otra').abrir(); todas.push(otra)
      await otra.page.goto(`${BASE}/#/unirse/${codigo}`)
      await otra.page.getByRole('heading', { name: /^(¿Quién eres\?|Escribe tu nombre para entrar)$/ }).waitFor({ timeout: 30000 })
      await dormir(600)
      const fila = otra.page.getByRole('button', { name: 'Camila', exact: true })
      const sigue = await fila.count()
      const aviso = limpio(await otra.page.locator('body').innerText()).match(/Camila\s*(no disponible|ya entró)/)?.[1] ?? ''
      inf.ok('i6: el lugar de Camila queda rotulado «no disponible» para otra persona', sigue === 0 || aviso !== '', `botón=${sigue}; rótulo=«${aviso}»`)
      const joinsAntes = otra.rpc.filter((r) => r.fn === 'join_space').length
      const tocar = async (nombre) => { await otra.page.getByRole('button', { name: nombre, exact: true }).first().click(); await dormir(1000); return limpio(await otra.page.locator('body').innerText()).match(new RegExp(`¿Eres ${nombre}\\?[^]{0,200}`))?.[0] ?? limpio(await otra.page.locator('body').innerText()).slice(0, 160) }
      const tCam = sigue ? await tocar('Camila') : ''
      inf.ok('i6: tocar el lugar tomado de Camila NO la hace entrar (no llama a join_space, sigue en la invitación)', /¿Eres Camila\?/.test(tCam) && otra.rpc.filter((r) => r.fn === 'join_space').length === joinsAntes && /#\/unirse\//.test(otra.page.url()), tCam)
      // El texto de «¿Eres X?» en la demo dice «X es una persona simulada»: Camila ya la reclamó una persona real, y Ana nunca fue simulada.
      inf.ok('i6: el aviso de Camila (ya reclamada por una persona real) no la llama «persona simulada»', !/persona simulada/.test(tCam), tCam)
      await otra.captura('i6-eres-camila-375')
      await otra.page.getByRole('button', { name: 'Elegir otro nombre' }).click().catch(() => {}); await dormir(500)
      const tAna = await tocar('Ana').catch(() => '')
      inf.ok('i6: el aviso de Ana (organiza la demo) no dice que es una persona simulada', /¿Eres Ana\?/.test(tAna) && !/persona simulada/.test(tAna), tAna)
      await otra.captura('i6-eres-ana-375')
      await anchos(otra, '¿Quién eres? de la demo'); await otra.captura('i6-quien-eres-despues-375')
    })

    // i7 · lo que ve Ana ahora: Participación del plan y Actividad del grupo
    await paso('i7 reflejo en el grupo', async () => {
      await p.goto(urlPlan); await p.reload(); await p.locator('.estado-hero-etiqueta').first().waitFor({ timeout: 30000 }); await dormir(1200)
      let t = limpio(await textoMain(p))
      inf.ok('i7: el plan de Ana ahora dice «2 de 7 respondieron»', /2 de 7 respondieron/.test(t), t.match(/\d+ de \d+ respondieron/)?.[0] ?? 'sin conteo')
      inf.ok('i7: «Participación del plan» sigue visible y aclara que el interés no confirma', /Participación del plan/.test(t) && /no confirma/.test(t), '')
      await anchos(ana, 'plan tras Camila'); await ana.captura('i7-plan-tras-camila-375')
      await p.goto(`${BASE}/#/e/${espacioId}`); await p.reload(); await p.getByText('Actividad del grupo').first().waitFor({ timeout: 30000 }); await dormir(1200)
      t = limpio(await textoMain(p))
      const act = t.match(/Actividad del grupo[^]{0,500}/)?.[0] ?? ''
      inf.ok('i7: «Actividad del grupo» muestra a Camila (se unió)', /Camila/.test(act), act.slice(0, 200))
      // Camila ya no es una persona simulada: «Ya están en el grupo» la incluye y «Personas simuladas» queda con 5.
      const ya = t.match(/Ya están en el grupo[^]{0,200}/)?.[0] ?? ''
      inf.ok('i7: «Integrantes del grupo» pasa a «2 ya entraron» con Camila entre quienes ya están', /2 ya entraron/.test(t) && /Camila/.test(ya), (t.match(/Integrantes del grupo[^]{0,90}/)?.[0] ?? '').slice(0, 100))
      await anchos(ana, 'grupo tras Camila'); await ana.captura('i7-grupo-tras-camila-375')
    })

    // i8 · Ana busca la opción con 2 respuestas; los dos confirman; Camila se baja: Participación del plan y Actividad del grupo
    await paso('i8 versión, confirmaciones y baja', async () => {
      await p.goto(urlPlan); await p.reload(); await p.locator('.estado-hero-etiqueta').first().waitFor({ timeout: 30000 })
      await p.getByRole('button', { name: /^(Buscar opción compatible|Volver a buscar opción)/ }).first().click()
      await p.getByRole('button', { name: /^Confirmar versión 1/ }).waitFor({ timeout: 30000 }); await dormir(800)
      let t = limpio(await textoMain(p))
      inf.ok('i8: la versión 1 muestra «desde las 16:00 · sin hora de fin»', /desde las 16:00 · sin hora de fin/.test(t) && !/16:00 a 04:00/.test(t), t.match(/[^.]{0,50}sin hora de fin/)?.[0] ?? 'no aparece')
      inf.ok('i8: «Participación del plan» pasa a «Versión 1 · 0 confirmaciones» y lista 7 «Sin confirmar esta versión»', /Versión 1 · 0 confirmaciones/.test(t) && /7\s*Sin confirmar esta versión/.test(t), t.match(/Participación del plan[^]{0,200}/)?.[0] ?? '')
      await anchos(ana, 'versión publicada'); await ana.captura('i8-version-publicada-375')
      await p.getByRole('button', { name: /^Confirmar versión 1/ }).click(); await dormir(1800)
      t = limpio(await textoMain(p))
      inf.ok('i8: tras confirmar Ana, «Versión 1 · 1 confirmación» y Ana figura entre quienes confirmaron', /Versión 1 · 1 confirmación/.test(t) && /1\s*Confirmaron la versión 1\s*AN\s*Ana \(tú\)/.test(t), t.match(/Participación del plan[^]{0,160}/)?.[0] ?? '')
      const c = camila.page
      await c.goto(urlPlan); await c.reload(); await c.getByRole('button', { name: /^Confirmar versión 1/ }).waitFor({ timeout: 30000 })
      await c.getByRole('button', { name: /^Confirmar versión 1/ }).click()
      await c.locator('.estado-hero-etiqueta').filter({ hasText: /¡Se juntan!|Grupo confirmado/ }).first().waitFor({ timeout: 30000 })
      inf.ok('i8: con la confirmación de Camila (mínimo 2) el plan dice ¡Se juntan!', true, await estadoPlan(c))
      await p.reload(); await p.locator('.estado-hero-etiqueta').first().waitFor({ timeout: 30000 }); await dormir(1000)
      t = limpio(await textoMain(p))
      inf.ok('i8: «Participación del plan» muestra 2 confirmaciones, con Ana y Camila', /Versión 1 · 2 confirmaciones/.test(t) && /Camila/.test(t.match(/Confirmaron la versión 1[^]{0,120}/)?.[0] ?? ''), t.match(/Participación del plan[^]{0,200}/)?.[0] ?? '')
      await ana.captura('i8-se-juntan-375')
      // Camila se baja: el plan no nombra a quien se bajó (E13); «Actividad del grupo» sí lo hace (pedido de Nico, docs/actividad-grupo.md).
      const ret = c.getByRole('button', { name: /^Retirarme de este plan$|^Ya no puedo ir/ }).first(); await ret.waitFor({ timeout: 15000 }); await ret.click()
      const promesa = limpio(await c.getByRole('button', { name: 'Sí, no voy' }).locator('xpath=ancestor::*[contains(., "Retirarte definitivamente")][1]').first().innerText().catch(() => ''))
      await c.getByRole('button', { name: 'Sí, no voy' }).click(); await dormir(2500)
      await p.reload(); await p.locator('.estado-hero-etiqueta').first().waitFor({ timeout: 30000 }); await dormir(1000)
      t = limpio(await textoMain(p))
      const enPlan = limpio((await p.locator('main').first().innerText()).split('Participación del plan')[0])
      inf.ok('i8: tras la baja de Camila, Ana ve «Una persona se retiró» y el encabezado del plan no nombra a Camila', /Una persona se retiró|se retiró/.test(enPlan) && !/Camila/.test(enPlan), `estado «${await estadoPlan(p)}»; «${enPlan.slice(0, 160)}»`)
      await ana.captura('i8-tras-la-baja-375')
      await p.goto(`${BASE}/#/e/${espacioId}`); await p.reload(); await p.getByText('Actividad del grupo').first().waitFor({ timeout: 30000 }); await dormir(1200)
      t = limpio(await textoMain(p))
      const act = t.match(/Actividad del grupo[^]{0,400}/)?.[0] ?? ''
      inf.ok('i8: «Actividad del grupo» muestra «Camila se bajó de Parque del Encuentro…» con «Ver plan»', /Camila.*se bajó de/.test(act) && /Ver plan/.test(act), act.slice(0, 220))
      // La confirmación de la baja promete «la baja queda registrada sin tu nombre»; la actividad del grupo (pedido de Nico, docs/actividad-grupo.md) sí lo nombra.
      const prometeAnonimato = /sin tu nombre/.test(promesa); const nombra = /Camila.*se bajó de/.test(act)
      inf.ok('i8: lo que promete la confirmación de baja coincide con lo que publica «Actividad del grupo»', !(prometeAnonimato && nombra), `confirmación: «${promesa.slice(0, 200)}»; actividad nombra a Camila: ${nombra}`)
      await anchos(ana, 'grupo tras la baja'); await ana.captura('i8-actividad-tras-baja-375')
    })

    const consola = todas.flatMap((x) => x.errores.map((e) => `${x.nombre}: ${e}`)).slice(0, 5)
    const malas = todas.flatMap((x) => x.malas.map((e) => `${x.nombre}: ${e}`)).slice(0, 5)
    inf.ok('i sin errores de consola', consola.length === 0, consola.join(' | '))
    inf.ok('i sin respuestas HTTP ≥ 400 (ni 401)', malas.length === 0, malas.join(' | '))
    const { texto, errores } = tablaRpc(todas)
    log('RPC (demo Makana):\n' + texto)
    inf.ok('i sin errores de RPC', Object.keys(errores).length === 0, JSON.stringify(errores))
  } finally {
    for (const x of todas) await x.cerrar(); await browser.close()
  }
})
inf.fin()
