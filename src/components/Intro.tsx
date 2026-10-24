// Dos personas se cruzan, se enciende la X y aparece CRUXE. SVG y CSS propios, sin video ni red.
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import './Intro.css'
import { parseRuta } from '../lib/shell'

const CLAVE = 'cruxe:entrada-vista'
const DURACION_MS = 2600
const SALIDA_MS = 300
let vistaEnEstaCarga = false

function yaVista(): boolean {
  if (vistaEnEstaCarga) return true
  // El respaldo por pestaña ayuda si el navegador permite sessionStorage pero bloquea localStorage.
  for (const tipo of ['localStorage', 'sessionStorage'] as const) {
    try {
      if (window[tipo].getItem(CLAVE) === '1') return true
    } catch {
      // El almacenamiento bloqueado nunca impide entrar.
    }
  }
  return false
}

function marcarVista() {
  vistaEnEstaCarga = true
  for (const tipo of ['localStorage', 'sessionStorage'] as const) {
    try {
      window[tipo].setItem(CLAVE, '1')
    } catch {
      // Sin almacenamiento se recuerda, al menos, durante esta carga de la app.
    }
  }
}

function movimientoReducido(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Primera visita a la app, también al llegar desde una invitación. No depende de Auth ni cambia la ruta. */
export function useEntrada() {
  // La intro es de la portada: quien llega por una invitación (#/unirse, #/e/…, #/responder) va directo a lo suyo.
  const [visible, setVisible] = useState(() => {
    const ruta = parseRuta(window.location.hash).nombre
    return !yaVista() && !movimientoReducido() && (ruta === 'inicio' || ruta === 'entrar' || ruta === 'crear')
  })
  useEffect(() => {
    // Se recuerda también si se omitió por movimiento reducido; nunca escribir en el inicializador de React.
    marcarVista()
  }, [])
  // Repetir desde Ayuda no altera las marcas de primera visita ni fuerza movimiento.
  const abrir = useCallback(() => setVisible(!movimientoReducido()), [])
  const cerrar = useCallback(() => setVisible(false), [])
  return { visible, abrir, cerrar }
}

export function Entrada({ alTerminar }: { alTerminar: () => void }) {
  const dialogo = useRef<HTMLDialogElement>(null)
  const [saliendo, setSaliendo] = useState(false)
  const salir = useCallback(() => setSaliendo(true), [])

  useLayoutEffect(() => {
    const el = dialogo.current
    if (!el) return
    const origen = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const overflowAnterior = document.body.style.overflow
    // Un diálogo nativo mantiene el fondo inerte y el foco en «Saltar intro».
    el.showModal()
    document.body.style.overflow = 'hidden'
    return () => {
      const focoEnIntro = el.contains(document.activeElement)
      el.close()
      document.body.style.overflow = overflowAnterior
      if (focoEnIntro) {
        const destino = origen?.isConnected && origen !== document.body ? origen : document.getElementById('contenido')
        destino?.focus({ preventScroll: true })
      }
    }
  }, [])

  useEffect(() => {
    const fin = window.setTimeout(salir, DURACION_MS)
    const preferencia = window.matchMedia('(prefers-reduced-motion: reduce)')
    const omitir = () => {
      if (preferencia.matches) alTerminar()
    }
    preferencia.addEventListener('change', omitir)
    return () => {
      window.clearTimeout(fin)
      preferencia.removeEventListener('change', omitir)
    }
  }, [alTerminar, salir])

  useEffect(() => {
    if (!saliendo) return
    const fin = window.setTimeout(alTerminar, SALIDA_MS)
    return () => window.clearTimeout(fin)
  }, [saliendo, alTerminar])

  return (
    <dialog
      ref={dialogo}
      className={`cruxe-intro${saliendo ? ' cruxe-intro--saliendo' : ''}`}
      aria-label="Bienvenido a CRUXE"
      onCancel={(e) => { e.preventDefault(); salir() }}
      onClick={salir}
    >
      <div className="cruxe-intro__arte" aria-hidden="true">
        <div className="cruxe-intro__halo" />
        <span className="cruxe-intro__haz cruxe-intro__haz--uno" />
        <span className="cruxe-intro__haz cruxe-intro__haz--dos" />
        <span className="cruxe-intro__haz cruxe-intro__haz--tres" />
        <div className="cruxe-intro__centro">
          <div className="cruxe-intro__escena">
            <div className="cruxe-intro__marca">
              <span className="cruxe-intro__letras cruxe-intro__izq"><span>CRU</span></span>
              <div className="cruxe-intro__simbolo">
                <svg className="cruxe-intro__x" viewBox="0 0 100 100" focusable="false">
                  <defs>
                    <clipPath id="cruxe-intro-recorte">
                      <rect className="cruxe-intro__recorte" x="-10" y="-10" width="120" height="120" />
                    </clipPath>
                    <linearGradient id="cruxe-intro-brasa" x1="0" y1="0" x2="1" y2="1">
                      <stop stopColor="#ffb284" />
                      <stop offset="0.48" stopColor="#ff783e" />
                      <stop offset="1" stopColor="#e94e19" />
                    </linearGradient>
                  </defs>
                  <circle className="cruxe-intro__onda" cx="50" cy="50" r="34" />
                  <path className="cruxe-intro__grueso" d="M9 6 L35 6 L91 94 L65 94 Z" clipPath="url(#cruxe-intro-recorte)" />
                  <path className="cruxe-intro__fino" d="M89 8 L64.4 34.5" pathLength={1} />
                  <path className="cruxe-intro__fino" d="M11 92 L35.6 65.5" pathLength={1} />
                  <circle className="cruxe-intro__persona cruxe-intro__persona--a" cx="64.4" cy="34.5" r="7.2" />
                  <circle className="cruxe-intro__persona cruxe-intro__persona--b" cx="35.6" cy="65.5" r="7.2" />
                </svg>
              </div>
              <span className="cruxe-intro__letras cruxe-intro__der"><span>E</span></span>
            </div>
          </div>
          <p className="cruxe-intro__lema">Menos vueltas. Más encuentros.</p>
        </div>
        <span className="cruxe-intro__progreso" />
      </div>
      <button type="button" className="cruxe-intro__saltar" onClick={salir} autoFocus>
        Saltar intro <span aria-hidden="true">↗</span>
      </button>
    </dialog>
  )
}
