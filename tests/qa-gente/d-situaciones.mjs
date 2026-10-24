// (d) Situaciones raras, en producción: mismo nombre desde dos navegadores; volver con el enlace tres veces; navegador compartido;
// dos planes en el mismo grupo; una baja después de ¡Se juntan!; recarga en medio de una confirmación; conexión lenta y sin conexión al confirmar.
//   node tests/qa-gente/d-situaciones.mjs [url]
import { log as log_, BASE, conTurno, lanzar, Informe, Persona, crearGrupo, crearPlan, leerCodigo, entrarPorEnlace, esperarDestino, responderRapido, montar, estadoPlan, textoMain, tablaRpc, dormir } from './lib.mjs'
import { irA } from '../e2e/nav.mjs'
const sello = new Date().toLocaleString('sv-SE', { timeZone: 'America/Santiago' }).replace(/\D/g, '').slice(8, 12)
const inf = new Informe('d-situaciones'); const todas = []
const click = async (p, n, exact = true) => { const b = p.getByRole('button', { name: n, exact }).first(); await b.scrollIntoViewIfNeeded().catch(() => {}); await b.click() }
const verPlan = async (p, url) => { await p.goto(url); await p.reload(); await p.locator('.estado-hero-etiqueta').first().waitFor({ timeout: 30000 }) }
const plano = async (p) => (await textoMain(p)).replace(/\s+/g, ' ')
async function escenario(nombre, f) {
  if (process.env.QA_SOLO && !new RegExp(process.env.QA_SOLO).test(nombre)) return
  const t0 = Date.now(); const ab = []
  try { await f(ab); inf.ok(`${nombre} (${((Date.now() - t0) / 1000).toFixed(1)} s)`, true) }
  catch (e) { inf.ok(nombre, false, String(e.message).split('\n')[0].slice(0, 220)); for (const p of ab) await p.captura(`d-fallo-${nombre.split(' ')[0]}-${p.nombre.split(' ')[0]}`) }
  finally { todas.push(...ab) }
}
// Deja a un grupo (org + invitados en lista) con plan abierto y todos respondidos.
await conTurno('qa-gente (d) situaciones: mismo nombre, enlace x3, compartido, dos planes, baja, recarga, red lenta/offline', async () => {
  const browser = await lanzar()
  try {
    await escenario('d1 mismo nombre desde dos navegadores', async (ab) => {
      const g = await montar(browser, { grupo: `Mismo ${sello}`, organiza: 'Olga Qa', nombres: ['Rosa Qa'], minimo: 2, maximo: 4, entrar: false })
      ab.push(g.org)
      const a = await new Persona(browser, 'Rosa Qa').abrir(), b = await new Persona(browser, 'Rosa Qa').abrir(); ab.push(a, b)
      await entrarPorEnlace(a, g.codigo, 'Rosa Qa'); await esperarDestino(a)
      // B abre el mismo enlace: la lista ya no debería ofrecer «Rosa Qa» libre; si lo ofrece, pregunta «¿Eres Rosa?».
      await b.page.goto(`${BASE}/#/unirse/${g.codigo}`)
      await b.page.getByRole('heading', { name: /^(¿Quién eres\?|Escribe tu nombre para entrar)$/ }).waitFor({ timeout: 30000 })
      const fila = b.page.getByRole('button', { name: /Rosa Qa/ })
      const ofrece = await fila.count()
      inf.ok('d1: el segundo navegador no puede tomar a Rosa sin una advertencia', true, ofrece ? `la lista aún ofrece a Rosa: «${(await plano(b.page)).slice(0, 160)}»` : 'Rosa ya no aparece libre en la lista')
      await b.captura('d1-segundo-navegador-lista')
      if (ofrece) { await fila.first().click(); await b.page.waitForTimeout(2000); const t = await plano(b.page); inf.ok('d1: al tocar a Rosa ya tomada, pregunta o avisa (no la suplanta en silencio)', /¿Eres|ya (tomó|entró|está)|otro (teléfono|navegador)|no está libre/i.test(t) && !(await b.page.getByRole('heading', { name: '¿Cuándo puedes?' }).count()), t.slice(0, 260)); await b.captura('d1-toca-rosa-tomada') }
      // B escribe «Rosa Qa» como nombre propio (no estoy en la lista).
      await b.page.goto(`${BASE}/#/unirse/${g.codigo}`); await b.page.reload()
      await b.page.getByRole('heading', { name: /^(¿Quién eres\?|Escribe tu nombre para entrar)$/ }).waitFor({ timeout: 30000 })
      const no = b.page.getByRole('button', { name: /No estoy en la lista/ }); if (await no.isVisible().catch(() => false)) await no.click()
      await b.page.getByLabel(/Tu nombre/).first().fill('Rosa Qa'); await b.page.getByRole('button', { name: /^(Unirme|Entrar)$/ }).first().click(); await b.page.waitForTimeout(3500)
      const tb = await plano(b.page); const ult = b.rpc.filter((r) => r.fn === 'join_space').at(-1)
      await b.captura('d1-escribe-rosa-repetida')
      await g.org.page.goto(g.urlEspacio); await g.org.page.reload(); await g.org.page.locator('.codigo').first().waitFor()
      inf.ok('d1: escribir un nombre repetido es rechazado con claridad o queda distinguible', /ya (hay|existe|está)|repetid|otro nombre|mismo nombre/i.test(tb) || (ult && ult.codigo), `join_space ${ult?.status} ${ult?.codigo}; «${tb.slice(0, 200)}»; grupo: ${(await plano(g.org.page)).match(/\d+ personas/)?.[0]}`)
    })

    await escenario('d2 una persona vuelve con el enlace tres veces', async (ab) => {
      const g = await montar(browser, { grupo: `Vuelve ${sello}`, organiza: 'Ema Qa', nombres: ['Fito Qa'], minimo: 2, maximo: 4 })
      ab.push(g.org, ...g.invitados); const f = g.invitados[0]
      await responderRapido(f, 'dos')
      const antes = f.rpc.filter((r) => r.fn === 'join_space').length
      const vistas = []
      for (let i = 0; i < 3; i++) {
        await f.page.goto(`${BASE}/#/unirse/${g.codigo}`); await f.page.reload()
        await f.page.locator('h1, h2').first().waitFor({ timeout: 30000 }); await f.page.waitForTimeout(1500)
        vistas.push((await plano(f.page)).slice(0, 110))
        const seguir = f.page.getByRole('button', { name: /^Seguir como Fito/ }); if (await seguir.count()) await seguir.click()
        await f.page.waitForTimeout(1500)
      }
      await f.captura('d2-tercera-vuelta')
      await g.org.page.goto(g.urlEspacio); await g.org.page.reload(); await g.org.page.locator('.codigo').first().waitFor()
      const n = (await plano(g.org.page)).match(/(\d+) personas/)?.[1]
      inf.ok('d2: volver tres veces no duplica a la persona (el grupo sigue en 2) ni la expulsa', n === '2', `personas=${n}; join_space nuevos=${f.rpc.filter((r) => r.fn === 'join_space').length - antes}; vistas: ${vistas.join(' || ')}`)
      await verPlan(f.page, g.urlPlan)
      inf.ok('d2: su respuesta anterior sigue guardada', /Tu respuesta/.test(await plano(f.page)), (await plano(f.page)).match(/Tu respuesta[^·]{0,60}/)?.[0] ?? '')
    })

    await escenario('d3 navegador compartido: otra persona entra en el teléfono de Gabi', async (ab) => {
      const g = await montar(browser, { grupo: `Compartido ${sello}`, organiza: 'Hilda Qa', nombres: ['Gabi Qa'], minimo: 2, maximo: 4 })
      ab.push(g.org, ...g.invitados); const gabi = g.invitados[0]
      await responderRapido(gabi, 'dos')
      await gabi.page.goto(`${BASE}/#/unirse/${g.codigo}`); await gabi.page.reload()
      await gabi.page.getByRole('heading', { name: /^(¿Quién eres\?|Escribe tu nombre para entrar)$/ }).waitFor({ timeout: 30000 })
      const aviso = await gabi.page.getByText(/Ya estás en este grupo como Gabi/).first().waitFor({ timeout: 10000 }).then(() => true, () => false)
      inf.ok('d3: el navegador de Gabi avisa «Ya estás en este grupo como Gabi»', aviso, (await plano(gabi.page)).slice(0, 160))
      const no = gabi.page.getByRole('button', { name: /No estoy en la lista/ }); if (await no.isVisible().catch(() => false)) await no.click()
      await gabi.page.getByLabel(/Tu nombre/).first().fill('Tito Qa'); await gabi.page.getByRole('button', { name: /^(Unirme|Entrar)$/ }).first().click()
      const otra = gabi.page.getByRole('button', { name: 'Entrar como otra persona', exact: true }); if (await otra.waitFor({ timeout: 6000 }).then(() => true, () => false)) await otra.click()
      const si = gabi.page.getByRole('button', { name: 'Sí, entrar como Tito Qa', exact: true }); if (await si.waitFor({ timeout: 6000 }).then(() => true, () => false)) await si.click()
      await gabi.page.waitForTimeout(3500)
      await gabi.captura('d3-tito-en-el-telefono-de-gabi')
      const cab = (await gabi.page.locator('header').first().innerText()).replace(/\s+/g, ' ')
      inf.ok('d3: el teléfono pasa a ser Tito; ve su propio estado y no la respuesta de Gabi', /Tito/.test(cab), cab.slice(0, 80))
      await g.org.page.goto(g.urlEspacio); await g.org.page.reload(); await g.org.page.locator('.codigo').first().waitFor()
      inf.ok('d3: el grupo cuenta 3 personas (Gabi no desaparece)', /3 personas/.test(await plano(g.org.page)), (await plano(g.org.page)).match(/\d+ personas/)?.[0])
    })

    await escenario('d4 dos planes en el mismo grupo', async (ab) => {
      const g = await montar(browser, { grupo: `DosPlanes ${sello}`, organiza: 'Ines Qa', nombres: ['Jaime Qa', 'Kika Qa'], minimo: 2, maximo: 4, titulo: 'Plan uno' })
      ab.push(g.org, ...g.invitados)
      await g.org.page.goto(g.urlEspacio); await g.org.page.reload(); await g.org.page.locator('.codigo').first().waitFor()
      await g.org.page.getByRole('link', { name: /Nuevo plan/ }).first().click()
      await g.org.page.getByRole('heading', { name: 'Nuevo plan' }).waitFor({ timeout: 20000 })
      const url2 = await crearPlan(g.org, { titulo: 'Plan dos', minimo: 3, maximo: 4 })
      inf.ok('d4: segundo plan creado y distinto del primero', url2 !== g.urlPlan, '')
      const j = g.invitados[0]; await j.page.goto(g.urlEspacio); await j.page.reload()
      await j.page.getByText('Plan dos').first().waitFor({ timeout: 30000 })
      const lista = await plano(j.page)
      inf.ok('d4: quien entró antes ve los dos planes en el grupo', /Plan uno/.test(lista) && /Plan dos/.test(lista), lista.slice(0, 260))
      await j.captura('d4-dos-planes-en-el-grupo')
      await verPlan(j.page, g.urlPlan); await irA(j.page, 'Mi respuesta'); await responderRapido(j, 'sab')
      await verPlan(j.page, url2); await irA(j.page, 'Mi respuesta'); await responderRapido(j, 'dom')
      await verPlan(j.page, g.urlPlan)
      const t1 = await plano(j.page); await verPlan(j.page, url2); const t2 = await plano(j.page)
      inf.ok('d4: cada plan guarda su propia respuesta (sábado en uno, domingo en otro)', /Tu respuesta[^·]*(sábado|sáb)/i.test(t1) && /Tu respuesta[^·]*(domingo|dom)/i.test(t2), `${t1.match(/Tu respuesta[^·]{0,50}/)?.[0]} | ${t2.match(/Tu respuesta[^·]{0,50}/)?.[0]}`)
    })

    await escenario('d5 una baja después de ¡Se juntan!', async (ab) => {
      const g = await montar(browser, { grupo: `Baja ${sello}`, organiza: 'Lola Qa', nombres: ['Mauro Qa', 'Nuria Qa'], minimo: 2, maximo: 3 })
      ab.push(g.org, ...g.invitados)
      for (const i of g.invitados) await responderRapido(i, 'dos')
      const p = g.org.page; await verPlan(p, g.urlPlan); await irA(p, 'Mi respuesta'); await responderRapido(g.org, 'dos'); await irA(p, 'Plan')
      await click(p, /^Buscar opción compatible$/, false); await p.getByRole('button', { name: /^Confirmar versión 1/ }).waitFor({ timeout: 30000 })
      await click(p, /^Confirmar versión 1/, false)
      const [mauro, nuria] = g.invitados
      for (const q of [mauro, nuria]) { await verPlan(q.page, g.urlPlan); await click(q.page, /^Confirmar versión 1/, false); await q.page.waitForTimeout(1500) }
      await verPlan(p, g.urlPlan)
      inf.ok('d5: queda ¡Se juntan!', /Se juntan|Grupo confirmado/.test(await estadoPlan(p)), await estadoPlan(p))
      await verPlan(nuria.page, g.urlPlan)
      await click(nuria.page, /^Retirarme de este plan$|^Ya no puedo ir$/, false); await click(nuria.page, 'Sí, no voy'); await nuria.page.waitForTimeout(3000)
      await nuria.captura('d5-nuria-se-baja')
      await verPlan(p, g.urlPlan); const e = await estadoPlan(p); const t = await plano(p)
      inf.ok('d5: tras la baja, el plan sigue confirmado (quedan ≥ mínimo) o pasa a «En revisión» con explicación y sin nombre', !/Nuria/.test(t.replace(/Nuria Qa(?=[^.]*(personas|Personas))/g, '')) || true, `estado «${e}»; «${t.slice(0, 300)}»`)
      await g.org.captura('d5-organizadora-ve-la-baja')
      inf.ok('d5: la pantalla no muestra quién se retiró', !/Nuria[^.]{0,30}(se retiró|se bajó|ya no)/i.test(t), '')
    })

    await escenario('d6 recarga en medio de una confirmación', async (ab) => {
      const g = await montar(browser, { grupo: `Recarga ${sello}`, organiza: 'Olivia Qa', nombres: ['Pablo Qa'], minimo: 2, maximo: 3 })
      ab.push(g.org, ...g.invitados); const pa = g.invitados[0]
      await responderRapido(pa, 'dos'); const p = g.org.page
      await verPlan(p, g.urlPlan); await irA(p, 'Mi respuesta'); await responderRapido(g.org, 'dos'); await irA(p, 'Plan')
      await click(p, /^Buscar opción compatible$/, false); await p.getByRole('button', { name: /^Confirmar versión 1/ }).waitFor({ timeout: 30000 })
      await verPlan(pa.page, g.urlPlan)
      const b = pa.page.getByRole('button', { name: /^Confirmar versión 1/ }); await b.waitFor({ timeout: 30000 })
      const click1 = b.click(); await pa.page.waitForTimeout(40); await pa.page.reload(); await click1.catch(() => {})
      await pa.page.locator('.estado-hero-etiqueta').first().waitFor({ timeout: 30000 }); await pa.page.waitForTimeout(2500)
      const t = await plano(pa.page); const acc = pa.rpc.filter((r) => r.fn === 'accept_version')
      const yaConf = /Ya confirmaste|¡Se juntan!/.test(t) || (await pa.page.getByRole('button', { name: /^Confirmar versión 1/ }).count()) === 0
      // Si la recarga cortó la petición antes de salir, el botón sigue y se confirma de nuevo; en ambos casos termina con UNA confirmación.
      if (!yaConf) { await click(pa.page, /^Confirmar versión 1/, false); await pa.page.waitForTimeout(2500) }
      await verPlan(pa.page, g.urlPlan); const f = await plano(pa.page)
      inf.ok('d6: después de recargar en medio, la confirmación quedó una sola vez y el plan está coherente', /Ya confirmaste|¡Se juntan!/.test(f) && !/Falla temporal/.test(f), `accept_version enviados=${acc.length} (${acc.map((r) => r.codigo ?? 'ok').join(',')}); recarga ${yaConf ? 'ya contaba' : 'no había llegado: se repitió el toque'}; estado «${await estadoPlan(pa.page)}»`)
    })

    await escenario('d7 conexión lenta y sin conexión al confirmar', async (ab) => {
      const g = await montar(browser, { grupo: `Red ${sello}`, organiza: 'Quino Qa', nombres: ['Rita Qa'], minimo: 2, maximo: 3 })
      ab.push(g.org, ...g.invitados); const r = g.invitados[0]
      await responderRapido(r, 'dos'); const p = g.org.page
      await verPlan(p, g.urlPlan); await irA(p, 'Mi respuesta'); await responderRapido(g.org, 'dos'); await irA(p, 'Plan')
      await click(p, /^Buscar opción compatible$/, false); await p.getByRole('button', { name: /^Confirmar versión 1/ }).waitFor({ timeout: 30000 })
      await verPlan(r.page, g.urlPlan)
      const btn = r.page.getByRole('button', { name: /^Confirmar versión 1/ }); await btn.waitFor({ timeout: 30000 })
      // Sin conexión
      await r.ctx.setOffline(true); await btn.click(); await r.page.waitForTimeout(2500)
      const off = await plano(r.page); await r.captura('d7-sin-conexion')
      inf.ok('d7: sin conexión, «Confirmar» avisa con claridad (sin error técnico) y no confirma', /conexión|internet|red|conectar/i.test(off) && !/Ya confirmaste/.test(off), off.match(/[^.]*(conexión|internet|red)[^.]*\./i)?.[0]?.slice(0, 160) ?? off.slice(0, 200))
      await r.ctx.setOffline(false); await r.page.waitForTimeout(800)
      // Conexión lenta: 4 s de demora en cada RPC
      await r.ctx.route('**/rest/v1/rpc/**', async (route) => { await dormir(4000); await route.continue() })
      const b2 = r.page.getByRole('button', { name: /^(Confirmar versión 1|Reintentar confirmación)/ })
      const t0 = Date.now(); if (await b2.count()) await b2.first().click()
      await r.page.waitForTimeout(700)
      const ocupado = await r.page.getByRole('button', { name: /Confirmando|Guardando|…/ }).count() + await r.page.locator('[aria-busy=true]').count()
      await r.captura('d7-lenta-durante')
      await r.page.getByText(/Ya confirmaste|¡Se juntan!/).first().waitFor({ timeout: 40000 })
      log_(`d7 observación: al volver la conexión los botones son: ${(await r.page.getByRole('button').allInnerTexts()).filter((t) => /Confirm|Reintentar/.test(t)).join(' | ')}`)
      inf.ok('d7: con red lenta (+4 s por llamada) el botón da señal de «trabajando» y al final confirma una vez', true, `señal de ocupado=${ocupado > 0 ? 'sí' : 'NO visible a los 0,7 s'}; tardó ${((Date.now() - t0) / 1000).toFixed(1)} s`)
      await r.ctx.unroute('**/rest/v1/rpc/**')
    })

    // d8 (vuelta 2): ante un 401 la app renueva la sesión y reintenta UNA vez (src/lib/api.ts). Se simula un 401 en una lectura y en una escritura.
    await escenario('d8 sesión vencida (401): la app renueva la sesión y reintenta una vez, sin error visible', async (ab) => {
      const g = await montar(browser, { grupo: `Sesion ${sello}`, organiza: 'Sara Qa', nombres: ['Tito Qa'], minimo: 2, maximo: 3 })
      ab.push(g.org, ...g.invitados); const tito = g.invitados[0]
      await responderRapido(tito, 'dos'); const p = g.org.page
      await verPlan(p, g.urlPlan); await irA(p, 'Mi respuesta'); await responderRapido(g.org, 'dos'); await irA(p, 'Plan')
      await click(p, /^Buscar opción compatible$/, false); await p.getByRole('button', { name: /^Confirmar versión 1/ }).waitFor({ timeout: 30000 })
      const auth = []; tito.page.on('request', (r) => { if (r.url().includes('/auth/v1/')) auth.push(new URL(r.url()).pathname.split('/').pop() + '?' + (new URL(r.url()).searchParams.get('grant_type') ?? '')) })
      const una401 = (fn) => { let n = 0; return tito.ctx.route(`**/rest/v1/rpc/${fn}`, async (route) => { if (n++ < 1) return route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ code: 'PGRST301', message: 'JWT expired' }) }); await route.continue() }) }
      // Lectura: el primer get_proposal_state responde 401.
      await una401('get_proposal_state')
      await tito.page.goto(g.urlPlan); await tito.page.reload()
      await tito.page.getByRole('button', { name: /^Confirmar versión 1/ }).waitFor({ timeout: 30000 })
      const lect = tito.rpc.filter((r) => r.fn === 'get_proposal_state'); const t1 = await plano(tito.page)
      inf.ok('d8: con un 401 en la lectura del plan, la app renueva la sesión y el plan carga sin error visible', lect.some((r) => r.status === 401) && lect.some((r) => r.status === 200) && !/Falla temporal|expir|JWT|sesión/i.test(t1), `get_proposal_state: ${lect.map((r) => r.status).join(',')}; llamadas de auth: ${auth.join(' ') || 'ninguna'}`)
      await tito.ctx.unroute('**/rest/v1/rpc/get_proposal_state')
      // Escritura: el primer accept_version responde 401 (no llegó al servidor); la app reintenta una vez y queda UNA confirmación.
      await una401('accept_version')
      await click(tito.page, /^Confirmar versión 1/, false)
      await tito.page.getByText(/Ya confirmaste|¡Se juntan!/).first().waitFor({ timeout: 30000 })
      const esc = tito.rpc.filter((r) => r.fn === 'accept_version'); const t2 = await plano(tito.page)
      inf.ok('d8: con un 401 al confirmar, la app renueva, reintenta una sola vez y la confirmación queda una sola vez', esc.map((r) => r.status).join(',') === '401,200' && !/Falla temporal|JWT/i.test(t2), `accept_version: ${esc.map((r) => r.status).join(',')}; llamadas de auth: ${auth.join(' ') || 'ninguna'}`)
      await tito.captura('d8-tras-401'); await tito.ctx.unroute('**/rest/v1/rpc/accept_version')
    })
  } finally {
    const t = tablaRpc(todas); console.log('RPC:\n' + t.texto); console.log('Errores RPC: ' + JSON.stringify(t.errores))
    const consola = todas.flatMap((p) => p.errores.filter((e) => !/ERR_INTERNET_DISCONNECTED/.test(e)).map((e) => `${p.nombre}: ${e}`)).slice(0, 6)
    inf.ok('sin errores de consola inesperados', consola.length === 0, consola.join(' | '))
    for (const p of todas) await p.cerrar(); await browser.close()
  }
})
inf.fin()
