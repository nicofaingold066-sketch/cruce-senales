// Pestaña Plan (S4, rediseño; mockup validado, obligatorio). El resultado y la acción viven en el bloque de arriba
// (`Resultado`); acá van las filas exactas de cada estado (`FilasPlan`): tu respuesta, así no puedo, avisar, la ficha y el
// historial plegados y, al final y chico, retirarse o cancelar.
import type { PestanaProps } from './tabs'
import { FilasPlan } from '../componentes-nuevos/plan/FilasPlan'
import { ParticipacionPlan } from '../participacion-publica'

export default function PlanTab({ p, viva, soloLectura, espacio, irAPestana, conSimulacion = false }: PestanaProps & { conSimulacion?: boolean }) {
  return (
    <div className="plan-tab">
      <ParticipacionPlan p={p} espacio={espacio ?? null} />
      <FilasPlan p={p} viva={viva} soloLectura={soloLectura} espacio={espacio ?? null} irAPestana={irAPestana} conSimulacion={conSimulacion} />
    </div>
  )
}
