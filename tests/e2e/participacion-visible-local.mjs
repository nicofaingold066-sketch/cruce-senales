// MOCK LOCAL: app y SDK reales; Auth/RPC completamente ficticios e interceptados ANTES de goto.
// Sin base de datos, modelos, servicios externos ni operaciones sobre Supabase.
// node tests/e2e/participacion-visible-local.mjs
// Opt-in opcional: CRUCE_QA_BASE_URL=https://app-autorizada.example (solo GET de sus assets; Auth/RPC siguen ficticios).
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const require = createRequire(import.meta.url)
let pw
try { pw = require('playwright') } catch {
  pw = require(process.env.CRUXE_PLAYWRIGHT_DIR || '/Users/macair/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
}
const ROOT = fileURLToPath(new URL('../..', import.meta.url))
const OUT = process.env.CRUXE_PARTICIPACION_EVIDENCIA || '/tmp/cruce-participacion-mobile-preview'
const MOCK = 'https://participacion-mock.invalid'
const requestedBase = process.env.CRUCE_QA_BASE_URL ? new URL(process.env.CRUCE_QA_BASE_URL) : null
if (requestedBase) {
  assert.ok(requestedBase.protocol === 'https:' || (requestedBase.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(requestedBase.hostname)), 'El destino debe ser HTTPS o loopback')
  assert.equal(requestedBase.username + requestedBase.password, '', 'No usar credenciales en la URL')
  assert.equal(requestedBase.search, '', 'Usar una URL sin tokens ni parámetros de acceso')
}
const E = '10000000-0000-4000-8000-000000000001'
const P = '20000000-0000-4000-8000-000000000001'
const LONG_NAME = 'María de los Ángeles Fernández'
const names = ['Ana', 'Bruno', 'Camila', 'Diego', 'Elena', 'Felipe', 'Gabriela']
const id = i => `30000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`
const members = () => names.map((nombre, i) => ({ miembro_id: id(i), nombre, rol: i ? 'miembro' : 'organizador',
  simulado: nombre === 'Bruno', pendiente: ['Diego', 'Elena'].includes(nombre), es_yo: nombre === 'Gabriela' }))
const ref = m => ({ miembro_id: m.miembro_id, nombre: m.nombre, simulado: m.simulado })
const mom = local => ({ local, utc: new Date(`${local}-03:00`).toISOString(), zona: 'America/Santiago' })
const NOW = mom('2026-10-24T12:00:00')
const slots = [
  { clave: 'A', inicio: mom('2026-10-31T16:00:00'), fin: mom('2026-10-31T18:00:00'), etiqueta: null },
  { clave: 'B', inicio: mom('2026-11-01T16:00:00'), fin: mom('2026-11-01T18:00:00'), etiqueta: null },
]
const envelope = data => ({ ok: true, contrato: 2, servidor_ahora: NOW, ...data })
function proposal(version = 1, accepted = ['Ana', 'Felipe'], rev = 10) {
  const ms = members()
  return { id: P, espacio_id: E, titulo: 'Una tarde juntos', organizador: ref(ms[0]), imprescindible: ref(ms[0]),
    minimo: 3, maximo: 7, zona_horaria: 'America/Santiago', franjas: slots, plazo: mom('2026-10-29T20:00:00'),
    plazo_vencido: false, creada_en: NOW, estado: 'esperando_compromisos', estado_etiqueta: 'Esperando compromisos',
    state_rev: rev, confirmados: accepted.length,
    opcion: { version, franja: slots[version === 1 ? 0 : 1], publicada_en: NOW,
      aceptaron: accepted.map(n => ({ miembro: ref(ms.find(m => m.nombre === n)), aceptado_en: NOW })),
      cupos: { minimo: 3, maximo: 7, confirmados: accepted.length, disponibles: 7 - accepted.length,
        faltan_para_minimo: Math.max(0, 3 - accepted.length), imprescindible_acepto: accepted.includes('Ana'),
        pendientes: null, reservado_imprescindible: !accepted.includes('Ana'), libres_para_otros: 6 - accepted.length } },
    opcion_anterior: version === 1 ? null : { version: 1, franja_clave: 'A', inicio: slots[0].inicio, fin: slots[0].fin },
    ultima_evaluacion: null, interesados: { cantidad: 0, miembros: [] }, personas_con_condiciones: null,
    opiniones_totales: null, actividad: null, ronda: null, regla: 'temprana', planes_totales: null, bajas: [], historial: [],
    siguiente_accion: { codigo: 'reunir_condiciones', texto: 'Cada persona decide si confirma esta versión.' },
    mi_situacion: { miembro_id: id(6), nombre: 'Gabriela', es_organizador: false, es_organizador_espacio: false,
      interesado: false, condiciones: 'sin_cargar', retirado: false, elegible_en_version: false,
      acepte_version: false, mi_opinion: null, invitacion_agente: null,
      puede: { abrir: false, marcar_interes: false, guardar_condiciones: false, evaluar: false, aceptar: false,
        retirarme: false, proponer_reparacion: false, cancelar: false, simular: false, opinar: false } } }
}
const user = { id: '40000000-0000-4000-8000-000000000001', aud: 'authenticated', role: 'authenticated', is_anonymous: true,
  created_at: NOW.utc, app_metadata: { provider: 'anonymous', providers: ['anonymous'] }, user_metadata: { ficticio: 'Gabriela MOCK LOCAL' }, identities: [] }
const b64 = x => Buffer.from(JSON.stringify(x)).toString('base64url')
function session() { const exp = Math.floor(Date.now() / 1000) + 3600; return {
  access_token: `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: user.id, exp, aud: 'authenticated', role: 'authenticated' })}.TU9DSw`,
  refresh_token: 'MOCK_LOCAL_NO_VALIDO', token_type: 'bearer', expires_in: 3600, expires_at: exp, user } }

await mkdir(OUT, { recursive: true })
// Fuentes públicas ya referenciadas por la app: fixtures opcionales en /tmp, nunca descarga al ejecutar.
const fontFixtures = new Map()
try {
  const manifest = JSON.parse(await readFile(process.env.CRUCE_QA_FONT_MANIFEST || '/tmp/cruce-participacion-fonts/manifest.json', 'utf8'))
  for (const entry of manifest.entries) {
    assert.ok(['https://fonts.googleapis.com', 'https://fonts.gstatic.com'].includes(new URL(entry.url).origin))
    fontFixtures.set(entry.url, { body: await readFile(entry.path), contentType: entry.contentType })
  }
} catch (error) { if (error.code !== 'ENOENT') throw error }
const server = requestedBase ? null : await createServer({ root: ROOT, cacheDir: `${OUT}/vite-cache`,
  server: { host: '127.0.0.1', port: 0, strictPort: false },
  define: { 'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(MOCK),
    'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': JSON.stringify('sb_publishable_MOCK_LOCAL_ONLY') } })
let browser
const report = { mode: 'MOCK LOCAL: Auth y RPC ficticios; app y SDK reales; sin backend', cases: [], backendNetworkAllowed: false, outsideAssetOriginAllowed: false, fontFixtureAssets: fontFixtures.size, fontMode: fontFixtures.size ? 'Plus Jakarta Sans servida desde archivos locales' : 'Respaldo del sistema; fuente web no disponible' }
try {
  await server?.listen()
  const BASE = requestedBase ? requestedBase.href.replace(/\/$/, '') : `http://127.0.0.1:${server.httpServer.address().port}`
  const baseURL = new URL(BASE)
  const ASSET_ORIGIN = baseURL.origin
  const navigationPaths = new Set([baseURL.pathname, `${baseURL.pathname.replace(/\/$/, '')}/`])
  const assetGET = (request, url) => request.method() === 'GET' && url.origin === ASSET_ORIGIN
    && !/^\/(api|auth|rest|functions)(?:\/|$)/.test(url.pathname)
    && ((request.isNavigationRequest() && navigationPaths.has(url.pathname))
      || /\.(?:[cm]?js|[jt]sx?|css|map|svg|png|jpe?g|gif|webp|avif|ico|woff2?|ttf|webmanifest)$/.test(url.pathname)
      || /^\/(?:@vite|@react-refresh|@id)(?:\/|$)/.test(url.pathname))
  report.appSource = BASE
  report.assets = requestedBase ? 'GET reales únicamente del origen elegido; Auth/RPC interceptados' : 'Vite loopback'
  const isSyntheticAPI = url => (url.origin === MOCK || requestedBase !== null) && (url.pathname.startsWith('/auth/v1/') || url.pathname.startsWith('/rest/v1/rpc/'))
  browser = await pw.chromium.launch({ headless: true, executablePath: process.env.CRUXE_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' })
  const configs = [375, 320, 390, 430, 1280].flatMap(width => ['light', 'dark'].map(theme => ({ width, theme, full: width === 375 && theme === 'light' })))
  for (const config of configs) {
    const label = `${config.width}-${config.theme}`
    const result = { ...config, checks: [], rpc: [], blocked: [], errors: [], screenshots: [], captures: [], fontRequests: [], overflow: [] }
    const context = await browser.newContext({ viewport: { width: config.width, height: 844 }, serviceWorkers: 'block',
      locale: 'es-CL', colorScheme: config.theme, reducedMotion: 'reduce' })
    let roster = members(), p = proposal(), reads = 0
    const space = () => ({ id: E, nombre: 'Amigos de siempre', tipo: 'amigos', demo: true, codigo_invitacion: 'VISTALOC',
      creado_en: NOW, ultimo_reinicio: null, generacion: 1, mi_miembro_id: id(6), mi_rol: 'miembro', miembros: roster,
      proposito: 'libre', familia: 'libre', actividad: [] })
    const reply = (route, data) => route.fulfill({ status: 200, contentType: 'application/json',
      headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(data) })
    // Las APIs se interceptan antes de permitir assets. Nunca salen Auth/RPC, incluso al optar por una app publicada.
    // Único continue: GET del origen EXACTO elegido; otros puertos/hosts y métodos también se bloquean.
    await context.route('**/*', async route => {
      const req = route.request(), url = new URL(req.url())
      if (req.method() === 'GET' && fontFixtures.has(url.href)) {
        const fixture = fontFixtures.get(url.href); result.fontRequests.push(url.href)
        return route.fulfill({ status: 200, contentType: fixture.contentType, body: fixture.body, headers: { 'access-control-allow-origin': '*' } })
      }
      if (!isSyntheticAPI(url)) {
        if (assetGET(req, url)) return route.continue()
        result.blocked.push(url.origin + url.pathname); return route.abort('blockedbyclient')
      }
      try {
        if (req.method() === 'OPTIONS') return reply(route, {})
        if (url.pathname.startsWith('/auth/v1/')) {
          const op = url.pathname.split('/').at(-1)
          if (['signup', 'token'].includes(op)) return reply(route, session())
          if (op === 'user') return reply(route, user)
          throw new Error(`Auth no esperado: ${op}`)
        }
        assert.equal(req.method(), 'POST')
        assert.ok(url.pathname.startsWith('/rest/v1/rpc/'))
        const fn = url.pathname.split('/').at(-1), args = req.postDataJSON()
        result.rpc.push({ fn, args })
        if (fn === 'server_info') return reply(route, envelope({ sesion: { autenticada: true } }))
        if (fn === 'list_my_spaces') return reply(route, envelope({ espacios: [{ ...space(), cantidad_miembros: roster.length }] }))
        if (fn === 'get_space') { reads++; assert.equal(args.p_espacio_id, E); return reply(route, envelope({ espacio: space() })) }
        if (fn === 'get_my_preferences') return reply(route, envelope({ preferencias: null, usar_en_agente: false,
          recibir_invitaciones_agente: false, actualizadas_en: null, opciones: { actividades: [] }, personas_con_preferencias: 0 }))
        if (fn === 'list_proposals') return reply(route, envelope({ propuestas: [{ ...p, version: p.opcion.version, fecha_local: p.opcion.franja.inicio.local }] }))
        if (fn === 'get_proposal_state') {
          assert.equal(args.p_propuesta_id, P)
          if (args.p_desde_rev === p.state_rev) return reply(route, envelope({ sin_cambios: true, state_rev: p.state_rev, rev_vista: p.state_rev }))
          return reply(route, envelope({ propuesta: p, rev_vista: p.state_rev }))
        }
        throw new Error(`RPC inesperada: ${fn}`)
      } catch (error) { result.errors.push(`Interceptor: ${error.message}`); await route.abort('blockedbyclient').catch(() => {}) }
    })
    await context.addInitScript(({ theme }) => {
      for (const storage of ['localStorage', 'sessionStorage']) for (const key of ['cruxe:entrada-vista', 'cruxe:guia-vista:v1']) window[storage].setItem(key, '1')
      localStorage.setItem('cruxe:tema:v1', theme)
      document.addEventListener('DOMContentLoaded', () => {
        const badge = document.createElement('div'); badge.id = 'qa-mock-local'
        badge.textContent = 'Vista previa local · Datos ficticios · sin backend'
        badge.style.cssText = 'display:block;position:fixed;top:0;left:0;right:0;height:26px;z-index:2147483647;background:#172554;color:white;font:11px/14px system-ui;padding:5px 6px;pointer-events:none;text-align:center;box-sizing:border-box'
        document.body.prepend(badge)
        document.body.style.paddingTop = '26px'
        const style = document.createElement('style'); style.textContent = '.barra { top:26px !important; }'
        document.head.appendChild(style)
      })
    }, { theme: config.theme })
    const page = await context.newPage()
    page.on('pageerror', e => result.errors.push(e.message))
    const visible = async locator => { await locator.waitFor({ state: 'visible', timeout: 15000 }); assert.equal(await locator.isVisible(), true) }
    const hasName = (root, name) => root.getByText(name, { exact: false }).first()
    const shot = async name => {
      const group = name.startsWith('grupo')
      const panel = page.getByRole('region', { name: group ? 'Integrantes del grupo' : 'Participación del plan', exact: true })
      const font = await page.evaluate(async () => { await document.fonts.ready; return { loadedFaces: Array.from(document.fonts).filter(f => f.status === 'loaded').length, family: getComputedStyle(document.body).fontFamily } })
      if (fontFixtures.size) assert.ok(font.loadedFaces > 0, 'La fuente web local debe estar cargada antes de capturar')
      result.font = font
      if (group) await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
      else await panel.evaluate(el => window.scrollTo({ top: Math.max(0, el.getBoundingClientRect().top + window.scrollY - 112), behavior: 'instant' }))
      const viewport = `${OUT}/${label}-${name}-viewport.png`
      await page.screenshot({ path: viewport, fullPage: false, animations: 'disabled' })
      result.screenshots.push(viewport); result.captures.push({ path: viewport, kind: 'viewport nativo con app, GRU y rótulo de datos ficticios', width: config.width, height: 844 })
      const crop = `${OUT}/${label}-${name}-panel.png`
      await panel.screenshot({ path: crop, animations: 'disabled' })
      result.screenshots.push(crop); result.captures.push({ path: crop, kind: 'element.screenshot nativo; recorte exacto del panel, sin edición de píxeles' })
      const size = await page.evaluate(() => ({ viewport: innerWidth, doc: document.documentElement.scrollWidth, body: document.body.scrollWidth }))
      result.overflow.push({ name, ...size }); assert.ok(size.doc <= size.viewport + 1 && size.body <= size.viewport + 1, `Desborde ${label}/${name}: ${JSON.stringify(size)}`)
    }
    try {
      await page.goto(`${BASE}/#/e/${E}`)
      const group = page.getByRole('region', { name: 'Integrantes del grupo', exact: true })
      await visible(group)
      for (const name of names) await visible(hasName(group, name))
      await visible(group.getByRole('list', { name: 'Ya están en el grupo', exact: true }))
      await visible(group.getByRole('list', { name: 'Personas simuladas', exact: true }))
      await visible(group.getByRole('list', { name: 'Por entrar al grupo', exact: true }))
      assert.match(await group.innerText(), /Simulación/)
      assert.doesNotMatch(await group.innerText(), /ojala_gratis|presupuesto|disponibilidad/i)
      await shot('grupo-siete-nombres')
      result.checks.push('Miembro común ve siete nombres sin abrir ficha, separados entre ingresados, simulación y por entrar')

      await page.goto(`${BASE}/#/e/${E}/p/${P}`)
      const participation = page.getByRole('region', { name: 'Participación del plan', exact: true })
      await visible(participation)
      const accepted1 = participation.getByRole('list', { name: 'Confirmaron la versión 1', exact: true })
      const waiting = () => participation.getByRole('list', { name: 'Sin confirmar esta versión', exact: true })
      for (const name of ['Ana', 'Felipe']) await visible(hasName(accepted1, name))
      for (const name of ['Camila', 'Gabriela']) await visible(hasName(waiting(), name))
      assert.doesNotMatch(await participation.innerText(), /ojala_gratis|presupuesto|disponibilidad|no viene|no puede|no respondió/i)
      await shot('plan-v1-confirmados-y-pendientes')
      result.checks.push('v1 muestra Ana y Felipe confirmados; Camila y Gabriela sin confirmar; sin atribuir disponibilidad ni motivos')
      if (config.full) {
        const beforeReads = reads
        roster = roster.map(m => m.nombre === 'Diego' ? { ...m, pendiente: false } : m.nombre === 'Bruno' ? { ...m, nombre: 'Bruno Demo' } : m)
        await visible(hasName(waiting(), 'Diego'))
        await visible(hasName(waiting(), 'Bruno Demo'))
        assert.equal(await participation.getByText('Bruno', { exact: true }).count(), 0)
        assert.ok(reads > beforeReads, 'get_space debe repetirse mientras la propuesta responde sin_cambios')
        result.checks.push('Sondeo get_space refresca ingreso de Diego y nombre de Bruno incluso con sin_cambios en el plan')
        p = proposal(2, [], 20)
        await visible(participation.getByText(/Nadie confirmó|Todavía no hay confirmaciones/).first())
        await visible(hasName(waiting(), 'Ana'))
        await visible(hasName(waiting(), 'Felipe'))
        assert.equal(await participation.getByRole('list', { name: 'Confirmaron la versión 1', exact: true }).count(), 0)
        await shot('plan-v2-cero-confirmaciones')
        result.checks.push('v2 con aceptaron=[] borra confirmaciones anteriores y devuelve Ana/Felipe a sin confirmar')
        p = proposal(2, ['Camila'], 21)
        const accepted2 = participation.getByRole('list', { name: 'Confirmaron la versión 2', exact: true })
        await visible(hasName(accepted2, 'Camila'))
        assert.equal(await waiting().getByText('Camila', { exact: true }).count(), 0)
        await shot('plan-v2-camila-confirmada')
        result.checks.push('Aceptación pública de Camila aparece en v2 y deja sin confirmar')
        roster = roster.filter(m => m.nombre !== 'Camila')
        p = proposal(2, [], 22)
        await visible(participation.getByText(/Nadie confirmó|Todavía no hay confirmaciones/).first())
        await page.waitForFunction(() => !Array.from(document.querySelectorAll('.participacion-publica li')).some(li => li.textContent.includes('Camila')), undefined, { timeout: 10000 })
        assert.equal(await participation.getByText('Camila', { exact: true }).count(), 0)
        await shot('plan-membresia-actualizada')
        result.checks.push('Salida de Camila y aceptación retirada desaparecen del plan tras refresco del espacio')
        await page.goto(`${BASE}/#/e/${E}`)
        const updatedGroup = page.getByRole('region', { name: 'Integrantes del grupo', exact: true })
        await visible(hasName(updatedGroup, 'Bruno Demo'))
        assert.equal(await updatedGroup.getByText('Camila', { exact: true }).count(), 0)
        const groupReads = reads
        roster = roster.filter(m => m.nombre !== 'Diego').map(m => m.nombre === 'Bruno Demo' ? { ...m, nombre: 'Bruno Renombrado' } : m)
        await visible(hasName(updatedGroup, 'Bruno Renombrado'))
        assert.equal(await updatedGroup.getByText('Diego', { exact: true }).count(), 0)
        assert.ok(reads > groupReads, 'La pantalla de grupo debe sondear get_space sin recargar ni navegar')
        await shot('grupo-refrescado-sin-navegar')
        result.checks.push('La pantalla Grupo sondea get_space y actualiza nombres/salidas sin abrir ficha ni volver a navegar')
      }
      // Prueba separada: las capturas principales mantienen los siete nombres normales.
      roster = members().map(m => m.nombre === 'Elena' ? { ...m, nombre: LONG_NAME } : m)
      p = proposal()
      await page.goto(`${BASE}/#/e/${E}/p/${P}`)
      const longPanel = page.getByRole('region', { name: 'Participación del plan', exact: true })
      const longName = hasName(longPanel, LONG_NAME)
      await visible(longName)
      const textRects = await longName.evaluate(el => { const range = document.createRange(); range.selectNodeContents(el); return Array.from(range.getClientRects()).map(r => ({ left: r.left, right: r.right })) })
      assert.ok(textRects.every(r => r.left >= 0 && r.right <= config.width + 1), 'El nombre largo debe caber completo dentro de la pantalla')
      await shot('plan-nombre-largo-separado')
      result.checks.push('Nombre largo completo probado por separado sin truncado ni desbordes')
      assert.equal(await page.locator('html').getAttribute('data-theme'), config.theme)
      assert.deepEqual(result.errors, [], 'Errores JS/interceptor')
      assert.ok(result.rpc.every(x => !/simulate|accept_version|save_|seed_|create_|leave_|withdraw/.test(x.fn)), 'La prueba de lectura no debe mutar ni siquiera el backend simulado')
      result.ok = true
      console.log(`PASS ${label}: nombres públicos, estados visibles y sin desbordes`)
    } catch (error) {
      result.ok = false; result.failure = error.message
      await page.screenshot({ path: `${OUT}/${label}-fallo.png`, fullPage: false }).catch(() => {})
      console.error(`FAIL ${label}: ${error.message}`)
      report.cases.push(result)
      throw error
    } finally { await context.close() }
    report.cases.push(result)
  }
  report.ok = true
} catch (error) { report.ok = false; report.error = error.message; process.exitCode = 1 }
finally {
  await browser?.close()
  await server?.close()
  await writeFile(`${OUT}/report.json`, JSON.stringify(report, null, 2))
  console.log(`Evidencia MOCK LOCAL: ${OUT}/report.json`)
}
