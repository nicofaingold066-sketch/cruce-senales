import { useEffect, useRef, useState } from 'react'
import { Aviso, Boton, ErrorCaja } from '../components/ui'
import { useAccion } from '../lib/hooks'
import { agenteApi } from './api'

/** E11: independiente de los gustos y del permiso para usarlos; nunca acepta un plan. */
export function ConsentimientoInvitaciones({ espacioId, inicial, soloLectura }: {
  espacioId: string
  inicial: boolean | null
  soloLectura?: boolean
}) {
  const [recibir, setRecibir] = useState(inicial ?? false)
  const [confirmado, setConfirmado] = useState(inicial)
  const [sinConfirmar, setSinConfirmar] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)
  const { ocupado, error, ejecutar, limpiarError } = useAccion()
  const refError = useRef<HTMLDivElement>(null)
  useEffect(() => { if (error) refError.current?.focus() }, [error])
  const pendiente = confirmado !== null && recibir !== confirmado

  async function guardar() {
    if (soloLectura || confirmado === null) return
    setAviso(null)
    const r = await ejecutar(`invitaciones:${espacioId}:${recibir}`, () => agenteApi.setRecibirInvitaciones(espacioId, recibir))
    if (r?.ok) {
      const eco = r.data.recibir_invitaciones_agente
      setConfirmado(eco)
      setSinConfirmar(false)
      setAviso(eco !== recibir
        ? 'El servidor confirmó otra elección. Tu cambio sigue sin guardar; revisa y vuelve a guardar.'
        : eco ? 'Guardado. Puedes recibir invitaciones del agente. Cada plan requiere tu respuesta.' : 'Guardado. No recibirás nuevas invitaciones del agente.')
    } else if (r) setSinConfirmar(true)
  }

  async function comprobar() {
    setAviso(null)
    const r = await ejecutar(`leer-invitaciones:${espacioId}`, () => agenteApi.getMyPreferences(espacioId))
    if (r?.ok) {
      const valor = r.data.recibir_invitaciones_agente
      setConfirmado(valor)
      if (valor !== null) {
        setRecibir(valor)
        setSinConfirmar(false)
        setAviso('Estado de las invitaciones actualizado desde el servidor.')
      }
    }
  }

  return (
    <section className="bloque" aria-labelledby="invitaciones-titulo">
      <h3 id="invitaciones-titulo" className="agente-subtitulo">Invitaciones del agente</h3>
      <label htmlFor="pref-invitaciones" className="agente-casilla">
        <input
          id="pref-invitaciones"
          type="checkbox"
          checked={recibir}
          disabled={soloLectura || ocupado || confirmado === null}
          aria-describedby="pref-invitaciones-ayuda"
          onChange={(e) => {
            setRecibir(e.target.checked)
            setAviso(null)
            limpiarError()
          }}
        />
        <span>
          Recibir invitaciones del agente
          <small id="pref-invitaciones-ayuda">Es opcional y está apagado por defecto. No habilita el uso de tus preferencias ni confirma asistencia. El cambio se aplica al guardar.</small>
        </span>
      </label>
      <p role="status">
        {confirmado === null
          ? 'El servidor todavía no confirmó si puedes recibir invitaciones.'
          : `Último estado confirmado: invitaciones ${confirmado ? 'activadas' : 'desactivadas'}.`}
        {pendiente ? ' Cambio sin guardar.' : ''}
        {sinConfirmar ? ' El cambio no está confirmado; el servidor pudo haberlo registrado. Puedes guardar tu elección otra vez o comprobar el estado.' : ''}
      </p>
      {confirmado === null ? <Aviso tono="info">Las invitaciones aún no están disponibles en esta conexión. Puedes seguir guardando tus preferencias.</Aviso> : null}
      <div ref={refError} tabIndex={-1}>
        {error ? <ErrorCaja error={error} onReintentar={() => void (confirmado === null ? comprobar() : guardar())} /> : null}
      </div>
      {aviso ? <Aviso tono={pendiente ? 'info' : 'ok'}>{aviso}</Aviso> : null}
      <p className="agente-sr" aria-live="polite">{ocupado ? 'Consultando el permiso de invitaciones…' : ''}</p>
      <Boton onClick={() => void guardar()} ocupado={ocupado} ocupadoTexto="Guardando…" disabled={soloLectura || confirmado === null || (!pendiente && !sinConfirmar && !error)}>
        Guardar permiso de invitaciones
      </Boton>
      {error || sinConfirmar || confirmado === null ? (
        <Boton onClick={() => void comprobar()} disabled={soloLectura || ocupado}>Comprobar permiso de invitaciones</Boton>
      ) : null}
    </section>
  )
}
