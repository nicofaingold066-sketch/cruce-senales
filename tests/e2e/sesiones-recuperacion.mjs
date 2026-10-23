// #69. SDK y helpers reales; servidor Auth completamente ficticio. Cero red externa real.
// node tests/e2e/sesiones-recuperacion.mjs
// Playwright y Chrome existentes, configuración como red-controlada.mjs. No instala nada.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { createServer } from 'vite'
const require = createRequire(import.meta.url)
let pw
try { pw = require('playwright') } catch {
  pw = require(process.env.CRUXE_PLAYWRIGHT_DIR || '/Users/macair/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
}
const BASE = 'http://127.0.0.1:4192'
const server = await createServer({ server: { host: '127.0.0.1', port: 4192, strictPort: true } })
await server.listen()
const browser = await pw.chromium.launch({ headless: true,
  executablePath: process.env.CRUXE_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' })
const hora = () => new Date().toLocaleString('sv-SE', { timeZone: 'America/Santiago' })
const nombres = ['Tomi', 'Pepe', 'Caro']
const usuarios = Object.fromEntries(nombres.map((n, i) => [n, {
  id: `00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`,
  aud: 'authenticated', role: 'authenticated', is_anonymous: true,
  created_at: '2026-10-23T00:00:00Z', app_metadata: { provider: 'anonymous', providers: ['anonymous'] },
  user_metadata: { ficticio: n }, identities: [],
}]))
const b64 = v => Buffer.from(JSON.stringify(v)).toString('base64url')
// Tokens sin firma real: solo los procesa el SDK frente al Auth simulado. No autentican en ningún servicio.
function sesion(nombre, refresh_token = `qa-ficticio-${nombre}-r0`) {
  const exp = Math.floor(Date.now() / 1000) + 3600
  return { access_token: `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: usuarios[nombre].id, exp, aud: 'authenticated', role: 'authenticated' })}.cWE`,
    refresh_token, token_type: 'bearer', expires_in: 3600, expires_at: exp, user: usuarios[nombre] }
}
const sobre = data => ({ ok: true, contrato: 2,
  servidor_ahora: { utc: '2026-10-23T20:00:00Z', local: '2026-10-23T17:00', zona: 'America/Santiago' }, ...data })
const responder = (route, json, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(json) })
const errorFatal = route => responder(route, { code: 'refresh_token_not_found', msg: 'Token ficticio rechazado' }, 400)
let aprobadas = 0, fallidas = 0, authSimulada = 0

async function caso(nombre, mock, prueba) {
  const filtro = process.env.CRUXE_SESIONES_CASO
  if (filtro && !nombre.startsWith(filtro + ' ')) return
  const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 375, height: 812 } })
  const page = await context.newPage()
  const erroresJS = [], inesperadas = [], pendientes = new Set()
  const recibidas = []
  let logout = 0
  page.on('pageerror', e => erroresJS.push(e.name))
  await context.route('**/*', async route => {
    const req = route.request(), u = new URL(req.url())
    if (u.origin === BASE) return route.continue()
    pendientes.add(route)
    try {
      if (req.method() === 'OPTIONS') return responder(route, {})
      if (u.pathname.startsWith('/auth/v1/')) {
        authSimulada++
        const op = u.pathname.split('/').at(-1)
        recibidas.push(op)
        if (op === 'logout') { logout++; return responder(route, {}) }
        if (op === 'user') {
          const token = req.headers().authorization?.replace(/^Bearer /, '')
          const sub = JSON.parse(Buffer.from(token?.split('.')[1] ?? '', 'base64url').toString()).sub
          const user = Object.values(usuarios).find(x => x.id === sub)
          assert.ok(user, 'El SDK debe consultar un usuario ficticio conocido')
          return responder(route, user)
        }
        return await mock({ route, op, args: req.postDataJSON(), recibidas })
      }
      if (u.pathname === '/rest/v1/rpc/list_my_spaces') {
        const token = req.headers().authorization?.replace(/^Bearer /, '')
        const sub = token?.includes('.') ? JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()).sub : null
        return responder(route, sobre({ espacios: sub === usuarios.Tomi.id ? [{
          id: 'qa-espacio', nombre: 'Los del asado', tipo: 'amigos', demo: true,
          mi_rol: 'organizador', cantidad_miembros: 6,
        }] : [] }))
      }
      if (u.pathname === '/rest/v1/rpc/list_proposals') return responder(route, sobre({ propuestas: [] }))
      if (u.pathname === '/rest/v1/rpc/server_info') return responder(route, sobre({ sesion: { autenticada: true } }))
      inesperadas.push(u.pathname)
      return route.abort('blockedbyclient')
    } catch (e) {
      if (!page.isClosed()) erroresJS.push(`Interceptor: ${e.name}`)
      await route.abort().catch(() => {})
    } finally { pendientes.delete(route) }
  })
  const inicio = Date.now()
  try {
    await page.goto(`${BASE}/tests/e2e/sesiones-recuperacion.html`)
    await page.waitForFunction(() => window.sesionesQA?.lista && window.sesionesQA?.mostrarInicio)
    await prueba(page, recibidas)
    assert.equal(logout, 0, 'Nunca revocar una sesión anónima para cambiar/restaurar/olvidar')
    assert.deepEqual(erroresJS, [], 'Errores JS o del interceptor')
    assert.deepEqual(inesperadas, [], `Salida externa inesperada bloqueada: ${[...new Set(inesperadas)].join(', ')}`)
    aprobadas++; console.log(`[${hora()}] PASS ${nombre} (${Date.now() - inicio} ms)`)
  } catch (e) {
    fallidas++; console.log(`[${hora()}] FAIL ${nombre}: ${String(e.message).split('\n')[0]}`)
  } finally {
    for (const route of pendientes) await route.abort().catch(() => {})
    await context.close()
  }
}
const poner = async (p, nombre) => assert.equal((await p.evaluate(s => window.sesionesQA.poner(s), sesion(nombre))).ok, true)
const estado = p => p.evaluate(() => window.sesionesQA.estado())
const guardar = p => p.evaluate(() => window.sesionesQA.guardarFicticia('qa-ficticio-Tomi-guardado'))
const cambiar = p => p.evaluate(() => window.sesionesQA.cambiar())
const mostrar = p => p.evaluate(() => window.sesionesQA.mostrarInicio())
const mostrarEntrada = async p => {
  await p.evaluate(() => window.sesionesQA.mostrarApp())
  await p.waitForURL(/#\/entrar$/)
  await retorno(p).waitFor()
}
const retorno = p => p.getByRole('button', { name: 'Volver a esa sesión', exact: true })
const noAuthEsperada = async () => { throw new Error('Operación Auth no esperada') }

console.log(`[${hora()}] #69 SDK real, datos y Auth ficticios; red externa interceptada.`)
try {
  await caso('S1 cambiar conserva Tomi y volver desde Inicio restaura su identidad', async ({ route, op, args }) => {
    if (op === 'signup') return responder(route, sesion('Pepe'))
    if (op === 'token') {
      assert.ok(['qa-ficticio-Tomi-r0', 'qa-ficticio-Tomi-rotado'].includes(args.refresh_token))
      // Control negativo del banco, sin editar código de producto: el Auth simulado devuelve otra identidad.
      if (process.env.CRUXE_SESIONES_CONTROL === 'identidad' && args.refresh_token === 'qa-ficticio-Tomi-rotado') {
        return responder(route, sesion('Pepe', 'qa-ficticio-Pepe-control'))
      }
      return responder(route, sesion('Tomi', 'qa-ficticio-Tomi-rotado'))
    }
    throw new Error('Auth no esperada')
  }, async p => {
    await poner(p, 'Tomi')
    assert.equal((await cambiar(p)).ok, true)
    assert.deepEqual(await estado(p), { actual: 'Pepe', guardada: 'Tomi en «Los del asado»' })
    assert.equal(await p.evaluate(() => window.sesionesQA.tokenGuardadoEs('qa-ficticio-Tomi-rotado')), true)
    await mostrar(p)
    await Promise.all([p.waitForEvent('domcontentloaded'), retorno(p).click()])
    await p.waitForFunction(() => window.sesionesQA?.lista)
    assert.deepEqual(await estado(p), { actual: 'Tomi', guardada: null })
  })

  await caso('S2 una nueva persona no pisa la copia ya guardada de Tomi', async ({ route, op }) => {
    assert.equal(op, 'signup')
    return responder(route, sesion('Caro'))
  }, async (p, ops) => {
    await poner(p, 'Pepe'); await guardar(p)
    assert.equal((await cambiar(p)).ok, true)
    assert.deepEqual(await estado(p), { actual: 'Caro', guardada: 'Tomi en «Los del asado»' })
    assert.equal(await p.evaluate(() => window.sesionesQA.tokenGuardadoEs('qa-ficticio-Tomi-guardado')), true)
    assert.equal(ops.filter(x => x === 'token').length, 0)
  })

  await caso('S3 fallo al guardar la sesión actual no crea otra identidad', async ({ route, op }) => {
    assert.equal(op, 'token'); return errorFatal(route)
  }, async (p, ops) => {
    await poner(p, 'Tomi')
    assert.equal((await cambiar(p)).ok, false)
    assert.deepEqual(await estado(p), { actual: 'Tomi', guardada: null })
    assert.equal(ops.includes('signup'), false)
  })

  await caso('S4 almacenamiento bloqueado conserva la identidad y no hace signup', async ({ route, op }) => {
    assert.equal(op, 'token'); return responder(route, sesion('Tomi', 'qa-ficticio-Tomi-rotado'))
  }, async (p, ops) => {
    await poner(p, 'Tomi'); await p.evaluate(() => window.sesionesQA.bloquearGuardado())
    const r = await cambiar(p)
    assert.equal(r.ok, false); assert.match(r.mensaje, /no permite guardar/)
    assert.deepEqual(await estado(p), { actual: 'Tomi', guardada: null })
    assert.equal(ops.includes('signup'), false)
  })

  await caso('S5 signup rechazado conserva Tomi y limpia solo la copia de ese intento', async ({ route, op }) => {
    if (op === 'token') return responder(route, sesion('Tomi', 'qa-ficticio-Tomi-rotado'))
    assert.equal(op, 'signup')
    return responder(route, { code: 'signup_disabled', msg: 'Alta ficticia rechazada' }, 400)
  }, async p => {
    await poner(p, 'Tomi')
    assert.equal((await cambiar(p)).ok, false)
    assert.deepEqual(await estado(p), { actual: 'Tomi', guardada: null })
  })

  await caso('S6 red caída al volver conserva la copia y la sesión de Pepe', async ({ route, op }) => {
    assert.equal(op, 'token')
    return route.abort('failed')
  }, async p => {
    await poner(p, 'Pepe'); await guardar(p); await mostrar(p)
    await retorno(p).click()
    await p.getByText('Sin conexión con el servidor. La sesión sigue guardada; intenta de nuevo.', { exact: false }).waitFor({ timeout: 35000 })
    assert.deepEqual(await estado(p), { actual: 'Pepe', guardada: 'Tomi en «Los del asado»' })
    assert.equal(await retorno(p).isEnabled(), true)
  })

  await caso('S7 copia inválida y doble clic: un refresh, Pepe sigue activo y se avisa', async ({ route, op }) => {
    assert.equal(op, 'token'); return errorFatal(route)
  }, async (p, ops) => {
    await poner(p, 'Pepe'); await guardar(p); await mostrar(p)
    await retorno(p).waitFor()
    await p.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find(x => x.textContent === 'Volver a esa sesión')
      b.click(); b.click()
    })
    await p.getByText('No se pudo volver a la otra sesión', { exact: true }).waitFor()
    assert.deepEqual(await estado(p), { actual: 'Pepe', guardada: null })
    assert.equal(ops.filter(x => x === 'token').length, 1)
    assert.equal(await retorno(p).count(), 0)
  })

  await caso('S8 olvidar pide confirmación, permite cancelar y no revoca la sesión actual', noAuthEsperada, async (p, ops) => {
    await poner(p, 'Pepe'); await guardar(p); await mostrar(p)
    await p.getByRole('button', { name: 'Olvidarla', exact: true }).click()
    await p.getByRole('button', { name: 'Cancelar', exact: true }).click()
    assert.deepEqual(await estado(p), { actual: 'Pepe', guardada: 'Tomi en «Los del asado»' })
    await p.getByRole('button', { name: 'Olvidarla', exact: true }).click()
    await p.getByRole('button', { name: 'Sí, olvidarla', exact: true }).click()
    assert.deepEqual(await estado(p), { actual: 'Pepe', guardada: null })
    assert.deepEqual(ops, ['user'])
  })

  await caso('S9 signup rechazado con una copia previa no la borra ni cambia Pepe', async ({ route, op }) => {
    assert.equal(op, 'signup')
    return responder(route, { code: 'signup_disabled', msg: 'Alta ficticia rechazada' }, 400)
  }, async (p, ops) => {
    await poner(p, 'Pepe'); await guardar(p)
    assert.equal((await cambiar(p)).ok, false)
    assert.deepEqual(await estado(p), { actual: 'Pepe', guardada: 'Tomi en «Los del asado»' })
    assert.equal(ops.includes('token'), false)
  })

  await caso('L1 login: retorno válido restaura Tomi, portada y sus espacios', async ({ route, op, args }) => {
    assert.equal(op, 'token'); assert.equal(args.refresh_token, 'qa-ficticio-Tomi-guardado')
    return responder(route, sesion('Tomi', 'qa-ficticio-Tomi-rotado'))
  }, async p => {
    await poner(p, 'Pepe'); await guardar(p); await mostrarEntrada(p)
    await Promise.all([p.waitForEvent('domcontentloaded'), retorno(p).click()])
    await p.waitForFunction(() => window.sesionesQA?.lista)
    await p.getByRole('heading', { name: 'Tus espacios', exact: true }).waitFor()
    assert.equal(new URL(p.url()).hash, '#/')
    assert.deepEqual(await estado(p), { actual: 'Tomi', guardada: null })
    assert.equal(await retorno(p).count(), 0)
  })

  await caso('L2 login: copia inválida conserva Pepe y ofrece las tres entradas con foco útil', async ({ route, op }) => {
    assert.equal(op, 'token'); return errorFatal(route)
  }, async p => {
    await poner(p, 'Pepe'); await guardar(p); await mostrarEntrada(p)
    await retorno(p).click()
    await p.getByText('No se pudo volver a esa sesión', { exact: true }).waitFor()
    assert.deepEqual(await estado(p), { actual: 'Pepe', guardada: null })
    const demo = p.getByRole('button', { name: 'Probar la demo «Los del asado»', exact: true })
    await demo.waitFor()
    assert.equal(await p.getByRole('button', { name: 'Unirme', exact: true }).count(), 1)
    assert.equal(await p.getByRole('button', { name: 'Crear un espacio', exact: true }).count(), 1)
    await p.waitForFunction(() => document.activeElement?.textContent === 'Probar la demo «Los del asado»')
  })

  await caso('L3 login: HTTP 503 conserva copia, sesión actual y foco en otra persona', async ({ route, op }) => {
    assert.equal(op, 'token'); return responder(route, { msg: 'Falla de red ficticia' }, 503)
  }, async p => {
    await poner(p, 'Pepe'); await guardar(p); await mostrarEntrada(p)
    await retorno(p).click()
    await p.getByText('Sin conexión con el servidor. La sesión sigue guardada; intenta de nuevo.', { exact: false }).waitFor({ timeout: 35000 })
    assert.deepEqual(await estado(p), { actual: 'Pepe', guardada: 'Tomi en «Los del asado»' })
    await p.waitForFunction(() => document.activeElement?.textContent === 'Entrar como otra persona')
  })
} finally {
  await browser.close(); await server.close()
  console.log(`#69: ${aprobadas} PASS, ${fallidas} FAIL; ${authSimulada} peticiones Auth interceptadas; cero red externa real, base y modelos.`)
}
if (fallidas) process.exitCode = 1
if (!aprobadas && !fallidas) process.exitCode = 2
