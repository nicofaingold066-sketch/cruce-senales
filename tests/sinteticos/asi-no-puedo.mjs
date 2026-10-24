// Enmienda 13: «Así no puedo, pero sigo». Gonza (y Joaco) opinan sobre la versión 1 sin bajarse, actualizan su
// disponibilidad, la organizadora rearma con lo nuevo, sale la versión 2 sin aceptaciones heredadas y nadie ve quién
// opinó. Grupo NUEVO, «Los del cerro». Si la interfaz todavía no tiene los botones («Así no puedo, pero sigo»,
// «Rearmar con lo nuevo»), hace esos dos pasos por RPC con la sesión que cada persona ya tiene en su navegador y lo
// anota como hallazgo para front-juan. Si la enmienda no está aplicada en la base (la RPC no existe), lo dice y sale.
//
//   node tests/sinteticos/asi-no-puedo.mjs [url]
import { randomUUID } from 'node:crypto'
import { Persona, lanzar, log, hallazgo, hallazgos, lecturas, guardarResultados, carpetaDeSalida } from './lib.mjs'
import { armarEscena, reintento, rpcComo } from './escena.mjs'
import { exigirBaseLibre } from './guardia.mjs'

exigirBaseLibre()

const BASE = (process.argv[2] || process.env.CRUXE_URL || 'https://cruce-senales.vercel.app').replace(/\/+$/, '')
const SALIDA = carpetaDeSalida(process.env.CRUXE_SALIDA || new URL('./salida', import.meta.url).pathname)
const GRUPO = 'Los del cerro'
const TITULO = 'Subida al cerro'
const t0 = Date.now()

const fugas = [
  // Nadie debe ver quién dijo «así no puedo» ni quién cambió su disponibilidad.
  { id: 'fuga-opinion', persona: 'Gonza', unaVez: true, destinatario: 'backend',
    re: /\b(Gonza|Joaco)\b.{0,60}(no pued[eo] así|opin|así no)|(no pued[eo]n? así|opin|así no).{0,60}\b(Gonza|Joaco)\b/i,
    titulo: 'Se ve quién dijo «así no puedo»', esperaba: 'Solo el total al organizador (y solo desde 2), nunca nombres.' },
]

const browser = await lanzar()
const E = armarEscena({ base: BASE, salida: SALIDA, grupo: GRUPO, titulo: TITULO, fugas })
const vale = await new Persona(browser, { nombre: 'Vale', perfil: 'organizadora', ancho: 375 }, SALIDA).abrir()
const joaco = await new Persona(browser, { nombre: 'Joaco', perfil: 'también opina', ancho: 320, alto: 640 }, SALIDA).abrir()
const renata = await new Persona(browser, { nombre: 'Renata', perfil: 'mira desde afuera', ancho: 375 }, SALIDA).abrir()
const gonza = await new Persona(browser, { nombre: 'Gonza', perfil: 'así no puedo, pero sigo', ancho: 375 }, SALIDA).abrir()
const todos = [vale, joaco, renata, gonza]
const resumen = { grupo: GRUPO, comprobaciones: {}, rpc: [] }
const C = resumen.comprobaciones
const tiene = (texto, re) => re.test(texto.replace(/\s+/g, ' '))

// Una RPC por respaldo, anotada. Devuelve el sobre; si la función no existe, marca la enmienda como no aplicada.
async function rpc(p, fn, args) {
  const r = await rpcComo(p, fn, args)
  resumen.rpc.push({ quien: p.nombre, fn, status: r.status, ok: r.data?.ok, error: r.data?.error ?? (r.status >= 400 ? r.data : undefined) })
  if (r.status === 404 && r.data?.code === 'PGRST202') return { noExiste: true }
  return r.data
}

// «Así no puedo, pero sigo»: por el botón si existe; si no, por RPC (y queda anotado).
async function opinar(p, version) {
  const boton = p.page.getByRole('button', { name: /Así no puedo/ })
  if (await boton.count()) {
    await p.tocar(boton.first(), '«Así no puedo, pero sigo»')
    await p.page.waitForTimeout(1500)
    const t = await E.ver(p, `${p.nombre.toLowerCase()}-asi-no-puedo`)
    C[`${p.nombre}OpinoPorBoton`] = true
    return { ok: true, texto: t.texto }
  }
  const r = await rpc(p, 'opinar_version', { p_propuesta_id: E.datos.propuestaId, p_version: version, p_opinion: 'asi_no_puedo', p_intento_id: randomUUID() })
  if (r.noExiste) return r
  hallazgo({ id: 'sin-boton-asi-no-puedo', persona: p, gravedad: 'alta', destinatario: 'front-juan',
    titulo: 'No hay botón «Así no puedo, pero sigo» en Mi respuesta', paso: `${p.nombre}, elegible en la versión ${version}, quiere decir que así no puede sin bajarse`,
    vio: 'Solo «Confirmar versión» y «Retirarme de esta propuesta».', esperaba: 'Enmienda 13 (a): el botón junto a confirmar; hoy se hizo por RPC.' })
  return r
}

try {
  log('— Vale crea «Los del cerro» y la propuesta (mínimo 3)')
  await reintento(() => E.crearGrupo(vale, { integrantes: ['Joaco', 'Renata', 'Gonza', 'Pili'], pegar: true }))
  await E.crearPropuesta(vale, { actividad: 'Paseo', minimoMas: 1 })
  await E.volverA(vale, E.datos.propuestaUrl, 'Mi respuesta')
  await E.guardarCondiciones(vale, 'Sí puedo', 'Sí puedo')

  log('— Joaco y Gonza pueden los dos días; Renata ninguno')
  for (const p of [joaco, gonza]) {
    await reintento(async () => { await E.entrarPorEnlace(p); await E.responder(p, 'Sí puedo', 'Sí puedo') })
    p.fin('del enlace a la respuesta guardada')
  }
  await reintento(async () => { await E.entrarPorEnlace(renata); await E.responder(renata, 'No puedo', 'No puedo') })

  log('— Vale busca la opción: versión 1 (sábado) con Vale, Joaco y Gonza; Vale confirma (1 de 3)')
  await E.volverA(vale, E.datos.propuestaUrl, 'Plan')
  await vale.tocarBoton('Buscar opción compatible')
  await vale.esperar('Confirmar versión 1', 30000)
  await E.confirmar(vale, 1)
  await E.ver(vale, 'vale-v1-confirmada-por-ella')

  // ── Gonza: «así no puedo, pero sigo» ───────────────────────────────────────────────────────────────
  log('— Gonza: así no puedo, pero sigo')
  await E.volverA(gonza, E.datos.propuestaUrl, 'Mi respuesta')
  const gonzaAntes = await E.ver(gonza, 'gonza-mi-respuesta-v1')
  C.gonzaTieneBotonAsiNoPuedo = tiene(gonzaAntes.texto, /Así no puedo/)
  const op = await opinar(gonza, 1)
  if (op.noExiste) {
    resumen.enmienda13 = 'NO APLICADA: la RPC opinar_version no existe todavía'
    log(`ENMIENDA 13 TODAVÍA NO APLICADA (opinar_version no existe). Queda armado; se repite cuando backend la aplique.`)
  } else {
    C.gonzaOpinionAceptada = op?.ok === true
    resumen.enmienda13 = 'aplicada'
    // Con la opinión vuelve a poder cambiar su disponibilidad: el sábado ya no, el domingo sí.
    await E.volverA(gonza, E.datos.propuestaUrl, 'Mi respuesta')
    const gonzaTras = await E.ver(gonza, 'gonza-mi-respuesta-tras-opinar')
    C.gonzaVeSuOpinion = tiene(gonzaTras.texto, /así no pued|Dijiste que así no/i)
    C.gonzaPuedeEditarCondiciones = !tiene(gonzaTras.texto, /tu disponibilidad no puede cambiar/)
    try {
      await E.guardarCondiciones(gonza, 'No puedo', null)
      C.gonzaCambioDisponibilidad = true
    } catch (e) {
      C.gonzaCambioDisponibilidad = false
      resumen.gonzaNoPudoCambiar = String(e.message).split('\n')[0]
    }
    await E.ver(gonza, 'gonza-disponibilidad-nueva')
    // ¿Sigue sin ser una baja?
    await E.volverA(gonza, E.datos.propuestaUrl, 'Plan')
    const gonzaPlan = await E.ver(gonza, 'gonza-plan-tras-opinar')
    C.gonzaNoFiguraComoBaja = !tiene(gonzaPlan.texto, /Gonza.{0,30}se bajó|Te retiraste/)

    // ── Joaco también (con 2 el organizador ve el total) ──────────────────────────────────────────────
    log('— Joaco también: así no puedo, pero sigo (con dos, el total le llega a Vale)')
    await E.volverA(joaco, E.datos.propuestaUrl, 'Mi respuesta')
    const opJ = await opinar(joaco, 1)
    C.joacoOpinionAceptada = opJ?.ok === true
    await E.volverA(joaco, E.datos.propuestaUrl, 'Mi respuesta')
    try { await E.guardarCondiciones(joaco, 'No puedo', null); C.joacoCambioDisponibilidad = true } catch { C.joacoCambioDisponibilidad = false }

    // Quien ya aceptó esa versión no puede opinar: primero se retira (regla (a)). Vale lo prueba por RPC.
    const yaAcepto = await rpc(vale, 'opinar_version', { p_propuesta_id: E.datos.propuestaId, p_version: 1, p_opinion: 'asi_no_puedo', p_intento_id: randomUUID() })
    C.quienAceptoNoPuedeOpinar = yaAcepto?.ok === false && yaAcepto?.error?.detalle === 'ya_acepto'
    resumen.respuestaYaAcepto = yaAcepto?.error ?? yaAcepto

    // ── Vale: ¿ve «Algunos no pueden así…» y «Rearmar con lo nuevo»? ─────────────────────────────────
    log('— Vale rearma con lo nuevo')
    await E.volverA(vale, E.datos.propuestaUrl, 'Plan')
    const valePlan = await E.ver(vale, 'vale-plan-con-opiniones')
    C.valeVeAlgunosNoPuedenAsi = tiene(valePlan.texto, /Algunos no pueden así/)
    C.valeVeTotalDeOpiniones = tiene(valePlan.texto, /2 .{0,20}(no pueden así|opin)/i) || C.valeVeAlgunosNoPuedenAsi
    C.valeVeNombresJuntoAOpinion = tiene(valePlan.texto, /(Gonza|Joaco).{0,40}(así|opin)/i)
    const rearmar = vale.page.getByRole('button', { name: /Rearmar/ })
    if (await rearmar.count()) {
      await vale.tocar(rearmar.first(), '«Rearmar con lo nuevo»')
      C.rearmoPorBoton = true
    } else {
      const r = await rpc(vale, 'propose_repair', { p_propuesta_id: E.datos.propuestaId, p_intento_id: randomUUID() })
      C.rearmoPorBoton = false
      C.rearmarAceptado = r?.ok === true
      resumen.respuestaRearmar = r?.ok ? r.resultado ?? r : r?.error ?? r
      hallazgo({ id: 'sin-boton-rearmar', persona: vale, gravedad: 'alta', destinatario: 'front-juan',
        titulo: 'No hay botón «Rearmar con lo nuevo» para la organizadora', paso: 'Vale, con dos «así no puedo» y la versión 1 sin llegar al mínimo',
        vio: valePlan.texto.match(/Próxima acción:\s*([^\n]+)/)?.[1] ?? '(sin próxima acción)', esperaba: 'Enmienda 13 (b): botón de rearmar desde «Esperando compromisos»; hoy se hizo por RPC.' })
    }
    await E.volverA(vale, E.datos.propuestaUrl, 'Plan')
    const v2 = await E.ver(vale, 'vale-version-2')
    C.hayVersion2 = tiene(v2.texto, /Versión 2/)
    C.v2EmpiezaDeCero = tiene(v2.texto, /Nadie confirmó todavía|empieza de cero/)
    C.v2EsDomingo = tiene(v2.texto, /Opción vigente · Versión 2.{0,80}Domingo/i) || /Sábado.{0,30}→.{0,30}Domingo/.test(v2.texto.replace(/\s+/g, ' '))
    C.v2NoHeredaOpiniones = !tiene(v2.texto, /Algunos no pueden así/)

    // ── Nadie ve quién ────────────────────────────────────────────────────────────────────────────────
    log('— Renata y Joaco miran: ¿se ve quién opinó?')
    await E.volverA(renata, E.datos.propuestaUrl, 'Plan')
    await E.ver(renata, 'renata-plan-v2')
    await renata.tocarPestana('Historial')
    const histR = await E.ver(renata, 'renata-historial')
    C.historialNombraOpiniones = tiene(histR.texto, /(Gonza|Joaco).{0,40}(opin|así no)/i)
    C.historialDiceQueSeRearmo = tiene(histR.texto, /versión 2/i)

    // ── Los tres confirman la versión 2: Gonza no quedó como baja ─────────────────────────────────────
    log('— Gonza, Joaco y Vale confirman la versión 2')
    await E.volverA(gonza, E.datos.propuestaUrl, 'Plan')
    try { await E.confirmar(gonza, 2); C.gonzaConfirmoV2 = true } catch (e) { C.gonzaConfirmoV2 = false; resumen.gonzaNoConfirmo = String(e.message).split('\n')[0] }
    await E.volverA(joaco, E.datos.propuestaUrl, 'Plan')
    try { await E.confirmar(joaco, 2); C.joacoConfirmoV2 = true } catch { C.joacoConfirmoV2 = false }
    await E.volverA(vale, E.datos.propuestaUrl, 'Plan')
    await E.confirmar(vale, 2)
    C.grupoConfirmadoV2 = await vale.hay('Grupo confirmado', 30000)
    await E.ver(vale, 'vale-grupo-confirmado-v2')
  }
} catch (e) {
  log(`ERROR del guion: ${String(e?.message ?? e).split('\n')[0]}`)
  resumen.errorDelGuion = String(e?.message ?? e).split('\n').slice(0, 3).join(' | ')
  for (const p of todos) await p.captura('error-final').catch(() => {})
  process.exitCode = 1
} finally {
  for (const p of todos) {
    resumen[p.nombre] = { ancho: p.ancho, toques: p.toques, pantallas: p.pantallas, errores: p.errores.slice(0, 5), respuestasMalas: p.respuestasMalas.slice(0, 5) }
  }
  guardarResultados(SALIDA, { base: BASE, resumen, segundos: Math.round((Date.now() - t0) / 1000) })
  await browser.close()
  console.log(`\nSALIDA: ${SALIDA}`)
  console.log(`enmienda 13: ${resumen.enmienda13 ?? '(no se llegó a probar)'}`)
  console.log(`${hallazgos.length} hallazgos, ${Math.round((Date.now() - t0) / 1000)} s`)
  for (const l of lecturas) console.log(`  ${l.persona} (${l.ancho} px): ${l.que}: ${l.segundos} s, ${l.toques} toques`)
  console.log('  comprobaciones:', JSON.stringify(C))
}
