import { useEffect, useRef, useState, type PointerEvent } from 'react'
import type { GruEstado } from './gruEstado'
import './gru.css'

interface Props {
  estado: GruEstado
  tamano?: 'mini' | 'grande'
  interactivo?: boolean
  className?: string
}

/** GRU expresa actividad; sus gestos nunca ejecutan acciones ni cambian un plan. */
export function GruPersonaje({ estado, tamano = 'grande', interactivo = true, className = '' }: Props) {
  const [saludando, setSaludando] = useState(false)
  const grafico = useRef<HTMLSpanElement>(null)
  const saludo = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => () => clearTimeout(saludo.current), [])
  useEffect(() => {
    const elemento = grafico.current
    if (!elemento) return
    let visible = true
    const actualizar = () => { elemento.dataset.pausado = String(document.hidden || !visible) }
    const observador = new IntersectionObserver(([entrada]) => { visible = entrada.isIntersecting; actualizar() })
    observador.observe(elemento)
    document.addEventListener('visibilitychange', actualizar)
    actualizar()
    return () => { observador.disconnect(); document.removeEventListener('visibilitychange', actualizar) }
  }, [])

  function mirar(evento: PointerEvent<HTMLElement>) {
    if (evento.pointerType === 'touch' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const elemento = grafico.current
    if (!elemento) return
    const caja = evento.currentTarget.getBoundingClientRect()
    const x = Math.max(-1, Math.min(1, (evento.clientX - caja.left - caja.width / 2) / (caja.width / 2)))
    const y = Math.max(-1, Math.min(1, (evento.clientY - caja.top - caja.height / 2) / (caja.height / 2)))
    elemento.style.setProperty('--gru-mirada-x', `${x * 3}px`)
    elemento.style.setProperty('--gru-mirada-y', `${y * 2}px`)
  }
  function centrar() {
    grafico.current?.style.setProperty('--gru-mirada-x', '0px')
    grafico.current?.style.setProperty('--gru-mirada-y', '0px')
  }
  function saludar() {
    clearTimeout(saludo.current)
    setSaludando(true)
    saludo.current = setTimeout(() => setSaludando(false), 1700)
  }

  const dibujo = (
    <span ref={grafico} className="gru-grafico" data-estado={estado} data-saludando={saludando} aria-hidden="true">
      <span className="gru-orbita" /><span className="gru-sombra" />
      <span className="gru-ser">
        <span className="gru-mano gru-mano--izquierda" /><span className="gru-mano gru-mano--derecha" />
        <span className="gru-cuerpo" />
        <span className="gru-cara">
          <span className="gru-cejas"><span /><span /></span>
          <span className="gru-ojos"><span className="gru-ojo" /><span className="gru-ojo" /></span>
          <span className="gru-mejilla gru-mejilla--izquierda" /><span className="gru-mejilla gru-mejilla--derecha" />
          <span className="gru-boca" />
        </span>
      </span>
      <span className="gru-chispa gru-chispa--a" /><span className="gru-chispa gru-chispa--b" /><span className="gru-chispa gru-chispa--c" />
    </span>
  )
  const clases = `gru-personaje gru-personaje--${tamano} ${className}`
  return interactivo ? (
    <button type="button" className={clases} aria-label="Saludar a GRU" onClick={saludar} onPointerMove={mirar} onPointerLeave={centrar}>
      {dibujo}
    </button>
  ) : <span className={clases} onPointerMove={mirar} onPointerLeave={centrar} aria-hidden="true">{dibujo}</span>
}
