// (i) Demo Makana «El plan que no deja a nadie afuera» (main 018215d; nombres viejos Ana/Bruno/Camila… o nuevos Bastián/Nacho/Carlos… según lo publicado): quien organiza + 6 simulados, SIN respuestas precargadas.
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
// El coordinador renombra a la demo (migración 0059): Ana→Bastián, Bruno→Nacho, Camila→Carlos, Diego→Kai, Elena→Charlie, Felipe→Joaco, Gabriela→Pía.
// Hasta que el front nuevo esté publicado, producción puede mostrar los nombres viejos: el guion detecta cuáles y acepta ambos.
const JUEGOS = {
  viejo: { ORG: 'Ana', CAM: 'Camila', PIA: 'Gabriela', TODOS: ['Ana', 'Bruno', 'Camila', 'Diego', 'Elena', 'Felipe', 'Gabriela'] },
  nuevo: { ORG: 'Bastián', CAM: 'Carlos', PIA: 'Pía', TODOS: ['Bastián', 'Nacho', 'Carlos', 'Kai', 'Charlie', 'Joaco', 'Pía'] },
}
let ORG = 'Ana', CAM = 'Camila', PIA = 'Gabriela', TODOS = JUEGOS.viejo.TODOS, copyPortada = 'viejo', TOT = 7
const esc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
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
    const ana = await new Persona(browser, 'Organizador'); await ana.abrir(); todas.push(ana)
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
      const quien = t.match(/Serás ([^\s,]+)/)?.[1]
      copyPortada = quien === JUEGOS.nuevo.ORG ? 'nuevo' : 'viejo'
      inf.ok(`i1 (nombres): el texto de la portada usa los nombres ${copyPortada === 'nuevo' ? 'NUEVOS' : 'VIEJOS («Serás Ana…»): el front con los nombres nuevos aún no está publicado'}`, true, t.match(/Serás [^.]*\./)?.[0] ?? '')
      inf.ok('i1: el detalle dice quién organiza y que los otros seis son simulados', /Serás [^\s,]+, quien organiza/.test(t) && /simulados/.test(t), t.match(/Serás [^.]*\./)?.[0] ?? '')
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
      const juegoServidor = t.includes(JUEGOS.nuevo.ORG) ? 'nuevo' : 'viejo'; ;({ ORG, CAM, PIA, TODOS } = JUEGOS[juegoServidor])
      inf.ok(`i2 (nombres): el servidor entrega los nombres ${juegoServidor === 'nuevo' ? 'NUEVOS (Bastián, Nacho, Carlos…)' : 'VIEJOS (Ana, Bruno, Camila…)'}${juegoServidor !== copyPortada ? ' mientras la portada dice los ' + copyPortada.toUpperCase() + 'S (front y base desfasados hasta publicar)' : ''}`, true, '')
      const faltan = TODOS.filter((n) => !t.includes(n))
      inf.ok(`i2: se ven los siete nombres (${ORG} + 6 simulados)`, faltan.length === 0, faltan.length ? `faltan ${faltan}` : '')
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
      inf.ok(`i5: dice que cada respuesta se carga por separado y ${PIA} sigue pendiente`, /por separado/.test(t) && t.includes(PIA), '')
      await anchos(ana, 'Simulación'); await ana.captura('i5-simulacion-375')
    })

    // i6 · Camila entra por el enlace desde otro contexto y reclama su asiento
    const camila = await new Persona(browser, 'Invitada').abrir(); todas.push(camila)
    await paso(`i6 ${CAM} reclama su asiento`, async () => {
      // ¿Está el lugar libre? Desde 0060 los seis simulados traen gustos y `cruce.asiento_usado` los cuenta: puede que ya no se pueda reclamar.
      await camila.page.goto(`${BASE}/#/unirse/${codigo}`)
      await camila.page.getByRole('heading', { name: /^(¿Quién eres\?|Escribe tu nombre para entrar)$/ }).waitFor({ timeout: 45000 })
      const enLista = await camila.page.getByRole('button', { name: CAM, exact: true }).waitFor({ timeout: 6000 }).then(() => true, () => false)
      const cuerpo = limpio(await camila.page.locator('body').innerText())
      inf.ok(`i6: ${CAM} (persona simulada de la demo) aparece en «¿Quién eres?» para reclamar su lugar`, enLista, enLista ? '' : `la lista no la ofrece: «${cuerpo.match(/(Escribe tu nombre|¿Quién eres\?)[^]{0,260}/)?.[0] ?? cuerpo.slice(0, 200)}»`)
      if (!enLista) {
        await camila.captura('i6-sin-lugar-para-reclamar-375')
        // Se prueba lo que ofrece la pantalla: escribir el nombre de la persona simulada («reclamas su lugar»).
        const no = camila.page.getByRole('button', { name: /No estoy en la lista/ }); if (await no.isVisible().catch(() => false)) await no.click()
        await camila.page.getByLabel(/Tu nombre/).first().fill(CAM); await camila.page.getByRole('button', { name: /^(Unirme|Entrar)$/ }).first().click(); await dormir(2500)
        const rech = limpio(await camila.page.locator('body').innerText()); const cod = camila.rpc.filter((r) => r.fn === 'join_space').map((r) => r.codigo || 'ok').join(',')
        inf.ok(`i6: escribir «${CAM}» (nombre de una persona simulada) reclama su lugar, como promete la pantalla`, !/asiento_en_uso/.test(cod) && !/ya tiene actividad simulada/.test(rech), `join_space → ${cod || 'sin llamada'}; «${rech.match(/Ese asiento[^]{0,120}/)?.[0] ?? rech.slice(0, 160)}»`)
        await camila.captura('i6-reclamo-escrito-rechazado-375')
        CAM = 'Camila Qa'; TOT += 1 // para seguir con el resto del flujo entra como una persona nueva
      }
      await entrarPorEnlace(camila, codigo, CAM)
      await esperarDestino(camila)
      await dormir(800)
      const t = limpio(await camila.page.locator('body').innerText())
      inf.ok(`i6: ${CAM} ve el aviso «Reclamaste el lugar de ${CAM}»`, new RegExp(`Reclamaste el lugar de ${CAM}|Entraste como ${CAM}|Te uniste a`).test(t), t.match(/(Reclamaste|Entraste)[^.]{0,80}/)?.[0] ?? limpio(t).slice(0, 120))
      inf.ok(`i6: ${CAM} queda en «¿Cuándo puedes?» o en el grupo, sin error`, /¿Cuándo puedes\?|Integrantes del grupo/.test(t) && !/Falla temporal|undefined|NaN/.test(t), '')
      await anchos(camila, `${CAM} tras reclamar`); await camila.captura('i6-camila-reclama-375')
      if (await camila.page.getByRole('heading', { name: '¿Cuándo puedes?' }).isVisible().catch(() => false)) {
        await responderRapido(camila, 'dos')
        await camila.page.getByRole('heading', { name: 'Respondiste' }).waitFor({ timeout: 15000 })
        inf.ok(`i6: ${CAM} responde en un toque y ve «Respondiste»`, true, '')
      }
      // ¿Puede otra persona reclamar el mismo lugar? El nombre ya no aparece libre (solo se prueba si el lugar se pudo reclamar).
      const otra = await new Persona(browser, 'Otra').abrir(); todas.push(otra)
      await otra.page.goto(`${BASE}/#/unirse/${codigo}`)
      await otra.page.getByRole('heading', { name: /^(¿Quién eres\?|Escribe tu nombre para entrar)$/ }).waitFor({ timeout: 30000 })
      await dormir(600)
      if (enLista) {
        const fila = otra.page.getByRole('button', { name: CAM, exact: true })
        const sigue = await fila.count()
        const aviso = limpio(await otra.page.locator('body').innerText()).match(new RegExp(`${CAM}\\s*(no disponible|ya entró)`))?.[1] ?? ''
        inf.ok(`i6: el lugar de ${CAM} queda rotulado «no disponible» para otra persona`, sigue === 0 || aviso !== '', `botón=${sigue}; rótulo=«${aviso}»`)
        const joinsAntes = otra.rpc.filter((r) => r.fn === 'join_space').length
        const tocar = async (nombre) => { await otra.page.getByRole('button', { name: nombre, exact: true }).first().click({ timeout: 8000 }); await dormir(1000); return limpio(await otra.page.locator('body').innerText()).match(new RegExp(`¿Eres ${nombre}\\?[^]{0,200}`))?.[0] ?? limpio(await otra.page.locator('body').innerText()).slice(0, 160) }
        const tCam = sigue ? await tocar(CAM) : ''
        inf.ok(`i6: tocar el lugar tomado de ${CAM} NO la hace entrar (no llama a join_space, sigue en la invitación)`, new RegExp(`¿Eres ${CAM}\\?`).test(tCam) && otra.rpc.filter((r) => r.fn === 'join_space').length === joinsAntes && /#\/unirse\//.test(otra.page.url()), tCam)
        // El texto de «¿Eres X?» en la demo dice «X es una persona simulada»: la persona que reclamó es real, y quien organiza nunca fue simulada.
        inf.ok(`i6: el aviso de ${CAM} (ya reclamada por una persona real) no la llama «persona simulada»`, !/persona simulada/.test(tCam), tCam)
        await otra.captura('i6-eres-camila-375')
        await otra.page.getByRole('button', { name: 'Elegir otro nombre' }).click().catch(() => {}); await dormir(500)
        const tAna = await tocar(ORG).catch(() => '')
        inf.ok(`i6: el aviso de ${ORG} (organiza la demo) no dice que es una persona simulada`, new RegExp(`¿Eres ${ORG}\\?`).test(tAna) && !/persona simulada/.test(tAna), tAna)
        await otra.captura('i6-eres-ana-375')
      } else {
        const t0 = limpio(await otra.page.locator('body').innerText())
        inf.ok('i6: (sin lugares que reclamar) la pantalla de la invitación no lista a ninguna persona de la demo y dice «Los nombres de la lista ya entraron»', /Los nombres de la lista ya entraron/.test(t0), t0.match(/Los nombres[^.]*\./)?.[0] ?? '')
      }
      await anchos(otra, '¿Quién eres? de la demo'); await otra.captura('i6-quien-eres-despues-375')
    })

    // i7 · lo que ve Ana ahora: Participación del plan y Actividad del grupo
    await paso('i7 reflejo en el grupo', async () => {
      await p.goto(urlPlan); await p.reload(); await p.locator('.estado-hero-etiqueta').first().waitFor({ timeout: 30000 }); await dormir(1200)
      let t = limpio(await textoMain(p))
      inf.ok(`i7: el plan de quien organiza ahora dice «2 de ${TOT} respondieron»`, new RegExp(`2 de ${TOT} respondieron`).test(t), t.match(/\d+ de \d+ respondieron/)?.[0] ?? 'sin conteo')
      inf.ok('i7: «Participación del plan» sigue visible y aclara que el interés no confirma', /Participación del plan/.test(t) && /no confirma/.test(t), '')
      await anchos(ana, 'plan tras Camila'); await ana.captura('i7-plan-tras-camila-375')
      await p.goto(`${BASE}/#/e/${espacioId}`); await p.reload(); await p.getByText('Actividad del grupo').first().waitFor({ timeout: 30000 }); await dormir(1200)
      t = limpio(await textoMain(p))
      const act = t.match(/Actividad del grupo[^]{0,500}/)?.[0] ?? ''
      inf.ok(`i7: «Actividad del grupo» muestra a ${CAM} (se unió)`, new RegExp(`${CAM} se unió`).test(act), act.slice(0, 200))
      // Camila ya no es una persona simulada: «Ya están en el grupo» la incluye y «Personas simuladas» queda con 5.
      const ya = t.match(/Ya están en el grupo[^]{0,200}/)?.[0] ?? ''
      inf.ok(`i7: «Integrantes del grupo» pasa a «2 ya entraron» con ${CAM} entre quienes ya están`, /2 ya entraron/.test(t) && ya.includes(CAM), (t.match(/Integrantes del grupo[^]{0,90}/)?.[0] ?? '').slice(0, 100))
      await anchos(ana, 'grupo tras Camila'); await ana.captura('i7-grupo-tras-camila-375')
    })

    // i8 · Ana busca la opción con 2 respuestas; los dos confirman; Camila se baja: Participación del plan y Actividad del grupo
    await paso('i8 versión, confirmaciones y baja', async () => {
      await p.goto(urlPlan); await p.reload(); await p.locator('.estado-hero-etiqueta').first().waitFor({ timeout: 30000 })
      await p.getByRole('button', { name: /^(Buscar opción compatible|Volver a buscar opción)/ }).first().click()
      await p.getByRole('button', { name: /^Confirmar versión 1/ }).waitFor({ timeout: 30000 }); await dormir(800)
      let t = limpio(await textoMain(p))
      inf.ok('i8: la versión 1 muestra «desde las 16:00 · sin hora de fin»', /desde las 16:00 · sin hora de fin/.test(t) && !/16:00 a 04:00/.test(t), t.match(/[^.]{0,50}sin hora de fin/)?.[0] ?? 'no aparece')
      inf.ok(`i8: «Participación del plan» pasa a «Versión 1 · 0 confirmaciones» y lista ${TOT} «Sin confirmar esta versión»`, /Versión 1 · 0 confirmaciones/.test(t) && new RegExp(`${TOT}\\s*Sin confirmar esta versión`).test(t), t.match(/Participación del plan[^]{0,200}/)?.[0] ?? '')
      await anchos(ana, 'versión publicada'); await ana.captura('i8-version-publicada-375')
      await p.getByRole('button', { name: /^Confirmar versión 1/ }).click(); await dormir(1800)
      t = limpio(await textoMain(p))
      inf.ok(`i8: tras confirmar ${ORG}, «Versión 1 · 1 confirmación» y ${ORG} figura entre quienes confirmaron`, /Versión 1 · 1 confirmación/.test(t) && new RegExp(`1\\s*Confirmaron la versión 1\\s*\\S+\\s*${ORG} \\(tú\\)`).test(t), t.match(/Participación del plan[^]{0,160}/)?.[0] ?? '')
      const c = camila.page
      await c.goto(urlPlan); await c.reload(); await c.getByRole('button', { name: /^Confirmar versión 1/ }).waitFor({ timeout: 30000 })
      await c.getByRole('button', { name: /^Confirmar versión 1/ }).click()
      await c.locator('.estado-hero-etiqueta').filter({ hasText: /¡Se juntan!|Grupo confirmado/ }).first().waitFor({ timeout: 30000 })
      inf.ok(`i8: con la confirmación de ${CAM} (mínimo 2) el plan dice ¡Se juntan!`, true, await estadoPlan(c))
      await p.reload(); await p.locator('.estado-hero-etiqueta').first().waitFor({ timeout: 30000 }); await dormir(1000)
      t = limpio(await textoMain(p))
      inf.ok(`i8: «Participación del plan» muestra 2 confirmaciones, con ${ORG} y ${CAM}`, /Versión 1 · 2 confirmaciones/.test(t) && !!t.match(/Confirmaron la versión 1[^]{0,120}/)?.[0]?.includes(CAM), t.match(/Participación del plan[^]{0,200}/)?.[0] ?? '')
      await ana.captura('i8-se-juntan-375')
      // quien reclamó se baja: el plan no nombra a quien se bajó (E13); «Actividad del grupo» sí lo hace (pedido de Nico, docs/actividad-grupo.md).
      const ret = c.getByRole('button', { name: /^Retirarme de este plan$|^Ya no puedo ir/ }).first(); await ret.waitFor({ timeout: 15000 }); await ret.click()
      const promesa = limpio(await c.getByRole('button', { name: 'Sí, no voy' }).locator('xpath=ancestor::*[contains(., "Retirarte definitivamente")][1]').first().innerText().catch(() => ''))
      await c.getByRole('button', { name: 'Sí, no voy' }).click(); await dormir(2500)
      await p.reload(); await p.locator('.estado-hero-etiqueta').first().waitFor({ timeout: 30000 }); await dormir(1000)
      t = limpio(await textoMain(p))
      const enPlan = limpio((await p.locator('main').first().innerText()).split('Participación del plan')[0])
      inf.ok(`i8: tras la baja de ${CAM}, ${ORG} ve «Una persona se retiró» y el encabezado del plan no nombra a ${CAM}`, /Una persona se retiró|se retiró/.test(enPlan) && !enPlan.includes(CAM), `estado «${await estadoPlan(p)}»; «${enPlan.slice(0, 160)}»`)
      await ana.captura('i8-tras-la-baja-375')
      await p.goto(`${BASE}/#/e/${espacioId}`); await p.reload(); await p.getByText('Actividad del grupo').first().waitFor({ timeout: 30000 }); await dormir(1200)
      t = limpio(await textoMain(p))
      const act = t.match(/Actividad del grupo[^]{0,400}/)?.[0] ?? ''
      inf.ok(`i8: «Actividad del grupo» muestra «${CAM} se bajó de Parque del Encuentro…» con «Ver plan»`, new RegExp(`${CAM}.*se bajó de`).test(act) && /Ver plan/.test(act), act.slice(0, 220))
      // La confirmación de la baja promete «la baja queda registrada sin tu nombre»; la actividad del grupo (pedido de Nico, docs/actividad-grupo.md) sí lo nombra.
      const prometeAnonimato = /sin tu nombre/.test(promesa); const nombra = new RegExp(`${CAM}.*se bajó de`).test(act)
      inf.ok('i8: lo que promete la confirmación de baja coincide con lo que publica «Actividad del grupo»', !(prometeAnonimato && nombra), `confirmación: «${promesa.slice(0, 200)}»; actividad nombra a ${CAM}: ${nombra}`)
      await anchos(ana, 'grupo tras la baja'); await ana.captura('i8-actividad-tras-baja-375')
    })

    // i9 · simulate_load_case directo (al final, para no alterar los conteos de i4–i8). Con 0059 respondía `caso_no_disponible`; con 0060 (la demo «nace cargada»)
    // el atajo «Cargar respuestas» ya está permitido en el servidor. Se informa cuál de los dos es la base de producción.
    await paso('i9 simulate_load_case', async () => {
      const propuestaId = urlPlan.match(/\/p\/([^/?#]+)/)?.[1]
      if (!cab) { inf.ok('i9: simulate_load_case (observación)', false, 'no se capturó la sesión de la página'); return }
      const r = await fetch(`${cab.base}/rest/v1/rpc/simulate_load_case`, { method: 'POST', headers: { apikey: cab.apikey, authorization: cab.auth, 'content-type': 'application/json' }, body: JSON.stringify({ p_propuesta_id: propuestaId, p_intento_id: randomUUID() }) })
      const j = await r.json().catch(() => ({}))
      const rechazado = j?.ok === false && (j?.error?.detalle === 'caso_no_disponible' || j?.error?.codigo === 'caso_no_disponible')
      inf.ok(`i9 (observación): simulate_load_case en la demo Makana → ${rechazado ? 'caso_no_disponible (base con 0059, sin atajo)' : j?.ok === true ? 'OK (base con 0060+: la demo nace cargada y «Cargar respuestas» está permitido; el front 018215d no muestra el botón)' : 'respuesta inesperada'}`, rechazado || j?.ok === true, `HTTP ${r.status}; ok=${j?.ok}; codigo=${j?.error?.codigo}; detalle=${j?.error?.detalle}`)
    })

    const consola = todas.flatMap((x) => x.errores.map((e) => `${x.nombre}: ${e}`)).slice(0, 5)
    const malas = todas.flatMap((x) => x.malas.map((e) => `${x.nombre}: ${e}`)).slice(0, 5)
    inf.ok('i sin errores de consola', consola.length === 0, consola.join(' | '))
    inf.ok('i sin respuestas HTTP ≥ 400 (ni 401)', malas.length === 0, malas.join(' | '))
    const { texto, errores } = tablaRpc(todas)
    log('RPC (demo Makana):\n' + texto)
    const inesperados = Object.keys(errores).filter((k) => !/asiento_en_uso/.test(k)) // asiento_en_uso es la consecuencia del defecto ya registrado en i6
    inf.ok('i sin errores de RPC (salvo el asiento_en_uso ya registrado en i6)', inesperados.length === 0, JSON.stringify(errores))
  } finally {
    for (const x of todas) await x.cerrar(); await browser.close()
  }
})
inf.fin()
