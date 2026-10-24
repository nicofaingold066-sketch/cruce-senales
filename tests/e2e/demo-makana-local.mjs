// MOCK LOCAL: App, SDK y componentes reales; Auth/RPC ficticios. Sin IA ni base de datos.
// node tests/e2e/demo-makana-local.mjs
// Usa Vite, Playwright y Chrome ya instalados. Capturas únicamente en /tmp/cruce-demo-ui-qa.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdirSync } from 'node:fs'
import { createServer } from 'vite'

const require = createRequire(import.meta.url)
let pw
try { pw = require('playwright') } catch {
  pw = require(process.env.CRUXE_PLAYWRIGHT_DIR || '/Users/macair/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
}
let BASE = 'http://127.0.0.1:4194'
const MOCK = 'https://makana-mock.invalid'
const CAPTURAS = '/tmp/cruce-demo-ui-qa'
const NOMBRE = 'El plan que no deja a nadie afuera'
const TITULO = 'Parque del Encuentro (ficticio) · acceso norte · encuentro gratuito'
const PERSONAS = ['Bastián', 'Nacho', 'Carlos', 'Kai', 'Charlie', 'Joaco', 'Pía']
const ANCHOS = [320, 375, 768, 1280]
const mom = local => ({ local, utc: new Date(`${local}-03:00`).toISOString() })
const AHORA = mom('2026-10-24T12:00:00')
const sobre = data => ({ ok: true, contrato: 2, servidor_ahora: AHORA, ...data })
const miembros = PERSONAS.map((nombre, i) => ({
  miembro_id: `makana-m${i + 1}`, nombre, rol: i === 0 ? 'organizador' : 'miembro',
  simulado: i !== 0, es_yo: i === 0, pendiente: false,
}))
const ESPACIO = {
  id: '10000000-0000-4000-8000-000000000001', nombre: NOMBRE, tipo: 'amigos', demo: true, demo_caso: 'makana',
  codigo_invitacion: 'MOCK2026', creado_en: AHORA, ultimo_reinicio: null, generacion: 1,
  mi_miembro_id: miembros[0].miembro_id, mi_rol: 'organizador', miembros,
  proposito: 'libre', familia: 'libre',
}
const FRANJAS = [
  { clave: 'A', inicio: mom('2026-10-31T16:00:00'), fin: mom('2026-10-31T18:00:00'), etiqueta: null },
  { clave: 'B', inicio: mom('2026-11-01T16:00:00'), fin: mom('2026-11-01T18:00:00'), etiqueta: null },
]
const ref = m => ({ miembro_id: m.miembro_id, nombre: m.nombre, simulado: m.simulado })
function propuesta(version = false) {
  return {
    id: '20000000-0000-4000-8000-000000000001', espacio_id: ESPACIO.id, demo_caso: 'makana', titulo: TITULO,
    organizador: ref(miembros[0]), imprescindible: ref(miembros[0]), minimo: 2, maximo: 7,
    zona_horaria: 'America/Santiago', franjas: FRANJAS, plazo: mom('2026-10-29T20:00:00'),
    plazo_vencido: false, creada_en: AHORA,
    estado: version ? 'esperando_compromisos' : 'reuniendo_interes',
    estado_etiqueta: version ? 'Esperando compromisos' : 'Reuniendo interés',
    state_rev: version ? 10 : 2, confirmados: 0,
    opcion: version ? {
      version: 1, franja: FRANJAS[0], publicada_en: AHORA, aceptaron: [],
      cupos: { minimo: 2, maximo: 7, confirmados: 0, disponibles: 7, faltan_para_minimo: 2,
        imprescindible_acepto: false, pendientes: 6, reservado_imprescindible: false, libres_para_otros: 6 },
    } : null,
    opcion_anterior: null, ultima_evaluacion: null, interesados: { cantidad: 0, miembros: [] },
    personas_con_condiciones: 0, opiniones_totales: { asi_no_puedo: null },
    actividad: { clave: 'parque', etiqueta: 'Parque', familia: 'aire_libre' },
    ronda: null, regla: 'temprana', planes_totales: null, bajas: [], historial: [],
    siguiente_accion: { codigo: 'reunir_condiciones', texto: 'Marca cuándo puedes.' },
    mi_situacion: { miembro_id: miembros[0].miembro_id, nombre: 'Bastián', es_organizador: true,
      es_organizador_espacio: true, interesado: false, condiciones: 'sin_cargar', retirado: false,
      elegible_en_version: null, acepte_version: false, mi_opinion: null,
      puede: { abrir: false, marcar_interes: true, guardar_condiciones: true, evaluar: false,
        aceptar: false, retirarme: false, proponer_reparacion: false, cancelar: false, simular: true, opinar: false },
    },
  }
}
function panel(version = false) {
  return miembros.slice(1).map(m => ({ miembro: ref(m), interesado: false,
    condiciones: { disponibilidad: version && m.nombre !== 'Pía' ? { A: 'si', B: 'si' } : {},
      estado: version && m.nombre !== 'Pía' ? 'completas' : 'sin_cargar', actualizadas_en: null },
    retirado: false, elegible_en_version: version && m.nombre !== 'Pía', acepte_version: false,
    puede: { marcar_interes: true, guardar_condiciones: true, aceptar: version && m.nombre !== 'Pía', retirarme: false },
  }))
}
const usuario = { id: '00000000-0000-4000-8000-000000000001', aud: 'authenticated', role: 'authenticated',
  is_anonymous: true, created_at: AHORA.utc, app_metadata: { provider: 'anonymous', providers: ['anonymous'] },
  user_metadata: { ficticio: 'Bastián MOCK LOCAL' }, identities: [],
}
const b64 = value => Buffer.from(JSON.stringify(value)).toString('base64url')
function sesion() {
  const exp = Math.floor(Date.now() / 1000) + 3600
  return { access_token: `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: usuario.id, exp, aud: 'authenticated', role: 'authenticated' })}.bW9jaw`,
    refresh_token: 'MOCK-LOCAL-no-valido', token_type: 'bearer', expires_in: 3600, expires_at: exp, user: usuario }
}

// El módulo virtual solo monta SimulacionTab real, con estado público explícito y viva local.
// Todas sus llamadas a api siguen pasando por el SDK real y el interceptor de red del contexto.
const moduloSimulacion = `
import React from 'react';
import ReactDOM from 'react-dom/client';
import SimulacionTab from '/src/screens/SimulacionTab.tsx';
import '/src/styles.css';
const espacio = ${JSON.stringify(ESPACIO)};
const inicial = ${JSON.stringify(propuesta())};
const conVersion = ${JSON.stringify(propuesta(true))};
function Banco() {
  const [p, setP] = React.useState(new URLSearchParams(location.search).has('version') ? conVersion : inicial);
  const viva = {propuesta:p,servidorAhora:${JSON.stringify(AHORA)},recibidoEn:Date.now(),errorInicial:null,
    sinActualizar:null,fuera:false,cargando:false,refrescar:async()=>{},
    aplicarResultado:r=>{if(r.ok) setP(r.data.propuesta)}};
  return React.createElement('main',{className:'contenido'},
    React.createElement('div',{className:'vista vista-plan'},
      React.createElement('section',{className:'escena'},React.createElement('h1',null,'MOCK LOCAL · Simulación Makana'),
        React.createElement('p',null,'Datos ficticios. Sin IA ni base de datos.')),
      React.createElement('div',{className:'hoja'},React.createElement(SimulacionTab,{p,viva,espacio,soloLectura:false,irAPestana:()=>{}}))));
}
ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(Banco));
`
const server = await createServer({
  cacheDir: `${CAPTURAS}/vite-cache`,
  server: { host: '127.0.0.1', port: 4194, strictPort: false },
  define: { 'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(MOCK),
    'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': JSON.stringify('sb_publishable_MOCK_LOCAL_ONLY') },
  plugins: [{ name: 'makana-qa-local',
    resolveId(id) { if (id === '/src/__makana_qa_virtual__.js') return '\0makana-qa' },
    load(id) { if (id === '\0makana-qa') return moduloSimulacion },
    configureServer(s) {
    s.middlewares.use(async (req, res, next) => {
      const path = req.url?.split('?')[0]
      if (path === '/__makana_qa__/simulacion.html') {
        res.setHeader('Content-Type', 'text/html')
        res.end(await s.transformIndexHtml(req.url, '<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>MOCK LOCAL Makana</title></head><body><div id="root"></div><script type="module" src="/src/__makana_qa_virtual__.js"></script></body></html>'))
      } else next()
    })
  } }],
})
await server.listen()
BASE = `http://127.0.0.1:${server.httpServer.address().port}`
const browser = await pw.chromium.launch({ headless: true,
  executablePath: process.env.CRUXE_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' })
mkdirSync(CAPTURAS, { recursive: true })
let rpcTotal = 0

async function verificar(ancho) {
  const context = await browser.newContext({ viewport: { width: ancho, height: 900 }, serviceWorkers: 'block',
    locale: 'es-CL', reducedMotion: 'reduce' })
  const llamadas = [], errores = [], inesperadas = [], desbordes = []
  let sembrado = false, creada = false, p = propuesta(), simulados = panel()
  const responder = (route, data, type = 'application/json') => route.fulfill({ status: 200, contentType: type,
    headers: { 'access-control-allow-origin': '*' }, body: type === 'application/json' ? JSON.stringify(data) : data })
  // Se instala antes de abrir cualquier página. Jamás se continúa una petición externa.
  await context.route('**/*', async route => {
    const req = route.request(), u = new URL(req.url())
    if (u.origin === BASE) return route.continue()
    if (/\.(googleapis|gstatic)\.com$/.test(u.hostname)) return responder(route, '', 'text/css')
    if (u.origin !== MOCK) { inesperadas.push(u.origin + u.pathname); return route.abort('blockedbyclient') }
    try {
      if (req.method() === 'OPTIONS') return responder(route, {})
      if (u.pathname.startsWith('/auth/v1/')) {
        const op = u.pathname.split('/').at(-1)
        if (['signup', 'token'].includes(op)) return responder(route, sesion())
        if (op === 'user') return responder(route, usuario)
        throw new Error(`Auth no esperado: ${op}`)
      }
      assert.ok(u.pathname.startsWith('/rest/v1/rpc/'), `Ruta externa no esperada: ${u.pathname}`)
      const fn = u.pathname.split('/').at(-1), args = req.postDataJSON()
      llamadas.push({ fn, args }); rpcTotal++
      if (fn === 'server_info') return responder(route, sobre({ sesion: { autenticada: true } }))
      if (fn === 'list_my_spaces') return responder(route, sobre({ espacios: sembrado ? [{ ...ESPACIO, cantidad_miembros: 7 }] : [] }))
      if (fn === 'seed_demo_makana') {
        assert.deepEqual(args, {}, 'La semilla Makana no recibe argumentos'); sembrado = true
        return responder(route, sobre({ espacio: ESPACIO, resultado: { espacio_id: ESPACIO.id, creado: true, repetido: false } }))
      }
      if (fn === 'get_space') return responder(route, sobre({ espacio: ESPACIO }))
      if (fn === 'list_proposals') return responder(route, sobre({ propuestas: creada ? [p] : [] }))
      if (fn === 'get_my_preferences') return responder(route, sobre({ preferencias: null, usar_en_agente: false,
        actualizadas_en: null, opciones: { actividades: [] }, personas_con_preferencias: 0 }))
      if (fn === 'create_proposal') { creada = true; return responder(route, sobre({ propuesta: p,
        resultado: { propuesta_id: p.id, repetido: false } })) }
      if (fn === 'open_proposal') return responder(route, sobre({ propuesta: p, resultado: { repetido: false } }))
      if (fn === 'get_proposal_state') return responder(route, sobre({ propuesta: p, rev_vista: p.state_rev }))
      if (fn === 'get_my_conditions') return responder(route, sobre({ state_rev: p.state_rev,
        condiciones: { disponibilidad: {}, estado: 'sin_cargar', actualizadas_en: null } }))
      if (fn === 'get_simulation_panel') return responder(route, sobre({ state_rev: p.state_rev, simulacion: { miembros: simulados } }))
      if (fn === 'simulate_save_conditions') {
        const m = simulados.find(x => x.miembro.miembro_id === args.p_miembro_id)
        assert.ok(m, 'La simulación debe guardar una persona conocida')
        m.condiciones = { disponibilidad: args.p_disponibilidad, estado: 'completas', actualizadas_en: AHORA }
        p = { ...p, state_rev: p.state_rev + 1 }
        return responder(route, sobre({ propuesta: p, condiciones: m.condiciones, resultado: { repetido: false, simulado: true } }))
      }
      if (fn === 'simulate_accept') {
        const m = simulados.find(x => x.miembro.miembro_id === args.p_miembro_id)
        assert.equal(m?.puede.aceptar, true); assert.equal(args.p_version, 1)
        m.acepte_version = true; m.puede.aceptar = false; m.puede.retirarme = true
        p = { ...p, state_rev: p.state_rev + 1, confirmados: 1 }
        return responder(route, sobre({ propuesta: p, resultado: { version: 1, repetido: false, simulado: true, grupo_confirmado: false } }))
      }
      throw new Error(`RPC no esperado: ${fn}`)
    } catch (e) { errores.push(e.message); return route.abort('blockedbyclient') }
  })
  await context.addInitScript(() => {
    localStorage.setItem('cruxe:entrada-vista', '1')
    localStorage.setItem('cruxe:guia-vista:v1', '1')
  })
  const page = await context.newPage()
  page.on('pageerror', e => errores.push(e.message))
  page.on('console', m => { if (m.type() === 'error') errores.push(m.text()) })
  page.setDefaultTimeout(10000)
  const captura = async etapa => {
    await page.evaluate(() => document.fonts.ready)
    const medidas = await page.evaluate(() => ({ viewport: innerWidth, documento: document.documentElement.scrollWidth }))
    if (medidas.documento > medidas.viewport) desbordes.push({ etapa, ...medidas })
    await page.evaluate(() => {
      const etiqueta = document.createElement('aside')
      etiqueta.dataset.makanaQa = '1'; etiqueta.textContent = 'MOCK LOCAL · sin IA ni DB'
      Object.assign(etiqueta.style, { position: 'fixed', bottom: '6px', right: '6px', zIndex: '99999',
        background: '#fff', color: '#352b20', border: '1px solid #bfb3a5', borderRadius: '6px',
        padding: '4px 7px', font: '11px system-ui', pointerEvents: 'none' })
      document.body.append(etiqueta)
    })
    try { await page.screenshot({ path: `${CAPTURAS}/${ancho}-${etapa}.png`, fullPage: true }) }
    finally { await page.evaluate(() => document.querySelector('[data-makana-qa]')?.remove()) }
  }
  try {
    await page.goto(BASE)
    const demo = page.getByRole('button', { name: `Probar la demo «${NOMBRE}»`, exact: true })
    await demo.waitFor()
    assert.match(await page.locator('body').innerText(), /Serás Bastián.*seis amigos.*ficticios/s)
    await captura('inicio')
    await demo.click()
    await page.getByRole('heading', { name: NOMBRE, exact: true }).waitFor()
    assert.equal(llamadas.filter(x => x.fn === 'seed_demo_makana').length, 1)
    assert.equal(llamadas.some(x => x.fn === 'seed_demo_space'), false)
    await page.getByRole('button', { name: 'Personas ›', exact: true }).click()
    const dialogo = page.getByRole('dialog', { name: 'Personas del espacio' })
    await dialogo.waitFor()
    const textoPersonas = await dialogo.innerText()
    for (const nombre of PERSONAS) assert.match(textoPersonas, new RegExp(`\\b${nombre}\\b`))
    assert.equal(await dialogo.locator('li').count(), 7)
    await dialogo.getByRole('button', { name: 'Cerrar', exact: true }).click()
    await captura('grupo')
    await page.getByRole('link', { name: /Nuevo plan/ }).click()
    await page.getByRole('heading', { name: 'Nuevo plan', exact: true }).waitFor()
    assert.match(await page.locator('.s3-chips button').first().innerText(), /parque/i)
    const tituloEstilo = await page.locator('#nueva-titulo').evaluate(el => ({
      texto: getComputedStyle(el).color, fondo: getComputedStyle(el.closest('.escena')).backgroundColor,
    }))
    const luminancia = color => {
      const [r, g, b] = color.match(/[\d.]+/g).slice(0, 3).map(Number).map(x => {
        const s = x / 255; return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
      })
      return 0.2126 * r + 0.7152 * g + 0.0722 * b
    }
    const lt = luminancia(tituloEstilo.texto), lf = luminancia(tituloEstilo.fondo)
    assert.ok((Math.max(lt, lf) + 0.05) / (Math.min(lt, lf) + 0.05) >= 4.5,
      `Contraste del título sobre el color base de su cabecera: ${JSON.stringify(tituloEstilo)}`)
    const fuentesPequenas = await page.locator('.form-compacto input:not([type=radio]), .form-compacto button').evaluateAll(els =>
      els.filter(el => el.getBoundingClientRect().width > 1 && parseFloat(getComputedStyle(el).fontSize) < 13)
        .map(el => ({ texto: el.textContent, fuente: getComputedStyle(el).fontSize })))
    assert.deepEqual(fuentesPequenas, [], 'Campos y botones del formulario con texto de al menos 13px')
    assert.equal(await page.getByRole('textbox', { name: 'Propósito de la propuesta' }).inputValue(), TITULO)
    assert.equal(await page.locator('#cupo-minimo').inputValue(), '2')
    assert.equal(await page.locator('#cupo-maximo').inputValue(), '7')
    assert.equal(await page.getByRole('radio', { name: 'Bastián', exact: true }).isChecked(), true)
    for (const clave of ['A', 'B']) {
      const resumen = page.locator('.s3-momento summary').filter({ hasText: `Editar la opción ${clave}` })
      assert.match(await resumen.innerText(), /16:00 · 2 h/)
    }
    await captura('nuevo-plan')
    await page.getByRole('button', { name: 'Crear y abrir al grupo', exact: true }).click()
    await page.waitForURL(`**/#/e/${ESPACIO.id}/p/${p.id}`)
    const enviado = llamadas.find(x => x.fn === 'create_proposal')?.args
    assert.ok(enviado, 'Debe salir una creación explícita desde el formulario')
    assert.equal(enviado.p_titulo, TITULO); assert.equal(enviado.p_actividad, 'parque')
    assert.equal(enviado.p_minimo, 2); assert.equal(enviado.p_maximo, 7)
    assert.equal(enviado.p_imprescindible_id, miembros[0].miembro_id)
    assert.deepEqual(enviado.p_franjas, [
      { inicio: '2026-10-31T16:00', fin: '2026-10-31T18:00' },
      { inicio: '2026-11-01T16:00', fin: '2026-11-01T18:00' },
    ])
    assert.equal(enviado.p_zona_horaria, 'America/Santiago')
    assert.equal(llamadas.filter(x => x.fn === 'create_proposal').length, 1)
    assert.equal(llamadas.filter(x => x.fn === 'open_proposal').length, 1)

    await page.goto(`${BASE}/__makana_qa__/simulacion.html`)
    await page.getByRole('heading', { name: 'Personas simuladas', exact: true }).waitFor()
    const filas = page.locator('.sim-fila')
    assert.equal(await filas.count(), 6)
    // Pedido de Nico (11:36): Makana se comporta como «Los del finde»; el atajo de cargar el caso aparece si el servidor lo habilita.
    assert.ok(await page.getByRole('button', { name: /Cargar condiciones del caso/ }).count() <= 1)
    assert.match(await page.locator('body').innerText(), /Pía sigue pendiente/)
    const bruno = page.getByRole('region', { name: 'Simulación de Nacho', exact: true })
    await bruno.locator('summary').click()
    await bruno.locator('fieldset').nth(0).getByRole('radio', { name: 'Sí puedo', exact: true }).check()
    await bruno.locator('fieldset').nth(1).getByRole('radio', { name: 'Sí puedo', exact: true }).check()
    await bruno.getByRole('button', { name: 'Guardar condiciones de Nacho', exact: true }).click()
    await page.waitForFunction(() => document.querySelector('[aria-label="Simulación de Nacho"] .sim-fila-estado')?.textContent.includes('A: Sí'))
    const guardadas = llamadas.filter(x => x.fn === 'simulate_save_conditions')
    assert.equal(guardadas.length, 1); assert.equal(guardadas[0].args.p_miembro_id, miembros[1].miembro_id)
    assert.deepEqual(guardadas[0].args.p_disponibilidad, { A: 'si', B: 'si' })
    assert.match(await page.getByRole('region', { name: 'Simulación de Pía', exact: true }).innerText(), /Sin responder/)
    await captura('simulacion-respuestas')

    p = propuesta(true); simulados = panel(true)
    await page.goto(`${BASE}/__makana_qa__/simulacion.html?version=1`)
    await page.getByRole('heading', { name: 'Personas simuladas', exact: true }).waitFor()
    assert.equal(await page.locator('.sim-fila').getByRole('button', { name: /^Aceptar versión 1 por / }).count(), 5,
      'Hay cinco botones individuales de aceptación')
    assert.equal(await page.locator('.sim-atajo-chico').count(), 1, 'Y el atajo colectivo, como en «Los del finde»')
    assert.equal(await page.getByRole('button', { name: /Aceptar versión 1 por Pía/ }).count(), 0)
    await page.getByRole('button', { name: 'Aceptar versión 1 por Nacho', exact: true }).click()
    await page.getByRole('status').filter({ hasText: 'Confirmaron la versión 1: Nacho.' }).waitFor()
    const aceptaciones = llamadas.filter(x => x.fn === 'simulate_accept')
    assert.equal(aceptaciones.length, 1); assert.equal(aceptaciones[0].args.p_miembro_id, miembros[1].miembro_id)
    assert.equal(llamadas.some(x => ['simulate_load_case', 'seed_demo_space'].includes(x.fn)), false)
    await captura('simulacion-version')
    assert.deepEqual(inesperadas, [], 'Toda salida externa no prevista se bloquea y falla la prueba')
    assert.deepEqual(errores, [], 'Sin errores JavaScript, consola ni interceptor')
    assert.deepEqual(desbordes, [], `Pantallas sin desborde a ${ancho}px`)
    console.log(`PASS MOCK LOCAL ${ancho}px: demo Makana, 7 personas, creación parque, respuestas y aceptación individual; sin desbordes ni errores.`)
  } catch (e) {
    await page.screenshot({ path: `${CAPTURAS}/${ancho}-fallo.png`, fullPage: true }).catch(() => {})
    console.error('MOCK LOCAL diagnóstico:', JSON.stringify({ url: page.url(), llamadas: llamadas.map(x => x.fn),
      errores, inesperadas, desbordes: await page.evaluate(() => [...document.querySelectorAll('body *')].map(e => {
        const r = e.getBoundingClientRect(); return { clase: e.className?.baseVal ?? e.className, ancho: r.width, derecha: r.right }
      }).filter(x => x.ancho > 0 && x.derecha > innerWidth + 1).slice(0, 15)),
      pantalla: (await page.locator('body').innerText()).slice(0, 1800) }))
    throw e
  } finally { await context.close() }
}
try {
  console.log('MOCK LOCAL: intercepta toda red externa; Auth/RPC ficticios. Cero IA, cero DB.')
  const fallos = []
  for (const ancho of ANCHOS) {
    try { await verificar(ancho) } catch (e) { fallos.push(e); console.error(`FAIL MOCK LOCAL ${ancho}px: ${e.message}`) }
  }
  assert.equal(fallos.length, 0, `${fallos.length} recorridos MOCK LOCAL fallaron`)
  console.log(`PASS MOCK LOCAL: ${rpcTotal} RPC interceptados. Capturas: ${CAPTURAS}. Estas pruebas no validan un backend desplegado.`)
} finally { await browser.close(); await server.close() }
