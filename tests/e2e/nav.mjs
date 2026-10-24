// Navegación común de los guiones por pantalla (un solo lugar que adaptar cuando el rediseño cambie cómo se llega a cada vista).
// El plan ya no tiene pestañas (S4, mockup obligatorio, 24 oct 03:30). Los guiones siguen pidiendo «Plan», «Mi respuesta»,
// «Historial» y «Simulación»; `irA` traduce cada nombre viejo a lo que hay ahora:
//   «Plan»         → el plan es la pantalla: si estamos en ¿Cuándo puedes? o en la Simulación, se vuelve («Listo», «Ver el
//                    plan», «‹ Volver al plan»); si ya estamos en el plan, no hace nada.
//   «Mi respuesta» → enlace «Tu respuesta: … · Cambiar ›» (a.fila[href*="/responder/"]) → ¿Cuándo puedes? (S5).
//   «Historial»    → resumen desplegable «Historial» o «Ficha del plan · Historial» (si ya está abierto, no se cierra).
//   «Simulación»   → fila «Simulación demo» (solo quien organiza la demo) → misma pantalla con «‹ Volver al plan».
// Cualquier otro nombre: primero la pestaña con ese nombre y, si no existe, una fila (botón, enlace o resumen) cuyo nombre
// empiece por él. Si no encuentra ninguna, falla con un mensaje que dice qué se buscó (no un timeout mudo).
//
//   import { irA, responderRapido, ROTULO } from './nav.mjs';  await irA(page, 'Mi respuesta')
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const primeroVisible = async (candidatos) => {
  for (const c of candidatos) {
    const el = c.first()
    if (await el.count() && await el.isVisible().catch(() => false)) return el
  }
  return null
}
const clic = async (p, el, espera) => {
  await el.scrollIntoViewIfNeeded().catch(() => {})
  await el.click()
  await p.waitForTimeout(espera)
}

export async function irA(p, nombre, { espera = 500, timeout = 15000 } = {}) {
  const exacto = new RegExp(`^${esc(nombre)}`, 'i')
  const fin = Date.now() + timeout
  if (nombre !== 'Simulación' && nombre !== 'Plan') {
    // Desde la Simulación abierta, las filas del plan no se ven: primero se vuelve al plan.
    const volver = await primeroVisible([p.getByRole('button', { name: /^‹? ?Volver al plan$/ })])
    if (volver) await clic(p, volver, espera)
  }
  if (nombre === 'Plan') {
    // Volver al plan desde ¿Cuándo puedes? o desde la Simulación; en el plan mismo no hay nada que tocar.
    const volver = await primeroVisible([
      p.getByRole('link', { name: /^(Listo|Ver el plan|‹? ?Volver al plan)$/ }),
      p.getByRole('button', { name: /^‹? ?Volver al plan$/ }),
    ])
    if (volver) await clic(p, volver, espera)
    await p.locator('.estado-hero-etiqueta, h1').first().waitFor({ timeout }).catch(() => {})
    return
  }
  if (nombre === 'Historial') {
    while (Date.now() < fin) {
      // Historial abierto como sección (h2) en algunos estados: nada que tocar.
      const h2 = p.getByRole('heading', { name: /^Historial$/ }).first()
      if (await h2.count() && await h2.isVisible().catch(() => false)) return
      const det = p.locator('details', { has: p.locator('summary', { hasText: /Historial/ }) }).first()
      if (await det.count() && await det.isVisible().catch(() => false)) {
        if (!(await det.evaluate((d) => d.open))) await clic(p, det.locator('summary').first(), espera) // el propio summary, no los anidados
        // «Ficha del plan · Historial» lleva adentro un «Historial» plegado: también se abre.
        const interno = det.locator('details', { has: p.locator('summary', { hasText: /^\s*Historial\s*$/ }) }).first()
        if (await interno.count() && !(await interno.evaluate((d) => d.open))) await clic(p, interno.locator('summary').first(), espera)
        return
      }
      const tab = p.getByRole('tab', { name: exacto }).first()
      if (await tab.count() && await tab.isVisible().catch(() => false)) { await clic(p, tab, espera); return }
      await p.waitForTimeout(250)
    }
    const resumenes = await p.locator('summary').allInnerTexts().catch(() => [])
    throw new Error(`irA: no encuentro «Historial» (ni plegado ni como pestaña) en ${p.url()}; resúmenes: ${JSON.stringify(resumenes)}`)
  }
  if (nombre === 'Simulación') {
    // Ya abierta (la fila desaparece mientras se ve la Simulación): no hay nada que tocar.
    const abierta = await primeroVisible([p.getByRole('button', { name: /^‹? ?Volver al plan$/ }), p.getByRole('heading', { name: /^Personas simuladas$/ })])
    if (abierta) return
  }
  const candidatos = nombre === 'Mi respuesta'
    ? [p.locator('a.fila[href*="/responder/"]'), p.getByRole('link', { name: /^Tu respuesta/ }), p.getByRole('tab', { name: exacto })]
    : nombre === 'Simulación'
      ? [p.getByRole('button', { name: /^Simulación( demo| \(demo\))?$/ }), p.getByRole('tab', { name: exacto })]
      : [
        p.getByRole('tab', { name: nombre, exact: true }),
        p.getByRole('tab', { name: exacto }),
        p.getByRole('button', { name: exacto }),
        p.getByRole('link', { name: exacto }),
        p.locator('summary', { hasText: exacto }),
      ]
  while (Date.now() < fin) {
    const el = await primeroVisible(candidatos)
    if (el) { await clic(p, el, espera); return }
    await p.waitForTimeout(250)
  }
  throw new Error(`irA: no encuentro «${nombre}» (ni como pestaña, ni como fila, enlace o resumen) en ${p.url()}`)
}

// ¿Cuándo puedes? (S5): se responde tocando UNA opción rápida; ya no hay editor «Franja A / Sí puedo / Guardar condiciones».
// a y b son 'si' | 'no' para las dos franjas. Devuelve el botón tocado; el guion espera la respuesta del servidor o el estado.
export async function responderRapido(p, a = 'si', b = 'si', { timeout = 15000 } = {}) {
  await p.getByRole('heading', { name: '¿Cuándo puedes?' }).waitFor({ timeout }).catch(() => {})
  // Si ya respondió antes, las opciones están plegadas detrás de «Cambiar mi respuesta».
  const cambiar = p.getByRole('button', { name: /^Cambiar mi respuesta/ })
  if (await cambiar.isVisible().catch(() => false)) await cambiar.click()
  let boton
  if (a === 'si' && b === 'si') boton = p.getByRole('button', { name: /^Puedo (los dos|en los dos)/ })
  else if (a === 'no' && b === 'no') boton = p.getByRole('button', { name: /^No puedo (ninguno|en ninguno)/ })
  else boton = p.getByRole('button', { name: /^Solo (el|de) / }).nth(a === 'si' ? 0 : 1)
  await boton.first().waitFor({ timeout })
  await boton.first().scrollIntoViewIfNeeded().catch(() => {})
  await boton.first().click()
  return boton.first()
}
// Lo que confirma que la respuesta quedó guardada (texto para lector, en la región de estado).
export const respuestaGuardada = (p, timeout = 15000) =>
  p.getByRole('status').filter({ hasText: /Respuesta guardada|Guardado\. Solo tú ves/ }).first().waitFor({ state: 'attached', timeout })

// Rótulos de estado: el servidor sigue hablando como antes (`siguiente_accion`, región role=status); la etiqueta del plan
// (.estado-hero-etiqueta) usa los del mockup. Los guiones aceptan los dos.
export const ROTULO = {
  'Reuniendo interés': /Reuniendo (interés|respuestas)/i,
  'Esperando compromisos': /Esperando (compromisos|confirmaciones)/i,
  'Grupo confirmado': /Grupo confirmado|¡Se juntan!/i,
  'En revisión': /En revisión/i,
  'Cancelado': /Cancelad[oa]/i,
}
export const rotulo = (t) => ROTULO[t] ?? new RegExp(`^${esc(t)}$`, 'i')
