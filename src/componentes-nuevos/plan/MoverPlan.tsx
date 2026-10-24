// Mover el plan (S4, rediseño): lo que puede hacer quien organiza fuera del resultado. «Avisar al grupo» una sola vez
// (el mensaje no nombra a nadie) y, al final y chico, cancelar con confirmación.
import { useState } from 'react'
import { api } from '../../lib/api'
import { franjaTexto } from '../../lib/format'
import { useMutacion } from '../../lib/hooks'
import type { PropuestaViva } from '../../lib/hooks'
import type { EstadoPropuesta } from '../../lib/types'
import { Aviso, Boton, EncabezadoSeccion, ErrorCaja } from '../../components/ui'
import { RecordarFaltan } from '../RecordarFaltan'
import type { MotivoAviso } from '../recordar'

export function MoverPlan({ p, viva, soloLectura, codigo }: { p: EstadoPropuesta; viva: PropuestaViva; soloLectura: boolean; codigo: string | null }) {
  const organiza = p.mi_situacion.es_organizador
  const o = p.opcion
  // El aviso al grupo: mientras se juntan respuestas (recordar a quien falta) o con una versión nueva y lugar para otros.
  // Con el último cupo reservado a quien no puede faltar, "si vas, confírmala" invitaría a algo que el servidor rechaza.
  // Confirmado, el aviso ya está en el resultado para quien confirmó.
  let motivo: MotivoAviso | null = null
  if (organiza && codigo) {
    if (p.estado === 'reuniendo_interes') motivo = 'faltan'
    else if (p.estado === 'esperando_compromisos' && o && o.cupos.libres_para_otros > 0) motivo = p.opcion_anterior ? 'reparacion' : 'version_nueva'
  }
  if (!motivo && !p.mi_situacion.puede.cancelar) return null
  return (
    <section className="mover-plan" aria-labelledby="mover-titulo">
      <EncabezadoSeccion id="mover-titulo" titulo="Mover el plan" nota="Solo lo ves tú, que organizas." />
      {motivo && codigo ? (
        <div className="tarjeta">
          <h3>Avisar al grupo</h3>
          <RecordarFaltan codigo={codigo} titulo={p.titulo} motivo={motivo} cuando={o ? franjaTexto(o.franja.inicio, o.franja.fin) : null} />
        </div>
      ) : null}
      {p.mi_situacion.puede.cancelar ? <Cancelar p={p} viva={viva} soloLectura={soloLectura} /> : null}
    </section>
  )
}

function Cancelar({ p, viva, soloLectura }: { p: EstadoPropuesta; viva: PropuestaViva; soloLectura: boolean }) {
  const [confirmar, setConfirmar] = useState(false)
  const { ocupado, error, correr } = useMutacion(viva)
  async function hacer() {
    const r = await correr(`cancelar:${p.id}`, () => api.cancelProposal(p.id))
    if (r?.ok) setConfirmar(false)
  }
  return (
    <section className={`tarjeta zona-peligro ${confirmar ? '' : 'zona-peligro-fila'}`} aria-labelledby="cancelar-titulo">
      <div className="zona-peligro-texto">
        <h3 id="cancelar-titulo">¿Ya no va?</h3>
        <p className="suave">Pasa a Cancelado y no se puede reabrir.</p>
      </div>
      {!confirmar ? (
        <Boton variante="secundario" onClick={() => setConfirmar(true)} disabled={soloLectura}>
          Cancelar propuesta
        </Boton>
      ) : (
        <Aviso tono="aviso" titulo="¿Cancelar la propuesta?">
          La propuesta pasa a Cancelado y no se puede reabrir.
          <div className="fila-botones">
            <Boton variante="peligro" onClick={() => void hacer()} ocupado={ocupado} ocupadoTexto="Cancelando…">
              Sí, cancelar
            </Boton>
            <Boton variante="secundario" onClick={() => setConfirmar(false)} disabled={ocupado}>
              Volver
            </Boton>
          </div>
        </Aviso>
      )}
      {error ? <ErrorCaja error={error} enfocar /> : null}
    </section>
  )
}
