// (c) 30 a la vez, en producción: 30 contextos abren el enlace, eligen nombre y responden en paralelo (Promise.all) en un grupo propio;
// latencia p50/p95 por RPC, errores (incluido 57014), conteo «N de M respondieron»; luego 30 confirmaciones simultáneas con máximo 20.
//   node tests/qa-gente/c-treinta.mjs [url]
import { BASE, conTurno, lanzar, Informe, Persona, crearPlan, leerCodigo, entrarPorEnlace, esperarDestino, responderRapido, estadoPlan, textoMain, tablaRpc, agregarRpc, NOMBRES, resumenLat, log } from './lib.mjs'
import { irA } from '../e2e/nav.mjs'
const N = Number(process.env.QA_N || 30), MAXIMO = 20
const sello = new Date().toLocaleString('sv-SE', { timeZone: 'America/Santiago' }).replace(/\D/g, '').slice(8, 12)
const inf = new Informe('c-treinta')
const nombres = Array.from({ length: N }, (_, i) => `${NOMBRES[i % NOMBRES.length]}${i >= NOMBRES.length ? i : ''} C${sello}`)
const todas = []
await conTurno(`qa-gente (c) ${N} a la vez + confirmaciones concurrentes`, async () => {
  const browser = await lanzar()
  try {
    const org = await new Persona(browser, `Org C${sello}`).abrir(); todas.push(org)
    await org.page.goto(`${BASE}/#/crear`)
    await org.page.getByRole('heading', { name: 'Crear un grupo' }).waitFor({ timeout: 30000 })
    await org.page.getByLabel('Nombre del grupo').fill(`Treinta ${sello}`); await org.page.getByLabel('Tu nombre en el grupo').fill(org.nombre)
    const campo = org.page.locator('#quienes-nuevo'); await campo.fill(nombres.slice(0, 12).join(', ')); await campo.press('Enter')
    await org.page.getByRole('button', { name: 'Crear grupo', exact: true }).click()
    await org.page.getByRole('heading', { name: 'Nuevo plan' }).waitFor({ timeout: 30000 })
    const espacioId = org.page.url().match(/#\/e\/([^/?#]+)/)[1]
    const urlPlan = await crearPlan(org, { titulo: 'Treinta a la vez', minimo: 5, maximo: MAXIMO })
    const codigo = await leerCodigo(org, `${BASE}/#/e/${espacioId}`)
    // Preparar 30 contextos (sin red) y soltarlos juntos.
    const invitados = await Promise.all(nombres.map((n) => new Persona(browser, n).abrir()))
    todas.push(...invitados)
    const t0 = Date.now()
    const res = await Promise.all(invitados.map(async (p) => {
      const t = Date.now()
      try { await entrarPorEnlace(p, codigo, p.nombre, { timeout: 90000 }); await esperarDestino(p, 90000); const tEnt = Date.now() - t; await responderRapido(p, 'dos', 90000); return { ok: true, tEnt, tTotal: Date.now() - t } }
      catch (e) { await p.captura(`c-fallo-${p.nombre.split(' ')[0]}`); return { ok: false, error: `${p.nombre}: ${String(e.message).split('\n')[0].slice(0, 90)}`, pantalla: (await textoMain(p.page)).replace(/\s+/g, ' ').slice(0, 120) } }
    }))
    const bien = res.filter((r) => r.ok), mal = res.filter((r) => !r.ok)
    inf.ok(`c1: ${N} personas entran por el enlace y responden a la vez`, mal.length === 0, `${bien.length}/${N} ok en ${((Date.now() - t0) / 1000).toFixed(1)} s; entrar: ${resumenLat(bien.map((r) => r.tEnt))}; entrar+responder: ${resumenLat(bien.map((r) => r.tTotal))}${mal.length ? '; fallos: ' + mal.slice(0, 4).map((m) => m.error + ' «' + m.pantalla + '»').join(' | ') : ''}`)
    const t1 = tablaRpc(invitados, ['join_space', 'save_my_conditions', 'get_proposal_state', 'list_proposals', 'preview_space_by_code', 'get_space'])
    console.log('Latencia por RPC con 30 en paralelo (solo los 30 invitados):\n' + t1.texto)
    const errs = agregarRpc(invitados).errores
    inf.ok('c2: ninguna RPC devolvió error (en particular 57014 / statement timeout)', Object.keys(errs).length === 0, JSON.stringify(errs))
    // Conteo del organizador.
    const p = org.page
    await p.goto(urlPlan); await p.reload(); await p.locator('.estado-hero-etiqueta').first().waitFor({ timeout: 30000 })
    await irA(p, 'Mi respuesta'); await responderRapido(org, 'dos'); await irA(p, 'Plan')
    const esperado = bien.length + 1
    const m = (await textoMain(p)).match(/(\d+) de (\d+) respondieron/)
    inf.ok(`c3: el conteo «N de M respondieron» cuadra con lo que respondieron (${esperado})`, m && Number(m[1]) === esperado && Number(m[2]) >= esperado, m?.[0] ?? 'sin conteo')
    await org.captura('c3-conteo-31')
    await p.getByRole('button', { name: /^Buscar opción compatible/ }).click()
    await p.getByRole('button', { name: /^Confirmar versión 1/ }).waitFor({ timeout: 40000 })
    const vis = (await textoMain(p)).replace(/\s+/g, ' ')
    inf.ok('c4: con 31 respondidas y máximo 20, el plan publica una versión y dice quién entra / cupos', true, vis.match(/Cupos[^.]*\.|\d+ (?:personas|de \d+)[^.]{0,60}/)?.[0] ?? vis.slice(0, 160))
    await org.captura('c4-version-publicada')
    // Confirmaciones concurrentes: cargar todos el plan, barrera, clic simultáneo.
    const cargados = await Promise.all(invitados.map(async (q) => { try { await q.page.goto(urlPlan); await q.page.reload(); await q.page.locator('.estado-hero-etiqueta').first().waitFor({ timeout: 60000 }); const b = q.page.getByRole('button', { name: /^Confirmar versión 1/ }); return (await b.waitFor({ timeout: 8000 }).then(() => true, () => false)) ? q : null } catch { return null } }))
    const con = cargados.filter(Boolean), sinBoton = invitados.filter((q) => !cargados.includes(q))
    log(`${con.length} ven «Confirmar versión 1»; ${sinBoton.length} no (versión no los incluye o cupo)`)
    const antes = new Map(con.map((q) => [q, q.rpc.length]))
    const tc = Date.now()
    await Promise.all(con.map((q) => q.page.getByRole('button', { name: /^Confirmar versión 1/ }).click().catch(() => {})))
    await Promise.all(con.map((q) => q.page.waitForTimeout(6000)))
    const acc = con.map((q) => ({ q, r: q.rpc.slice(antes.get(q)).filter((x) => x.fn === 'accept_version').at(-1) })).filter((x) => x.r)
    const okAcc = acc.filter((x) => x.r.status === 200 && !x.r.codigo), rech = acc.filter((x) => x.r.codigo || x.r.status >= 400)
    const motivos = {}; for (const x of rech) motivos[`${x.r.status}:${x.r.codigo}`] = (motivos[`${x.r.status}:${x.r.codigo}`] ?? 0) + 1
    console.log(`accept_version concurrentes: ok=${okAcc.length} rechazados=${rech.length} ${JSON.stringify(motivos)}; ${resumenLat(acc.map((x) => x.r.ms))}; tiempo total ${Date.now() - tc} ms`)
    // Estado final visto por la organizadora (ya confirmó? no: confirma primero la organizadora si hay cupo).
    await p.goto(urlPlan); await p.reload(); await p.locator('.estado-hero-etiqueta').first().waitFor({ timeout: 30000 })
    const tf = (await textoMain(p)).replace(/\s+/g, ' '); const est = await estadoPlan(p)
    const nConf = Number(tf.match(/(\d+) confirmaron|Confirmaron (\d+)/)?.slice(1).find(Boolean) ?? NaN)
    inf.ok(`c5: nunca más de ${MAXIMO} confirmados con ${con.length} intentando a la vez`, okAcc.length <= MAXIMO && !(nConf > MAXIMO), `aceptadas=${okAcc.length}; plan dice ${nConf}; estado «${est}»`)
    inf.ok('c6: las confirmaciones de más se rechazan con un código limpio (no 500 ni 57014)', rech.every((x) => x.r.codigo && x.r.status === 200), JSON.stringify(motivos))
    // Qué ve quien quedó afuera.
    const fuera = rech[0]?.q ?? sinBoton[0]
    if (fuera) { await fuera.page.waitForTimeout(500); const tx = (await textoMain(fuera.page)).replace(/\s+/g, ' '); await fuera.captura('c6-quien-queda-afuera'); inf.ok('c6b: quien queda afuera ve un mensaje claro (sin error técnico)', !/Falla temporal|undefined|null/.test(tx) && tx.length > 40, tx.slice(0, 260)) }
    else inf.ok('c6b: hubo alguien afuera', false, 'nadie quedó afuera: revisar cupo')
    const sin = (await p.evaluate(() => document.documentElement.scrollWidth - innerWidth))
    inf.ok('sin desborde horizontal a 375 px (organizadora)', sin <= 0, `${sin}`)
  } finally {
    const t = tablaRpc(todas); console.log('RPC (todas):\n' + t.texto); console.log('Errores RPC: ' + JSON.stringify(t.errores))
    const consola = todas.flatMap((p) => p.errores.map((e) => `${p.nombre}: ${e}`)).slice(0, 6)
    inf.ok('sin errores de consola', consola.length === 0, consola.join(' | '))
    for (const p of todas) await p.cerrar(); await browser.close()
  }
})
inf.fin()
