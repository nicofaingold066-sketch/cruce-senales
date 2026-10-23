import { describirEvento, etiquetaEstado, momentoCorto } from '../lib/format'
import { Nombre, Vacio } from '../components/ui'
import type { PestanaProps } from './tabs'

export default function HistorialTab({ p }: PestanaProps) {
  const eventos = [...p.historial].reverse()
  return (
    <section className="tarjeta">
      <h2>Historial</h2>
      <p className="suave">Del más reciente al más antiguo. Las horas son del servidor, en hora de Santiago.</p>
      {eventos.length === 0 ? (
        <Vacio titulo="Sin movimientos todavía" />
      ) : (
        <ol className="linea linea-completa">
          {eventos.map((e) => (
            <li key={`${e.state_rev}-${e.tipo}-${e.en.utc}`}>
              <div>
                <strong>{describirEvento(e)}</strong>
                {e.actor_tipo === 'simulacion' ? (
                  <>
                    {' '}
                    <span className="rotulo-sim">Simulación</span>
                    {e.ejecutado_por ? (
                      <span className="suave">
                        {' '}
                        · ejecutado por <Nombre m={e.ejecutado_por} />
                      </span>
                    ) : null}
                  </>
                ) : null}
              </div>
              <div className="suave">
                {momentoCorto(e.en)}
                {e.estado_previo !== e.estado_nuevo && e.estado_nuevo
                  ? ` · ${e.estado_previo ? etiquetaEstado(e.estado_previo) + ' → ' : ''}${etiquetaEstado(e.estado_nuevo)}`
                  : ''}
                {e.version_nueva != null ? ` · versión ${e.version_nueva}` : ''}
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
