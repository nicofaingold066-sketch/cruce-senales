// Entrada de CRUXE (al estilo de la de Netflix, con el cruce): dos personas llegan desde lados opuestos,
// se enciende el trazo de brasa del plan, late el encuentro y la X se achica hasta formar CRU✕E.
// Solo SVG y CSS (src/styles.css, bloque "Entrada"). Una vez por sesión del navegador, se salta con un toque
// o una tecla y no aparece con movimiento reducido. Es decorativa: aria-hidden, no tapa a lectores de pantalla.
import { useEffect, useState } from 'react'

const CLAVE = 'cruxe:entrada-vista'
const DURACION_MS = 2900

function yaVista(): boolean {
  try {
    return sessionStorage.getItem(CLAVE) === '1'
  } catch {
    return false
  }
}

function marcarVista() {
  try {
    sessionStorage.setItem(CLAVE, '1')
  } catch {
    // Sin almacenamiento: se vuelve a ver en la próxima carga, no pasa nada.
  }
}

function movimientoReducido(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
}

/** true mientras la entrada está en pantalla. Solo se muestra en la portada y en la invitación. */
export function useEntrada(enPortada: boolean) {
  const [visible, setVisible] = useState(() => enPortada && !yaVista() && !movimientoReducido())
  useEffect(() => {
    if (visible) marcarVista()
  }, [visible])
  return { visible, cerrar: () => setVisible(false) }
}

export function Entrada({ alTerminar }: { alTerminar: () => void }) {
  const [saliendo, setSaliendo] = useState(false)

  useEffect(() => {
    let cerrado = false
    const salir = () => {
      if (cerrado) return
      cerrado = true
      setSaliendo(true)
      window.setTimeout(alTerminar, 380)
    }
    const fin = window.setTimeout(salir, DURACION_MS)
    const tecla = () => salir()
    window.addEventListener('keydown', tecla)
    const el = document.getElementById('entrada')
    el?.addEventListener('pointerdown', salir)
    return () => {
      window.clearTimeout(fin)
      window.removeEventListener('keydown', tecla)
      el?.removeEventListener('pointerdown', salir)
    }
  }, [alTerminar])

  return (
    <div id="entrada" className={`entrada ${saliendo ? 'entrada-saliendo' : ''}`} aria-hidden="true">
      <span className="entrada-haz entrada-haz-1" />
      <span className="entrada-haz entrada-haz-2" />
      <span className="entrada-haz entrada-haz-3" />
      <div className="entrada-marca">
        <span className="entrada-letras entrada-izq">
          <span>CRU</span>
        </span>
        <svg className="entrada-x" viewBox="0 0 100 100">
          <defs>
            <clipPath id="entrada-recorte">
              <rect className="entrada-recorte" x="-10" y="-10" width="120" height="120" />
            </clipPath>
          </defs>
          <circle className="entrada-onda" cx="50" cy="50" r="34" />
          <path className="entrada-grueso" d="M9 6 L35 6 L91 94 L65 94 Z" clipPath="url(#entrada-recorte)" />
          <path className="entrada-fino entrada-fino-a" d="M89 8 L64.4 34.5" pathLength={1} />
          <path className="entrada-fino entrada-fino-b" d="M11 92 L35.6 65.5" pathLength={1} />
          <circle className="entrada-persona entrada-persona-a" cx="64.4" cy="34.5" r="7.2" />
          <circle className="entrada-persona entrada-persona-b" cx="35.6" cy="65.5" r="7.2" />
        </svg>
        <span className="entrada-letras entrada-der">
          <span>E</span>
        </span>
      </div>
      <p className="entrada-lema">Del «nos juntamos» al encuentro que ocurre.</p>
      <span className="entrada-saltar">Toca para saltar</span>
    </div>
  )
}
