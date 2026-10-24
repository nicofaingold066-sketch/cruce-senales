// Las respuestas de un toque (#88), compartidas por "¿Cuándo puedes?" y la pestaña "Mi respuesta" (rediseño S5):
// una lista de botones grandes; `elegida` marca la respuesta ya guardada y `sugerida` la que propone la agenda ficticia.
import { DiaTile } from '../components/ui'
import type { Franja } from '../lib/types'
import { opcionesRapidas } from './respuestas'
import type { Opcion } from './respuestas'
import './friccion.css'

export function RespuestasRapidas({
  franjas,
  onElegir,
  ocupado,
  deshabilitado,
  sugerida,
  elegida,
}: {
  franjas: Franja[]
  onElegir: (o: Opcion) => void
  ocupado?: boolean
  deshabilitado?: boolean
  sugerida?: string | null
  elegida?: string | null
}) {
  const opciones = opcionesRapidas(franjas)
  if (!opciones) return null
  return (
    <ul className="rapida-opciones sd-escalonado">
      {opciones.map((o) => {
        const primaria = o.id === 'ambas' || o.id === 'si'
        return (
          <li key={o.id}>
            <button
              type="button"
              id={`rapida-${o.id}`}
              className={`btn ${primaria ? 'btn-primario' : 'btn-secundario'} rapida-opcion ${o.id === 'ninguna' ? 'rapida-ninguna' : ''} ${sugerida === o.id ? 'rapida-sugerida' : ''} ${elegida === o.id ? 'rapida-elegida' : ''}`}
              aria-describedby={sugerida === o.id ? 'rapida-sugerencia' : undefined}
              aria-pressed={elegida ? elegida === o.id : undefined}
              onClick={() => onElegir(o)}
              disabled={deshabilitado}
              aria-busy={ocupado || undefined}
            >
              {o.dia ? <DiaTile local={o.dia} /> : null}
              <span className="rapida-texto">
                <strong>{o.texto}</strong>
                <span className="rapida-detalle">{o.detalle}</span>
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
