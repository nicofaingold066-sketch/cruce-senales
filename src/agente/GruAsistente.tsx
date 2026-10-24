import { useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore, type RefObject, type PointerEvent as ReactPointerEvent, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent as ReactMouseEvent } from 'react'
import type { Identidad, Ruta } from '../lib/shell'
import { GruPersonaje } from './GruPersonaje'
import { useEstadoGru } from './gruEstado'
import './gru-asistente.css'

interface GruAsistenteProps {
  identidad: Identidad
  soloLectura: boolean
  parseRuta: (hash: string) => Ruta
  rutaAgente: (id: string) => string
}

const ESTADOS = {
  disponible: 'Disponible',
  buscando: 'Buscando',
  listo: 'Propuesta lista',
  'sin-opcion': 'Sin opción',
  error: 'No pude completar la búsqueda',
}

function suscribirHash(notificar: () => void) {
  window.addEventListener('hashchange', notificar)
  return () => window.removeEventListener('hashchange', notificar)
}

const leerHash = () => window.location.hash
const hashServidor = () => '#/'

interface UbicacionGru {
  x: number
  y: number
  colocado: boolean
  reserva: boolean
  claro: boolean
  arriba: boolean
  izquierda: boolean
  altoPanel: number
  anchoPanel: number
  panelX: number
  manual: boolean
}

const ANCHO_GRU = 54
const ALTO_GRU = 68
const MARGEN_GRU = 12

/** Busca espacio libre o conserva la ubicación elegida por la persona durante la navegación. */
function useUbicacionGru(hash: string, ruta: Ruta['nombre'], raiz: RefObject<HTMLDivElement | null>, visible: boolean) {
  const [ubicacion, setUbicacion] = useState<UbicacionGru>({ x: 0, y: 0, colocado: false, reserva: false, claro: false, arriba: false, izquierda: false, altoPanel: 320, anchoPanel: 320, panelX: 0, manual: false })
  const actual = useRef(ubicacion)
  const [animar, setAnimar] = useState(false)
  const [arrastrando, setArrastrando] = useState(false)
  const manual = useRef<{ x: number; y: number } | null>(null)
  const gesto = useRef<{ id: number; inicioX: number; inicioY: number; x: number; y: number; movido: boolean } | null>(null)
  const ignorarClick = useRef(false)
  const mover = useRef<((punto?: { x: number; y: number }) => void) | null>(null)

  useEffect(() => {
    if (!ubicacion.colocado) return
    const cuadro = requestAnimationFrame(() => setAnimar(true))
    return () => cancelAnimationFrame(cuadro)
  }, [ubicacion.colocado])

  useLayoutEffect(() => {
    if (!visible) return
    let cuadro = 0
    let pausaScroll: ReturnType<typeof setTimeout> | undefined
    let reservaDeRuta = false
    const medir = (preferirRuta = false, puntoManual?: { x: number; y: number }) => {
      // Ningún observer puede mover a GRU debajo del dedo mientras se lo sostiene.
      if (gesto.current && !puntoManual) return
      if (puntoManual) manual.current = puntoManual
      const propio = raiz.current
      if (!propio) return
      const disparador = propio.querySelector('.gru-asistente-boton')?.getBoundingClientRect()
      const anchoGru = Math.ceil(disparador?.width || ANCHO_GRU)
      const altoGru = Math.ceil(disparador?.height || ALTO_GRU)
      const viewport = window.visualViewport
      const izquierda = viewport?.offsetLeft ?? 0
      const arriba = viewport?.offsetTop ?? 0
      const ancho = viewport?.width ?? document.documentElement.clientWidth
      const alto = viewport?.height ?? window.innerHeight
      const derecha = izquierda + ancho
      const abajo = arriba + alto
      const elementos = manual.current ? [] : [...document.querySelectorAll<HTMLElement>('button,a,input,textarea,select,summary,h1,h2,h3,p,label,dt,dd,.barra,.nav-inferior,.barra-accion')]
      const obstaculos: { left: number; right: number; top: number; bottom: number }[] = []
      let limiteSuperior = arriba + MARGEN_GRU
      let limiteInferior = abajo - MARGEN_GRU
      for (const elemento of elementos) {
        if (propio.contains(elemento) || elemento.closest('.visualmente-oculto,[hidden],[aria-hidden="true"]')) continue
        const estilo = getComputedStyle(elemento)
        if (estilo.display === 'none' || estilo.visibility === 'hidden' || Number(estilo.opacity) === 0) continue
        const caja = elemento.getBoundingClientRect()
        if (caja.width < 2 || caja.height < 2 || caja.bottom <= arriba || caja.top >= abajo || caja.right <= izquierda || caja.left >= derecha) continue
        // Los títulos bloquean sus letras, no toda la franja vacía del bloque.
        const cajas = /^(H[123]|P|LABEL|DT|DD)$/.test(elemento.tagName) ? (() => {
          const rectangulos: DOMRect[] = []
          const textos = document.createTreeWalker(elemento, NodeFilter.SHOW_TEXT)
          let texto: Node | null
          while ((texto = textos.nextNode())) {
            if (!texto.textContent?.trim()) continue
            const rango = document.createRange()
            rango.selectNodeContents(texto)
            rectangulos.push(...rango.getClientRects())
          }
          return rectangulos
        })() : [caja]
        for (const rectangulo of cajas) obstaculos.push(rectangulo)
        if (elemento.matches('.barra')) limiteSuperior = Math.max(limiteSuperior, caja.bottom + MARGEN_GRU)
        if (elemento.matches('.nav-inferior,.barra-accion') && caja.width > ancho * 0.65 && caja.top > arriba + alto / 2) {
          limiteInferior = Math.min(limiteInferior, caja.top - MARGEN_GRU)
        }
      }

      const xIzquierda = izquierda + MARGEN_GRU
      const xDerecha = Math.max(xIzquierda, derecha - anchoGru - MARGEN_GRU)
      const yArriba = limiteSuperior
      const yAbajo = Math.max(yArriba, limiteInferior - altoGru)
      const medio = (yArriba + yAbajo) / 2
      const laterales = [medio, yArriba + (yAbajo - yArriba) * 0.25, yArriba + (yAbajo - yArriba) * 0.75]
      const preferirIzquierda = ruta === 'inicio'
      const primero = preferirIzquierda ? xIzquierda : xDerecha
      const segundo = preferirIzquierda ? xDerecha : xIzquierda
      const candidatos = [
        { x: primero, y: yAbajo }, { x: segundo, y: yAbajo },
        ...laterales.flatMap((y) => [{ x: primero, y }, { x: segundo, y }]),
        { x: segundo, y: yArriba }, { x: primero, y: yArriba },
        // Las esquinas no cubren todos los huecos: también probamos justo antes/después del texto o control.
        ...obstaculos.flatMap((caja) => [caja.top - altoGru - MARGEN_GRU, caja.bottom + MARGEN_GRU])
          .filter((y) => y >= yArriba && y <= yAbajo)
          .sort((a, b) => b - a)
          .flatMap((y) => [{ x: primero, y }, { x: segundo, y }]),
      ]
      const libre = (punto: { x: number; y: number }) =>
        punto.x >= izquierda && punto.x + anchoGru <= derecha && punto.y >= arriba && punto.y + altoGru <= abajo
        && !obstaculos.some((caja) => punto.x < caja.right + 5 && punto.x + anchoGru > caja.left - 5
          && punto.y < caja.bottom + 5 && punto.y + altoGru > caja.top - 5)

      const anterior = actual.current
      // La reserva, si fue necesaria, se mantiene durante esta ruta para que el contenido no oscile.
      const mantener = !preferirRuta && anterior.colocado && libre(anterior)
      // La persona elige incluso sobre contenido. Sólo se ajusta al borde visible,
      // también al rotar el teléfono, abrir el teclado o cambiar de pantalla.
      let punto = manual.current ? {
        x: Math.max(xIzquierda, Math.min(manual.current.x, xDerecha)),
        y: Math.max(arriba + MARGEN_GRU, Math.min(manual.current.y, abajo - altoGru - MARGEN_GRU)),
      } : mantener ? anterior : candidatos.find(libre)
      let reserva = false
      if (!punto) {
        reservaDeRuta = true
        reserva = true
        punto = { x: xDerecha, y: limiteSuperior }
      }
      if (manual.current) manual.current = punto

      // Se toma el color de la superficie bajo el nombre, sin agregarle una pastilla de fondo.
      const superficies = document.elementsFromPoint(punto.x + anchoGru / 2, punto.y + altoGru - 8)
      let claro = false
      for (const superficie of superficies) {
        if (propio.contains(superficie)) continue
        const color = getComputedStyle(superficie).backgroundColor.match(/[\d.]+/g)?.map(Number)
        if (color && color.length >= 3 && (color.length < 4 || color[3] > 0.8)) {
          claro = color[0] * 0.2126 + color[1] * 0.7152 + color[2] * 0.0722 < 145
          break
        }
      }
      const espacioArriba = punto.y - arriba - MARGEN_GRU
      const espacioAbajo = abajo - punto.y - altoGru - MARGEN_GRU
      const panelArriba = manual.current ? espacioArriba > espacioAbajo : punto.y > arriba + alto * 0.45
      const anchoPanel = Math.max(1, Math.min(320, ancho - MARGEN_GRU * 2))
      const panelX = Math.max(izquierda + MARGEN_GRU, Math.min(
        punto.x < izquierda + ancho / 2 ? punto.x : punto.x + anchoGru - anchoPanel,
        derecha - anchoPanel - MARGEN_GRU,
      )) - punto.x
      const siguiente: UbicacionGru = {
        x: Math.round(punto.x), y: Math.round(punto.y), colocado: true,
        reserva: !manual.current && (reservaDeRuta || reserva),
        claro, arriba: panelArriba, izquierda: punto.x < izquierda + ancho / 2,
        altoPanel: Math.max(manual.current ? 0 : 100, Math.floor(panelArriba ? espacioArriba : espacioAbajo)),
        anchoPanel, panelX, manual: !!manual.current,
      }
      if (Object.keys(siguiente).some((clave) => siguiente[clave as keyof UbicacionGru] !== anterior[clave as keyof UbicacionGru])) {
        actual.current = siguiente
        setUbicacion(siguiente)
      }
    }
    mover.current = (punto) => medir(false, punto)
    const programar = () => {
      if (cuadro) return
      cuadro = requestAnimationFrame(() => { cuadro = 0; medir() })
    }
    const alDesplazar = () => {
      clearTimeout(pausaScroll)
      pausaScroll = setTimeout(programar, 120)
    }
    const alTerminarMovimiento = (evento: Event) => {
      if (evento.target instanceof Node && !raiz.current?.contains(evento.target)) programar()
    }
    medir(true)
    // Las pantallas con carga diferida pueden aparecer después del cambio de hash.
    const mutaciones = new MutationObserver((cambios) => {
      if (cambios.some((cambio) => !raiz.current?.contains(cambio.target))) programar()
    })
    mutaciones.observe(document.body, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ['class', 'hidden', 'open', 'aria-hidden', 'aria-modal'] })
    const tamanos = new ResizeObserver(programar)
    tamanos.observe(document.body)
    for (const elemento of document.querySelectorAll('main#contenido,.barra')) tamanos.observe(elemento)
    window.addEventListener('resize', programar)
    window.addEventListener('scroll', alDesplazar, { passive: true })
    document.addEventListener('animationend', alTerminarMovimiento, true)
    document.addEventListener('transitionend', alTerminarMovimiento, true)
    window.visualViewport?.addEventListener('resize', programar)
    window.visualViewport?.addEventListener('scroll', alDesplazar)
    return () => {
      mover.current = null
      gesto.current = null
      setArrastrando(false)
      cancelAnimationFrame(cuadro)
      clearTimeout(pausaScroll)
      mutaciones.disconnect()
      tamanos.disconnect()
      window.removeEventListener('resize', programar)
      window.removeEventListener('scroll', alDesplazar)
      document.removeEventListener('animationend', alTerminarMovimiento, true)
      document.removeEventListener('transitionend', alTerminarMovimiento, true)
      window.visualViewport?.removeEventListener('resize', programar)
      window.visualViewport?.removeEventListener('scroll', alDesplazar)
    }
  }, [hash, ruta, raiz, visible])

  type Disparador = HTMLAnchorElement | HTMLButtonElement
  const arrastre = {
    onPointerDown(evento: ReactPointerEvent<Disparador>) {
      if (!evento.isPrimary || evento.button !== 0) return
      const caja = evento.currentTarget.getBoundingClientRect()
      ignorarClick.current = false
      gesto.current = { id: evento.pointerId, inicioX: evento.clientX, inicioY: evento.clientY, x: caja.x, y: caja.y, movido: false }
      evento.currentTarget.setPointerCapture(evento.pointerId)
    },
    onPointerMove(evento: ReactPointerEvent<Disparador>) {
      const inicio = gesto.current
      if (!inicio || inicio.id !== evento.pointerId) return
      const dx = evento.clientX - inicio.inicioX
      const dy = evento.clientY - inicio.inicioY
      if (!inicio.movido && Math.hypot(dx, dy) < 6) return
      inicio.movido = true
      ignorarClick.current = true
      setArrastrando(true)
      mover.current?.({ x: inicio.x + dx, y: inicio.y + dy })
    },
    onPointerUp: terminarArrastre,
    onPointerCancel: terminarArrastre,
    onLostPointerCapture: terminarArrastre,
    onClickCapture(evento: ReactMouseEvent<Disparador>) {
      if (!ignorarClick.current || evento.detail === 0) return
      evento.preventDefault()
      evento.stopPropagation()
      ignorarClick.current = false
    },
    onKeyDown(evento: ReactKeyboardEvent<Disparador>) {
      const paso = { ArrowLeft: [-16, 0], ArrowRight: [16, 0], ArrowUp: [0, -16], ArrowDown: [0, 16] }[evento.key]
      if (!evento.altKey || !paso) return
      evento.preventDefault()
      const caja = evento.currentTarget.getBoundingClientRect()
      mover.current?.({ x: caja.x + paso[0], y: caja.y + paso[1] })
    },
    draggable: false,
  }
  function terminarArrastre(evento: ReactPointerEvent<Disparador>) {
    if (gesto.current?.id !== evento.pointerId) return
    gesto.current = null
    setArrastrando(false)
    if (evento.currentTarget.hasPointerCapture(evento.pointerId)) evento.currentTarget.releasePointerCapture(evento.pointerId)
    mover.current?.()
  }

  return { ...ubicacion, animar, arrastrando, arrastre }
}

/** Presencia pequeña de GRU. La actividad viene de solicitudes reales; no inicia búsquedas ni modifica planes. */
export function GruAsistente({ identidad, soloLectura, parseRuta, rutaAgente }: GruAsistenteProps) {
  const hash = useSyncExternalStore(suscribirHash, leerHash, hashServidor)
  const ruta = parseRuta(hash)
  const enPestanaGru = ruta.nombre === 'espacio' && ruta.vista === 'agente'
  const grupoActual = 'espacioId' in ruta ? ruta.espacioId : null
  const [ultimoGrupoVisitado, setUltimoGrupoVisitado] = useState(grupoActual)
  const ultimaActividad = useEstadoGru()
  const grupoDestino = grupoActual ?? ultimoGrupoVisitado ?? ultimaActividad.espacioId
  const actividad = useEstadoGru(grupoDestino)
  const [abiertoEn, setAbiertoEn] = useState<string | null>(null)
  const abierto = !grupoDestino && abiertoEn === hash
  const raiz = useRef<HTMLDivElement>(null)
  const ubicacion = useUbicacionGru(hash, ruta.nombre, raiz, !enPestanaGru)
  const boton = useRef<HTMLButtonElement>(null)
  const panelId = useId()
  const tituloId = useId()
  const ayudaArrastreId = useId()

  // El panel se cierra al navegar y no reaparece si se vuelve a ese hash.
  // No roba el foco de la pantalla que acaba de abrirse.
  useEffect(() => setAbiertoEn(null), [hash])
  useEffect(() => {
    if (grupoActual) setUltimoGrupoVisitado(grupoActual)
  }, [grupoActual])

  useEffect(() => {
    if (!abierto) return
    function cerrarFuera(evento: PointerEvent) {
      if (evento.target instanceof Node && !raiz.current?.contains(evento.target)) setAbiertoEn(null)
    }
    function cerrarConEscape(evento: KeyboardEvent) {
      if (evento.key !== 'Escape' || evento.defaultPrevented) return
      evento.preventDefault()
      setAbiertoEn(null)
      boton.current?.focus({ preventScroll: true })
    }
    document.addEventListener('pointerdown', cerrarFuera)
    document.addEventListener('keydown', cerrarConEscape)
    return () => {
      document.removeEventListener('pointerdown', cerrarFuera)
      document.removeEventListener('keydown', cerrarConEscape)
    }
  }, [abierto])

  function cerrar() {
    setAbiertoEn(null)
    boton.current?.focus({ preventScroll: true })
  }

  const estadoTexto = soloLectura ? 'En pausa' : ESTADOS[actividad.estado]
  const titulo = soloLectura
    ? 'Necesitamos actualizar la app.'
    : 'Soy GRU, tu asistente de IA.'
  const descripcion = soloLectura
    ? 'Recargá la aplicación para volver a pedirme un plan.'
    : 'Elegí uno de tus grupos para abrir mi pestaña y preparar un plan juntos. Me vas a encontrar por acá.'
  const miniatura = (
    <>
      <GruPersonaje estado={actividad.estado} tamano="mini" interactivo={false} className="gru-asistente-personaje" />
      <span className="gru-asistente-nombre" aria-hidden="true">GRU</span>
      <span className="gru-asistente-indicador" aria-hidden="true" />
    </>
  )

  // En su pestaña ya está el personaje grande. Quitar el dock también elimina cualquier reserva de espacio.
  if (enPestanaGru) return null

  return (
    <div
      ref={raiz}
      className="gru-asistente"
      data-estado={actividad.estado}
      data-abierto={abierto ? 'true' : 'false'}
      data-colocado={ubicacion.colocado}
      data-animar={ubicacion.animar}
      data-manual={ubicacion.manual}
      data-arrastrando={ubicacion.arrastrando}
      data-reserva={ubicacion.reserva}
      data-claro={ubicacion.claro}
      data-panel-arriba={ubicacion.arriba}
      data-izquierda={ubicacion.izquierda}
      style={{ transform: `translate3d(${ubicacion.x}px, ${ubicacion.y}px, 0)` }}
      onBlur={(evento) => {
        // Popover no modal: Tab puede seguir con el resto de la app.
        if (evento.relatedTarget instanceof Node && !evento.currentTarget.contains(evento.relatedTarget)) setAbiertoEn(null)
      }}
    >
      {grupoDestino ? (
        <a
          {...ubicacion.arrastre}
          className="gru-asistente-boton"
          href={rutaAgente(grupoDestino)}
          aria-label={`Abrir pestaña de GRU${grupoActual && identidad.espacio ? ` en ${identidad.espacio}` : ''}. ${estadoTexto}.`}
          aria-describedby={ayudaArrastreId}
          title={`GRU · ${estadoTexto} · Arrastra para mover`}
          onClick={(evento) => {
            setAbiertoEn(null)
            if (ruta.nombre === 'espacio' && ruta.vista === 'agente' && ruta.espacioId === grupoDestino
              && evento.button === 0 && !evento.metaKey && !evento.ctrlKey && !evento.altKey && !evento.shiftKey) {
              evento.preventDefault()
              window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
            }
          }}
        >
          {miniatura}
        </a>
      ) : <button
        {...ubicacion.arrastre}
        ref={boton}
        type="button"
        className="gru-asistente-boton"
        aria-label={`${abierto ? 'Cerrar' : 'Abrir'} a GRU, tu asistente de IA. Elegí un grupo para abrir su pestaña.`}
        aria-haspopup="dialog"
        aria-expanded={abierto}
        aria-controls={abierto ? panelId : undefined}
        aria-describedby={ayudaArrastreId}
        title="GRU · Arrastra para mover"
        onClick={() => setAbiertoEn(abierto ? null : hash)}
      >
        {miniatura}
      </button>}
      <span id={ayudaArrastreId} className="visualmente-oculto">Arrastra para mover a GRU. Con teclado, usa Alt y las flechas.</span>
      {abierto ? (
        <section
          id={panelId}
          className="gru-asistente-panel"
          role="dialog"
          aria-modal="false"
          aria-labelledby={tituloId}
          style={{ maxHeight: ubicacion.altoPanel, ...(ubicacion.manual ? { left: ubicacion.panelX, right: 'auto', width: ubicacion.anchoPanel } : {}) }}
        >
          <div className="gru-asistente-cabecera">
            <div>
              <p className="gru-asistente-identidad" id={tituloId}>GRU <span>Tu asistente de IA</span></p>
              <p className="gru-asistente-estado" role="status">{estadoTexto}</p>
            </div>
            <button type="button" className="gru-asistente-cerrar" aria-label="Cerrar el asistente GRU" onClick={cerrar}>
              <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
            </button>
          </div>
          <p className="gru-asistente-contexto">Siempre a mano</p>
          <h2 className="gru-asistente-titulo">{titulo}</h2>
          <p className="gru-asistente-descripcion">{descripcion}</p>
          <a
            className="gru-asistente-enlace"
            href="#/"
            onClick={() => setAbiertoEn(null)}
          >
            Ver mis grupos
            <span aria-hidden="true">↗</span>
          </a>
          <p className="gru-asistente-nota">Yo propongo. El grupo decide.</p>
        </section>
      ) : null}
    </div>
  )
}

export default GruAsistente
