import { Aviso, Boton } from '../components/ui'
import { textoInvitacionAgente } from './socialApi'

/** situacion es propuesta.mi_situacion de la respuesta actual del servidor. */
export function InvitacionAgente({ situacion, onResponder }: { situacion: unknown; onResponder?: () => void }) {
  const texto = textoInvitacionAgente(situacion)
  if (texto === null) return null
  return <Aviso titulo="Tienes una invitación del agente" accion={onResponder ? <Boton variante="secundario" onClick={onResponder}>Revisar cómo responder</Boton> : undefined}>
    <p>{texto}</p>
    <p className="suave">Esta invitación no confirma tu asistencia. Revisa el horario, lugar, cupos y versión del plan antes de responder con las acciones de la propuesta.</p>
  </Aviso>
}

export default InvitacionAgente
