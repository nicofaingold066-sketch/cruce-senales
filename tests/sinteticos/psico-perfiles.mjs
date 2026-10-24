// Perfiles de los estudios de psico (docs/psicologia-grupo.md) en un grupo NUEVO, «Los del reencuentro»:
//   Vale  — la que siempre organiza (crea el grupo pegando la lista, arma el plan, busca la opción, repara).
//   Dani  — el que se ofende si no van a su casa (busca dónde ofrecerla; mira qué dice el plan de «anfitrión»).
//   Ana   — la que no come carne, en un asado (busca dónde decirlo; nadie debe verlo).
//   Beto  — el que va con pareja a una juntada «solo el grupo» (la regla va en el título, D3; nadie pregunta por parejas).
//   Flor  — la que se baja por un mal momento (confirma y después «No voy»; qué le dice la app y qué ve el resto).
//   Pili  — la que nunca abre el enlace.
// Comprueba, por pantalla, que cada uno pueda expresarse sin exponerse y anota lo que NO se puede decir todavía.
//
//   node tests/sinteticos/psico-perfiles.mjs [url]     (misma salida y cuidados que seis-amigos.mjs)
import { Persona, lanzar, log, hallazgo, hallazgos, lecturas, guardarResultados, carpetaDeSalida } from './lib.mjs'
import { armarEscena, reintento } from './escena.mjs'
import { exigirBaseLibre } from './guardia.mjs'

exigirBaseLibre()

const BASE = (process.argv[2] || process.env.CRUXE_URL || 'https://cruce-senales.vercel.app').replace(/\/+$/, '')
const SALIDA = carpetaDeSalida(process.env.CRUXE_SALIDA || new URL('./salida', import.meta.url).pathname)
const GRUPO = 'Los del reencuentro'
// D3: la modalidad va en el título. Hoy la escribe la organizadora a mano (no hay selector).
const TITULO = 'Asado del reencuentro · solo el grupo'
const t0 = Date.now()

const fugas = [
  { id: 'fuga-ana-comida', persona: 'Ana', re: /\bAna\b.{0,60}(carne|vegetari|comida)|(carne|vegetari).{0,60}\bAna\b/, destinatario: 'backend' },
  { id: 'fuga-beto-pareja', persona: 'Beto', re: /\bBeto\b.{0,60}(pareja|novi|acompañ)|(pareja|novi|acompañ).{0,60}\bBeto\b/i, destinatario: 'backend' },
  { id: 'fuga-dani-casa', persona: 'Dani', re: /casa de Dani|\bDani\b.{0,30}\bcasa\b/i, destinatario: 'front-juan' },
  { id: 'baja-con-nombre', persona: 'Flor', unaVez: true, gravedad: 'media', destinatario: 'backend',
    re: /\bFlor\b.{0,40}se bajó|se bajó.{0,40}\bFlor\b|\bFlor\b.{0,60}había confirmado/,
    titulo: 'La baja de Flor se ve con nombre (y «había confirmado») en el teléfono de los demás',
    esperaba: 'Enmienda 13 (c): «Una persona se retiró», sin nombre, motivo ni si había confirmado.' },
]

const browser = await lanzar()
const E = armarEscena({ base: BASE, salida: SALIDA, grupo: GRUPO, titulo: TITULO, fugas })
const vale = await new Persona(browser, { nombre: 'Vale', perfil: 'siempre organiza', ancho: 375 }, SALIDA).abrir()
const dani = await new Persona(browser, { nombre: 'Dani', perfil: 'se ofende si no van a su casa', ancho: 375 }, SALIDA).abrir()
const ana = await new Persona(browser, { nombre: 'Ana', perfil: 'no come carne', ancho: 375 }, SALIDA).abrir()
const beto = await new Persona(browser, { nombre: 'Beto', perfil: 'va con pareja a «solo el grupo»', ancho: 320, alto: 640 }, SALIDA).abrir()
const flor = await new Persona(browser, { nombre: 'Flor', perfil: 'se baja por un mal momento', ancho: 375 }, SALIDA).abrir()
const todos = [vale, dani, ana, beto, flor]
const resumen = { grupo: GRUPO, titulo: TITULO, comprobaciones: {} }
const C = resumen.comprobaciones
const tiene = (texto, re) => re.test(texto.replace(/\s+/g, ' '))

try {
  // ── Vale: crear el grupo pegando la lista (friccion) ────────────────────────────────────────────────
  log('— Vale (siempre organiza): crea el grupo pegando la lista')
  await reintento(() => E.crearGrupo(vale, { integrantes: ['Dani', 'Ana', 'Beto', 'Flor', 'Pili'], pegar: true }))
  const crear = (await vale.page.locator('body').innerText().catch(() => '')) // ya en el espacio; el texto del formulario quedó en textos.md
  C.listaPegadaDeUnaVez = (await vale.page.getByText('Dani', { exact: true }).count()) > 0 && (await vale.page.getByText('Pili', { exact: true }).count()) > 0
  resumen.valeCrearGrupo = lecturas.at(-1)

  // ── Vale: la propuesta. ¿Hay «¿Dónde se juntan?», modalidad, «gana la A»? ─────────────────────────
  log('— Vale: crea la propuesta («solo el grupo» en el título, a mano)')
  const prop = await E.crearPropuesta(vale, { actividad: 'Asado', minimoMas: 1 })
  C.ayudaDondeSeJuntan = tiene(prop.textoFormulario, /D[oó]nde se juntan|lugar neutro|por turnos/i)
  C.selectorModalidad = tiene(prop.textoFormulario, /Solo el grupo|Con parejas|Abierta/)
  C.diceGanaLaA = tiene(prop.textoFormulario, /gana la A/)
  C.textoNoPuedeFaltar = tiene(prop.textoFormulario, /No puede faltar/)
  C.anfitrionEnFormulario = tiene(prop.textoFormulario, /anfitri/i)
  C.valeVeTuArmasElPlan = tiene(prop.textoPlan, /Tú armas el plan/)
  C.valeVePrimeroTuDisponibilidad = tiene(prop.textoPlan, /Primero marca tu disponibilidad/)
  resumen.valeCrearPropuesta = prop.toques
  // La invitación de WhatsApp (href de wa.me del espacio): ¿repite la regla «solo el grupo»?
  await vale.page.goto(E.datos.espacioUrl)
  await vale.page.getByRole('heading', { name: GRUPO }).waitFor({ timeout: 20000 })
  const href = await vale.page.locator('a[href^="https://wa.me"]').first().getAttribute('href').catch(() => null)
  const invitacion = href ? decodeURIComponent(href.replace(/^.*text=/, '')) : ''
  C.invitacionRepiteSoloElGrupo = /solo el grupo/i.test(invitacion)
  resumen.textoInvitacion = invitacion
  C.hayRecordarAQuienFalta = (await vale.page.getByText(/Recordar a quien falta|Avisar al grupo/).count()) > 0

  // Vale responde (es quien no puede faltar).
  await E.volverA(vale, E.datos.propuestaUrl, 'Mi respuesta')
  await E.guardarCondiciones(vale, 'Sí puedo', 'Sí puedo')

  // ── Dani: casa ─────────────────────────────────────────────────────────────────────────────────────
  log('— Dani (quiere que sea en su casa)')
  await reintento(async () => { await E.entrarPorEnlace(dani); await E.responder(dani, 'Sí puedo', 'Sí puedo') })
  dani.fin('del enlace a la respuesta guardada')
  await E.irAlPlan(dani)
  const daniPlan = await E.ver(dani, 'dani-ficha-del-plan')
  C.daniVeAnfitrion = tiene(daniPlan.texto, /anfitri/i)
  C.daniVeCasaDeAlguien = tiene(daniPlan.texto, /casa de \w+/i)
  // ¿Dónde ofrece su casa? En las preferencias no hay nada de eso: solo «Lugar: da igual / bajo techo».
  await E.abrirPreferencias(dani)
  const daniPref = await E.ver(dani, 'dani-preferencias')
  C.daniPuedeOfrecerCasa = tiene(daniPref.texto, /recibir en mi casa|mi casa|ofrecer/i)
  C.preferenciasMencionanLugar = tiene(daniPref.texto, /Prefiero bajo techo/)

  // ── Ana: comida ────────────────────────────────────────────────────────────────────────────────────
  log('— Ana (no come carne, en un asado)')
  await reintento(async () => { await E.entrarPorEnlace(ana); await E.responder(ana, 'Sí puedo', 'Sí puedo') })
  ana.fin('del enlace a la respuesta guardada')
  await E.abrirPreferencias(ana)
  const anaPref = await E.ver(ana, 'ana-preferencias')
  C.anaPuedeDecirSinCarne = tiene(anaPref.texto, /sin carne|vegetari|comida|restricci/i)
  C.ordenMeGustaria = (anaPref.texto.match(/Me gustaría\s+([\s\S]{0,80})/)?.[1] ?? '').replace(/\s+/g, ' ').trim().slice(0, 60)
  await E.irAlPlan(ana)
  const anaPlan = await E.ver(ana, 'ana-ficha-del-plan')
  C.planDiceOpcionSinCarne = tiene(anaPlan.texto, /opci[oó]n sin carne/i)

  // ── Beto: pareja, «solo el grupo» (320 px) ─────────────────────────────────────────────────────────
  log('— Beto (va con pareja; la juntada es «solo el grupo»)')
  const betoEntrada = await reintento(() => E.entrarPorEnlace(beto))
  C.betoVeSoloElGrupoAlResponder = tiene(betoEntrada.texto, /solo el grupo/i)
  await E.responder(beto, 'Sí puedo', 'Sí puedo')
  beto.fin('del enlace a la respuesta guardada')
  await E.irAlPlan(beto)
  const betoPlan = await E.ver(beto, 'beto-ficha-del-plan')
  C.betoVeSoloElGrupoEnElPlan = tiene(betoPlan.texto, /solo el grupo/i)
  C.betoPuedeDecirVengoConAlguien = tiene(betoPlan.texto, /acompañante|traer a alguien|\+1/i)
  // El organizador anotó «solo el grupo» a mano: ¿el plan lo explica como regla de la ocasión o queda como parte del título?
  C.soloElGrupoSoloEnElTitulo = C.betoVeSoloElGrupoEnElPlan && !tiene(betoPlan.texto, /Esta vez es solo el grupo/)

  // ── Flor: mal momento ──────────────────────────────────────────────────────────────────────────────
  log('— Flor (después se baja)')
  await reintento(async () => { await E.entrarPorEnlace(flor); await E.responder(flor, 'Sí puedo', 'Sí puedo') })
  flor.fin('del enlace a la respuesta guardada')

  // ── Vale busca la opción; confirman Flor, Dani y Vale → grupo confirmado ──────────────────────────
  log('— Vale busca la opción (Pili nunca abrió el enlace)')
  await E.volverA(vale, E.datos.propuestaUrl, 'Plan')
  await vale.tocarBoton('Buscar opción compatible')
  await vale.esperar('Confirmar versión 1', 30000)
  const valeV1 = await E.ver(vale, 'vale-opcion-v1')
  C.valeVeSoloValeSiLlegan = tiene(valeV1.texto, /solo vale si llegan/i)
  C.valeVeHoyConvieneRecordar = tiene(valeV1.texto, /Hoy conviene recordar/)

  log('— Flor y Dani confirman; Vale cierra el mínimo')
  await E.volverA(flor, E.datos.propuestaUrl, 'Plan')
  const florV1 = await E.ver(flor, 'flor-plan-v1')
  C.florVeSoloValeSiLlegan = tiene(florV1.texto, /solo vale si llegan/i)
  await E.confirmar(flor, 1)
  await E.volverA(dani, E.datos.propuestaUrl, 'Plan')
  await E.confirmar(dani, 1)
  await E.volverA(vale, E.datos.propuestaUrl, 'Plan')
  await E.confirmar(vale, 1)
  await vale.esperar('Grupo confirmado', 30000)
  const valeOk = await E.ver(vale, 'vale-grupo-confirmado')
  C.valeVeGraciasPorMoverlo = tiene(valeOk.texto, /Gracias por moverlo/)

  // ── Flor se baja: qué le dice la app, qué ve el resto ─────────────────────────────────────────────
  log('— Flor se baja')
  await E.volverA(flor, E.datos.propuestaUrl, 'Plan')
  await E.bajarse(flor)
  const florBaja = await E.ver(flor, 'flor-se-bajo')
  C.florVeGraciasPorAvisar = tiene(florBaja.texto, /Gracias por avisar/)
  C.florVeTeRetiraste = tiene(florBaja.texto, /Te retiraste/)
  await E.irAlPlan(flor)
  await E.ver(flor, 'flor-plan-tras-la-baja')

  log('— Los demás ven la baja')
  for (const p of [vale, dani, ana, beto]) {
    await E.volverA(p, E.datos.propuestaUrl, 'Plan')
    await E.ver(p, 'plan-tras-la-baja-de-flor')
  }
  await vale.tocarPestana('Historial')
  const hist = await E.ver(vale, 'vale-historial')
  C.historialNombraLaBaja = tiene(hist.texto, /\bFlor\b.{0,30}se bajó/)
  await vale.tocarPestana('Plan')
  C.valeVeCambioElPlan = tiene((await vale.main()), /Cambió el plan/)

  log('— Vale busca alternativa')
  await vale.tocarBoton('Buscar alternativa')
  await vale.page.waitForTimeout(2500)
  const rep = await E.ver(vale, 'vale-despues-de-buscar-alternativa')
  C.hayVersion2 = tiene(rep.texto, /versión 2/i)
  C.comparacionMismaFecha = /(\S+ \d+ \w+ \d+:\d+) → \1/.test(rep.texto.replace(/\s+/g, ' '))
  for (const p of [beto]) {
    await E.volverA(p, E.datos.propuestaUrl, 'Plan')
    await E.ver(p, 'beto-plan-v2')
  }
  await vale.page.goto(E.datos.espacioUrl)
  await vale.page.getByRole('heading', { name: GRUPO }).waitFor({ timeout: 20000 })
  const fin = await E.ver(vale, 'vale-espacio-al-final')
  C.piliSiguePorEntrar = /Pili[\s\S]{0,40}por entrar/.test(fin.texto)
} catch (e) {
  log(`ERROR del guion: ${String(e?.message ?? e).split('\n')[0]}`)
  resumen.errorDelGuion = String(e?.message ?? e).split('\n').slice(0, 3).join(' | ')
  for (const p of todos) await p.captura('error-final').catch(() => {})
  process.exitCode = 1
} finally {
  for (const p of todos) {
    resumen[p.nombre] = { ancho: p.ancho, toques: p.toques, pantallas: p.pantallas, errores: p.errores.slice(0, 5), respuestasMalas: p.respuestasMalas.slice(0, 5) }
    if (p.errores.length || p.respuestasMalas.length) {
      hallazgo({ id: `consola-${p.nombre}`, persona: p, gravedad: 'media', destinatario: 'friccion',
        titulo: `${p.nombre} ve errores en la consola o pedidos fallidos`, paso: 'durante todo el recorrido',
        vio: [...p.errores.slice(0, 3), ...p.respuestasMalas.slice(0, 3)].join(' | '), esperaba: 'Ninguno.' })
    }
  }
  guardarResultados(SALIDA, { base: BASE, resumen, segundos: Math.round((Date.now() - t0) / 1000) })
  await browser.close()
  console.log(`\nSALIDA: ${SALIDA}`)
  console.log(`${hallazgos.length} hallazgos, ${Math.round((Date.now() - t0) / 1000)} s`)
  for (const l of lecturas) console.log(`  ${l.persona} (${l.ancho} px): ${l.que}: ${l.segundos} s, ${l.toques} toques`)
  console.log('  comprobaciones:', JSON.stringify(C))
}
