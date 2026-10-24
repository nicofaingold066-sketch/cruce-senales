// #67 (A2 de docs/agente-revision-a11y.md): confirmaciones de acciones que no se deshacen, con foco y anuncio.
// Archivo propio para no tocar ui.tsx, que en el rediseño de la noche es solo de la sesión diseno.
import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { Aviso } from './ui'

/**
 * #67 (A2 de docs/agente-revision-a11y.md): la pregunta de una acción que no se deshace (cancelar, retirarse, dar de
 * baja, reiniciar) toma el foco al aparecer, así el lector la anuncia y el teclado sigue desde ahí.
 */
export function Confirmacion({ titulo, children }: { titulo: string; children?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    ref.current?.focus()
  }, [])
  return (
    <Aviso ref={ref} tabIndex={-1} tono="aviso" titulo={titulo}>
      {children}
    </Aviso>
  )
}

/** Con "Volver", el foco regresa al botón que abrió la pregunta (el marcado con `data-abre-confirmacion` dentro de `zona`). */
export function useVolverFoco<T extends HTMLElement>() {
  const zona = useRef<T>(null)
  const pendiente = useRef<string | null>(null)
  useEffect(() => {
    if (pendiente.current === null) return
    const selector = pendiente.current
    pendiente.current = null
    zona.current?.querySelector<HTMLElement>(selector)?.focus()
  })
  return {
    zona,
    volver: (cerrar: () => void, selector = '[data-abre-confirmacion]') => {
      pendiente.current = selector
      cerrar()
    },
  }
}
