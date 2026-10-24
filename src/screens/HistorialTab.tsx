import { describirEvento, fechaCorta, hora, momentoCorto } from '../lib/format'
import type { EstadoPropuesta, Evento } from '../lib/types'
import { Vacio } from '../components/ui'
import '../estilo/seccion-s7.css'
import type { PestanaProps } from './tabs'

// S7 (mockup validado, pantalla 19): historial agrupado por versión, de lo más nuevo a lo más viejo:
// «VERSIÓN 2 · VIGENTE», «VERSIÓN 1 · YA NO VALE», «ANTES». Cada evento: hora a la izquierda, un punto (lleno si es
// una confirmación) y un texto corto. Solo reordena los eventos que entrega el servidor (últimos 50); no deduce nada
// que el servidor no haya registrado. Nunca dice qué marcó cada uno ni quién se retiró (enmienda 13 (c)).

interface Grupo {
  clave: string
  version: number | null
  eventos: Evento[]
}

/** Versión a la que pertenece un evento, o null si no nombra ninguna (sigue en el grupo en curso). */
function versionDe(e: Evento): number | null {
  if (e.tipo === 'opcion_publicada' || e.tipo === 'reparacion_publicada') return e.version_nueva
  if (e.tipo === 'aceptacion') return e.version_nueva ?? e.version_previa
  if (e.tipo === 'baja') return e.version_previa
  return null
}

/** Agrupa en orden del servidor (los eventos sin versión siguen en el grupo en curso) y devuelve lo más nuevo primero. */
function agrupar(eventos: Evento[]): Grupo[] {
  const enOrden = [...eventos].sort((a, b) => a.state_rev - b.state_rev || a.en.utc.localeCompare(b.en.utc))
  const grupos: Grupo[] = []
  let actual: Grupo | null = null
  for (const e of enOrden) {
    const v = versionDe(e)
    const clave: string = v == null ? (actual?.clave ?? 'antes') : `v${v}`
    if (!actual || actual.clave !== clave) {
      actual = { clave, version: clave === 'antes' ? null : Number(clave.slice(1)), eventos: [] }
      grupos.push(actual)
    }
    actual.eventos.push(e)
  }
  return grupos.reverse().map((g) => ({ ...g, eventos: [...g.eventos].reverse() }))
}

function tituloGrupo(g: Grupo, p: EstadoPropuesta): string {
  if (g.version == null) return 'Antes'
  return p.opcion?.version === g.version ? `Versión ${g.version} · vigente` : `Versión ${g.version} · ya no vale`
}

/** Cuándo es el plan de una versión, si la propuesta todavía lo trae (la vigente y la inmediatamente anterior). */
function inicioDe(version: number | null, p: EstadoPropuesta): string | null {
  if (version == null) return null
  if (p.opcion?.version === version) return momentoCorto(p.opcion.franja.inicio)
  if (p.opcion_anterior?.version === version) return momentoCorto(p.opcion_anterior.inicio)
  return null
}

/** El texto corto de cada evento. Las bajas nunca llevan nombre, aunque el servidor mande actor. */
function textoCorto(e: Evento, p: EstadoPropuesta): string {
  const quien = e.actor?.nombre ?? 'El sistema'
  const pasoA = e.estado_nuevo && e.estado_previo !== e.estado_nuevo ? e.estado_nuevo : null
  switch (e.tipo) {
    case 'propuesta_creada':
      return `${quien} creó la propuesta.`
    case 'propuesta_abierta':
      return `${quien} abrió la propuesta al grupo.`
    case 'opcion_publicada':
    case 'reparacion_publicada': {
      const v = e.version_nueva
      const cuando = inicioDe(v, p)
      const base = `Se publicó la versión ${v ?? ''}${cuando ? `: ${cuando}` : ''}.`.replace(' .', '.')
      return v != null && v > 1 ? `${base} Las confirmaciones empiezan de cero.` : base
    }
    case 'aceptacion': {
      const v = e.version_nueva ?? e.version_previa
      const base = `${e.actor?.nombre ?? 'Una persona'} aceptó la versión ${v ?? ''}.`.replace(' .', '.')
      return pasoA === 'grupo_confirmado' ? `${base} El grupo quedó confirmado.` : base
    }
    case 'baja':
      return pasoA === 'en_revision' ? 'Una persona se retiró. El plan pasó a revisión.' : 'Una persona se retiró.'
    case 'evaluacion_sin_opcion':
      return 'Se buscó una opción: ninguna sirve.'
    case 'reparacion_sin_alternativa':
      return 'Se buscó una alternativa: no hay.'
    case 'propuesta_cancelada':
      return `${quien} canceló la propuesta.`
    case 'propuesta_expirada':
      return 'Venció el plazo para confirmar.'
    default:
      return describirEvento(e)
  }
}

export default function HistorialTab({ p }: PestanaProps) {
  const eventos = p.historial
  const grupos = agrupar(eventos)
  let diaPrevio = ''

  return (
    <section className="tarjeta historial" aria-label="Historial">
      {eventos.length === 0 ? (
        <Vacio titulo="Sin movimientos todavía" />
      ) : (
        grupos.map((g) => (
          <section key={g.clave + g.eventos[0].state_rev} className="historial-grupo" aria-labelledby={`hg-${g.clave}`}>
            <h2 id={`hg-${g.clave}`} className={`t-nota hg-titulo ${g.version != null && p.opcion?.version === g.version ? 'hg-vigente' : ''}`}>
              {tituloGrupo(g, p)}
            </h2>
            <ol className="hl-lista">
              {g.eventos.map((e) => {
                const dia = fechaCorta(e.en.local)
                const mostrarDia = dia !== diaPrevio
                diaPrevio = dia
                const lleno = e.tipo === 'aceptacion'
                const simulado = e.actor_tipo === 'simulacion'
                return (
                  <li key={`${e.state_rev}-${e.tipo}-${e.en.utc}`} className={`hl-fila ${lleno ? 'hl-lleno' : ''}`}>
                    <span className="hl-cuando t-nota">
                      <time dateTime={e.en.utc}>{hora(e.en.local)}</time>
                      {mostrarDia ? <span className="hl-cuando-dia">{dia}</span> : null}
                    </span>
                    <span className="hl-punto" aria-hidden="true" />
                    <p className="hl-que t-cuerpo">
                      {simulado ? textoCorto(e, p).replace(/\.$/, '') : textoCorto(e, p)}
                      {simulado ? <span className="hl-simulado t-nota"> · simulación</span> : null}
                    </p>
                  </li>
                )
              })}
            </ol>
          </section>
        ))
      )}
    </section>
  )
}
