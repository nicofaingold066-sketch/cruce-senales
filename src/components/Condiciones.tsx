import type { Disponibilidad, Franja, Valor } from '../lib/types'
import { franjaTexto } from '../lib/format'

const OPCIONES: { v: Valor; texto: string }[] = [
  { v: 'si', texto: 'Sí puedo' },
  { v: 'no', texto: 'No puedo' },
  { v: 'pendiente', texto: 'Pendiente' },
]

/** Selector de disponibilidad por franja. Solo edita un borrador local; guardar es otra acción. */
export function EditorCondiciones({
  franjas,
  valor,
  onCambio,
  deshabilitado,
  prefijo,
}: {
  franjas: Franja[]
  valor: Disponibilidad
  onCambio: (clave: string, v: Valor) => void
  deshabilitado?: boolean
  prefijo: string
}) {
  return (
    <div className="condiciones">
      {franjas.map((f) => (
        <fieldset key={f.clave} className="franja-cond" disabled={deshabilitado}>
          <legend>
            Franja {f.clave}: {franjaTexto(f.inicio, f.fin)}
          </legend>
          <div className="opciones">
            {OPCIONES.map((o) => {
              const id = `${prefijo}-${f.clave}-${o.v}`
              return (
                <label key={o.v} htmlFor={id} className={`opcion-radio ${valor[f.clave] === o.v ? 'opcion-activa' : ''}`}>
                  <input
                    id={id}
                    type="radio"
                    name={`${prefijo}-${f.clave}`}
                    checked={valor[f.clave] === o.v}
                    onChange={() => onCambio(f.clave, o.v)}
                  />
                  {o.texto}
                </label>
              )
            })}
          </div>
        </fieldset>
      ))}
    </div>
  )
}

export const ETIQUETA_VALOR: Record<Valor, string> = { si: 'Sí', no: 'No', pendiente: 'Pendiente' }
