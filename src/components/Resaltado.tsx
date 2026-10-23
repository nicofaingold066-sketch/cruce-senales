// Texto anotado a mano (idea del "Annotated Text" de componentry.dev, hecho propio en SVG y CSS, sin dependencias).
// Un trazo irregular se dibuja una sola vez al aparecer; con movimiento reducido aparece ya dibujado.
import type { CSSProperties, ReactNode } from 'react'

type Tipo = 'subrayado' | 'circulo' | 'marcador'

const TRAZOS: Record<Tipo, { viewBox: string; d: string }> = {
  subrayado: { viewBox: '0 0 200 20', d: 'M3 13 C 40 6, 70 17, 105 11 S 170 7, 197 12' },
  circulo: {
    viewBox: '0 0 200 60',
    d: 'M108 6 C 60 2, 12 12, 8 31 C 4 50, 60 58, 108 56 C 160 54, 196 44, 193 26 C 190 10, 150 3, 92 7',
  },
  marcador: { viewBox: '0 0 200 20', d: 'M2 11 C 60 9, 140 12, 198 9' },
}

export function Resaltado({
  children,
  tipo = 'subrayado',
  retraso = 0.35,
  color,
}: {
  children: ReactNode
  tipo?: Tipo
  /** Segundos antes de dibujar el trazo. */
  retraso?: number
  color?: string
}) {
  const t = TRAZOS[tipo]
  const estilo = { '--res-retraso': `${retraso}s`, ...(color ? { '--res-color': color } : {}) } as CSSProperties
  return (
    <span className={`resaltado resaltado-${tipo}`} style={estilo}>
      {children}
      <svg className="resaltado-trazo" viewBox={t.viewBox} preserveAspectRatio="none" aria-hidden="true" focusable="false">
        <path d={t.d} pathLength={1} />
      </svg>
    </span>
  )
}
