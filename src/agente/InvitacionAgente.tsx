import { Aviso, Boton } from '../components/ui'
import { textoInvitacionAgente } from './socialApi'

/** situacion es propuesta.mi_situacion de la respuesta actual del servidor. */
export function InvitacionAgente({ situacion, onResponder }: { situacion: unknown; onResponder?: () => void }) {
  const texto = textoInvitacionAgente(situacion)
  if (texto === null) return null
  // Rediseño S6: un aviso en el bloque de resultado del plan (lo monta S4). La misma interfaz de siempre.
  return <Aviso tono="info" titulo="Tienes una invitación del agente" accion={onResponder ? <Boton variante="secundario" onClick={onResponder}>Revisar cómo responder</Boton> : undefined}>
    <p>{texto}</p>
    <p className="suave">Esta invitación no confirma tu asistencia: responde desde el plan.</p>
  </Aviso>
}

export default InvitacionAgente
