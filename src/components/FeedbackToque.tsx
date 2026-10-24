import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { createPortal } from 'react-dom'

const DURACION = 280
const CONTROLES = 'button, a[href], summary, [role="button"], [role="link"], [role="tab"], input[type="button"], input[type="submit"], input[type="reset"]'
const EDICION = 'textarea, select, [contenteditable]:not([contenteditable="false"]), input:not([type="button"]):not([type="submit"]):not([type="reset"])'

type Eco = { id: number; x: number; y: number; teclado: boolean; vence: number }

/** Eco de una activación, sin afirmar nada sobre el resultado de la acción. */
export function FeedbackToque() {
  const [ecos, setEcos] = useState<Eco[]>([])
  const siguiente = useRef(0)

  useEffect(() => {
    const movimiento = window.matchMedia('(prefers-reduced-motion: reduce)')

    function activar(evento: MouseEvent) {
      if (movimiento.matches || evento.button !== 0) return
      const teclado = evento.detail === 0

      const origen = evento.target instanceof Element ? evento.target : null
      if (!origen || origen.closest(EDICION)) return
      const control = origen.closest<HTMLElement>(CONTROLES)
      if (!control || control.matches(':disabled') || control.closest('[aria-disabled="true"], [aria-busy="true"], [inert]')) return

      // Captura antes de que una acción cambie la pantalla o marque el botón ocupado.
      const caja = control.getBoundingClientRect()
      if (caja.width <= 0 || caja.height <= 0) return
      const eco: Eco = {
        id: siguiente.current++,
        x: teclado ? caja.left + caja.width / 2 : evento.clientX,
        y: teclado ? caja.top + caja.height / 2 : evento.clientY,
        teclado,
        vence: performance.now() + DURACION,
      }
      setEcos((actuales) => [...actuales.filter((e) => e.vence > performance.now()).slice(-5), eco])
    }

    function cambiarMovimiento() {
      if (movimiento.matches) setEcos([])
    }

    document.addEventListener('click', activar, { capture: true, passive: true })
    movimiento.addEventListener('change', cambiarMovimiento)
    return () => {
      document.removeEventListener('click', activar, true)
      movimiento.removeEventListener('change', cambiarMovimiento)
    }
  }, [])

  // Un único reloj limpia también si la hoja CSS no llega a animar algún eco.
  useEffect(() => {
    if (ecos.length === 0) return
    const vence = Math.min(...ecos.map((eco) => eco.vence))
    const reloj = window.setTimeout(() => {
      setEcos((actuales) => actuales.filter((eco) => eco.vence > performance.now()))
    }, Math.max(0, Math.ceil(vence - performance.now())))
    return () => window.clearTimeout(reloj)
  }, [ecos])

  if (typeof document === 'undefined') return null
  return createPortal(
    <div className="vida-feedback" aria-hidden="true">
      {ecos.map((eco) => (
        <span
          key={eco.id}
          className={`vida-eco${eco.teclado ? ' vida-eco-teclado' : ''}`}
          style={{ '--eco-x': `${eco.x}px`, '--eco-y': `${eco.y}px` } as CSSProperties}
          onAnimationEnd={() => setEcos((actuales) => actuales.filter((e) => e.id !== eco.id))}
        />
      ))}
    </div>,
    document.body,
  )
}
