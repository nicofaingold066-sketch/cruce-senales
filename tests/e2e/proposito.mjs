// Enmienda 14 (docs/contrato-enmienda-14.md): PROPÓSITO DEL GRUPO. Guion pedido por el coordinador (21:55), para correr
// de a uno y por turno apenas esté la migración 0048, de madrugada y otra vez a las 08:30.
//
//   node tests/e2e/proposito.mjs [url]      (URL: argumento, CRUXE_URL o producción; solo se usa para la invitación)
//
// Capa de servidor (RPC reales, dos identidades anónimas propias, datos ficticios):
//   · create_space sin propósito → libre/libre (cliente viejo intacto); con futbol → deporte; con deporte → deporte;
//     con cultura → cultura; con «sushi» → formato_invalido. get_space y preview_space_by_code traen proposito y familia.
//   · create_proposal en el grupo de fútbol: sin actividad → aceptada (ajuste 1 de la revisión); con asado → rechazada con
//     el mensaje exacto y SIN crear nada (un intento cuyo primer uso falló no queda guardado); con pádel → aceptada, con propuesta.actividad = {padel, Pádel, deporte}.
//     En un grupo libre: cualquier actividad vale; una clave inexistente → formato_invalido.
//   · Privacidad (ajuste 2): quien NO es del grupo no se entera del propósito por el error.
//   · El demo «Los del finde» sigue en modo libre.
//   · «Me gustaría» solo de la familia del grupo (0049): se informa como pendiente mientras no esté.
// Capa de pantalla: la invitación («¿Quién eres?») dice «para jugar fútbol» (friccion); pendiente mientras no esté.
// Códigos de salida: 0 todo lo exigible en verde (los PENDIENTE se listan), 1 hay fallas, 3 base ocupada, 4 la 0048 no está.
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'
import { baseLibre } from './base-libre.mjs'
baseLibre()
const RAIZ = fileURLToPath(new URL('../../', import.meta.url))
const require = createRequire(RAIZ + 'package.json')
const { createClient } = require('@supabase/supabase-js')
let pw
try { pw = require('playwright') } catch {
  pw = require(process.env.CRUXE_PLAYWRIGHT_DIR || '/Users/macair/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
}
const env = Object.fromEntries(readFileSync(RAIZ + '.env', 'utf8').split('\n').filter((l) => l.includes('='))
  .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]))
const BASE = (process.argv[2] || process.env.CRUXE_URL || 'https://cruce-senales.vercel.app').replace(/\/+$/, '')
const MENSAJE_FUERA = 'Este grupo se armó para otro tipo de plan. Elige una actividad de ese tipo o crea un grupo en modo libre.'
const hora = () => new Date().toLocaleTimeString('es-CL', { timeZone: 'America/Santiago', hour: '2-digit', minute: '2-digit', second: '2-digit' })
const paso = (t) => console.log(`[${hora()}] ${t}`)
let aprobadas = 0, fallidas = 0
const pendientes = []
const verificar = (nombre, cond, detalle = '') => {
  if (cond) aprobadas++; else fallidas++
  paso(`${cond ? 'OK ' : 'MAL'} ${nombre}${detalle ? ' → ' + detalle : ''}`)
}
const pendiente = (nombre, motivo) => { pendientes.push(nombre); paso(`PENDIENTE ${nombre} → ${motivo}`) }

const cliente = async () => {
  const c = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  const a = await c.auth.signInAnonymously(); if (a.error) throw a.error
  return c
}
// Devuelve el sobre tal cual (ok o error tipado). Un error de transporte (función inexistente, etc.) se devuelve aparte.
const rpc = async (c, fn, args) => {
  const r = await c.rpc(fn, args)
  if (r.error) return { transporte: r.error }
  return r.data
}
const f = (d) => new Date(Date.now() + d * 864e5).toISOString().slice(0, 10)
const propuesta = (espacioId, miembroId, extra = {}) => ({
  p_espacio_id: espacioId, p_titulo: 'Plan de prueba', p_minimo: 2, p_maximo: 4, p_imprescindible_id: miembroId,
  p_franjas: [{ inicio: f(6) + 'T14:00', fin: f(6) + 'T17:00' }, { inicio: f(7) + 'T14:00', fin: f(7) + 'T17:00' }],
  p_plazo: f(4) + 'T20:00', p_zona_horaria: 'America/Santiago', p_intento_id: randomUUID(), ...extra,
})
const creados = []   // propuestas propias, para cancelarlas al final

paso(`Propósito del grupo (enmienda 14) contra la base; invitación contra ${BASE}`)
let T, O
try {
  T = await cliente()
  // ¿Está la 0048? create_space de 5 parámetros.
  const sonda = await rpc(T, 'create_space', { p_nombre: 'Prueba propósito ' + Date.now().toString(36), p_tipo: 'amigos', p_nombre_visible: 'Orga', p_integrantes: ['Ana', 'Beto'], p_proposito: 'futbol' })
  if (sonda.transporte) {
    paso(`PENDIENTE 0048 no aplicada (create_space no acepta p_proposito: ${sonda.transporte.code ?? ''} ${String(sonda.transporte.message).slice(0, 90)})`)
    process.exit(4)
  }
  verificar('create_space con propósito «futbol» responde ok', sonda.ok === true, sonda.ok ? '' : `${sonda.error?.codigo}/${sonda.error?.detalle}`)
  const futbol = { id: sonda.resultado.espacio_id, codigo: sonda.resultado.codigo_invitacion, yo: sonda.resultado.miembro_id }
  const crear = async (extra, nombre = 'Prueba propósito ') => rpc(T, 'create_space', { p_nombre: nombre + Date.now().toString(36), p_tipo: 'amigos', p_nombre_visible: 'Orga', ...extra })
  const ver = async (c, id) => (await rpc(c, 'get_space', { p_espacio_id: id })).espacio

  // 1. Propósito y familia en get_space y preview_space_by_code.
  const gF = await ver(T, futbol.id)
  verificar('get_space: «futbol» → proposito futbol, familia deporte', gF?.proposito === 'futbol' && gF?.familia === 'deporte', `${gF?.proposito}/${gF?.familia}`)
  const pF = await rpc(T, 'preview_space_by_code', { p_codigo: futbol.codigo })
  verificar('preview_space_by_code trae proposito y familia (para «¿Quién eres?»)', pF?.espacio?.proposito === 'futbol' && pF?.espacio?.familia === 'deporte', `${pF?.espacio?.proposito}/${pF?.espacio?.familia}`)
  const viejo = await crear({})   // cliente viejo: sin p_proposito
  const gV = viejo.ok ? await ver(T, viejo.resultado.espacio_id) : null
  verificar('create_space SIN propósito (cliente viejo) → libre/libre', viejo.ok === true && gV?.proposito === 'libre' && gV?.familia === 'libre', `${gV?.proposito}/${gV?.familia}`)
  for (const [clave, familia] of [['deporte', 'deporte'], ['cultura', 'cultura'], ['comida', 'comida']]) {
    const r = await crear({ p_proposito: clave }); const g = r.ok ? await ver(T, r.resultado.espacio_id) : null
    verificar(`create_space «${clave}» → familia ${familia}`, r.ok === true && g?.proposito === clave && g?.familia === familia, `${g?.proposito}/${g?.familia}`)
  }
  const malo = await crear({ p_proposito: 'sushi' })
  verificar('create_space «sushi» → entrada_incompleta/formato_invalido', malo.ok === false && malo.error?.codigo === 'entrada_incompleta' && malo.error?.detalle === 'formato_invalido', `${malo.error?.codigo}/${malo.error?.detalle}`)
  const vacio = await crear({ p_proposito: '' }); const gVac = vacio.ok ? await ver(T, vacio.resultado.espacio_id) : null
  verificar('create_space con propósito vacío → se toma libre', vacio.ok === true && gVac?.proposito === 'libre', `${gVac?.proposito}`)

  // 2. Propuestas dentro del propósito.
  const antes = (await rpc(T, 'list_proposals', { p_espacio_id: futbol.id }))?.propuestas?.length ?? 0
  const sinAct = await rpc(T, 'create_proposal', propuesta(futbol.id, futbol.yo))
  if (sinAct.ok) creados.push(sinAct.resultado.propuesta_id)
  verificar('Grupo de fútbol: propuesta SIN actividad → aceptada (ajuste 1; actividad null)', sinAct.ok === true && (sinAct.propuesta?.actividad ?? null) === null,
    sinAct.ok ? 'actividad null' : `${sinAct.error?.codigo}/${sinAct.error?.detalle}: el contrato ajustado la acepta`)
  const asado = await rpc(T, 'create_proposal', propuesta(futbol.id, futbol.yo, { p_actividad: 'asado' }))
  verificar('Grupo de fútbol: «asado» → entrada_incompleta/fuera_de_proposito', asado.ok === false && asado.error?.codigo === 'entrada_incompleta' && asado.error?.detalle === 'fuera_de_proposito', `${asado.error?.codigo}/${asado.error?.detalle}`)
  verificar('El rechazo trae el mensaje exacto del contrato y no es reintentable', asado.error?.mensaje === MENSAJE_FUERA && asado.error?.reintentable === false, asado.error?.mensaje ?? '(sin mensaje)')
  const despues = (await rpc(T, 'list_proposals', { p_espacio_id: futbol.id }))?.propuestas?.length ?? 0
  verificar('El rechazo no crea ninguna propuesta', despues === antes + (sinAct.ok ? 1 : 0), `propuestas ${antes} → ${despues}`)
  const padel = await rpc(T, 'create_proposal', propuesta(futbol.id, futbol.yo, { p_actividad: 'padel', p_titulo: 'Pádel del sábado' }))
  if (padel.ok) creados.push(padel.resultado.propuesta_id)
  const act = padel.propuesta?.actividad
  verificar('Grupo de fútbol: «padel» → aceptada, con actividad {padel, Pádel, deporte}', padel.ok === true && act?.clave === 'padel' && act?.etiqueta === 'Pádel' && act?.familia === 'deporte', padel.ok ? JSON.stringify(act) : `${padel.error?.codigo}/${padel.error?.detalle}`)
  const mismoIntento = propuesta(futbol.id, futbol.yo, { p_actividad: 'tenis' })
  const t1 = await rpc(T, 'create_proposal', mismoIntento); if (t1.ok) creados.push(t1.resultado.propuesta_id)
  const t2 = await rpc(T, 'create_proposal', { ...mismoIntento, p_actividad: 'basquet' })
  verificar('Mismo p_intento_id con otra actividad → entrada_incompleta/intento_reutilizado', t1.ok === true && t2.ok === false && t2.error?.codigo === 'entrada_incompleta' && t2.error?.detalle === 'intento_reutilizado', `${t2.error?.codigo ?? 'ok'}/${t2.error?.detalle ?? ''}`)
  const lista = (await rpc(T, 'list_proposals', { p_espacio_id: futbol.id }))?.propuestas ?? []
  verificar('list_proposals trae la actividad de cada propuesta (aditivo)', lista.length > 0 && lista.every((p) => 'actividad' in p), `${lista.length} propuestas`)

  // Grupo libre: cualquier actividad; clave inexistente → formato_invalido.
  const L = viejo.ok ? { id: viejo.resultado.espacio_id, yo: viejo.resultado.miembro_id } : null
  if (L) {
    const l1 = await rpc(T, 'create_proposal', propuesta(L.id, L.yo, { p_actividad: 'asado' })); if (l1.ok) creados.push(l1.resultado.propuesta_id)
    const l2 = await rpc(T, 'create_proposal', propuesta(L.id, L.yo)); if (l2.ok) creados.push(l2.resultado.propuesta_id)
    const l3 = await rpc(T, 'create_proposal', propuesta(L.id, L.yo, { p_actividad: 'sushi' }))
    verificar('Grupo libre: con actividad y sin actividad se acepta (como hoy)', l1.ok === true && l2.ok === true, `${l1.ok}/${l2.ok}`)
    verificar('Actividad inexistente → entrada_incompleta/formato_invalido (en cualquier grupo)', l3.ok === false && l3.error?.detalle === 'formato_invalido', `${l3.error?.codigo}/${l3.error?.detalle}`)
  }

  // 3. Privacidad (ajuste 2): una sesión ajena no se entera del propósito por el tipo de error.
  O = await cliente()
  const ajeno = await rpc(O, 'create_proposal', propuesta(futbol.id, futbol.yo, { p_actividad: 'asado' }))
  verificar('Quien no es del grupo NO recibe fuera_de_proposito (no se filtra el propósito)', ajeno.ok === false && ajeno.error?.detalle !== 'fuera_de_proposito', `${ajeno.error?.codigo}/${ajeno.error?.detalle}`)
  const texto = JSON.stringify(ajeno)
  verificar('El error ajeno no menciona deporte, fútbol ni «otro tipo de plan»', !/deporte|f[úu]tbol|otro tipo de plan/i.test(texto))

  // 4. El demo sigue libre.
  const demo = await rpc(T, 'seed_demo_space', {})
  const gD = demo.ok ? await ver(T, demo.resultado.espacio_id) : null
  verificar('El demo «Los del finde» sigue en modo libre', demo.ok === true && gD?.proposito === 'libre' && gD?.familia === 'libre', `${gD?.proposito}/${gD?.familia}`)

  // 5. «Me gustaría» solo de la familia del grupo (0049).
  const prefs = await rpc(T, 'get_my_preferences', { p_espacio_id: futbol.id })
  const acts = (prefs?.opciones?.actividades ?? []).map((a) => a.clave ?? a)
  if (!prefs?.ok) pendiente('«Me gustaría» solo de la familia', `get_my_preferences: ${prefs?.error?.codigo ?? prefs?.transporte?.message}`)
  else if (acts.length >= 16) pendiente('«Me gustaría» solo de la familia (0049)', `el grupo de fútbol aún ofrece ${acts.length} actividades`)
  else verificar('«Me gustaría» en el grupo de fútbol ofrece solo deporte (futbol, padel, tenis, basquet)',
    ['futbol', 'padel', 'tenis', 'basquet'].every((c) => acts.includes(c)) && acts.length === 4, acts.join(', '))

  // 6. Pantalla: la invitación dice «para jugar fútbol» (friccion). Pendiente mientras no esté la frase.
  const browser = await pw.chromium.launch({ headless: true, executablePath: process.env.CRUXE_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' })
  try {
    const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true, locale: 'es-CL' })
    const p = await ctx.newPage()
    const errores = []
    p.on('pageerror', (e) => errores.push(e.message))
    await p.goto(`${BASE}/#/unirse/${futbol.codigo}`)
    await p.getByRole('button', { name: 'Ana', exact: true }).waitFor({ timeout: 25000 })
    const cuerpo = (await p.locator('main').innerText()).replace(/\s+/g, ' ')
    if (/para jugar f[úu]tbol/i.test(cuerpo)) verificar('«¿Quién eres?» dice «para jugar fútbol»', true)
    else pendiente('«¿Quién eres?» dice «para jugar fútbol»', `todavía no en ${BASE} (friccion/front-juan)`)
    verificar('Sin desborde horizontal a 375 px en la invitación', !(await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)))
    verificar('Sin errores de la app en la invitación', errores.length === 0, errores.slice(0, 2).join(' | '))
  } finally { await browser.close() }
} catch (e) {
  fallidas++
  paso(`ERROR: ${String(e?.message ?? e).split('\n')[0]}`)
} finally {
  // Limpieza de lo propio: las propuestas de prueba se cancelan; los grupos de prueba se dejan (no se borra nada).
  for (const id of creados) { try { await T?.rpc('cancel_proposal', { p_propuesta_id: id }) } catch { /* sigue */ } }
  console.log(`${fallidas === 0 ? 'PROPÓSITO OK' : 'PROPÓSITO CON FALLAS'}: ${aprobadas} aprobadas, ${fallidas} fallidas${pendientes.length ? `, ${pendientes.length} pendientes (${pendientes.join('; ')})` : ''}`)
  process.exitCode = fallidas === 0 ? 0 : 1
}
