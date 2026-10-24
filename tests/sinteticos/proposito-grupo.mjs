// Enmienda 14: «¿Para qué es este grupo?» (propósito, familias y quórum) con un grupo NUEVO, «Los del fútbol».
// El pedido de Nico: quien crea un grupo «para jugar fútbol» solo recibe propuestas de deporte, y si no hay gente
// para fútbol el agente propone algo parecido que sí alcance, sin explicar quién ni por qué.
//   Teo   — crea el grupo con propósito «Fútbol» y «¿Quién viene?» = «Solo el grupo»; propone; llama al agente UNA vez.
//   Lalo  — recibe el enlace: ¿ve para qué es el grupo? responde; carga preferencias.
//   Maca  — carga preferencias: ¿«Me gustaría» solo ofrece deporte?
//   Rufi  — el grupo tiene 4 personas: Teo, Lalo, Maca y Rufi (Rufi nunca abre el enlace: «por entrar»).
// Con 3 reales y 1 pendiente, `personas_posibles` = 3 y fútbol (mínimo 10) no alcanza: debe salir el texto de quórum.
//
//   node tests/sinteticos/proposito-grupo.mjs [url]        CRUXE_AGENTE=0 para no llamar al agente (cuesta por llamada).
import { Persona, lanzar, log, hallazgo, hallazgos, lecturas, guardarResultados, carpetaDeSalida } from './lib.mjs'
import { armarEscena, reintento } from './escena.mjs'
import { exigirBaseLibre } from './guardia.mjs'

exigirBaseLibre()

const BASE = (process.argv[2] || process.env.CRUXE_URL || 'https://cruce-senales.vercel.app').replace(/\/+$/, '')
const SALIDA = carpetaDeSalida(process.env.CRUXE_SALIDA || new URL('./salida', import.meta.url).pathname)
const GRUPO = 'Los del fútbol'
const TITULO = 'Fútbol del sábado'
const CON_AGENTE = process.env.CRUXE_AGENTE !== '0'
const t0 = Date.now()

const browser = await lanzar()
const E = armarEscena({ base: BASE, salida: SALIDA, grupo: GRUPO, titulo: TITULO })
const teo = await new Persona(browser, { nombre: 'Teo', perfil: 'crea el grupo «para jugar fútbol»', ancho: 375 }, SALIDA).abrir()
const lalo = await new Persona(browser, { nombre: 'Lalo', perfil: 'recibe el enlace', ancho: 320, alto: 640 }, SALIDA).abrir()
const maca = await new Persona(browser, { nombre: 'Maca', perfil: 'carga preferencias', ancho: 375 }, SALIDA).abrir()
const todos = [teo, lalo, maca]
const resumen = { grupo: GRUPO, comprobaciones: {} }
const C = resumen.comprobaciones
const tiene = (texto, re) => re.test(texto.replace(/\s+/g, ' '))
const DEPORTE = ['Fútbol', 'Pádel', 'Tenis', 'Básquet']

// Las preferencias de una persona: abre «Agente del círculo», anota qué actividades ofrece «Me gustaría», marca una.
async function cargarPreferencias(p, marcar) {
  await E.abrirPreferencias(p)
  const pant = await E.ver(p, `${p.nombre.toLowerCase()}-preferencias`)
  const chips = await p.page.locator('input[id^=pref-gusta-]').evaluateAll((els) =>
    els.map((e) => (e.closest('label')?.innerText ?? '').replace(/\s+/g, ' ').trim()))
  C[`${p.nombre}Actividades`] = chips
  await p.tocar(p.page.locator(`label[for^=pref-gusta-]`, { hasText: marcar }).first(), `Me gustaría: ${marcar}`)
  await p.tocarBoton('Guardar mis preferencias')
  await p.esperar('Guardado. Nadie más ve tus preferencias.', 20000)
  return { chips, texto: pant.texto }
}

try {
  // ── Teo crea el grupo con propósito ───────────────────────────────────────────────────────────────
  log('— Teo crea «Los del fútbol» con propósito Fútbol y «Solo el grupo»')
  await reintento(async () => {
    teo.inicio()
    await teo.page.goto(BASE)
    await teo.page.getByRole('heading', { level: 1 }).first().waitFor({ timeout: 30000 })
    await teo.page.waitForTimeout(3300)
    await teo.page.getByRole('textbox').first().fill('Teo')
    await teo.tocarBoton('Entrar')
    await teo.tocarEnlace('Crear un grupo', false)
    await teo.page.getByRole('heading', { name: 'Crear un grupo' }).waitFor({ timeout: 15000 })
    const campos = teo.page.locator('form input[type=text], form input:not([type])')
    await campos.nth(0).fill(GRUPO)
    const vacio = await E.ver(teo, 'crear-grupo-con-proposito-vacio')
    C.formularioPregunta = tiene(vacio.texto, /¿Para qué es este grupo\?/)
    C.formularioPreguntaQuienViene = tiene(vacio.texto, /¿Quién viene\?/)
    C.propositoPorDefectoLibre = tiene(vacio.texto, /Libre: cualquiera propone lo que quiera|Cualquiera del grupo puede proponer lo que quiera/)
    // Lista de integrantes pegada de una vez.
    await teo.page.getByLabel('Agregar a alguien del grupo').fill('Lalo, Maca, Rufi')
    await teo.tocarBoton('Agregar')
    // El selector nativo: un toque, aunque no sea un click de ratón.
    await teo.page.getByLabel('¿Para qué es este grupo?').selectOption({ label: 'Fútbol' })
    teo.toques++
    await teo.page.waitForTimeout(250)
    await teo.page.getByText('Solo el grupo', { exact: true }).first().click()
    teo.toques++
    const lleno = await E.ver(teo, 'crear-grupo-con-proposito-lleno')
    C.explicacionDelPropositoVisible = tiene(lleno.texto, /Las propuestas de este grupo serán de este tipo de plan \(deporte\)/)
    C.invitacionDiraQuienViene = tiene(lleno.texto, /En la invitación dirá/)
    await teo.tocarBoton('Crear grupo')
    await teo.page.getByRole('heading', { name: /Los del fútbol/ }).waitFor({ timeout: 30000 })
  })
  E.datos.codigo = (await teo.page.locator('.codigo').first().textContent())?.trim() ?? ''
  E.datos.espacioUrl = teo.page.url()
  E.datos.enlace = `${BASE}/#/unirse/${E.datos.codigo}`
  const espacio = await E.ver(teo, 'espacio-recien-creado')
  teo.fin('crear el grupo con propósito (nombres pegados, selector y «Solo el grupo»)')
  resumen.teoCrearGrupo = lecturas.at(-1)
  C.nombreDelGrupoConMarca = (await teo.page.getByRole('heading', { level: 1 }).first().innerText().catch(() => '')).replace(/\s+/g, ' ')
  C.espacioDicePropositoAlOrganizador = tiene(espacio.texto, /para jugar fútbol|Deporte|propósito/i)
  const href = await teo.page.locator('a[href^="https://wa.me"]').first().getAttribute('href').catch(() => null)
  const invitacion = href ? decodeURIComponent(href.replace(/^.*text=/, '')) : ''
  resumen.textoInvitacion = invitacion
  C.invitacionDicePropositoYRegla = /para jugar fútbol/i.test(invitacion) && /solo el grupo/i.test(invitacion)

  // ── Nueva propuesta: ¿qué atajos ofrece? ¿se puede salir del propósito? ───────────────────────────────
  log('— Teo: Nueva propuesta (atajos del grupo, fuera de propósito)')
  await teo.tocarEnlace('Crear propuesta', false)
  await teo.page.getByRole('heading', { name: 'Nueva propuesta' }).waitFor({ timeout: 15000 })
  const nueva = await E.ver(teo, 'nueva-propuesta-grupo-de-futbol')
  const atajos = await teo.page.locator('.chip-actividad').allInnerTexts()
  C.atajosOfrecidos = atajos.map((a) => a.replace(/\s+/g, ' ').trim())
  C.atajosSoloDeporte = C.atajosOfrecidos.length > 0 && C.atajosOfrecidos.every((a) => DEPORTE.some((d) => a.includes(d)))
  C.ofreceAsadoEnGrupoDeFutbol = C.atajosOfrecidos.some((a) => /Asado/.test(a))
  C.nuevaDiceNoPuedeFaltar = tiene(nueva.texto, /No puede faltar/) && !tiene(nueva.texto, /anfitri/i)
  if (C.ofreceAsadoEnGrupoDeFutbol) {
    await teo.tocarBoton('Asado')
    await teo.tocarBoton('Revisar antes de crear')
    await teo.tocarBoton('Crear y abrir al grupo')
    await teo.page.waitForTimeout(2500)
    const fuera = await E.ver(teo, 'asado-en-grupo-de-futbol')
    C.mensajeFueraDePropositoExacto = tiene(fuera.texto, /Este grupo se armó para otro tipo de plan\. Elige una actividad de ese tipo o crea un grupo en modo libre\./)
    C.noCreoPropuestaFuera = !/\/p\//.test(teo.page.url())
    if (!C.noCreoPropuestaFuera) hallazgo({ id: 'propuesta-fuera-de-proposito', persona: teo, gravedad: 'alta', destinatario: 'backend', titulo: 'Se creó una propuesta de asado en un grupo de fútbol', paso: 'Teo, Nueva propuesta con «Asado»', vio: teo.page.url(), esperaba: 'Rechazo con «Este grupo se armó para otro tipo de plan…».' })
    if (/\/p\//.test(teo.page.url())) await teo.page.goBack()
    else await teo.tocarBoton('Volver a editar').catch(() => {})
  }
  // Una actividad de la familia: pádel es deporte, no es el propósito puntual pero sí su familia.
  const atajoDeporte = teo.page.locator('.chip-actividad', { hasText: /Pádel|Tenis|Básquet/ }).first()
  if (await atajoDeporte.count()) await teo.tocar(atajoDeporte, 'atajo de deporte distinto del propósito')
  else await teo.tocarBoton('Fútbol')
  await teo.page.getByLabel('Propósito de la propuesta').fill(TITULO)
  await teo.tocarBoton('Revisar antes de crear')
  await teo.tocarBoton('Crear y abrir al grupo')
  await teo.page.getByRole('tab', { name: 'Plan' }).waitFor({ timeout: 30000 })
  await teo.page.waitForTimeout(1200)
  E.datos.propuestaUrl = teo.page.url()
  const plan = await E.ver(teo, 'propuesta-de-futbol-abierta')
  C.propuestaDeDeporteCreada = /\/p\//.test(E.datos.propuestaUrl)
  C.planMuestraLaActividad = tiene(plan.texto, /Pádel|Tenis|Básquet|Fútbol/)

  // ── Lalo: el enlace dice para qué es el grupo ─────────────────────────────────────────────────────
  log('— Lalo recibe el enlace')
  await reintento(async () => {
    lalo.inicio()
    await lalo.page.goto(E.datos.enlace)
    await lalo.page.getByRole('heading', { name: '¿Quién eres?' }).waitFor({ timeout: 25000 })
    const quien = await E.ver(lalo, 'enlace-quien-eres')
    C.quienEresDicePropositoYRegla = tiene(quien.texto, /Este grupo es para jugar fútbol/)
    C.quienEresNombreDelGrupo = (quien.texto.match(/en «([^»]+)»/)?.[1] ?? '')
    await lalo.tocar(lalo.page.getByRole('button', { name: 'Lalo', exact: true }), 'su nombre «Lalo»')
    await lalo.tocarBoton('Sí, soy Lalo')
    const destino = lalo.page.getByRole('heading', { name: /Los del fútbol/ }).or(lalo.page.getByRole('heading', { name: '¿Cuándo puedes?' }))
    await destino.first().waitFor({ timeout: 25000 })
    await lalo.page.waitForTimeout(1200)
    lalo.rapida = (await lalo.page.getByRole('heading', { name: '¿Cuándo puedes?' }).count()) > 0
    await E.ver(lalo, lalo.rapida ? 'responder-en-un-paso' : 'espacio-recien-entrado')
    await E.responder(lalo, 'Sí puedo', 'Sí puedo')
  })
  lalo.fin('del enlace a la respuesta guardada')
  resumen.laloResponder = lecturas.at(-1)

  // ── Preferencias: «Me interesa más X» dentro de la familia ────────────────────────────────────────
  log('— Preferencias de Lalo, Maca y Teo («Me gustaría» solo deporte)')
  const prefLalo = await cargarPreferencias(lalo, 'Pádel')
  await reintento(async () => {
    maca.inicio()
    await maca.page.goto(E.datos.enlace)
    await maca.page.getByRole('heading', { name: '¿Quién eres?' }).waitFor({ timeout: 25000 })
    await maca.tocar(maca.page.getByRole('button', { name: 'Maca', exact: true }), 'su nombre «Maca»')
    await maca.tocarBoton('Sí, soy Maca')
    await maca.page.getByRole('heading', { name: /Los del fútbol|¿Cuándo puedes\?/ }).first().waitFor({ timeout: 25000 })
  })
  await cargarPreferencias(maca, 'Tenis')
  await cargarPreferencias(teo, 'Fútbol')
  C.meGustariaSoloDeporte = [prefLalo.chips, C.MacaActividades, C.TeoActividades].every(
    (l) => Array.isArray(l) && l.length > 0 && l.every((a) => DEPORTE.some((d) => a.includes(d))))
  C.meGustariaLista = C.LaloActividades

  // ── El agente, una sola vez: 3 personas reales y fútbol pide 10 ───────────────────────────────────
  if (CON_AGENTE) {
    log('— Teo pide UNA propuesta al agente (4 personas, 1 pendiente: fútbol no alcanza)')
    await E.abrirPreferencias(teo)
    await teo.page.getByRole('button', { name: 'Que el agente proponga' }).scrollIntoViewIfNeeded()
    await teo.tocarBoton('Que el agente proponga')
    // Espera a que el agente TERMINE de pensar (los textos de «pensando» incluyen «opciones para el grupo»: no sirven de señal).
    await teo.page.getByText('El agente está pensando').first().waitFor({ timeout: 10000 }).catch(() => {})
    const resp = await teo.page.getByText('El agente está pensando').first().waitFor({ state: 'detached', timeout: 120000 }).then(() => true, () => false)
    await teo.page.waitForTimeout(1500)
    const ag = await E.ver(teo, 'agente-en-grupo-de-futbol')
    C.agenteRespondio = resp
    C.agenteDiceQuorum = tiene(ag.texto, /hacen falta al menos 10 personas/)
    C.agenteTextoQuorum = (ag.texto.match(/Para [A-ZÁÉÍÓÚa-záéíóú]+ hacen falta[^.]*\.[^.]*\./)?.[0] ?? '').replace(/\s+/g, ' ')
    C.agenteSoloDeporte = !tiene(ag.texto, /Asado|Cena|Cine|Bar\b|Cerro|Parque|Café/)
    C.agenteFaltanPersonas = tiene(ag.texto, /Todavía no hay suficientes personas/)
    resumen.agenteResumen = ag.texto.replace(/\s+/g, ' ').slice(0, 900)
  }
} catch (e) {
  log(`ERROR del guion: ${String(e?.message ?? e).split('\n')[0]}`)
  resumen.errorDelGuion = String(e?.message ?? e).split('\n').slice(0, 3).join(' | ')
  for (const p of todos) await p.captura('error-final').catch(() => {})
  process.exitCode = 1
} finally {
  for (const p of todos) resumen[p.nombre] = { ancho: p.ancho, toques: p.toques, pantallas: p.pantallas, errores: p.errores.slice(0, 5), respuestasMalas: p.respuestasMalas.slice(0, 5) }
  guardarResultados(SALIDA, { base: BASE, resumen, segundos: Math.round((Date.now() - t0) / 1000) })
  await browser.close()
  console.log(`\nSALIDA: ${SALIDA}`)
  console.log(`${hallazgos.length} hallazgos, ${Math.round((Date.now() - t0) / 1000)} s`)
  for (const l of lecturas) console.log(`  ${l.persona} (${l.ancho} px): ${l.que}: ${l.segundos} s, ${l.toques} toques`)
  console.log('  comprobaciones:', JSON.stringify(C))
}
