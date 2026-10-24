import { textoInvitacionAgente } from './socialApi'
import '../estilo/seccion-s6.css'

/**
 * Pantalla 21 del mockup: la invitación del agente vista por un invitado. Una línea punteada arriba del plan de
 * siempre; nada nuevo que aprender (la acción es la del plan, "Responder en un toque", que pone S4).
 * `situacion` es propuesta.mi_situacion de la respuesta actual del servidor; `organizador`, el nombre de quien
 * organiza la propuesta (PlanTab lo tiene en `p.organizador.nombre`). `onResponder` queda por compatibilidad.
 */
export function InvitacionAgente({ situacion, organizador }: { situacion: unknown; onResponder?: () => void; organizador?: string | null }) {
  if (textoInvitacionAgente(situacion) === null) return null
  const quien = organizador?.trim() || null
  return (
    <p className="agente-invitacion" role="note">
      {quien ? `El agente de ${quien} te invita. ${quien} revisó y aprobó este plan.` : 'El agente de quien organiza te invita. Quien organiza revisó y aprobó este plan.'}{' '}
      Lo redactó la IA; no es una confirmación.
    </p>
  )
}

export default InvitacionAgente
