// Ficha del plan (S4, rediseño): los datos técnicos que salen del frente, plegados al final. `details` con el título
// «Ficha del plan» y «Cómo viene cada plan» (E15, solo quien organiza): los busca el guion f15 de rincones.
import { cuentaRegresiva, franjaTexto, momentoCorto } from '../../lib/format'
import { useAhora } from '../../lib/hooks'
import type { PropuestaViva } from '../../lib/hooks'
import type { EstadoPropuesta } from '../../lib/types'
import { Nombre } from '../../components/ui'

/**
 * Enmienda 15 (E-d): totales que el servidor da solo a quien organiza. Un número en null (menos de 2) no se muestra:
 * así no se adivina quién. Sin ningún número, la fila no sale.
 */
function textoPlan(t: { si: number | null; prefieren: number | null }): string | null {
  const partes = [t.si != null ? `pueden ${t.si}` : null, t.prefieren != null ? `la prefieren ${t.prefieren}` : null].filter(Boolean)
  return partes.length > 0 ? partes.join(' · ') : null
}

export function FichaPlan({ p, viva }: { p: EstadoPropuesta; viva: PropuestaViva }) {
  const ahora = useAhora(1000)
  const o = p.opcion
  const totalesPlanes = Object.entries(p.planes_totales ?? {})
    .map(([clave, t]) => [clave, textoPlan(t)] as const)
    .filter((x): x is readonly [string, string] => x[1] !== null)
  return (
    <details className="tarjeta plegable ficha" open={!o}>
      <summary>
        <h2>Ficha del plan</h2>
      </summary>
      <dl className="datos">
        <dt>Organiza</dt>
        <dd>
          <Nombre m={p.organizador} />
        </dd>
        <dt>No puede faltar</dt>
        <dd>
          <Nombre m={p.imprescindible} />
        </dd>
        <dt>Franjas candidatas</dt>
        <dd>
          {p.franjas.map((f) => (
            <div key={f.clave}>
              <strong>
                Franja {f.clave}
                {f.etiqueta ? ` · ${f.etiqueta}` : ''}:
              </strong>{' '}
              {franjaTexto(f.inicio, f.fin)}
            </div>
          ))}
        </dd>
        {p.regla === 'mas_si' ? (
          <>
            <dt>Si sirven las dos</dt>
            <dd>Gana la que pueden más personas; lo cuenta el servidor.</dd>
          </>
        ) : null}
        {totalesPlanes.length > 0 ? (
          <>
            <dt>Cómo viene cada plan</dt>
            <dd>
              {totalesPlanes.map(([clave, texto]) => (
                <div key={clave}>
                  <strong>Franja {clave}:</strong> {texto}
                </div>
              ))}
              <div className="suave">Solo lo ves tú, sin contarte a ti y sin decir quién. El servidor elige.</div>
            </dd>
          </>
        ) : null}
        {o ? (
          <>
            <dt>Versión {o.version}</dt>
            <dd>
              Franja {o.franja.clave} · publicada {momentoCorto(o.publicada_en)}
            </dd>
          </>
        ) : null}
        <dt>Cupos</dt>
        <dd>
          Mínimo {p.minimo} (cuenta a quien no puede faltar), máximo {p.maximo}
        </dd>
        <dt>Cierre de aceptación</dt>
        <dd>
          {momentoCorto(p.plazo)}
          <PlazoInformativo p={p} viva={viva} ahora={ahora} />
        </dd>
        <dt>Horas</dt>
        <dd>De Santiago de Chile. Las condiciones de cada persona son privadas y no se muestran.</dd>
      </dl>
    </details>
  )
}

function PlazoInformativo({ p, viva, ahora }: { p: EstadoPropuesta; viva: PropuestaViva; ahora: number }) {
  // Cuenta regresiva SOLO informativa. El servidor decide si el plazo se cumplió.
  if (p.plazo_vencido) return <div className="suave">El plazo de aceptación cerró.</div>
  if (!viva.servidorAhora) return null
  const c = cuentaRegresiva(p.plazo.utc, viva.servidorAhora.utc, viva.recibidoEn, ahora)
  return <div className="suave">{c ? `Faltan ${c} (solo informativo; lo decide el servidor)` : 'El servidor confirmará el cierre en la próxima actualización.'}</div>
}
