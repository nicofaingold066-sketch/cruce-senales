import { useEffect, useRef } from 'react'
import type { ButtonHTMLAttributes, MouseEvent, ReactNode, Ref } from 'react'
import { ayudaError } from '../lib/api'
import type { ApiError, EstadoClave, MiembroRef } from '../lib/types'

export function RotuloSimulacion() {
  return <span className="rotulo-sim">Simulación</span>
}

/** Nombre de miembro. Si es simulado, agrega siempre el rótulo "Simulación". */
export function Nombre({ m, yo }: { m: Pick<MiembroRef, 'nombre' | 'simulado'>; yo?: boolean }) {
  return (
    <span className="nombre">
      {m.nombre}
      {yo ? <span className="yo"> (tú)</span> : null}
      {m.simulado ? <> <RotuloSimulacion /></> : null}
    </span>
  )
}

export function InsigniaEstado({ estado, etiqueta }: { estado: EstadoClave; etiqueta: string }) {
  return <span className={`estado estado-${estado}`}>{etiqueta}</span>
}

type Tono = 'info' | 'aviso' | 'error' | 'ok'

export function Aviso({
  tono = 'info',
  titulo,
  children,
  accion,
  ref,
  tabIndex,
}: {
  tono?: Tono
  titulo?: string
  children?: ReactNode
  accion?: ReactNode
  ref?: Ref<HTMLDivElement>
  tabIndex?: number
}) {
  return (
    <div ref={ref} tabIndex={tabIndex} className={`aviso aviso-${tono}`} role={tono === 'error' ? 'alert' : 'status'}>
      {titulo ? <strong className="aviso-titulo">{titulo}</strong> : null}
      {children ? <div className="aviso-texto">{children}</div> : null}
      {accion ? <div className="aviso-accion">{accion}</div> : null}
    </div>
  )
}

export function Cargando({ texto = 'Cargando…' }: { texto?: string }) {
  return (
    <div className="cargando" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      {texto}
    </div>
  )
}

export function ErrorCaja({
  error,
  onReintentar,
  titulo,
  enfocar,
}: {
  error: ApiError
  onReintentar?: () => void
  titulo?: string
  /** Error de una acción de la persona (no de una carga o sondeo): mueve el foco a algo útil. */
  enfocar?: boolean
}) {
  const caja = useRef<HTMLDivElement>(null)
  // Mejora #44: tras una acción fallida el foco va a "Reintentar" o, si se perdió (el botón desapareció), al aviso.
  // Nunca en errores de carga o sondeo, que se repiten cada 10 s y le robarían el foco a quien está escribiendo.
  useEffect(() => {
    const el = caja.current
    if (!enfocar || !el) return
    const reintentar = el.querySelector<HTMLElement>('button')
    if (reintentar) reintentar.focus()
    else if (!document.activeElement || document.activeElement === document.body) el.focus()
  }, [error, enfocar])
  return (
    <Aviso
      ref={caja}
      tabIndex={-1}
      tono="error"
      titulo={titulo ?? (error.sinConexion
          ? 'Sin conexión'
          : error.resultadoIncierto
            ? 'No pudimos confirmar el resultado'
            : 'No se pudo completar')}
      accion={
        onReintentar && error.reintentable ? (
          <button type="button" className="btn btn-secundario" onClick={onReintentar}>
            Reintentar
          </button>
        ) : null
      }
    >
      {error.mensaje}
      {ayudaError(error) ? <p className="suave">{ayudaError(error)}</p> : null}
    </Aviso>
  )
}

export function Vacio({ titulo, texto, accion }: { titulo: string; texto?: string; accion?: ReactNode }) {
  return (
    <div className="vacio">
      <strong>{titulo}</strong>
      {texto ? <p>{texto}</p> : null}
      {accion}
    </div>
  )
}

export function Boton({
  children,
  ocupado,
  ocupadoTexto = 'Enviando…',
  variante = 'primario',
  ...rest
}: {
  children: ReactNode
  ocupado?: boolean
  ocupadoTexto?: string
  variante?: 'primario' | 'secundario' | 'peligro'
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'>) {
  // Mejora #44: mientras trabaja no se usa `disabled`, que saca el foco al cuerpo de la página y lo pierde
  // tras cada acción. Queda aria-disabled y se ignora la activación (también el envío de formulario).
  const bloqueado = Boolean(ocupado && !rest.disabled)
  return (
    <button
      type="button"
      {...rest}
      className={`btn btn-${variante} ${rest.className ?? ''}`}
      disabled={rest.disabled}
      aria-disabled={bloqueado || undefined}
      aria-busy={ocupado ? true : undefined}
      onClick={(e: MouseEvent<HTMLButtonElement>) => {
        if (bloqueado) {
          e.preventDefault()
          return
        }
        rest.onClick?.(e)
      }}
    >
      {ocupado ? ocupadoTexto : children}
    </button>
  )
}
