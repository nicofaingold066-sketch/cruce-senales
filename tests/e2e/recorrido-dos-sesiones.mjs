// #57. Recorrido completo en el navegador a 375 px con dos sesiones separadas: Tomi (ventana normal)
// y Luna (ventana privada), más el navegador compartido y la vuelta a la sesión de Tomi ("Volver a esa sesión").
// Es el guion de la evidencia #55 (docs/agente-ia.md §8.2).
//
//   node tests/e2e/recorrido-dos-sesiones.mjs [url]
//
// URL: argumento, o CRUXE_URL, o producción (https://cruce-senales.vercel.app).
// Capturas: solo si se define CRUXE_CAPTURAS=<carpeta> (una subcarpeta por corrida). Playwright y Chrome como en red-controlada.mjs
// (CRUXE_PLAYWRIGHT_DIR, CRUXE_CHROME); no instala nada.
//
// Datos: todo ficticio. Cada ejecución crea UN demo propio ("Los del finde") y tres identidades anónimas,
// cada una reutilizada en todo el recorrido: Tomi, Luna y Pepe (Pepe entra en el navegador de Tomi; ese caso
// necesita una sesión nueva). No escribe fuera de ese demo, no llama al modelo y no guarda archivos salvo las
// capturas pedidas.
import { createRequire } from 'node:module'
import { mkdirSync } from 'node:fs'
import { baseLibre } from './base-libre.mjs'
import { irA } from './nav.mjs'
baseLibre()
const require = createRequire(import.meta.url)
let pw
try { pw = require('playwright') } catch {
  pw = require(process.env.CRUXE_PLAYWRIGHT_DIR || '/Users/macair/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
}
const BASE = (process.argv[2] || process.env.CRUXE_URL || 'https://cruce-senales.vercel.app').replace(/\/+$/, '')
const sello = new Date().toLocaleString('sv-SE', { timeZone: 'America/Santiago' }).replace(/\D/g, '').slice(0, 14)
const CAPTURAS = process.env.CRUXE_CAPTURAS ? `${process.env.CRUXE_CAPTURAS}/${sello}` : ''
if (CAPTURAS) mkdirSync(CAPTURAS, { recursive: true })

const hora = () => new Date().toLocaleTimeString('es-CL', { timeZone: 'America/Santiago', hour: '2-digit', minute: '2-digit', second: '2-digit' })
const paso = (t) => console.log(`[${hora()}] ${t}`)
let aprobadas = 0, fallidas = 0
const verificar = (nombre, cond, detalle = '') => {
  if (cond) aprobadas++; else fallidas++
  paso(`${cond ? 'OK ' : 'MAL'} ${nombre}${detalle ? ' → ' + detalle : ''}`)
}
// Mejora #56: un conteo "N de M" con N mayor que M no debe aparecer ("5 de 4 confirmaron"). No toma horas
// ("sábado 31 de 14:00") y cubre "N confirmación(es) de M".
const conteosImposibles = (texto) => [...texto.matchAll(/(\d+) (?:confirmaci(?:ón\(es\)|ones|ón) )?de (\d+)(?![\d:])/g)]
  .filter((m) => Number(m[1]) > Number(m[2])).map((m) => m[0])
// El código de invitación de la demo no se imprime entero.
const enmascarar = (codigo) => (codigo ? `${codigo.slice(0, 2)}…` : '(sin código)')

const browser = await pw.chromium.launch({ headless: true,
  executablePath: process.env.CRUXE_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' })
const opts = { viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'es-CL' }
const ctxTomi = await browser.newContext(opts) // ventana normal
const ctxLuna = await browser.newContext(opts) // ventana privada: almacenamiento separado
const T = await ctxTomi.newPage(), L = await ctxLuna.newPage()
const errores = [], respuestas = []
// Enmienda 13 (c): ninguna respuesta compartida nombra a quien se retiró ni dice si había confirmado, y Luna nunca ve
// `opiniones_totales`. Se activa sola cuando el servidor trae las claves nuevas (`mi_situacion.mi_opinion` /
// `opiniones_totales`); hasta entonces queda como pendiente, sin contar. `ejecutado_por` es quien corrió la simulación.
let e13 = null
const fugasE13 = []
const NOMBRES_DEMO = ['Tomi', 'Luna', 'Mati', 'Caro', 'Fede', 'Sofi']
const revisarE13 = (quien, p) => {
  if (!p?.mi_situacion) return
  if (e13 === null) e13 = 'mi_opinion' in p.mi_situacion || 'opiniones_totales' in p
  if (!e13) return
  const baja = JSON.stringify({ bajas: p.bajas ?? null,
    eventos: (p.historial ?? []).filter((e) => e.tipo === 'baja').map(({ ejecutado_por: _simula, ...e }) => e) })
  for (const n of NOMBRES_DEMO) if (baja.includes(`"${n}"`)) fugasE13.push(`${quien}: la baja nombra a ${n}`)
  // Backend deja `habia_aceptado` en null (no quita la clave): lo que no puede haber es true/false.
  for (const b of Array.isArray(p.bajas) ? p.bajas : []) if ((b?.habia_aceptado ?? null) !== null) fugasE13.push(`${quien}: la baja dice si había confirmado`)
  // "Sin decir si había confirmado": la aceptación vieja de quien se retiró también sale sin actor. Aquí se retira Caro.
  if (Array.isArray(p.bajas) && p.bajas.length > 0) {
    for (const e of (p.historial ?? []).filter((e) => e.tipo === 'aceptacion')) if (e.actor?.nombre === 'Caro') fugasE13.push(`${quien}: la aceptación de quien se retiró conserva el nombre`)
  }
  if (quien === 'Luna' && (p.opiniones_totales?.asi_no_puedo ?? null) !== null) fugasE13.push('Luna: ve opiniones_totales')
}
// Enmienda 15 (borrador): ver el comentario equivalente en jurado-navegador.mjs. Se activa sola con las claves nuevas.
let e15 = null
const fugasE15 = []
const revisarE15 = (quien, p) => {
  if (!p) return
  if (e15 === null) e15 = 'ronda' in p || 'regla' in p || 'planes_totales' in p
  if (!e15) return
  if (quien === 'Luna' && (p.planes_totales ?? null) !== null) fugasE15.push('Luna: ve planes_totales')
  if ((p.regla ?? 'temprana') === 'temprana' && p.ronda != null) fugasE15.push(`${quien}: ronda sin haberla pedido`)
}
const buscarPrefiero = (v) => JSON.stringify(v ?? null).includes('"prefiero"')
for (const [n, p] of [['Tomi', T], ['Luna', L]]) {
  p.on('pageerror', (e) => errores.push(`${n}: ${e.message}`))
  p.on('console', (m) => { if (m.type() === 'error') errores.push(`${n} consola: ${m.text().slice(0, 160)}`) })
  // Solo la ruta y el código (sin parámetros ni cabeceras), para saber qué pedido falló.
  p.on('response', (r) => { if (r.status() >= 400) respuestas.push(`${n} ${r.status()} ${r.request().method()} ${new URL(r.url()).pathname}`) })
  p.on('response', (r) => {
    if (!new URL(r.url()).pathname.startsWith('/rest/v1/rpc/')) return
    const fn = new URL(r.url()).pathname.split('/').at(-1)
    r.json().then((j) => {
      if (j?.propuesta) { revisarE13(n, j.propuesta); revisarE15(n, j.propuesta) }
      for (const q of j?.propuestas ?? []) { revisarE13(n, q); revisarE15(n, q) }
      if (!['get_my_conditions', 'save_my_conditions', 'simulate_save_conditions'].includes(fn) && buscarPrefiero(j)) fugasE15.push(`${n}: ${fn} trae prefiero`)
    }).catch(() => {})
  })
}
let nCaptura = 0
const captura = async (p, nombre) => {
  if (!CAPTURAS) return
  nCaptura++
  await p.screenshot({ path: `${CAPTURAS}/${String(nCaptura).padStart(2, '0')}-${nombre}.png` })
}
const boton = (p, texto) => p.getByRole('button', { name: texto, exact: true })
const tocar = async (p, texto) => { const b = boton(p, texto); await b.scrollIntoViewIfNeeded(); await b.click() }
const esperarTexto = (p, texto, ms = 20000) => p.getByText(texto, { exact: false }).first().waitFor({ timeout: ms })
const pestana = (p, nombre) => irA(p, nombre, { espera: 600 })
const siPuedo = (p, franja) => p.locator('fieldset', { hasText: `Franja ${franja}` }).getByText('Sí puedo', { exact: true }).click()
const estado = (p) => p.locator('.estado-hero-etiqueta').first().innerText().catch(() => '')
// Cada paso espera lo que devuelve el servidor, no un tiempo fijo.
const conInteres = async (p) => {
  await tocar(p, 'Me interesa')
  await esperarTexto(p, 'Marcaste "Me interesa"')
}
const conCondiciones = async (p) => {
  await siPuedo(p, 'A'); await siPuedo(p, 'B')
  await tocar(p, 'Guardar condiciones')
  await esperarTexto(p, 'Guardado. Solo tú ves estas condiciones.')
}
const confirmar = async (p, version) => {
  await tocar(p, `Confirmar versión ${version}`)
  await esperarTexto(p, `Ya confirmaste la versión ${version}`)
}
const aceptarSimulados = async (version) => {
  await pestana(T, 'Simulación')
  await T.getByRole('button', { name: new RegExp(`^Aceptar versión ${version} por `) }).first().click()
  await esperarTexto(T, `Confirmaron la versión ${version}:`, 30000)
}
const textoYEtiquetas = (p) => p.evaluate(() => {
  const main = document.querySelector('main')
  const etiquetas = [...document.querySelectorAll('[aria-label]')].map((e) => e.getAttribute('aria-label'))
  return `${main ? main.innerText : document.body.innerText}\n${etiquetas.join('\n')}`
})

paso(`Recorrido con dos sesiones contra ${new URL(BASE).origin}${new URL(BASE).pathname.replace(/\/$/, '')}`)
try {
  // 1. Tomi abre la demo.
  await T.goto(BASE)
  await tocar(T, /^Probar la demo «Los del (asado|finde)»$/)
  await T.getByRole('heading', { name: /^Los del (asado|finde)$/ }).waitFor({ timeout: 20000 })
  const codigo = (await T.locator('.codigo').first().textContent())?.trim()
  const urlEspacio = T.url()
  verificar('Tomi entra a su demo como organizador', !!codigo && (await T.getByText('Herramientas del organizador').count()) > 0, `código ${enmascarar(codigo)}`)
  await captura(T, 'tomi-espacio')

  // 2. Propuesta del caso, creada y abierta.
  await T.getByRole('link', { name: /^(Crear propuesta|\+? ?Nuevo plan)$/ }).first().click()
  // El mockup (S3) deja un solo primario («Crear y abrir al grupo»): el paso «Revisar antes de crear» es opcional.
  { const revisar = T.getByRole('button', { name: 'Revisar antes de crear', exact: true }); if (await revisar.isVisible().catch(() => false)) await revisar.click() }
  await tocar(T, 'Crear y abrir al grupo')
  await T.waitForURL(/\/p\//, { timeout: 20000 })
  await T.getByRole('tab', { name: 'Plan' }).waitFor({ timeout: 20000 })
  // Abierta de verdad: el servidor la pasa a "Reuniendo interés" (si open_proposal falla, queda en borrador).
  await esperarTexto(T, 'Reuniendo interés').catch(() => {})
  const estadoInicial = await estado(T)
  verificar('Propuesta creada y abierta al grupo', /Reuniendo interés/i.test(estadoInicial), estadoInicial)

  // 3. Luna entra con el enlace en su ventana privada. La lista tiene que aparecer sola (F1, mejora #52).
  await L.goto(`${BASE}/#/unirse/${codigo}`)
  await L.getByRole('textbox').nth(1).fill('Luna')
  await tocar(L, 'Unirme')
  await L.getByRole('heading', { name: /^Los del (asado|finde)$/ }).waitFor({ timeout: 20000 })
  const t0 = Date.now()
  const listaSola = await L.getByText('Asado en casa de Tomi', { exact: false }).first().waitFor({ timeout: 4000 }).then(() => true, () => false)
  verificar('F1: la lista de propuestas aparece sola al entrar', listaSola, listaSola ? `${Date.now() - t0} ms después del título, sin recargar` : 'no apareció en 4 s')
  verificar('Luna reclamó su lugar', (await L.getByText('Reclamaste el lugar de Luna', { exact: false }).count()) > 0)
  await captura(L, 'luna-espacio')

  // 4. Condiciones privadas: Tomi y Luna (franjas A y B); los simulados, con el atajo de la demo.
  await pestana(T, 'Mi respuesta'); await conInteres(T); await conCondiciones(T)
  await L.getByText('Asado en casa de Tomi', { exact: false }).first().click()
  await L.getByRole('tab', { name: 'Mi respuesta' }).waitFor({ timeout: 15000 })
  // La pestaña depende del espacio (get_space aparte): se espera a que llegue y se mira un rato, no un instante.
  await L.getByRole('link', { name: /Los del (asado|finde)/ }).first().waitFor({ timeout: 15000 }) // rediseño: el volver lleva ícono, no '←'
  let conSimulacion = false
  for (let i = 0; i < 6 && !conSimulacion; i++) {
    conSimulacion = (await L.getByRole('tab', { name: 'Simulación' }).count()) > 0
    await L.waitForTimeout(250)
  }
  verificar('Luna no tiene la pestaña Simulación', !conSimulacion)
  await pestana(L, 'Mi respuesta'); await conInteres(L); await conCondiciones(L)
  // E7.2 con control positivo, mientras se reúne interés: Tomi ve el conteo de condiciones cargadas; Luna no.
  await pestana(T, 'Plan'); await pestana(L, 'Plan')
  const tomiVeConteo = await esperarTexto(T, 'Con condiciones', 10000).then(() => true, () => false)
  const lunaVeConteo = (await L.getByText('Con condiciones', { exact: false }).count()) > 0
  verificar('E7.2: "Con condiciones cargadas" lo ve Tomi y no Luna', tomiVeConteo && !lunaVeConteo, `Tomi ${tomiVeConteo ? 'sí' : 'no'}, Luna ${lunaVeConteo ? 'sí' : 'no'}`)
  await pestana(T, 'Simulación'); await tocar(T, 'Cargar condiciones del caso a las personas simuladas')
  await esperarTexto(T, 'cargadas las condiciones de', 20000)
  await captura(T, 'tomi-simulacion-cargada')

  // 5. Opción v1 (sábado) y confirmaciones hasta "Grupo confirmado".
  await pestana(T, 'Plan'); await tocar(T, 'Buscar opción compatible')
  await esperarTexto(T, 'Confirmar versión 1')
  await confirmar(T, 1)
  await aceptarSimulados(1)
  await L.reload(); await pestana(L, 'Plan')
  await esperarTexto(L, 'Confirmar versión 1')
  await confirmar(L, 1)
  const v1 = await L.getByText('Grupo confirmado', { exact: false }).first().waitFor({ timeout: 20000 }).then(() => true, () => false)
  verificar('v1: Grupo confirmado en el teléfono de Luna', v1)
  // E7.2 con control positivo, con versión vigente: "Faltan por responder" lo ve Tomi y no Luna.
  await pestana(T, 'Plan')
  // El rótulo puede ser «Faltan por responder» (hoy) o «Faltan por confirmar» (ux-flujo, opcional): se aceptan los dos.
  const RE_FALTAN = /Faltan por (?:responder|confirmar)/
  const tomiVePendientes = await T.getByText(RE_FALTAN).first().waitFor({ timeout: 10000 }).then(() => true, () => false)
  const lunaVePendientes = RE_FALTAN.test(await L.locator('main').innerText())
  verificar('E7.2: «Faltan por responder/confirmar» lo ve Tomi y no Luna', tomiVePendientes && !lunaVePendientes, `Tomi ${tomiVePendientes ? 'sí' : 'no'}, Luna ${lunaVePendientes ? 'sí' : 'no'}`)
  await captura(L, 'luna-v1-confirmado')

  // 6. Baja de Caro → En revisión → v2 (domingo) desde cero.
  await pestana(T, 'Simulación'); await tocar(T, 'Se baja: Caro'); await tocar(T, 'Sí, Caro se baja')
  await pestana(T, 'Plan')
  verificar('Baja de Caro: En revisión', await esperarTexto(T, 'En revisión').then(() => true, () => false))
  // E13 (c) en el teléfono de Luna: el historial no dice quién se retiró. El texto nuevo es de front-juan: se anota.
  if (e13) {
    // Ni "Caro se bajó" ni "Caro aceptó / había confirmado" en lo que ve Luna: plan e historial.
    const fuga = /(?:Tomi|Luna|Mati|Caro|Fede|Sofi) se (?:bajó|retiró)|Caro (?:aceptó|había confirmado)/
    await L.reload(); await esperarTexto(L, 'En revisión')
    verificar('E13: el plan de Luna no nombra a quien se retiró ni dice que había confirmado', !fuga.test(await L.locator('main').innerText()))
    await pestana(L, 'Historial')
    const historialLuna = await L.locator('main').innerText()
    verificar('E13: el historial de Luna no nombra a quien se retiró', !fuga.test(historialLuna),
      /Una persona se (?:bajó|retiró)/.test(historialLuna) ? 'dice "Una persona se retiró"' : /El sistema se bajó/.test(historialLuna) ? 'AVISO: dice "El sistema se bajó"' : 'sin el texto nuevo todavía')
    await pestana(L, 'Plan')
  } else paso('E13 pendiente: el servidor no trae mi_opinion/opiniones_totales; la baja sin nombre se comprueba sola cuando llegue.')
  await tocar(T, 'Buscar alternativa')
  verificar('Alternativa: versión 2 publicada', await esperarTexto(T, 'Confirmar versión 2').then(() => true, () => false))
  // Cero heredadas: antes de que nadie confirme, la v2 empieza en cero y no está confirmada.
  const v2Inicio = await T.locator('main').innerText()
  const v2Estado = await estado(T)
  verificar('v2: empieza de cero (ninguna confirmación de v1 pasa)',
    /Nadie confirmó todavía/.test(v2Inicio) && /Estas confirmaciones no pasan a la versión 2/.test(v2Inicio) && !/Grupo confirmado/i.test(v2Estado), v2Estado)
  await captura(T, 'tomi-v2')
  await confirmar(T, 2)
  await aceptarSimulados(2)
  await L.reload(); await pestana(L, 'Plan')
  await esperarTexto(L, 'Confirmar versión 2')
  await confirmar(L, 2)
  const v2 = await L.getByText('Grupo confirmado', { exact: false }).first().waitFor({ timeout: 20000 }).then(() => true, () => false)
  verificar('v2: Grupo confirmado otra vez y Luna confirmó la versión 2', v2)
  // #56: con más confirmaciones que el mínimo (el caso llega a 5 de mínimo 4) se dice "5 (mínimo 4)".
  const planLuna = await textoYEtiquetas(L)
  const imposiblesPlan = conteosImposibles(planLuna)
  const nuevoPlan = planLuna.match(/Confirmaron \d+ \(mínimo \d+\)/)?.[0]
  verificar('#56: el plan dice "Confirmaron N (mínimo M)" y no "N de M" con N mayor (texto y aria-label)',
    imposiblesPlan.length === 0 && !!nuevoPlan, imposiblesPlan.length ? imposiblesPlan.join(', ') : nuevoPlan ?? 'sin el texto nuevo')
  await captura(L, 'luna-v2-confirmado')
  verificar('Sin desborde horizontal a 375 px (Luna)', !(await L.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)))

  // 7. Navegador compartido (mejora #47): en el navegador de Tomi alguien abre el enlace como "Pepe".
  await T.goto(`${BASE}/#/unirse/${codigo}`)
  await T.getByRole('textbox').nth(1).fill('Pepe'); await tocar(T, 'Unirme')
  verificar('Navegador compartido: avisa en vez de entrar como Tomi',
    await esperarTexto(T, 'Este navegador ya está en este espacio como Tomi').then(() => true, () => false))
  await captura(T, 'compartido-aviso')
  await tocar(T, 'Entrar como otra persona')
  // Mejora #47 (arreglo 5204837): la sesión de Tomi no se revoca; queda guardada para volver a ella.
  verificar('Confirmación: la sesión de Tomi queda guardada en este navegador',
    await esperarTexto(T, 'queda guardada en este navegador').then(() => true, () => false))
  await tocar(T, 'Sí, entrar como Pepe')
  await T.getByRole('heading', { name: /^Los del (asado|finde)$/ }).waitFor({ timeout: 20000 })
  const cab = await T.locator('header').innerText()
  verificar('Entra como Pepe con sesión nueva, sin herramientas del organizador',
    /Pepe/.test(cab) && (await T.getByText('Herramientas del organizador').count()) === 0, cab.replace(/\s+/g, ' ').slice(0, 80))
  await T.getByText('Asado en casa de Tomi', { exact: false }).first().waitFor({ timeout: 15000 })
  // La tarjeta une el texto del servidor (siguiente_accion) y el conteo que arma la interfaz.
  const tarjeta = (await T.locator('.plan-vivo, .tarjeta-prop').first().innerText()).replace(/\s+/g, ' ')
  const imposiblesTarjeta = conteosImposibles(tarjeta)
  verificar('#56: la tarjeta dice "N confirmaron (mínimo M)" y no "N de M" con N mayor',
    imposiblesTarjeta.length === 0 && /\d+ confirmaron \(mínimo \d+\)/.test(tarjeta), imposiblesTarjeta.length ? imposiblesTarjeta.join(', ') : tarjeta)
  await captura(T, 'compartido-pepe')
  verificar('Sin desborde horizontal a 375 px (Pepe)', !(await T.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)))

  // 8. Vuelta (mejora #61): desde la portada, "Volver a esa sesión" devuelve a Tomi como organizador.
  await T.goto(`${BASE}/#/`)
  verificar('Portada: ofrece volver a la sesión de Tomi',
    await esperarTexto(T, 'Este navegador guarda otra sesión: Tomi').then(() => true, () => false))
  await captura(T, 'volver-a-esa-sesion')
  await tocar(T, 'Volver a esa sesión')
  // La pantalla se recarga con la sesión recuperada: el aviso desaparece porque ya no hay nada guardado.
  await T.getByText('Este navegador guarda otra sesión', { exact: false }).first().waitFor({ state: 'detached', timeout: 20000 }).catch(() => {})
  await T.goto(urlEspacio)
  await T.getByRole('heading', { name: /^Los del (asado|finde)$/ }).waitFor({ timeout: 20000 })
  const cabTomi = (await T.locator('header').innerText()).replace(/\s+/g, ' ')
  const herramientas = await T.getByText('Herramientas del organizador').first().waitFor({ timeout: 15000 }).then(() => true, () => false)
  verificar('Vuelve a ser Tomi, organizador, con sus herramientas', /Tomi/.test(cabTomi) && /organizador/.test(cabTomi) && herramientas, cabTomi.slice(0, 80))
  await T.goto(`${BASE}/#/`)
  await T.waitForTimeout(1500)
  verificar('Ya no queda otra sesión guardada', (await T.getByText('Este navegador guarda otra sesión', { exact: false }).count()) === 0)
  await captura(T, 'tomi-de-vuelta')
} catch (e) {
  fallidas++
  paso(`ERROR: ${String(e?.message ?? e).split('\n')[0]}`)
  await captura(T, 'error-tomi').catch(() => {}); await captura(L, 'error-luna').catch(() => {})
} finally {
  if (e13) verificar('E13: ninguna respuesta compartida nombra a quien se retiró ni muestra totales a Luna', fugasE13.length === 0, fugasE13.slice(0, 3).join(' | '))
  if (e15) verificar('E15: «prefiero» no aparece en ninguna respuesta compartida y Luna no ve planes_totales', fugasE15.length === 0, fugasE15.slice(0, 3).join(' | '))
  verificar('Sin errores de la app en consola', errores.length === 0, [...errores.slice(0, 3), ...respuestas.slice(0, 3)].join(' | '))
  await browser.close()
  console.log(`${fallidas === 0 ? 'RECORRIDO OK' : 'RECORRIDO CON FALLAS'}: ${aprobadas} aprobadas, ${fallidas} fallidas`)
  process.exitCode = fallidas === 0 ? 0 : 1
}
