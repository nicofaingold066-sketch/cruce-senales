// Navegación común de los guiones por pantalla (un solo lugar que adaptar cuando el rediseño cambie cómo se llega a cada vista).
// Hoy el plan tiene pestañas (Plan · Mi respuesta · Historial · Simulación). El mockup validado (03:05, «el mockup gana y el
// guion se adapta») las reemplaza por filas y hojas: «Tu respuesta · Cambiar ›», «Historial ⌄», «Simulación (demo)». `irA`
// prueba primero la pestaña con ese nombre y, si no existe, una fila (botón, enlace o resumen desplegable) cuyo nombre empiece
// por él. Si no encuentra ninguna, falla con un mensaje que dice qué se buscó (no un timeout mudo).
//
//   import { irA } from './nav.mjs';  await irA(page, 'Mi respuesta')
export async function irA(p, nombre, { espera = 500, timeout = 15000 } = {}) {
  const exacto = new RegExp(`^${nombre.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i')
  const candidatos = [
    p.getByRole('tab', { name: nombre, exact: true }),
    p.getByRole('tab', { name: exacto }),
    p.getByRole('button', { name: exacto }),
    p.getByRole('link', { name: exacto }),
    p.locator('summary', { hasText: exacto }),
  ]
  const fin = Date.now() + timeout
  while (Date.now() < fin) {
    for (const c of candidatos) {
      const el = c.first()
      if (await el.count() && await el.isVisible().catch(() => false)) {
        await el.scrollIntoViewIfNeeded().catch(() => {})
        await el.click()
        await p.waitForTimeout(espera)
        return
      }
    }
    await p.waitForTimeout(250)
  }
  throw new Error(`irA: no encuentro «${nombre}» (ni como pestaña, ni como fila, enlace o resumen) en ${p.url()}`)
}
