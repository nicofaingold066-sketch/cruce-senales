// Pestaña Plan (S4, rediseño; mockup validado, obligatorio). El resultado y la acción viven en el bloque de arriba
// (`Resultado`); acá van las filas exactas de cada estado (`FilasPlan`): tu respuesta, así no puedo, avisar, la ficha y el
// historial plegados y, al final y chico, retirarse o cancelar.
import type { PestanaProps } from './tabs'
import { FilasPlan } from '../componentes-nuevos/plan/FilasPlan'

export default function PlanTab({ p, viva, soloLectura, espacio, irAPestana }: PestanaProps) {
  return (
    <div className="plan-tab">
      <FilasPlan p={p} viva={viva} soloLectura={soloLectura} espacio={espacio ?? null} irAPestana={irAPestana} />
    </div>
  )
}
