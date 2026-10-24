import { useEffect, useRef } from 'react'
import type { ButtonHTMLAttributes, CSSProperties, MouseEvent, ReactNode, Ref } from 'react'
import { ayudaError } from '../lib/api'
import { hojaCalendario } from '../lib/format'
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

export function Cargando({ texto = 'Cargando…', esqueleto = false }: { texto?: string; esqueleto?: boolean }) {
  return (
    <div role="status" aria-live="polite">
      <div className="cargando">
        <span className="spinner" aria-hidden="true" />
        {texto}
      </div>
      {esqueleto ? (
        <div className="esqueleto" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      ) : null}
    </div>
  )
}

// ---- Avatares: iniciales con un color estable por nombre. Las personas simuladas van con borde punteado. ----

const COLORES_AVATAR = ['#7a4b3a', '#3d5a80', '#5b6c3a', '#7d3c64', '#3f6b68', '#8a5a14', '#4b4f8c', '#6b4f3a']

export function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean)
  if (partes.length === 0) return '?'
  if (partes.length === 1) return partes[0].slice(0, 2).toLocaleUpperCase('es')
  return (partes[0][0] + partes[1][0]).toLocaleUpperCase('es')
}

export function colorAvatar(nombre: string): string {
  let h = 0
  for (const c of nombre.trim().toLocaleLowerCase('es')) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return COLORES_AVATAR[h % COLORES_AVATAR.length]
}

export function Avatar({
  nombre,
  simulado,
  yo,
  tam,
}: {
  nombre: string
  simulado?: boolean
  yo?: boolean
  tam?: number
}) {
  const estilo = { '--av-c': colorAvatar(nombre), ...(tam ? { '--av': `${tam}px` } : {}) } as CSSProperties
  return (
    <span className={`avatar ${simulado ? 'avatar-sim' : ''} ${yo ? 'avatar-yo' : ''}`} style={estilo} aria-hidden="true">
      {iniciales(nombre)}
    </span>
  )
}

/** Avatares apilados, como "quién viene": hasta `max` y "+N". Decorativo; la lista con nombres va aparte. */
export function AvatarPila({ personas, max = 5 }: { personas: Pick<MiembroRef, 'nombre' | 'simulado'>[]; max?: number }) {
  const visibles = personas.slice(0, max)
  const resto = personas.length - visibles.length
  return (
    <span className="avatar-pila" aria-hidden="true">
      {visibles.map((m, i) => (
        <Avatar key={`${m.nombre}-${i}`} nombre={m.nombre} simulado={m.simulado} />
      ))}
      {resto > 0 ? <span className="avatar avatar-mas">+{resto}</span> : null}
    </span>
  )
}

/**
 * Barra de cupos. Solo dibuja números del servidor: `valor` confirmados sobre `maximo` cupos,
 * con una marca en el `minimo` necesario. No decide nada.
 */
export function Progreso({
  valor,
  minimo,
  maximo,
  ok,
  etiqueta,
}: {
  valor: number
  minimo: number
  maximo: number
  ok?: boolean
  etiqueta: string
}) {
  const tope = Math.max(maximo, minimo, valor, 1)
  return (
    <div className={`progreso ${ok ? 'progreso-ok' : ''}`} role="img" aria-label={etiqueta}>
      <span className="progreso-relleno" style={{ width: `${(Math.min(valor, tope) / tope) * 100}%` }} />
      {minimo > 0 && minimo < tope ? <span className="progreso-minimo" style={{ left: `${(minimo / tope) * 100}%` }} /> : null}
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
  variante?: 'primario' | 'secundario' | 'peligro' | 'turno' | 'claro'
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

/** Hoja de calendario (mes, número y día) para una hora local del servidor. Decorativa: el texto completo va al lado. */
export function DiaTile({ local }: { local: string }) {
  const h = hojaCalendario(local)
  if (!h) return null
  return (
    <span className="dia-tile" aria-hidden="true">
      <span className="dia-tile-mes">{h.mes.toLocaleUpperCase('es')}</span>
      <span className="dia-tile-num">{h.num}</span>
      <span className="dia-tile-dia">{h.dia}</span>
    </span>
  )
}

// ---- Componentes base del rediseño (fase 1, docs/rediseno/sistema.md). Se suman a los de arriba; nada cambia de nombre. ----

/** La unidad de contenido: una pregunta o un resultado por tarjeta. `titulo` va en --t-subtitulo; `accion` es secundaria. */
export function Card({
  titulo,
  accion,
  id,
  className,
  children,
}: {
  titulo?: string
  accion?: ReactNode
  id?: string
  className?: string
  children?: ReactNode
}) {
  const tituloId = titulo && id ? `${id}-titulo` : undefined
  return (
    <section id={id} className={`tarjeta ${className ?? ''}`} aria-labelledby={tituloId}>
      {titulo || accion ? (
        <div className="tarjeta-cabeza">
          {titulo ? <h2 id={tituloId}>{titulo}</h2> : null}
          {accion}
        </div>
      ) : null}
      {children}
    </section>
  )
}

type TonoChip = 'neutro' | 'ok' | 'aviso' | 'info' | 'sim'

/** Estado, rótulo o filtro en una palabra. Con `onClick` es un botón de 44 px con `aria-pressed`. */
export function Chip({
  tono = 'neutro',
  activo,
  onClick,
  className,
  children,
}: {
  tono?: TonoChip
  activo?: boolean
  onClick?: () => void
  className?: string
  children: ReactNode
}) {
  const clases = `chip chip-${tono} ${activo ? 'chip-activo' : ''} ${onClick ? 'chip-tocable' : ''} ${className ?? ''}`
  if (onClick) {
    return (
      <button type="button" className={clases} aria-pressed={activo} onClick={onClick}>
        {children}
      </button>
    )
  }
  return <span className={clases}>{children}</span>
}

/** Separa bloques dentro de una pantalla: título, nota opcional y una acción secundaria a la derecha. */
export function EncabezadoSeccion({ titulo, nota, accion, id }: { titulo: string; nota?: string; accion?: ReactNode; id?: string }) {
  return (
    <div className="encabezado-seccion">
      <div>
        <h2 id={id}>{titulo}</h2>
        {nota ? <p className="encabezado-nota">{nota}</p> : null}
      </div>
      {accion ? <div className="encabezado-accion">{accion}</div> : null}
    </div>
  )
}

/** Ícono del grupo: sus iniciales sobre un color estable por nombre. Marca el nivel "Grupo" sin leer (y en la lista de grupos). */
export function IconoGrupo({ nombre, chico }: { nombre: string; chico?: boolean }) {
  return (
    <span className={`icono-grupo ${chico ? 'icono-grupo-chico' : ''}`} style={{ '--ig-c': colorAvatar(nombre) } as CSSProperties} aria-hidden="true">
      {iniciales(nombre)}
    </span>
  )
}
