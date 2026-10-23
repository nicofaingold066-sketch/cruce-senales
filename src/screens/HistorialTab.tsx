import { describirEvento, etiquetaEstado, fechaCorta, hora } from '../lib/format'
import type { Evento } from '../lib/types'
import { Nombre, Vacio } from '../components/ui'
import type { PestanaProps } from './tabs'

// Mejora #9: historial legible para el jurado. Se cuenta en orden (de lo más viejo a lo más nuevo), agrupado
// por versión del plan, con la hora del servidor, quién lo hizo y si fue una Simulación. Solo reordena los
// eventos que entrega el servidor (últimos 50); no deduce nada que el servidor no haya registrado.

type Tono = 'publicacion' | 'aceptacion' | 'baja' | 'neutro'

const TONO: Record<string, Tono> = {
  opcion_publicada: 'publicacion',
  reparacion_publicada: 'publicacion',
  aceptacion: 'aceptacion',
  baja: 'baja',
  evaluacion_sin_opcion: 'baja',
  reparacion_sin_alternativa: 'baja',
  propuesta_cancelada: 'baja',
  propuesta_expirada: 'baja',
}

interface Grupo {
  clave: string
  titulo: string
  eventos: Evento[]
}

/** Versión a la que pertenece un evento, o null si no nombra ninguna (sigue en el grupo en curso). */
function versionDe(e: Evento): number | null {
  if (e.tipo === 'opcion_publicada' || e.tipo === 'reparacion_publicada') return e.version_nueva
  if (e.tipo === 'aceptacion') return e.version_nueva ?? e.version_previa
  if (e.tipo === 'baja') return e.version_previa
  return null
}

function agrupar(eventos: Evento[]): Grupo[] {
  const grupos: Grupo[] = []
  let actual: Grupo | null = null
  for (const e of eventos) {
    const v = versionDe(e)
    const clave: string = v == null ? (actual?.clave ?? 'antes') : `v${v}`
    if (!actual || actual.clave !== clave) {
      actual = {
        clave,
        titulo: clave === 'antes' ? 'Antes de la primera versión' : `Versión ${clave.slice(1)}`,
        eventos: [],
      }
      grupos.push(actual)
    }
    actual.eventos.push(e)
  }
  return grupos
}

export default function HistorialTab({ p }: PestanaProps) {
  const eventos = p.historial
  const grupos = agrupar(eventos)
  const versiones = eventos.filter((e) => e.tipo === 'opcion_publicada' || e.tipo === 'reparacion_publicada').length
  const confirmaciones = eventos.filter((e) => e.tipo === 'aceptacion').length
  const bajas = eventos.filter((e) => e.tipo === 'baja').length
  let diaPrevio = ''

  return (
    <section className="tarjeta historial">
      <h2>Historial</h2>
      <p className="suave">
        Lo que pasó, en orden. Horas del servidor, en hora de Santiago. Lo hecho por personas simuladas dice{' '}
        <span className="rotulo-sim">Simulación</span> y quién lo ejecutó.
      </p>
      {eventos.length === 0 ? (
        <Vacio titulo="Sin movimientos todavía" />
      ) : (
        <>
          <p className="historial-resumen">
            {versiones} {versiones === 1 ? 'versión publicada' : 'versiones publicadas'} · {confirmaciones}{' '}
            {confirmaciones === 1 ? 'confirmación' : 'confirmaciones'} en total · {bajas} {bajas === 1 ? 'baja' : 'bajas'}
          </p>
          {grupos.map((g) => (
            <section key={g.clave + g.eventos[0].state_rev} className="historial-grupo" aria-label={g.titulo}>
              <h3>{g.titulo}</h3>
              <ol className="historial-linea">
                {g.eventos.map((e) => {
                  const dia = fechaCorta(e.en.local)
                  const mostrarDia = dia !== diaPrevio
                  diaPrevio = dia
                  const cambio = e.estado_nuevo && e.estado_previo !== e.estado_nuevo ? e.estado_nuevo : null
                  return (
                    <li key={`${e.state_rev}-${e.tipo}-${e.en.utc}`} className={`hl-evento hl-${TONO[e.tipo] ?? 'neutro'}`}>
                      <span className="hl-hora">
                        {mostrarDia ? <span className="hl-dia">{dia}</span> : null}
                        {hora(e.en.local)}
                      </span>
                      <span className="hl-marca" aria-hidden="true" />
                      <span className="hl-texto">
                        <span>{describirEvento(e)}</span>
                        {e.actor_tipo === 'simulacion' ? (
                          <span className="hl-sim">
                            <span className="rotulo-sim">Simulación</span>
                            {e.ejecutado_por ? (
                              <span className="suave">
                                {' '}
                                por <Nombre m={e.ejecutado_por} />
                              </span>
                            ) : null}
                          </span>
                        ) : null}
                        {cambio ? <span className={`hl-estado estado estado-${cambio}`}>{etiquetaEstado(cambio)}</span> : null}
                      </span>
                    </li>
                  )
                })}
              </ol>
            </section>
          ))}
        </>
      )}
    </section>
  )
}
