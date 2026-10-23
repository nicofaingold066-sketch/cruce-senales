// El cruce en 3D para la portada: las personas del grupo orbitan sobre un plano en perspectiva y, una por una,
// se conectan con un rayo de brasa hacia la X del centro, que flota de pie con su reflejo.
// Solo CSS 3D (bloque "Órbita 3D" en styles.css), sin librerías. Decorativa (aria-hidden); quieta con movimiento reducido.
import { useRef } from 'react'
import type { CSSProperties, PointerEvent } from 'react'
import { Trazos } from './Marca'

const PERSONAS = 7

export function Orbita({ compacta = false }: { compacta?: boolean }) {
  // Se inclina un poco hacia el dedo o el puntero (paralaje). Solo cambia dos variables CSS; no re-renderiza.
  const escena = useRef<HTMLDivElement>(null)
  function inclinar(e: PointerEvent<HTMLDivElement>) {
    const el = escena.current
    if (!el) return
    const r = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width - 0.5
    const y = (e.clientY - r.top) / r.height - 0.5
    el.style.setProperty('--incl-x', `${(-y * 14).toFixed(2)}deg`)
    el.style.setProperty('--incl-y', `${(x * 18).toFixed(2)}deg`)
  }
  function soltar() {
    escena.current?.style.setProperty('--incl-x', '0deg')
    escena.current?.style.setProperty('--incl-y', '0deg')
  }
  return (
    <div className={`orbita ${compacta ? 'orbita-compacta' : ''}`} aria-hidden="true" onPointerMove={inclinar} onPointerLeave={soltar} onPointerUp={soltar}>
      <div className="orbita-escena" ref={escena}>
        <div className="orbita-plano">
          <span className="orbita-anillo" />
          <span className="orbita-anillo orbita-anillo-2" />
          <span className="orbita-reflejo" />
          {Array.from({ length: PERSONAS }, (_, i) => (
            <span
              key={i}
              className="orbita-brazo"
              style={{ '--a': `${(360 / PERSONAS) * i}deg`, '--d': `${i * 0.55}s` } as CSSProperties}
            >
              <span className="orbita-rayo" />
              <span className="orbita-nodo">
                <span className={`orbita-esfera ${i % 3 === 1 ? 'orbita-esfera-tenue' : ''}`} />
              </span>
            </span>
          ))}
        </div>
        <div className="orbita-centro">
          <svg className="orbita-x" viewBox="0 0 100 100">
            <defs>
              <linearGradient id="orbita-brasa" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#ffb07a" />
                <stop offset="0.45" stopColor="#ff6a2b" />
                <stop offset="1" stopColor="#b4400f" />
              </linearGradient>
            </defs>
            <g fill="url(#orbita-brasa)">
              <Trazos />
            </g>
          </svg>
        </div>
      </div>
    </div>
  )
}
