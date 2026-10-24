// Pestaña Plan (S4, rediseño; pantalla 5 del mockup). El resultado y la acción viven en la escena (`Resultado`); acá va lo
// que explica y acompaña: cómo se armó, las filas (tu respuesta, así no puedo, avisar, mapa, cambios), la ficha plegada
// con quién confirmó y, al final y chico, no voy y cancelar.
import type { PestanaProps } from './tabs'
import { ComoSeArmo } from '../componentes-nuevos/plan/ComoSeArmo'
import { FichaPlan } from '../componentes-nuevos/plan/FichaPlan'
import { FilasPlan } from '../componentes-nuevos/plan/FilasPlan'

export default function PlanTab({ p, viva, soloLectura, espacio, irAPestana }: PestanaProps) {
  return (
    <div className="plan-tab">
      <ComoSeArmo p={p} espacio={espacio ?? null} />
      <FilasPlan p={p} viva={viva} soloLectura={soloLectura} espacio={espacio ?? null} irAPestana={irAPestana}>
        <FichaPlan p={p} viva={viva} />
      </FilasPlan>
    </div>
  )
}
