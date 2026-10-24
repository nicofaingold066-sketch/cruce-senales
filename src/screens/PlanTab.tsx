// Pestaña Plan (S4, rediseño). El resultado y la acción viven arriba de las pestañas (`Resultado`); acá va lo que
// explica y acompaña: cómo se armó, quiénes, la ficha plegada y, para quien organiza, mover el plan.
import type { PestanaProps } from './tabs'
import { ComoSeArmo } from '../componentes-nuevos/plan/ComoSeArmo'
import { FichaPlan } from '../componentes-nuevos/plan/FichaPlan'
import { MoverPlan } from '../componentes-nuevos/plan/MoverPlan'
import { Quienes } from '../componentes-nuevos/plan/Quienes'

export default function PlanTab({ p, viva, soloLectura, espacio }: PestanaProps) {
  return (
    <div className="plan-tab">
      <ComoSeArmo p={p} espacio={espacio ?? null} />
      <Quienes p={p} />
      <FichaPlan p={p} viva={viva} />
      <MoverPlan p={p} viva={viva} soloLectura={soloLectura} codigo={espacio?.codigo_invitacion ?? null} />
    </div>
  )
}
