// (b) Muchas personas, en producción: un grupo con 20 integrantes (organizadora + 19), todos responden y confirman; la persona 21 intenta entrar.
// La lista de «Crear grupo» admite hasta 12 nombres (MAX_INTEGRANTES): 12 entran tocando su nombre y el resto por «No estoy en la lista».
//   node tests/qa-gente/b-muchas.mjs [url]
import { BASE, conTurno, lanzar, Informe, Persona, crearGrupo, crearPlan, leerCodigo, entrarPorEnlace, esperarDestino, responderRapido, estadoPlan, textoMain, tablaRpc, enLotes, NOMBRES, log, resumenLat } from './lib.mjs'
import { irA } from '../e2e/nav.mjs'
const sello = new Date().toLocaleString('sv-SE', { timeZone: 'America/Santiago' }).replace(/\D/g, '').slice(8, 12)
const inf = new Informe('b-muchas')
const inv = NOMBRES.slice(1, 20).map((n) => `${n} B${sello}`) // 19 invitados + organizadora = 20
const todas = []
await conTurno('qa-gente (b) 20 personas en un grupo + persona 21', async () => {
  const browser = await lanzar()
  try {
    const org = await new Persona(browser, `${NOMBRES[0]} B${sello}`).abrir(); todas.push(org)
    // Intento de anotar 19 nombres en la lista de la pantalla: se espera el tope de 12.
    const t0 = Date.now()
    await org.page.goto(`${BASE}/#/crear`)
    await org.page.getByRole('heading', { name: 'Crear un grupo' }).waitFor({ timeout: 30000 })
    await org.page.getByLabel('Nombre del grupo').fill(`Veinte ${sello}`)
    await org.page.getByLabel('Tu nombre en el grupo').fill(org.nombre)
    const campo = org.page.locator('#quienes-nuevo')
    await campo.fill(inv.join(', ')); await campo.press('Enter')
    const aviso = (await org.page.locator('.s2-quienes').innerText()).replace(/\s+/g, ' ')
    const anotados = (await org.page.locator('.s2-quienes-lista li').count()) - 1
    inf.ok('b0: la lista de «Crear grupo» tiene tope; con 19 nombres pegados anota solo los que caben y avisa', anotados <= 19 && /Hasta \d+ personas/.test(aviso), `anotados=${anotados}; ${aviso.match(/Hasta \d+ personas[^.]*\./)?.[0] ?? '(sin aviso de tope)'}`)
    await org.captura('b0-tope-lista')
    await org.page.getByRole('button', { name: 'Crear grupo', exact: true }).click()
    const sinLista = org.page.getByRole('button', { name: 'Crear sin lista', exact: true }); if (await sinLista.isVisible({ timeout: 1500 }).catch(() => false)) await sinLista.click()
    await org.page.getByRole('heading', { name: 'Nuevo plan' }).waitFor({ timeout: 30000 })
    const espacioId = org.page.url().match(/#\/e\/([^/?#]+)/)[1]
    const urlPlan = await crearPlan(org, { titulo: 'Fiesta de veinte', minimo: 10, maximo: 20 })
    const codigo = await leerCodigo(org, `${BASE}/#/e/${espacioId}`)
    inf.ok('b1: grupo con plan mín 10 / máx 20 creado', true, `${((Date.now() - t0) / 1000).toFixed(1)} s`)
    // 19 entran por el enlace, de a 5 a la vez.
    const entradas = []
    const invitados = []
    const res = await enLotes(inv, 5, async (n) => {
      const p = await new Persona(browser, n).abrir(); invitados.push(p); todas.push(p)
      try {
        const t = Date.now(); const via = await entrarPorEnlace(p, codigo, n); await esperarDestino(p); entradas.push(Date.now() - t)
        await responderRapido(p, 'dos')
        return via
      } catch (e) {
        const txt = (await textoMain(p.page)).replace(/\s+/g, ' ').slice(0, 200); await p.captura(`b-fallo-${n.split(' ')[0]}`)
        const ult = p.rpc.slice(-3).map((r) => `${r.fn}:${r.status}:${r.codigo}`).join(',')
        throw new Error(`${n}: ${String(e.message).split('\n')[0].slice(0, 70)} | pantalla «${txt}» | rpc ${ult} | url ${p.page.url().replace(codigo, '***')}`)
      }
    })
    const caidos = res.filter((r) => r?.error)
    const vias = res.reduce((a, r) => { if (typeof r === 'string') a[r] = (a[r] ?? 0) + 1; return a }, {})
    inf.ok('b2: 19 personas entran por el enlace y responden', caidos.length === 0, `entradas ${JSON.stringify(vias)}; entrar→¿Cuándo puedes?: ${resumenLat(entradas)}${caidos.length ? '; fallos: ' + caidos.slice(0, 5).map((c) => c.error).join(' | ') : ''}`)
    // La organizadora responde y ve el conteo.
    const p = org.page
    await p.goto(urlPlan); await p.reload(); await p.locator('.estado-hero-etiqueta').first().waitFor({ timeout: 30000 })
    await irA(p, 'Mi respuesta'); await responderRapido(org, 'dos'); await irA(p, 'Plan')
    const conteo = (await textoMain(p)).match(/(\d+) de (\d+) respondieron/)
    inf.ok('b3: «N de M respondieron» de la organizadora cuadra (20 de 20)', conteo && conteo[1] === '20' && conteo[2] === '20', conteo?.[0] ?? 'sin conteo')
    await org.captura('b3-20-respondieron')
    const tb = Date.now()
    await p.getByRole('button', { name: /^Buscar opción compatible/ }).click()
    await p.getByRole('button', { name: /^Confirmar versión 1/ }).waitFor({ timeout: 40000 })
    inf.ok('b4: «Buscar opción compatible» con 20 respuestas publica la versión 1', true, `${Date.now() - tb} ms`)
    // Todos confirman (organizadora primero, luego 19 de a 5).
    await p.getByRole('button', { name: /^Confirmar versión 1/ }).click(); await p.waitForTimeout(1500)
    const tc = Date.now()
    const conf = await enLotes(invitados, 5, async (q) => {
      await q.page.goto(urlPlan); await q.page.reload()
      const b = q.page.getByRole('button', { name: /^Confirmar versión 1/ }); await b.waitFor({ timeout: 40000 }); await b.click()
      await q.page.locator('.estado-hero-etiqueta, [role=status]').filter({ hasText: /Ya confirmaste|¡Se juntan!|Grupo confirmado/ }).first().waitFor({ timeout: 40000 })
    })
    const malos = conf.filter((r) => r?.error)
    inf.ok('b5: las 19 personas confirman la versión 1', malos.length === 0, `${((Date.now() - tc) / 1000).toFixed(1)} s${malos.length ? '; fallos: ' + malos.slice(0, 5).map((c) => c.error).join(' | ') : ''}`)
    await p.goto(urlPlan); await p.reload(); await p.locator('.estado-hero-etiqueta').first().waitFor({ timeout: 30000 })
    const est = await estadoPlan(p); const tx = (await textoMain(p)).replace(/\s+/g, ' ')
    inf.ok('b6: el plan queda «¡Se juntan!» con 20 confirmados', /Se juntan|Grupo confirmado/.test(est), `${est}; ${tx.match(/\d+ confirmaron[^.]{0,40}|Confirmaron \d+[^.]{0,30}/)?.[0] ?? tx.slice(0, 120)}`)
    await org.captura('b6-se-juntan-20')
    // Persona 21.
    const p21 = await new Persona(browser, `Veintiuno B${sello}`).abrir(); todas.push(p21)
    await p21.page.goto(`${BASE}/#/unirse/${codigo}`)
    await p21.page.getByRole('heading', { name: /^(¿Quién eres\?|Escribe tu nombre para entrar)$/ }).waitFor({ timeout: 40000 }).catch(async () => { await p21.captura('b7-21-sin-quien-eres'); log('21: no apareció ¿Quién eres?: ' + (await textoMain(p21.page)).replace(/\s+/g, ' ').slice(0, 200)) })
    const no = p21.page.getByRole('button', { name: /No estoy en la lista/ }); if (await no.isVisible().catch(() => false)) await no.click()
    await p21.page.getByLabel(/Tu nombre/).first().fill(p21.nombre)
    await p21.page.getByRole('button', { name: /^(Unirme|Entrar)$/ }).first().click()
    await p21.page.waitForTimeout(4000)
    const t21 = (await textoMain(p21.page)).replace(/\s+/g, ' ')
    const rechazo = p21.rpc.filter((r) => r.fn === 'join_space').at(-1)
    const dentro = await p21.page.getByRole('heading', { name: `Veinte ${sello}` }).count()
    // Hallazgo de la corrida del 24 oct: el grupo NO tiene tope de personas; la 21 entra al grupo y el plan lleno dice «Cupos disponibles: 0».
    const sinCupo = /Cupos disponibles: 0/.test(t21) && (await p21.page.getByRole('button', { name: /^(Confirmar versión|Puedo)/ }).count()) === 0
    inf.ok('b7: la persona 21 no puede sumarse al plan lleno (dice «Cupos disponibles: 0», sin botón de confirmar)', sinCupo, `join_space: ${rechazo?.status} ${rechazo?.codigo ?? 'ok'}; ${dentro ? 'ENTRÓ AL GRUPO (no hay tope de integrantes)' : 'no entró'}; «${t21.slice(0, 200)}»`)
    inf.ok('b7 (observación): el grupo rechaza a la persona 21 con un mensaje claro', dentro === 0, dentro ? 'no hay rechazo: el tope de 20 es del plan, no del grupo' : 'rechazada')
    await p21.captura('b7-persona-21')
    inf.ok('b7: la pantalla de la 21 sigue usable (sin desborde ni error de consola)', (await p21.desborde()) <= 0 && p21.errores.length === 0, p21.errores.slice(0, 2).join(' | '))
    // la lista de planes del organizador con 20 integrantes
    const tl = Date.now(); await org.page.goto(`${BASE}/#/e/${espacioId}`); await org.page.getByText('Fiesta de veinte').first().waitFor({ timeout: 30000 })
    inf.ok('b8: el espacio con 20 personas muestra el plan', true, `${Date.now() - tl} ms; personas: ${(await org.page.locator('main').innerText()).match(/\d+ personas/)?.[0] ?? '?'}`)
  } finally {
    const t = tablaRpc(todas); console.log('RPC:\n' + t.texto); console.log('Errores RPC: ' + JSON.stringify(t.errores))
    const consola = todas.flatMap((p) => p.errores.map((e) => `${p.nombre}: ${e}`)).slice(0, 6)
    inf.ok('sin errores de consola (salvo los esperados del rechazo)', consola.length === 0, consola.join(' | '))
    for (const p of todas) await p.cerrar(); await browser.close()
  }
})
inf.fin()
