import type { ReactNode } from 'react'
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
}: {
  tono?: Tono
  titulo?: string
  children?: ReactNode
  accion?: ReactNode
}) {
  return (
    <div className={`aviso aviso-${tono}`} role={tono === 'error' ? 'alert' : 'status'}>
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
}: {
  error: ApiError
  onReintentar?: () => void
  titulo?: string
}) {
  return (
    <Aviso
      tono="error"
      titulo={titulo ?? (error.sinConexion ? 'Sin conexión' : 'No se pudo completar')}
      accion={
        onReintentar && error.reintentable ? (
          <button type="button" className="btn btn-secundario" onClick={onReintentar}>
            Reintentar
          </button>
        ) : null
      }
    >
      {error.mensaje}
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
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'>) {
  return (
    <button
      type="button"
      {...rest}
      className={`btn btn-${variante} ${rest.className ?? ''}`}
      disabled={rest.disabled || ocupado}
      aria-busy={ocupado ? true : undefined}
    >
      {ocupado ? ocupadoTexto : children}
    </button>
  )
}
