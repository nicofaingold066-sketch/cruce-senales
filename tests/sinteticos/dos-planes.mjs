// Enmienda 15 (E-c y E-d) con un grupo NUEVO, «Los de la terraza» (no «Los del finde»: así se llama la demo desde la 0054): dos planes con nombre, «gana la que pueden más», «¿cuál
// prefieres?» (desempate privado) y una ronda de opiniones de 2 h.
//   Mara  — organiza: pone nombre a cada plan, elige «La que pueden más» y ronda de 2 h; ve los totales; rearma.
//   Teo   — puede los dos; prefiere B (desempate).
//   Lola  — puede los dos; prefiere B.
//   Nano  — solo el sábado (A); el domingo (B) no puede.
//   (Pipo — nunca abre el enlace: «por entrar».)
// A pueden: Mara, Teo, Lola, Nano (4). B pueden: Mara, Teo, Lola (3). Con «la que pueden más» gana A aunque B sea la
// preferida de dos; con «la más temprana» también sería A: para probar el desempate de verdad se necesita igualdad
// (ver el segundo tramo: Nano cambia a «No puedo» en A y entonces A=3, B=3 → desempate por «prefiero»: B).
//
//   node tests/sinteticos/dos-planes.mjs [url]
// Comprueba, por pantalla: que el formulario ofrece «Más opciones» (ronda y regla) y el nombre de cada plan; que el plan
// publicado muestra la etiqueta y «Opiniones hasta HH:MM»; que quien organiza ve los totales («pueden N · la prefieren M»)
// y nadie más; que la preferencia no la ve nadie más; que con la ronda abierta no se rearma; que «Así no puedo» sigue.
import { Persona, lanzar, log, hallazgo, hallazgos, lecturas, guardarResultados, carpetaDeSalida } from './lib.mjs'
import { armarEscena, reintento } from './escena.mjs'
import { exigirBaseLibre } from './guardia.mjs'

exigirBaseLibre()

const BASE = (process.argv[2] || process.env.CRUXE_URL || 'https://cruce-senales.vercel.app').replace(/\/+$/, '')
const SALIDA = carpetaDeSalida(process.env.CRUXE_SALIDA || new URL('./salida', import.meta.url).pathname)
const GRUPO = 'Los de la terraza'
const TITULO = 'Plan del finde'
const t0 = Date.now()

const fugas = [
  // Nadie debe ver quién prefiere qué ni quién puede en cuál plan.
  { id: 'fuga-prefiero', persona: 'Teo', unaVez: true, destinatario: 'backend',
    re: /\b(Teo|Lola)\b.{0,40}(prefier|prefiere)|(prefier|prefiere).{0,40}\b(Teo|Lola)\b/i,
    titulo: 'Se ve quién prefiere qué plan', esperaba: 'Solo totales al organizador y desde 2; nunca nombres.' },
  { id: 'fuga-nano', persona: 'Nano', unaVez: true, destinatario: 'backend',
    re: /\bNano\b.{0,50}(solo (el )?s[aá]bado|no puede el domingo|solo puede)|(solo (el )?s[aá]bado|no puede el domingo).{0,50}\bNano\b/i,
    titulo: 'Se ve que Nano solo puede un plan', esperaba: 'Las condiciones de cada persona son privadas.' },
]

const browser = await lanzar()
const E = armarEscena({ base: BASE, salida: SALIDA, grupo: GRUPO, titulo: TITULO, fugas })
const mara = await new Persona(browser, { nombre: 'Mara', perfil: 'organiza con dos planes y ronda', ancho: 375 }, SALIDA).abrir()
const teo = await new Persona(browser, { nombre: 'Teo', perfil: 'prefiere el plan B', ancho: 320, alto: 640 }, SALIDA).abrir()
const lola = await new Persona(browser, { nombre: 'Lola', perfil: 'prefiere el plan B', ancho: 375 }, SALIDA).abrir()
const nano = await new Persona(browser, { nombre: 'Nano', perfil: 'solo el sábado', ancho: 375 }, SALIDA).abrir()
const todos = [mara, teo, lola, nano]
const resumen = { grupo: GRUPO, comprobaciones: {} }
const C = resumen.comprobaciones
const tiene = (texto, re) => re.test(texto.replace(/\s+/g, ' '))

try {
  // ── Mara crea el grupo y la propuesta con los dos planes ───────────────────────────────────────────
  log('— Mara crea «Los de la terraza»')
  await reintento(() => E.crearGrupo(mara, { integrantes: ['Teo', 'Lola', 'Nano', 'Pipo'], pegar: true }))
  await mara.tocarEnlace('Crear propuesta', false)
  await mara.page.getByRole('heading', { name: 'Nueva propuesta' }).waitFor({ timeout: 15000 })
  const form = await E.ver(mara, 'nueva-propuesta-e15')
  C.formularioDiceNombreDelPlan = tiene(form.texto, /Nombre de este plan/)
  C.formularioOfreceMasOpciones = tiene(form.texto, /Más opciones/)
  await mara.page.getByLabel('Propósito de la propuesta').fill(TITULO)
  // Nombre de cada plan (opcional) y «Más opciones».
  const nombres = mara.page.locator('.campo-etiqueta-plan input')
  C.camposDeNombreDePlan = await nombres.count()
  if (C.camposDeNombreDePlan >= 2) {
    await nombres.nth(0).fill('Asado en el parque')
    await nombres.nth(1).fill('Cine y pizza')
  }
  await mara.tocar(mara.page.getByText('Más opciones', { exact: true }).first(), 'abrir «Más opciones»')
  const mas = await E.ver(mara, 'nueva-propuesta-mas-opciones')
  C.masOpcionesRonda = tiene(mas.texto, /Sin ronda/) && tiene(mas.texto, /2 h/)
  C.masOpcionesRegla = tiene(mas.texto, /La que pueden más/)
  await mara.tocar(mara.page.locator('label', { hasText: /^2 h$/ }).first(), 'ronda de 2 h')
  await mara.tocar(mara.page.locator('label', { hasText: 'La que pueden más' }).first(), 'gana: la que pueden más')
  await mara.tocar(mara.page.getByLabel('Sumar uno al mínimo'), 'mínimo +1')
  await mara.tocarBoton('Revisar antes de crear')
  const rev = await E.ver(mara, 'nueva-propuesta-revisar-e15')
  C.revisarMuestraRonda = tiene(rev.texto, /Ronda de opiniones[\s\S]{0,40}2 h/)
  C.revisarMuestraRegla = tiene(rev.texto, /la que pueden más|La que pueden más/)
  await mara.tocarBoton('Crear y abrir al grupo')
  await mara.page.getByRole('tab', { name: 'Plan' }).waitFor({ timeout: 30000 })
  await mara.page.waitForTimeout(1200)
  E.datos.propuestaUrl = mara.page.url()
  E.datos.propuestaId = E.datos.propuestaUrl.match(/\/p\/([0-9a-f-]{36})/)?.[1] ?? ''
  await E.ver(mara, 'propuesta-abierta')
  await E.volverA(mara, E.datos.propuestaUrl, 'Mi respuesta')
  const miRespMara = await E.ver(mara, 'mara-mi-respuesta')
  C.maraVeCualPrefieresAntesDeResponder = tiene(miRespMara.texto, /¿cuál prefieres\?/)
  await E.guardarCondiciones(mara, 'Sí puedo', 'Sí puedo')
  const miRespMara2 = await E.ver(mara, 'mara-mi-respuesta-con-las-dos-en-si')
  C.maraVeCualPrefieresConLasDosEnSi = tiene(miRespMara2.texto, /Si te sirven los dos, ¿cuál prefieres\?/)

  // ── Teo y Lola: pueden los dos y prefieren B ──────────────────────────────────────────────────────
  for (const p of [teo, lola]) {
    log(`— ${p.nombre} responde y prefiere B`)
    await reintento(async () => {
      await E.entrarPorEnlace(p)
      // El camino de un toque guarda las dos franjas pero no ofrece «¿cuál prefieres?»: ir a Mi respuesta del plan.
      await E.responder(p, 'Sí puedo', 'Sí puedo')
    })
    p.fin('del enlace a la respuesta guardada')
    await E.volverA(p, E.datos.propuestaUrl, 'Mi respuesta')
    const mr = await E.ver(p, `${p.nombre.toLowerCase()}-mi-respuesta`)
    C[`${p.nombre}VeCualPrefieres`] = tiene(mr.texto, /Si te sirven los dos, ¿cuál prefieres\?/)
    C[`${p.nombre}VeNombresDeLosPlanes`] = tiene(mr.texto, /Asado en el parque/) && tiene(mr.texto, /Cine y pizza/)
    const opcionB = p.page.locator('fieldset.prefiero label', { hasText: /Cine y pizza|Opción B/ }).first()
    if (await opcionB.count()) {
      await p.tocar(opcionB, 'prefiero el plan B')
      await p.tocarBoton('Guardar condiciones')
      await p.esperar('Guardado. Solo tú ves estas condiciones.', 20000)
      C[`${p.nombre}GuardoPrefiero`] = true
    } else C[`${p.nombre}GuardoPrefiero`] = false
  }

  // ── Nano: solo el sábado (A) ───────────────────────────────────────────────────────────────────────
  log('— Nano: solo el sábado')
  await reintento(async () => { await E.entrarPorEnlace(nano); await E.responder(nano, 'Sí puedo', 'No puedo') })
  nano.fin('del enlace a la respuesta guardada')

  // ── Mara: totales antes de buscar (solo ella), busca la opción ────────────────────────────────────
  log('— Mara busca la opción: ¿gana A (4 pueden) o B (la prefieren)?')
  await E.volverA(mara, E.datos.propuestaUrl, 'Plan')
  const antes = await E.ver(mara, 'mara-plan-antes-de-buscar')
  C.maraVeTotalesPorPlan = tiene(antes.texto, /pueden \d/) || tiene(antes.texto, /la prefieren \d/)
  C.maraTotalesTexto = (antes.texto.match(/[^\n]*(pueden \d|prefieren \d)[^\n]*/g) ?? []).map((x) => x.trim()).join(' | ')
  await mara.tocarBoton('Buscar opción compatible')
  await mara.esperar('Confirmar versión 1', 30000)
  const v1 = await E.ver(mara, 'mara-opcion-v1')
  C.v1GanaA = tiene(v1.texto, /Franja A/) && tiene(v1.texto, /Asado en el parque/)
  C.v1MuestraEtiqueta = tiene(v1.texto, /Asado en el parque|Cine y pizza/)
  C.v1MuestraRonda = tiene(v1.texto, /Opiniones hasta/)
  C.v1TextoRonda = (v1.texto.match(/Opiniones hasta[^\n]*/)?.[0] ?? '').trim()
  C.v1DiceGanaLaQuePuedenMas = tiene(v1.texto, /Gana la que pueden más personas/)

  // ── Lo que ven los demás: sin totales ni preferencias ─────────────────────────────────────────────
  for (const p of [teo, nano]) {
    await E.volverA(p, E.datos.propuestaUrl, 'Plan')
    const t = await E.ver(p, `${p.nombre.toLowerCase()}-plan-v1`)
    C[`${p.nombre}VeTotalesDePlanes`] = tiene(t.texto, /la prefieren \d|pueden \d+ ·/)
    C[`${p.nombre}VeRonda`] = tiene(t.texto, /Opiniones hasta/)
  }

  // ── Ronda abierta: «así no puedo» sigue; rearmar espera ──────────────────────────────────────────
  log('— Teo dice «así no puedo» con la ronda abierta; Mara no puede rearmar todavía')
  await E.volverA(teo, E.datos.propuestaUrl, 'Plan')
  const boton = teo.page.getByRole('button', { name: /Así no puedo/ })
  C.teoTieneAsiNoPuedoConRondaAbierta = (await boton.count()) > 0
  if (await boton.count()) {
    await teo.tocar(boton.first(), '«Así no puedo, pero sigo»')
    await teo.page.waitForTimeout(1500)
    await E.ver(teo, 'teo-asi-no-puedo')
  }
  await E.volverA(mara, E.datos.propuestaUrl, 'Plan')
  const conOp = await E.ver(mara, 'mara-plan-con-ronda-abierta-y-una-opinion')
  C.maraNoVeRearmarConRondaAbierta = !(await mara.page.getByRole('button', { name: /Rearmar/ }).count())
  C.maraVeTextoDeEspera = tiene(conOp.texto, /Mientras tanto no se rearma|Opiniones hasta/)
  // Confirmar sigue abierto durante la ronda.
  await E.confirmar(mara, 1)
  C.confirmarSigueAbierto = true
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
