// "Rearmar con lo nuevo" para el organizador (enmienda 13 (b), ux-flujo). Lo conecta front-juan en `PlanTab.tsx`,
// en el bloque de la opción vigente cuando la propuesta está en `esperando_compromisos`.
// Llama a `propose_repair` igual que "Buscar alternativa" (`AlternativaOrganizador`): misma huella e intento.
// Después de rearmar ofrece avisar al grupo con `RecordarFaltan motivo="reparacion"` (no nombra a nadie).
import { useId, useState } from 'react'
import { api } from '../lib/api'
import { franjaTexto } from '../lib/format'
import { useMutacion } from '../lib/hooks'
import type { PropuestaViva } from '../lib/hooks'
import type { EstadoPropuesta } from '../lib/types'
import { Aviso, Boton, ErrorCaja } from '../components/ui'
import { RecordarFaltan } from './RecordarFaltan'
import { vistaRearmar } from './rearmar'
import type { CamposE13 } from './rearmar'

export function RearmarConLoNuevo({
  p,
  viva,
  codigo,
  soloLectura,
}: {
  p: EstadoPropuesta & CamposE13
  viva: PropuestaViva
  /** `espacio.codigo_invitacion`: si viene, después de rearmar se ofrece avisar al grupo por WhatsApp. */
  codigo?: string | null
  soloLectura?: boolean
}) {
  const { ocupado, error, correr } = useMutacion(viva)
  const [rearmada, setRearmada] = useState<number | null>(null)
  const id = useId()

  async function rearmar() {
    const r = await correr(`rearmar:${p.id}:${p.state_rev}`, (intento) => api.proposeRepair(p.id, intento))
    if (r?.ok) setRearmada(r.data.resultado.version)
  }

  // Recién rearmada: la propuesta ya trae la versión nueva; se ofrece el aviso al grupo una vez.
  if (rearmada !== null && p.opcion?.version === rearmada) {
    return (
      <section className="tarjeta" aria-labelledby={`${id}-rearmada`}>
        <h2 id={`${id}-rearmada`}>Versión {rearmada} lista</h2>
        <Aviso tono="ok">Empieza sin confirmaciones. Avísale al grupo para que cada uno confirme si le sirve.</Aviso>
        {codigo ? (
          <RecordarFaltan
            codigo={codigo}
            titulo={p.titulo}
            motivo="reparacion"
            cuando={franjaTexto(p.opcion.franja.inicio, p.opcion.franja.fin)}
          />
        ) : null}
      </section>
    )
  }

  const v = vistaRearmar(p, error ? { codigo: error.codigo, detalle: error.detalle } : null)
  if (!v) return null
  const otroError = error && v.clave === 'rearmar' ? error : null
  return (
    <section className="tarjeta" aria-labelledby={`${id}-rearmar`}>
      <h2 id={`${id}-rearmar`}>{v.titulo}</h2>
      {v.clave === 'rearmar' ? <p>{v.texto}</p> : <Aviso tono={v.clave === 'ya_no_hace_falta' ? 'info' : 'aviso'}>{v.texto}</Aviso>}
      {v.boton ? (
        <div className="barra-accion">
          <Boton onClick={() => void rearmar()} ocupado={ocupado} ocupadoTexto="Rearmando…" disabled={soloLectura}>
            {error?.reintentable ? 'Reintentar' : v.boton}
          </Boton>
        </div>
      ) : null}
      {v.nota ? <p className="suave">{v.nota}</p> : null}
      {otroError ? <ErrorCaja error={otroError} enfocar /> : null}
    </section>
  )
}
