// Seis amigos ficticios usan CRUXE como lo haría gente real, en un GRUPO NUEVO (nunca el demo "Los del asado").
//
//   node tests/sinteticos/seis-amigos.mjs [url]
//
// URL: argumento, o CRUXE_URL, o producción (https://cruce-senales.vercel.app). Contra un build propio:
//   npx vite build && npx vite preview --port 4186 &   node tests/sinteticos/seis-amigos.mjs http://localhost:4186
// Salida: CRUXE_SALIDA=<carpeta> (por defecto tests/sinteticos/salida/<sello>/): capturas, textos de cada pantalla
// (textos.md) y resultados.json. Los perfiles están en docs/usuarios-sinteticos.md.
//
// No es una prueba de aprobado/reprobado: cuenta toques, pantallas y segundos por persona y anota hallazgos
// (dónde se traban, qué texto confunde, qué responden mal). Sale con código 0 salvo que el guion mismo se rompa.
// Cuidados: grupo propio nuevo cada vez, sin tocar el demo; no llama al modelo; no borra nada.
import { appendFileSync, writeFileSync } from 'node:fs'
import { Persona, lanzar, log, hallazgo, hallazgos, lecturas, guardarResultados, carpetaDeSalida } from './lib.mjs'
import { revisarTextos } from './revisar.mjs'
import { exigirBaseLibre } from './guardia.mjs'

exigirBaseLibre() // no corre si backend dice MIGRACION EN CURSO

const BASE = (process.argv[2] || process.env.CRUXE_URL || 'https://cruce-senales.vercel.app').replace(/\/+$/, '')
const SALIDA = carpetaDeSalida(process.env.CRUXE_SALIDA || new URL('./salida', import.meta.url).pathname)
const TEXTOS = `${SALIDA}/textos.md`
writeFileSync(TEXTOS, `# Textos que vio cada persona (${BASE})\n`)

const NOMBRES = { vale: 'Vale', joaco: 'Joaco', renata: 'Renata', bruno: 'Bruno', gonza: 'Gonza', pili: 'Pili' }
const t0 = Date.now()
const reintento = async (f, veces = 3) => {
  // Un fallo de tiempo (57014) o de red se reintenta solo.
  let ultimo
  for (let i = 0; i < veces; i++) {
    try { return await f() } catch (e) { ultimo = e; log(`  (reintento ${i + 1}: ${String(e.message).split('\n')[0].slice(0, 100)})`) }
  }
  throw ultimo
}

// Anota lo que la persona ve en esta pantalla (para el informe) y revisa los textos sospechosos.
async function ver(p, donde, { capturar = true } = {}) {
  await p.mirar()
  const texto = await p.main()
  appendFileSync(TEXTOS, `\n## ${p.nombre} (${p.ancho} px): ${donde}\n\`\`\`\n${texto.trim()}\n\`\`\`\n`)
  const captura = capturar ? await p.captura(donde.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)) : undefined
  const cabecera = await p.page.locator('header').first().innerText().catch(() => '')
  revisarTextos(p, donde, `${cabecera}\n${texto}`, captura)
  // Privacidad: lo de Bruno (poca plata, bajo techo, que lo lleven, franja incompleta) no debe verse en el teléfono de otro.
  if (p.nombre !== 'Bruno') {
    const plano = texto.replace(/\s+/g, ' ')
    const fuga = plano.match(/Bruno.{0,60}(gratis|barato|techo|llev|incomplet|plata)|(gratis|barato|techo|incomplet|plata).{0,60}Bruno/i)
    if (fuga) {
      hallazgo({ id: `fuga-bruno-${p.nombre}-${donde}`, persona: p, gravedad: 'alta', destinatario: 'backend',
        titulo: `Se ve algo privado de Bruno en el teléfono de ${p.nombre}`, paso: `${p.nombre} en «${donde}»`, vio: `«${fuga[0]}»`, esperaba: 'Nada de las condiciones ni preferencias de otra persona.', captura })
    }
  }
  const sobra = await p.desborde()
  if (sobra > 0) {
    hallazgo({ id: `desborde-${p.ancho}-${donde}`, persona: p, gravedad: 'media', destinatario: 'front-juan',
      titulo: `Desborde horizontal a ${p.ancho} px en «${donde}»`, paso: donde, vio: `La página es ${sobra} px más ancha que la pantalla.`, esperaba: 'Nada que obligue a deslizar de costado.', captura })
  }
  return { texto, captura }
}

const browser = await lanzar()
const vale = await new Persona(browser, { nombre: NOMBRES.vale, perfil: 'organizadora', ancho: 375 }, SALIDA).abrir()
const joaco = await new Persona(browser, { nombre: NOMBRES.joaco, perfil: 'apurado', ancho: 320, alto: 640 }, SALIDA).abrir()
const renata = await new Persona(browser, { nombre: NOMBRES.renata, perfil: 'sin franja', ancho: 375 }, SALIDA).abrir()
const bruno = await new Persona(browser, { nombre: NOMBRES.bruno, perfil: 'con condiciones', ancho: 375 }, SALIDA).abrir()
const gonza = await new Persona(browser, { nombre: NOMBRES.gonza, perfil: 'interesado que se baja', ancho: 375 }, SALIDA).abrir()
// Pili nunca abre el enlace: no tiene navegador.
const todos = [vale, joaco, renata, bruno, gonza]

let enlace = '', codigo = ''
const resumen = { grupo: 'Los de la facu', pasos: {} }

// Una persona entra por el enlace, elige su nombre en "¿Quién eres?" y llega al espacio. Devuelve lo que vio.
async function entrarPorEnlace(p, nombre) {
  p.inicio()
  await p.page.goto(enlace)
  await p.mirar()
  await p.page.getByRole('heading', { name: '¿Quién eres?' }).waitFor({ timeout: 25000 })
  await ver(p, 'enlace-quien-eres')
  await p.tocar(p.page.getByRole('button', { name: nombre, exact: true }), `su nombre «${nombre}»`)
  await ver(p, 'eres-tu')
  await p.tocarBoton(`Sí, soy ${nombre}`)
  // Con #88 (friccion) el enlace lleva directo a «¿Cuándo puedes?»; sin él, al espacio.
  const destino = p.page.getByRole('heading', { name: 'Los de la facu' }).or(p.page.getByRole('heading', { name: '¿Cuándo puedes?' }))
  await destino.first().waitFor({ timeout: 25000 })
  await p.page.waitForTimeout(1200)
  p.rapida = await p.page.getByRole('heading', { name: '¿Cuándo puedes?' }).count() > 0
  return ver(p, p.rapida ? 'responder-en-un-paso' : 'espacio-recien-entrado')
}

// Responde las dos franjas por el camino que ofrezca la app: «¿Cuándo puedes?» (un toque) o plan → Mi respuesta.
// a, b: 'Sí puedo' | 'No puedo' | null (null = no sabe: en un toque va a «Todavía no sé», y en el plan deja «Pendiente»).
async function responder(p, a, b) {
  if (p.rapida && a && b) {
    const nombre = a === 'Sí puedo' && b === 'Sí puedo' ? /^Puedo (en )?los dos/
      : a === 'No puedo' && b === 'No puedo' ? /^No puedo (ninguno|en ninguno)/
      : a === 'Sí puedo' ? /^Solo (el |de )/ : /^Solo (el |de )/
    const opciones = p.page.getByRole('button', { name: nombre })
    await p.tocar(a === 'No puedo' && b === 'Sí puedo' ? opciones.nth(1) : opciones.first(), `respuesta de un toque (${a} / ${b})`)
    await p.esperar('Respuesta guardada', 20000)
    return
  }
  if (p.rapida) {
    await p.tocar(p.page.getByRole('link', { name: 'Todavía no sé: ver el plan' }), '«Todavía no sé: ver el plan»')
    await p.page.getByRole('tab', { name: 'Mi respuesta' }).waitFor({ timeout: 20000 })
    await ver(p, 'plan-desde-todavia-no-se')
    await p.tocarPestana('Mi respuesta')
  } else {
    await irAMiRespuesta(p)
  }
  await guardarCondiciones(p, a, b)
}

// Del espacio a "Mi respuesta" de la propuesta abierta.
async function irAMiRespuesta(p) {
  await p.page.getByText('Cena de egresados', { exact: false }).first().waitFor({ timeout: 20000 }).catch(() => {})
  await p.tocar(p.page.locator('a.plan-vivo, a.tarjeta-prop').first(), 'la tarjeta del plan')
  await p.page.getByRole('tab', { name: 'Mi respuesta' }).waitFor({ timeout: 20000 })
  await ver(p, 'plan-vista-general')
  await p.tocarPestana('Mi respuesta')
  return ver(p, 'mi-respuesta-vacia')
}

// Vuelve a la propuesta como lo haría quien reabre la app: recarga de verdad (ir a la misma URL con # no recarga) y abre una pestaña.
async function volverA(p, url, pestana = 'Plan') {
  await p.page.goto(url)
  await p.page.reload()
  await p.page.getByRole('tab', { name: pestana }).waitFor({ timeout: 25000 })
  await p.page.waitForTimeout(800)
  await p.tocarPestana(pestana)
}

const franja = (p, clave, valor) => p.page.locator('fieldset', { hasText: `Franja ${clave}` }).getByText(valor, { exact: true })
async function guardarCondiciones(p, a, b) {
  if (a) await p.tocar(franja(p, 'A', a), `Franja A: ${a}`)
  if (b) await p.tocar(franja(p, 'B', b), `Franja B: ${b}`)
  await p.tocarBoton('Guardar condiciones')
  await p.esperar('Guardado. Solo tú ves estas condiciones.', 20000)
}

try {
  // ───────────────────────── 1. Vale crea el grupo y manda el enlace ─────────────────────────
  log('— Vale (organizadora): crea el grupo con los nombres')
  await reintento(async () => {
    vale.inicio()
    await vale.page.goto(BASE)
    await vale.page.getByRole('heading', { level: 1 }).first().waitFor({ timeout: 30000 })
    await vale.page.waitForTimeout(3300) // la entrada animada de 2,9 s
    await ver(vale, 'portada-primera-vez')
    await vale.page.getByRole('textbox').first().fill('Vale')
    await vale.tocarBoton('Entrar')
    await ver(vale, 'portada-con-nombre')
    await vale.tocarEnlace('Crear un grupo', false)
    await vale.page.getByRole('heading', { name: 'Crear un grupo' }).waitFor({ timeout: 15000 })
    await ver(vale, 'crear-grupo-vacio')
    const campos = vale.page.locator('form input')
    await campos.nth(0).fill('Los de la facu')
    // El nombre de Vale ya viene precargado de la portada: no se escribe de nuevo.
    const precargado = await campos.nth(1).inputValue()
    resumen.nombrePrecargadoEnCrear = precargado
    if (!precargado) await campos.nth(1).fill('Vale')
    for (const n of ['Joaco', 'Renata', 'Bruno', 'Gonza', 'Pili']) {
      await campos.nth(2).fill(n)
      await vale.tocarBoton('Agregar')
    }
    await ver(vale, 'crear-grupo-lleno')
    await vale.tocarBoton('Crear grupo')
    await vale.page.getByRole('heading', { name: 'Los de la facu' }).waitFor({ timeout: 30000 })
  })
  codigo = (await vale.page.locator('.codigo').first().textContent())?.trim() ?? ''
  const espacioUrl = vale.page.url()
  // El enlace que mandaría por WhatsApp (el mismo que arma la interfaz).
  enlace = `${BASE}/#/unirse/${codigo}`
  await ver(vale, 'espacio-recien-creado')
  vale.fin('crear el grupo con 5 nombres')
  resumen.pasos.crearGrupo = { toques: vale.toques, pantallas: vale.pantallas.length }

  // Vale crea y abre la propuesta (una cena para el finde de la semana que viene). Mínimo 3.
  log('— Vale: crea y abre la propuesta')
  const tProp = vale.toques
  await vale.tocarEnlace('Crear propuesta', false)
  await vale.esperarNuevoPlan()
  await ver(vale, 'nueva-propuesta-vacia')
  await vale.atajo('Cena')
  await vale.page.getByLabel('Propósito de la propuesta').fill('Cena de egresados')
  await vale.tocar(vale.page.getByLabel('Sumar uno al mínimo'), 'mínimo +1')
  await vale.revisarYCrear(() => ver(vale, 'nueva-propuesta-revisar'))
  await vale.page.getByRole('tab', { name: 'Plan' }).waitFor({ timeout: 30000 })
  await vale.page.waitForTimeout(1200)
  await ver(vale, 'propuesta-abierta')
  resumen.pasos.crearPropuesta = { toques: vale.toques - tProp }
  const propuestaUrl = vale.page.url()

  // Vale responde ella misma (es la imprescindible): interés y las dos franjas.
  log('— Vale: responde')
  await vale.tocarPestana('Mi respuesta')
  await ver(vale, 'vale-mi-respuesta')
  await vale.tocarBoton('Me interesa')
  await guardarCondiciones(vale, 'Sí puedo', 'Sí puedo')
  await ver(vale, 'vale-guardado')

  // ───────────────────────── 2. Joaco (320 px): 10 segundos en el colectivo ─────────────────────────
  log('— Joaco (apurado, 320 px)')
  await reintento(async () => {
    await entrarPorEnlace(joaco, 'Joaco')
    await responder(joaco, 'Sí puedo', 'Sí puedo')
  })
  joaco.fin('del enlace a las condiciones guardadas')
  await ver(joaco, 'joaco-guardado')
  resumen.pasos.joaco = lecturas.at(-1)

  // ───────────────────────── 3. Renata: no puede ninguna franja ─────────────────────────
  log('— Renata (no puede ninguna franja)')
  await reintento(async () => {
    await entrarPorEnlace(renata, 'Renata')
    await responder(renata, 'No puedo', 'No puedo')
  })
  renata.fin('del enlace a «No puedo» en las dos franjas')
  await ver(renata, 'renata-guardado')
  resumen.pasos.renata = lecturas.at(-1)
  if (renata.rapida) await renata.tocar(renata.page.getByRole('link', { name: /^(Ver el plan|Listo)$/ }), 'enlace «Ver el plan» / «Listo»')
  else await renata.tocarPestana('Plan')
  await renata.page.getByRole('tab', { name: 'Plan' }).waitFor({ timeout: 20000 })
  await ver(renata, 'renata-plan-sin-franja')

  // ───────────────────────── 4. Bruno: contesta una franja, deja la otra «Pendiente», presupuesto bajo ─────────────────────────
  log('— Bruno (condiciones: presupuesto bajo, bajo techo)')
  await reintento(async () => {
    await entrarPorEnlace(bruno, 'Bruno')
    // Solo contesta la A (la B no la sabe todavía) y guarda.
    await responder(bruno, 'Sí puedo', null)
  })
  bruno.fin('del enlace a guardar SOLO la franja A')
  const brunoEtiqueta = await ver(bruno, 'bruno-guardo-una-franja')
  resumen.pasos.bruno = lecturas.at(-1)
  resumen.brunoVeIncompletas = /Incompletas/.test(brunoEtiqueta.texto)

  // Bruno busca dónde decir que tiene poca plata y prefiere bajo techo: «Agente del círculo», plegado al final del espacio.
  log('— Bruno busca dónde cargar presupuesto y techo')
  try {
    const t1 = bruno.toques
    await bruno.tocar(bruno.page.getByRole('link', { name: /Los de la facu/ }).first(), 'volver al espacio')
    await bruno.page.getByRole('heading', { name: 'Los de la facu' }).waitFor({ timeout: 15000 })
    await bruno.tocar(bruno.page.getByText('Agente del círculo', { exact: true }).first(), 'abrir «Agente del círculo»')
    await bruno.page.getByText('Presupuesto este finde').first().waitFor({ timeout: 15000 })
    await ver(bruno, 'bruno-preferencias')
    await bruno.tocar(bruno.page.getByText('Ojalá gratis', { exact: true }), 'Presupuesto: Ojalá gratis')
    await bruno.tocar(bruno.page.getByText('Prefiero bajo techo', { exact: true }), 'Lugar: bajo techo')
    await bruno.tocar(bruno.page.locator('input[id^=pref-gusta-]').first().locator('xpath=..'), 'Me gustaría: la primera actividad')
    // Enmienda 10, si ya está en el build: transporte, 30 minutos. Con el panel compacto (agente-ia, 02:12) esas
    // preguntas viven plegadas en «Cómo llegas (opcional)»: se abre si existe (en el panel largo no está).
    const plegado = bruno.page.getByRole('button', { name: /Cómo llegas \(opcional\)/ })
    if (await plegado.count()) await bruno.tocar(plegado.first(), 'abrir «Cómo llegas (opcional)»')
    for (const [txt, que] of [['Transporte público', 'Cómo te movés'], ['Hasta 30 min', 'Hasta cuánto viajás']]) {
      const o = bruno.page.getByText(txt, { exact: true })
      if (await o.count()) await bruno.tocar(o.first(), que)
    }
    await bruno.tocarBoton('Guardar mis preferencias')
    await bruno.esperar('Guardado. Nadie más ve tus preferencias.', 20000)
    await ver(bruno, 'bruno-preferencias-guardadas')
    resumen.brunoPreferencias = { toques: bruno.toques - t1, encontro: true }
  } catch (e) {
    resumen.brunoPreferencias = { encontro: false, error: String(e.message).split('\n')[0] }
    hallazgo({ id: 'bruno-no-encuentra-preferencias', persona: bruno, gravedad: 'media', destinatario: 'ux-flujo',
      titulo: 'Bruno no logra cargar presupuesto y techo', paso: 'Bruno, tras guardar la franja A: busca dónde decir que tiene poca plata',
      vio: String(e.message).split('\n')[0], esperaba: 'Un camino claro desde su respuesta a «Mis preferencias».' })
  }

  // ───────────────────────── 5. Gonza: «Me interesa» + las dos franjas ─────────────────────────
  log('— Gonza (le interesa, y después se baja)')
  await reintento(async () => {
    await entrarPorEnlace(gonza, 'Gonza')
    if (gonza.rapida) {
      await responder(gonza, 'Sí puedo', 'Sí puedo')
      await ver(gonza, 'gonza-respuesta-guardada')
      await gonza.tocarBoton('Me interesa') // la tarjeta «¿Avisar al grupo que te interesa?»
      await gonza.esperar('Marcaste "Me interesa"')
    } else {
      await irAMiRespuesta(gonza)
      await gonza.tocarBoton('Me interesa')
      await gonza.esperar('Marcaste "Me interesa"')
      await ver(gonza, 'gonza-me-interesa')
      await guardarCondiciones(gonza, 'Sí puedo', 'Sí puedo')
    }
  })
  gonza.fin('del enlace a «Me interesa» y condiciones guardadas')
  resumen.pasos.gonza = lecturas.at(-1)

  // ───────────────────────── 6. Vale busca la opción (Pili nunca abrió el enlace) ─────────────────────────
  log('— Vale: busca la opción compatible')
  await volverA(vale, propuestaUrl, 'Plan')
  await ver(vale, 'vale-plan-antes-de-buscar')
  await vale.tocarBoton('Buscar opción compatible')
  await vale.esperar('Confirmar versión 1', 30000)
  const planV1 = await ver(vale, 'vale-opcion-v1')
  resumen.v1Vale = planV1.texto.replace(/\s+/g, ' ').slice(0, 600)

  // Bruno vuelve a la app: ¿se entera de que quedó fuera?
  log('— Bruno vuelve: ¿sabe que quedó fuera?')
  await volverA(bruno, propuestaUrl, 'Plan')
  const brunoPlan = await ver(bruno, 'bruno-plan-v1-sin-el')
  resumen.brunoPlanV1 = brunoPlan.texto.replace(/\s+/g, ' ').slice(0, 700)
  await bruno.tocarPestana('Mi respuesta')
  const brunoResp = await ver(bruno, 'bruno-mi-respuesta-v1')
  resumen.brunoRespV1 = brunoResp.texto.replace(/\s+/g, ' ').slice(0, 700)

  // Renata: ¿qué ve ahora?
  await volverA(renata, propuestaUrl, 'Plan')
  await ver(renata, 'renata-plan-v1')

  // ───────────────────────── 7. Confirmaciones: Joaco desde la portada, Gonza desde la propuesta, Vale ─────────────────────────
  log('— Joaco confirma desde la portada (el apurado)')
  joaco.inicio()
  await joaco.page.goto(`${BASE}/#/`)
  await joaco.page.getByRole('heading', { level: 1 }).first().waitFor({ timeout: 20000 })
  await joaco.page.waitForTimeout(1500)
  await ver(joaco, 'joaco-portada-vuelve')
  // Rediseño S1 (57b89f1): la portada ya no tiene la tarjeta «Tu plan»; el camino es la línea «Te toca confirmar» (enlace al plan).
  await joaco.tocar(joaco.page.locator('a.plan-vivo, a[href*="/p/"]').first(), 'el plan desde la portada («Tu plan» o «Te toca confirmar»)')
  await joaco.tocarBoton('Confirmar versión 1')
  await joaco.esperar('Ya confirmaste la versión 1', 25000)
  joaco.fin('de la portada a «Confirmar versión 1»')
  resumen.pasos.joacoConfirma = lecturas.at(-1)
  await ver(joaco, 'joaco-confirmo')

  log('— Gonza confirma')
  await volverA(gonza, propuestaUrl, 'Plan')
  await ver(gonza, 'gonza-plan-v1')
  await gonza.tocarBoton('Confirmar versión 1')
  await gonza.esperar('Ya confirmaste la versión 1', 25000)

  log('— Vale confirma: el grupo queda confirmado')
  await volverA(vale, propuestaUrl, 'Plan')
  await vale.tocarBoton('Confirmar versión 1')
  await vale.esperar('Grupo confirmado', 30000)
  await ver(vale, 'vale-grupo-confirmado')

  // ───────────────────────── 8. Gonza se baja → ¿qué ve cada uno? ─────────────────────────
  log('— Gonza se baja')
  await volverA(gonza, propuestaUrl, 'Plan')
  await ver(gonza, 'gonza-grupo-confirmado')
  await gonza.tocarPestana('Mi respuesta')
  await gonza.tocarBoton('Retirarme de esta propuesta')
  await ver(gonza, 'gonza-confirma-baja')
  await gonza.tocarBoton('Sí, no voy')
  // Texto de hoy, o el de la enmienda 13 (c) para quien se retira.
  await gonza.esperar(/Te retiraste|Gracias por avisar/, 25000)
  await ver(gonza, 'gonza-se-bajo')

  log('— Vale ve la baja y busca alternativa')
  await volverA(vale, propuestaUrl, 'Plan')
  await vale.esperar('En revisión', 30000)
  await ver(vale, 'vale-en-revision')
  await volverA(joaco, propuestaUrl, 'Plan')
  await ver(joaco, 'joaco-en-revision')
  // Bruno completa la franja B ahora que vio que quedó fuera.
  await volverA(bruno, propuestaUrl, 'Mi respuesta')
  const brunoRevision = await ver(bruno, 'bruno-mi-respuesta-en-revision')
  resumen.brunoRespEnRevision = brunoRevision.texto.replace(/\s+/g, ' ').slice(0, 700)
  let brunoPudoCompletar = false
  try {
    await bruno.tocar(franja(bruno, 'B', 'Sí puedo'), 'Franja B: Sí puedo')
    await bruno.tocarBoton('Guardar condiciones')
    await bruno.esperar('Guardado. Solo tú ves estas condiciones.', 12000)
    brunoPudoCompletar = true
  } catch { /* no pudo: queda anotado abajo */ }
  resumen.brunoPudoCompletarEnRevision = brunoPudoCompletar
  await ver(bruno, 'bruno-despues-de-completar')

  await vale.tocarBoton('Buscar alternativa')
  await vale.page.waitForTimeout(2500)
  const reparacion = await ver(vale, 'vale-despues-de-buscar-alternativa')
  resumen.reparacionVale = reparacion.texto.replace(/\s+/g, ' ').slice(0, 800)
  resumen.hayVersion2 = /versión 2/i.test(reparacion.texto)

  // Pili: el espacio la sigue mostrando «por entrar».
  await vale.page.goto(espacioUrl)
  await vale.page.getByRole('heading', { name: 'Los de la facu' }).waitFor({ timeout: 20000 })
  const espacioFinal = await ver(vale, 'vale-espacio-al-final')
  resumen.piliAparece = /Pili[\s\S]{0,40}por entrar/.test(espacioFinal.texto)
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
}
