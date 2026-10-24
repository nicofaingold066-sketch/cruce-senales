import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { Coffee } from 'lucide-react'
import { parseRuta } from '../lib/shell'
import { Icono } from './Icono'
import type { NombreIcono } from './Icono'
import './Guia.css'

const CLAVE = 'cruxe:guia-vista:v1'
let vistaEnEstaCarga = false

function yaVista() {
  if (vistaEnEstaCarga) return true
  for (const tipo of ['localStorage', 'sessionStorage'] as const) {
    try {
      if (window[tipo].getItem(CLAVE) === '1') return true
    } catch { /* El almacenamiento bloqueado nunca impide usar la guía. */ }
  }
  return false
}

function recordarVisita() {
  vistaEnEstaCarga = true
  for (const tipo of ['localStorage', 'sessionStorage'] as const) {
    try { window[tipo].setItem(CLAVE, '1') } catch { /* Respaldo en memoria. */ }
  }
}

/** Los enlaces a un grupo o una invitación siguen directo a su destino, sin consumir la guía. */
export function useGuia() {
  const [visible, setVisible] = useState(() => {
    const ruta = parseRuta(window.location.hash)
    return !yaVista() && (ruta.nombre === 'inicio' || ruta.nombre === 'entrar')
  })
  const abrir = useCallback(() => setVisible(true), [])
  const cerrar = useCallback(() => setVisible(false), [])
  return { visible, abrir, cerrar }
}

const PLANES: { nombre: string; icono: NombreIcono; detalle: string }[] = [
  { nombre: 'Asado', icono: 'asado', detalle: 'Asado con amigos' },
  { nombre: 'Café', icono: 'juntada', detalle: 'Café con amigos' },
  { nombre: 'Fútbol', icono: 'futbol', detalle: 'Fútbol con amigos' },
]
const HORARIOS = [
  { dia: 'Sábado', hora: '14:00 a 17:00' },
  { dia: 'Domingo', hora: '14:00 a 17:00' },
]
const PASOS = [
  { nombre: 'La idea', titulo: 'Ese “hay que juntarnos” merece un plan.', descripcion: 'Elige algo que les guste para compartir con el grupo.' },
  { nombre: 'Cuándo', titulo: 'Tú dices cuándo. En privado.', descripcion: 'CRUXE busca una opción compatible sin mostrar tus horarios al grupo.' },
  { nombre: 'Confirmar', titulo: 'El último toque es tuyo.', descripcion: 'Cada persona confirma la misma versión del plan. Prueba con la tuya.' },
]

/** Ejemplo local: sus botones solo cambian esta escena; nunca llaman a la API ni confirman un plan real. */
export function Guia({ alCerrar }: { alCerrar: () => void }) {
  const dialogo = useRef<HTMLDialogElement>(null)
  const titulo = useRef<HTMLHeadingElement>(null)
  const [paso, setPaso] = useState(0)
  const [plan, setPlan] = useState<number | null>(null)
  const [horario, setHorario] = useState<number | null>(null)
  const [confirmado, setConfirmado] = useState(false)
  const elegido = PLANES[plan ?? 0]
  const momento = HORARIOS[horario ?? 0]
  const hecho = paso === 0 ? plan !== null : paso === 1 ? horario !== null : confirmado

  useLayoutEffect(() => {
    const el = dialogo.current
    if (!el) return
    const origen = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const overflowAnterior = document.body.style.overflow
    if (!el.open) el.showModal()
    document.body.style.overflow = 'hidden'
    recordarVisita()
    return () => {
      el.close()
      document.body.style.overflow = overflowAnterior
      const destino = origen?.isConnected && origen !== document.body ? origen : document.getElementById('contenido')
      destino?.focus({ preventScroll: true })
    }
  }, [])

  useLayoutEffect(() => {
    titulo.current?.focus({ preventScroll: true })
    dialogo.current?.scrollTo({ top: 0 })
  }, [paso])

  function avanzar() {
    if (paso === 2) alCerrar()
    else setPaso((p) => Math.min(2, p + 1))
  }

  const respuesta = paso === 0
    ? plan === null ? 'Toca una idea. Acá empieza el encuentro.' : `${elegido.detalle}. ¡Ya tenemos una idea!`
    : paso === 1
      ? horario === null ? 'Toca el día que te sirve.' : 'Respuesta de ejemplo guardada. Tu horario queda privado.'
      : confirmado ? '¡4 de 4! Así se ve un grupo confirmado.' : 'En este ejemplo, otras 3 personas ya confirmaron.'

  return (
    <dialog
      ref={dialogo}
      className="cruxe-guia"
      aria-labelledby="cruxe-guia-titulo"
      aria-describedby="cruxe-guia-descripcion"
      onCancel={(e) => { e.preventDefault(); alCerrar() }}
      onKeyDown={(e) => {
        if (e.key !== 'Tab') return
        const botones = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'))
          .filter((b) => b.getClientRects().length > 0 && getComputedStyle(b).visibility !== 'hidden')
        const primero = botones[0]
        const ultimo = botones.at(-1)
        if (e.shiftKey && document.activeElement === primero) {
          e.preventDefault()
          ultimo?.focus()
        } else if (!e.shiftKey && document.activeElement === ultimo) {
          e.preventDefault()
          primero?.focus()
        }
      }}
    >
      <div className="cruxe-guia__tarjeta">
        <header className="cruxe-guia__cabecera">
          <span>CRU<span className="cruxe-guia__marca-x">X</span>E <span className="cruxe-guia__cabecera-nota">/ en 3 toques</span></span>
          <button type="button" className="cruxe-guia__saltar" onClick={alCerrar}>
            Saltar guía <Icono n="cerrar" tam={16} />
          </button>
        </header>

        <ol className="cruxe-guia__progreso" aria-label="Pasos de la guía">
          {PASOS.map((p, i) => (
            <li key={p.nombre} data-activo={paso === i} data-listo={paso > i} aria-current={paso === i ? 'step' : undefined}>
              <span aria-hidden="true">{paso > i ? <Icono n="check" tam={16} /> : `0${i + 1}`}</span>
              {p.nombre}
            </li>
          ))}
        </ol>

        <div className="cruxe-guia__cuerpo">
          <section key={`relato-${paso}`} className="cruxe-guia__relato">
            <p className="cruxe-guia__eyebrow">GUÍA RÁPIDA · PASO {paso + 1} DE 3</p>
            <h2 id="cruxe-guia-titulo" className="cruxe-guia__titulo" ref={titulo} tabIndex={-1}>
              {PASOS[paso].titulo}
            </h2>
            <p id="cruxe-guia-descripcion" className="cruxe-guia__descripcion">{PASOS[paso].descripcion}</p>
          </section>

          <div key={`escena-${paso}`} className="cruxe-guia__escena" data-paso={paso} data-hecho={hecho}>
            <div className="cruxe-guia__muestra">
              <div className="cruxe-guia__muestra-cabeza">
                <span className="cruxe-guia__etiqueta"><Icono n="chispa" tam={14} /> A practicar</span>
                <span>Ejemplo ficticio</span>
              </div>

              <div className="cruxe-guia__grupo">
                <div className={`cruxe-guia__avatares${paso === 2 && confirmado ? ' cruxe-guia__avatares--juntos' : ''}`} aria-hidden="true">
                  {['T', 'L', 'M', 'TÚ'].map((nombre) => <span key={nombre} className="cruxe-guia__avatar">{nombre}</span>)}
                </div>
                <p className="cruxe-guia__grupo-nombre">Los del finde</p>
              </div>

              {paso === 0 ? (
                <div className="cruxe-guia__objetivo">
                  <div className="cruxe-guia__planes" role="group" aria-label="Elige un plan de ejemplo">
                    {PLANES.map((p, i) => (
                      <button key={p.nombre} type="button" className="cruxe-guia__opcion" aria-pressed={plan === i} onClick={() => { if (plan !== i) setConfirmado(false); setPlan(i) }}>
                        <IconoPlan indice={i} /><span>{p.nombre}</span>
                      </button>
                    ))}
                  </div>
                  {!hecho ? <Cursor /> : null}
                </div>
              ) : paso === 1 ? (
                <div className="cruxe-guia__objetivo">
                  <div className="cruxe-guia__horarios" role="group" aria-label="Elige tu disponibilidad de ejemplo">
                    {HORARIOS.map((h, i) => (
                      <button key={h.dia} type="button" className="cruxe-guia__horario" aria-pressed={horario === i} onClick={() => { if (horario !== i) setConfirmado(false); setHorario(i) }}>
                        <Icono n={horario === i ? 'confirmado' : 'calendario'} tam={24} />
                        <span>{h.dia}</span><small>{h.hora}</small>
                      </button>
                    ))}
                  </div>
                  {!hecho ? <Cursor /> : null}
                </div>
              ) : (
                <div className="cruxe-guia__plan-final">
                  <span className="cruxe-guia__plan-icono"><IconoPlan indice={plan ?? 0} /></span>
                  <strong>{elegido.detalle}</strong>
                  <span>{momento.dia} · {momento.hora}</span>
                  <div className="cruxe-guia__objetivo">
                    <button type="button" className="cruxe-guia__confirmar" data-hecho={confirmado} aria-pressed={confirmado} onClick={() => setConfirmado(true)}>
                      <Icono n={confirmado ? 'check' : 'chispa'} tam={20} />
                      {confirmado ? '¡Confirmaste el ejemplo!' : 'Confirmar en el ejemplo'}
                    </button>
                    {!hecho ? <Cursor /> : null}
                  </div>
                </div>
              )}

              <p className="cruxe-guia__respuesta" role="status" data-hecho={hecho}>
                <Icono n={hecho ? 'check' : paso === 1 ? 'candado' : 'chispa'} tam={18} />
                <span>{respuesta}</span>
              </p>
              <p className="cruxe-guia__nota">
                {paso === 0 ? 'Todo lo que toques acá es de práctica.'
                  : paso === 1 ? 'El grupo ve el resultado compatible, no tus horarios.'
                    : 'Mostrar interés no es confirmar. Si el plan cambia, volvés a confirmar.'}
              </p>
            </div>
            {paso === 2 && confirmado ? Array.from({ length: 12 }, (_, i) => (
              <span key={i} className="cruxe-guia__confeti" style={{ '--i': i } as CSSProperties} aria-hidden="true" />
            )) : null}
          </div>
        </div>

        <footer className="cruxe-guia__pie">
          <button type="button" className="cruxe-guia__atras" onClick={() => setPaso((p) => Math.max(0, p - 1))} disabled={paso === 0}>
            <Icono n="atras" tam={18} /> Atrás
          </button>
          <button type="button" className="cruxe-guia__siguiente" onClick={avanzar}>
            {paso === 2 ? 'Dale, vamos' : hecho ? 'Siguiente' : 'Ver cómo sigue'}
            <Icono n={paso === 2 ? 'check' : 'chevron'} tam={20} />
          </button>
        </footer>
      </div>
    </dialog>
  )
}

function IconoPlan({ indice }: { indice: number }) {
  return indice === 1 ? <Coffee size={28} strokeWidth={2.1} aria-hidden="true" focusable="false" /> : <Icono n={PLANES[indice].icono} tam={28} />
}

function Cursor() {
  return (
    <span className="cruxe-guia__cursor" aria-hidden="true">
      <svg width="30" height="38" viewBox="0 0 30 38" fill="none" focusable="false">
        <path d="M3 2L26 21L16 23L11 34L3 2Z" fill="#ff9764" stroke="#20110b" strokeWidth="2.5" strokeLinejoin="round" />
      </svg>
      <span>Prueba acá</span>
    </span>
  )
}
