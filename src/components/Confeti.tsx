// Ráfaga de confeti para el final del recorrido ("¡Se juntan!"). Solo CSS, una vez, decorativa.
// Con movimiento reducido no se muestra.
import type { CSSProperties } from 'react'

const COLORES = ['var(--brasa-viva)', '#4cc98a', '#f0b44c', '#86b3ff', '#b79bff', '#ffffff']

const PIEZAS = Array.from({ length: 18 }, (_, i) => {
  const angulo = (i / 18) * Math.PI - Math.PI // abanico hacia arriba
  const fuerza = 70 + ((i * 37) % 60)
  return {
    x: Math.round(Math.cos(angulo) * fuerza * 1.6),
    y: Math.round(Math.sin(angulo) * fuerza),
    giro: (i * 67) % 360,
    color: COLORES[i % COLORES.length],
    retraso: (i % 5) * 40,
  }
})

export function Confeti() {
  return (
    <span className="confeti" aria-hidden="true">
      {PIEZAS.map((p, i) => (
        <i
          key={i}
          style={
            {
              '--cx': `${p.x}px`,
              '--cy': `${p.y}px`,
              '--cr': `${p.giro}deg`,
              background: p.color,
              animationDelay: `${p.retraso}ms`,
            } as CSSProperties
          }
        />
      ))}
    </span>
  )
}
