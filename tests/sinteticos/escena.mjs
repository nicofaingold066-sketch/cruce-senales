// Escena común de los usuarios sintéticos (psico-perfiles.mjs, asi-no-puedo.mjs): un grupo NUEVO, una propuesta
// abierta y lo que repite cada persona (entrar por el enlace, responder, volver al plan, mirar la pantalla).
// seis-amigos.mjs es anterior y lleva su propia copia de estas funciones; cuando haya tiempo, pasa a usar esta.
// Todo ficticio. Nunca el demo. No borra nada.
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs'
import { log, hallazgo } from './lib.mjs'
import { revisarTextos } from './revisar.mjs'

/** URL y clave publishable del .env de la raíz: las mismas dos que ya lleva el navegador. Nunca se imprimen. */
export function entornoPublico() {
  const env = {}
  try {
    for (const linea of readFileSync(new URL('../../.env', import.meta.url), 'utf8').split('\n')) {
      const m = linea.match(/^\s*(VITE_SUPABASE_URL|VITE_SUPABASE_PUBLISHABLE_KEY)\s*=\s*"?([^"\n]*)"?\s*$/)
      if (m) env[m[1]] = m[2].trim()
    }
  } catch {
    // Sin .env: solo process.env.
  }
  return {
    url: (process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL || '').replace(/\/+$/, ''),
    clave: process.env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY || '',
  }
}

/**
 * Llama a una RPC con la sesión que esa persona tiene en SU navegador (el token que guardó supabase-js), sin
 * refrescarla ni abrir otra. Sirve para probar lo que todavía no tiene botón en la interfaz (enmienda 13).
 * Devuelve { status, data }: data es el sobre {ok, …} del servidor o el error de PostgREST (code PGRST202 = la
 * función no existe, o sea la enmienda no está aplicada).
 */
export async function rpcComo(p, fn, args) {
  const { url, clave } = entornoPublico()
  if (!url || !clave) throw new Error('faltan VITE_SUPABASE_URL o VITE_SUPABASE_PUBLISHABLE_KEY (en .env o en el entorno)')
  const sesion = await p.page.evaluate(() => {
    for (const k of Object.keys(localStorage)) {
      if (/^sb-.*-auth-token$/.test(k)) {
        try { return JSON.parse(localStorage.getItem(k) ?? 'null') } catch { return null }
      }
    }
    return null
  })
  const token = sesion?.access_token
  if (!token) throw new Error(`${p.nombre} no tiene sesión guardada en su navegador`)
  const r = await fetch(`${url}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', apikey: clave, Authorization: `Bearer ${token}` },
    body: JSON.stringify(args),
  })
  const texto = await r.text()
  let data
  try { data = JSON.parse(texto) } catch { data = texto }
  return { status: r.status, data }
}

/** Un fallo de tiempo (57014) o de red se reintenta solo. */
export async function reintento(f, veces = 3) {
  let ultimo
  for (let i = 0; i < veces; i++) {
    try { return await f() } catch (e) { ultimo = e; log(`  (reintento ${i + 1}: ${String(e.message).split('\n')[0].slice(0, 100)})`) }
  }
  throw ultimo
}

/**
 * Arma la escena: base, carpeta de salida, nombre del grupo y título de la propuesta.
 * `fugas`: [{ id, persona, re, gravedad, destinatario, titulo, esperaba, unaVez }]: lo que no debe verse en el teléfono
 * de OTRA persona (se revisa en cada pantalla que mira cada una).
 */
export function armarEscena({ base, salida, grupo, titulo, fugas = [] }) {
  const TEXTOS = `${salida}/textos.md`
  writeFileSync(TEXTOS, `# Textos que vio cada persona (${base}) · grupo «${grupo}»\n`)
  const datos = { codigo: '', enlace: '', espacioUrl: '', propuestaUrl: '', propuestaId: '' }

  // Anota lo que la persona ve en esta pantalla (para el informe), revisa textos sospechosos, fugas y desborde.
  async function ver(p, donde, { capturar = true } = {}) {
    await p.mirar()
    const texto = await p.main()
    appendFileSync(TEXTOS, `\n## ${p.nombre} (${p.ancho} px): ${donde}\n\`\`\`\n${texto.trim()}\n\`\`\`\n`)
    const captura = capturar ? await p.captura(donde.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)) : undefined
    const cabecera = await p.page.locator('header').first().innerText().catch(() => '')
    revisarTextos(p, donde, `${cabecera}\n${texto}`, captura)
    const plano = texto.replace(/\s+/g, ' ')
    for (const f of fugas) {
      if (f.persona === p.nombre) continue
      const m = plano.match(f.re)
      if (!m) continue
      hallazgo({
        id: f.unaVez ? f.id : `${f.id}-${p.nombre}-${donde}`,
        persona: p,
        gravedad: f.gravedad ?? 'alta',
        destinatario: f.destinatario ?? 'backend',
        titulo: f.titulo ?? `Se ve algo privado de ${f.persona} en el teléfono de ${p.nombre}`,
        paso: `${p.nombre} en «${donde}»`,
        vio: `«${m[0]}»`,
        esperaba: f.esperaba ?? 'Nada de las condiciones, preferencias ni motivos de otra persona.',
        captura,
      })
    }
    const sobra = await p.desborde()
    if (sobra > 0) {
      hallazgo({ id: `desborde-${p.ancho}-${donde}`, persona: p, gravedad: 'media', destinatario: 'front-juan',
        titulo: `Desborde horizontal a ${p.ancho} px en «${donde}»`, paso: donde, vio: `La página es ${sobra} px más ancha que la pantalla.`, esperaba: 'Nada que obligue a deslizar de costado.', captura })
    }
    return { texto, captura }
  }

  // La organizadora entra a la portada, pone su nombre y crea el grupo con los nombres. `pegar`: toda la lista en un
  // solo «Agregar» (friccion, 20:5x); si no, un «Agregar» por nombre.
  async function crearGrupo(org, { integrantes, pegar = false, quienViene = null, proposito = null }) {
    org.inicio()
    await org.page.goto(base)
    await org.page.getByRole('heading', { level: 1 }).first().waitFor({ timeout: 30000 })
    await org.page.waitForTimeout(3300) // la entrada animada de 2,9 s
    await ver(org, 'portada-primera-vez')
    await org.page.getByRole('textbox').first().fill(org.nombre)
    await org.tocarBoton('Entrar')
    await org.tocarEnlace('Crear un grupo', false)
    await org.page.getByRole('heading', { name: 'Crear un grupo' }).waitFor({ timeout: 15000 })
    await ver(org, 'crear-grupo-vacio')
    const campos = org.page.locator('form input')
    await campos.nth(0).fill(grupo)
    if (!(await campos.nth(1).inputValue())) await campos.nth(1).fill(org.nombre)
    if (pegar) {
      await campos.nth(2).fill(integrantes.join(', '))
      await org.tocarBoton('Agregar')
    } else {
      for (const n of integrantes) {
        await campos.nth(2).fill(n)
        await org.tocarBoton('Agregar')
      }
    }
    // «¿Quién viene?» (D3) y «¿Para qué es este grupo?» (enmienda 14): opcionales, un toque cada uno.
    if (quienViene) { await org.page.getByText(quienViene, { exact: true }).first().click(); org.toques++ }
    if (proposito) { await org.page.getByLabel('¿Para qué es este grupo?').selectOption({ label: proposito }); org.toques++ }
    await ver(org, 'crear-grupo-lleno')
    await org.tocarBoton('Crear grupo')
    await org.page.getByRole('heading', { name: grupo }).waitFor({ timeout: 30000 })
    datos.codigo = (await org.page.locator('.codigo').first().textContent())?.trim() ?? ''
    datos.espacioUrl = org.page.url()
    datos.enlace = `${base}/#/unirse/${datos.codigo}`
    await ver(org, 'espacio-recien-creado')
    org.fin(`crear el grupo con ${integrantes.length} nombres${pegar ? ' (lista pegada)' : ''}`)
    return datos
  }

  // Crea y abre la propuesta: atajo de actividad, título, mínimo (+N sobre el valor inicial 2).
  async function crearPropuesta(org, { actividad, minimoMas = 1 }) {
    const t = org.toques
    await org.tocarEnlace('Crear propuesta', false)
    await org.esperarNuevoPlan()
    const vacia = await ver(org, 'nueva-propuesta-vacia')
    if (actividad) await org.atajo(actividad)
    await org.page.getByLabel('Propósito de la propuesta').fill(titulo)
    for (let i = 0; i < minimoMas; i++) await org.tocar(org.page.getByLabel('Sumar uno al mínimo'), 'mínimo +1')
    await org.revisarYCrear(() => ver(org, 'nueva-propuesta-revisar'))
    await org.page.getByRole('tab', { name: 'Plan' }).waitFor({ timeout: 30000 })
    await org.page.waitForTimeout(1200)
    datos.propuestaUrl = org.page.url()
    datos.propuestaId = datos.propuestaUrl.match(/\/p\/([0-9a-f-]{36})/)?.[1] ?? ''
    const abierta = await ver(org, 'propuesta-abierta')
    return { toques: org.toques - t, textoFormulario: vacia.texto, textoPlan: abierta.texto }
  }

  // Una persona entra por el enlace, elige su nombre en «¿Quién eres?» y llega a «¿Cuándo puedes?» (#88) o al espacio.
  async function entrarPorEnlace(p, nombre = p.nombre) {
    p.inicio()
    await p.page.goto(datos.enlace)
    await p.mirar()
    await p.page.getByRole('heading', { name: '¿Quién eres?' }).waitFor({ timeout: 25000 })
    const quienEres = await ver(p, 'enlace-quien-eres')
    p.quienEresTexto = quienEres.texto // la regla del grupo («Esta vez es solo el grupo.») y el propósito se leen acá
    await p.tocar(p.page.getByRole('button', { name: nombre, exact: true }), `su nombre «${nombre}»`)
    await ver(p, 'eres-tu')
    await p.tocarBoton(`Sí, soy ${nombre}`)
    const destino = p.page.getByRole('heading', { name: grupo }).or(p.page.getByRole('heading', { name: '¿Cuándo puedes?' }))
    await destino.first().waitFor({ timeout: 25000 })
    await p.page.waitForTimeout(1200)
    p.rapida = (await p.page.getByRole('heading', { name: '¿Cuándo puedes?' }).count()) > 0
    return ver(p, p.rapida ? 'responder-en-un-paso' : 'espacio-recien-entrado')
  }

  // Del espacio a «Mi respuesta» de la propuesta abierta.
  async function irAMiRespuesta(p) {
    await p.page.getByText(titulo, { exact: false }).first().waitFor({ timeout: 20000 }).catch(() => {})
    await p.tocar(p.page.locator('a.plan-vivo, a.tarjeta-prop').first(), 'la tarjeta del plan')
    await p.page.getByRole('tab', { name: 'Mi respuesta' }).waitFor({ timeout: 20000 })
    await ver(p, 'plan-vista-general')
    await p.tocarPestana('Mi respuesta')
    return ver(p, 'mi-respuesta-vacia')
  }

  const franja = (p, clave, valor) => p.page.locator('fieldset', { hasText: `Franja ${clave}` }).getByText(valor, { exact: true })
  async function guardarCondiciones(p, a, b) {
    if (a) await p.tocar(franja(p, 'A', a), `Franja A: ${a}`)
    if (b) await p.tocar(franja(p, 'B', b), `Franja B: ${b}`)
    await p.tocarBoton('Guardar condiciones')
    await p.esperar('Guardado. Solo tú ves estas condiciones.', 20000)
  }

  // Responde las dos franjas por el camino que ofrezca la app: «¿Cuándo puedes?» (un toque) o plan → Mi respuesta.
  // a, b: 'Sí puedo' | 'No puedo' | null (null = no sabe: «Todavía no sé» y después «Pendiente» en el plan).
  async function responder(p, a, b) {
    if (p.rapida && a && b) {
      const nombre = a === 'Sí puedo' && b === 'Sí puedo' ? /^Puedo (en )?los dos/
        : a === 'No puedo' && b === 'No puedo' ? /^No puedo (ninguno|en ninguno)/
        : /^Solo (el |de )/
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

  // Vuelve a la propuesta como quien reabre la app: recarga de verdad y abre una pestaña.
  async function volverA(p, url = datos.propuestaUrl, pestana = 'Plan') {
    await p.page.goto(url)
    await p.page.reload()
    await p.page.getByRole('tab', { name: pestana }).waitFor({ timeout: 25000 })
    await p.page.waitForTimeout(800)
    await p.tocarPestana(pestana)
  }

  // De «Respuesta guardada» (o del espacio) a la pestaña Plan de la propuesta.
  async function irAlPlan(p) {
    if (p.rapida && (await p.page.getByRole('link', { name: 'Ver el plan' }).count())) {
      await p.tocar(p.page.getByRole('link', { name: 'Ver el plan' }), 'enlace «Ver el plan»')
    } else {
      await p.page.goto(datos.propuestaUrl)
    }
    await p.page.getByRole('tab', { name: 'Plan' }).waitFor({ timeout: 20000 })
    await p.tocarPestana('Plan')
  }

  async function confirmar(p, version) {
    await p.tocarBoton(`Confirmar versión ${version}`)
    await p.esperar(`Ya confirmaste la versión ${version}`, 25000)
  }

  async function bajarse(p) {
    await p.tocarPestana('Mi respuesta')
    await p.tocarBoton('Retirarme de esta propuesta')
    await ver(p, 'confirma-la-baja')
    await p.tocarBoton('Sí, no voy')
    // Texto de hoy, o el de la enmienda 13 (c) para quien se retira («Gracias por avisar. No hace falta contar por qué.»).
    await p.esperar(/Te retiraste|Gracias por avisar/, 25000)
  }

  // El bloque «Agente del círculo» plegado al final del espacio: ahí viven las preferencias privadas.
  async function abrirPreferencias(p) {
    await p.page.goto(datos.espacioUrl)
    await p.page.reload()
    await p.page.getByRole('heading', { name: grupo }).waitFor({ timeout: 20000 })
    await p.tocar(p.page.getByText('Agente del círculo', { exact: true }).first(), 'abrir «Agente del círculo»')
    await p.page.getByText('Presupuesto este finde').first().waitFor({ timeout: 15000 })
  }

  return { datos, ver, crearGrupo, crearPropuesta, entrarPorEnlace, irAMiRespuesta, franja, guardarCondiciones, responder, volverA, irAlPlan, confirmar, bajarse, abrirPreferencias }
}
