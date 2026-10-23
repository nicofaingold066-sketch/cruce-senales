// El cruce: la "escena en vivo" de CRUXE (el equivalente al mapa de una app de viajes).
// Cada persona del espacio es un punto alrededor del plan; quien confirmó la versión vigente se conecta
// con una línea de brasa que fluye hacia el centro. Solo dibuja lo que entrega el servidor (quién confirmó,
// quién marcó interés, quién se bajó y los números de cupos). Nunca muestra condiciones ni calcula nada.
import { colorAvatar, iniciales } from './ui'
import { Trazos } from './Marca'

export type EstadoNodo = 'confirmo' | 'interesado' | 'baja' | 'pendiente'

export interface NodoCruce {
  id: string
  nombre: string
  simulado: boolean
  yo: boolean
  estado: EstadoNodo
}

export type TonoCruce = 'vivo' | 'ok' | 'revision' | 'info' | 'neutro'

const W = 340
const H = 252
const CX = W / 2
const CY = 116
const RX = 128
const RY = 84
const R_NODO = 17
const R_CENTRO = 40
const MAX_NODOS = 10

const COLOR_TONO: Record<TonoCruce, string> = {
  vivo: 'var(--brasa-viva)',
  ok: '#4cc98a',
  revision: '#f0b44c',
  info: '#86b3ff',
  neutro: 'rgba(255,255,255,0.35)',
}

function posiciones(n: number): { x: number; y: number }[] {
  return Array.from({ length: n }, (_, i) => {
    // Se gira medio paso para que ninguna persona quede justo arriba o abajo del centro (las etiquetas no chocan).
    const a = -Math.PI / 2 + Math.PI / n + (i * 2 * Math.PI) / n
    return { x: CX + RX * Math.cos(a), y: CY + RY * Math.sin(a) }
  })
}

/** Recorta un segmento entre dos círculos para que la línea no se meta debajo de los discos. */
function segmento(x: number, y: number) {
  const dx = CX - x
  const dy = CY - y
  const d = Math.hypot(dx, dy) || 1
  const ux = dx / d
  const uy = dy / d
  return {
    x1: x + ux * (R_NODO + 3),
    y1: y + uy * (R_NODO + 3),
    x2: CX - ux * (R_CENTRO + 5),
    y2: CY - uy * (R_CENTRO + 5),
  }
}

function corto(nombre: string): string {
  const n = nombre.trim()
  return n.length > 9 ? `${n.slice(0, 8)}…` : n
}

const DESCRIPCION_ESTADO: Record<EstadoNodo, string> = {
  confirmo: 'confirmó',
  interesado: 'le interesa',
  baja: 'se bajó',
  pendiente: 'sin respuesta visible',
}

export function Cruce({
  nodos,
  valor,
  etiqueta,
  fraccion,
  tono,
  confirmado = false,
}: {
  nodos: NodoCruce[]
  /** Texto grande del centro, por ejemplo "2/4". Sale de números del servidor. */
  valor: string
  etiqueta: string
  /** Proporción para el anillo del centro (0 a 1), por ejemplo confirmados / mínimo. */
  fraccion: number
  tono: TonoCruce
  /** Grupo confirmado: las líneas pasan a verde y el centro late. */
  confirmado?: boolean
}) {
  const visibles = nodos.slice(0, MAX_NODOS)
  const pos = posiciones(visibles.length)
  const color = COLOR_TONO[tono]
  const circ = 2 * Math.PI * R_CENTRO
  const f = Math.max(0, Math.min(1, Number.isFinite(fraccion) ? fraccion : 0))
  const descripcion =
    `${valor} ${etiqueta}. ` +
    visibles.map((n) => `${n.yo ? `${n.nombre} (tú)` : n.nombre}${n.simulado ? ' (simulación)' : ''}: ${DESCRIPCION_ESTADO[n.estado]}`).join('; ')

  return (
    <figure style={{ margin: 0 }}>
      <svg className="cruce" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={descripcion}>
        {/* Líneas primero, para que queden debajo de los discos */}
        {visibles.map((n, i) => {
          const s = segmento(pos[i].x, pos[i].y)
          if (n.estado === 'baja') return null
          const clase =
            n.estado === 'confirmo'
              ? `cruce-linea cruce-linea-ok cruce-trazo ${confirmado ? 'cruce-linea-confirmado' : ''}`
              : n.estado === 'interesado'
                ? 'cruce-linea cruce-linea-interes'
                : 'cruce-linea cruce-linea-pendiente'
          return <line key={`${n.id}-${n.estado}`} className={clase} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} />
        })}

        {/* Centro: el plan */}
        {confirmado ? <circle className="cruce-pulso" cx={CX} cy={CY} r={R_CENTRO} style={{ stroke: color }} /> : null}
        <circle className="cruce-centro-fondo" cx={CX} cy={CY} r={R_CENTRO} />
        <circle
          className="cruce-centro-borde"
          cx={CX}
          cy={CY}
          r={R_CENTRO}
          style={{ stroke: color, strokeDasharray: circ, strokeDashoffset: circ * (1 - f) }}
        />
        <g transform={`translate(${CX - 9} ${CY - 31}) scale(0.18)`} style={{ color }} opacity="0.9">
          <Trazos />
        </g>
        {/* key: al cambiar el número del servidor, el contador "salta" (sin pasar por números intermedios). */}
        <text key={valor} className="cruce-texto cruce-valor cruce-pop" x={CX} y={CY + 12} textAnchor="middle">
          {valor}
        </text>
        <text className="cruce-texto cruce-etiqueta" x={CX} y={CY + 27} textAnchor="middle">
          {etiqueta}
        </text>

        {/* Personas */}
        {visibles.map((n, i) => {
          const { x, y } = pos[i]
          const ok = n.estado === 'confirmo'
          return (
            <g key={n.id} className={`cruce-nodo ${n.estado === 'baja' ? 'cruce-nodo-baja' : ''}`}>
              {n.yo ? <circle className="cruce-anillo-yo" cx={x} cy={y} r={R_NODO + 7} /> : null}
              {ok ? (
                <circle className={`cruce-anillo-ok ${confirmado ? 'cruce-anillo-confirmado' : ''}`} cx={x} cy={y} r={R_NODO + 3.5} />
              ) : null}
              <circle
                cx={x}
                cy={y}
                r={R_NODO}
                fill={n.simulado ? 'var(--noche-2)' : colorAvatar(n.nombre)}
                stroke={n.simulado ? '#b79bff' : 'none'}
                strokeWidth={n.simulado ? 1.8 : 0}
                strokeDasharray={n.simulado ? '3 3' : undefined}
              />
              <text
                className="cruce-texto cruce-iniciales"
                x={x}
                y={y + 4.5}
                textAnchor="middle"
                style={n.simulado ? { fill: '#d9cbff' } : undefined}
              >
                {iniciales(n.nombre)}
              </text>
              {n.estado === 'baja' ? (
                <line x1={x - 14} y1={y + 14} x2={x + 14} y2={y - 14} stroke="#ff8080" strokeWidth="2.5" strokeLinecap="round" />
              ) : null}
              <text className={`cruce-texto cruce-nombre ${ok ? 'cruce-nombre-ok' : ''}`} x={x} y={y + R_NODO + 15} textAnchor="middle">
                {n.yo ? 'Tú' : corto(n.nombre)}
              </text>
            </g>
          )
        })}
      </svg>
      <figcaption className="cruce-leyenda" aria-hidden="true">
        <span>
          <i className="ley-ok" /> Confirmó
        </span>
        <span>
          <i className="ley-interes" /> Le interesa
        </span>
        <span>
          <i className="ley-pendiente" /> Sin respuesta
        </span>
      </figcaption>
    </figure>
  )
}

/** Arte de la portada: puntos que se encienden uno por uno hacia el cruce. Decorativo. */
export function ArteCruce() {
  const n = 7
  const pos = posiciones(n)
  return (
    <svg className="portada-arte" viewBox={`0 0 ${W} ${H - 20}`} aria-hidden="true" focusable="false">
      {pos.map((p, i) => {
        const s = segmento(p.x, p.y)
        return (
          <g key={i}>
            <line className="arte-linea" x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} />
            <line
              className="arte-linea-viva"
              x1={s.x1}
              y1={s.y1}
              x2={s.x2}
              y2={s.y2}
              style={{ animationDelay: `${i * 0.55}s` }}
            />
          </g>
        )
      })}
      {pos.map((p, i) => (
        <g key={`n${i}`}>
          <circle className="arte-nodo" cx={p.x} cy={p.y} r={R_NODO - 3} />
          <circle className="arte-nodo-vivo" cx={p.x} cy={p.y} r={R_NODO - 3} style={{ animationDelay: `${i * 0.55}s` }} />
        </g>
      ))}
      <circle cx={CX} cy={CY} r={R_CENTRO} fill="var(--noche-2)" stroke="rgba(255,255,255,0.16)" strokeWidth="1.5" />
      <g transform={`translate(${CX - 22} ${CY - 22}) scale(0.44)`} style={{ color: 'var(--brasa-viva)' }}>
        <Trazos />
      </g>
    </svg>
  )
}
