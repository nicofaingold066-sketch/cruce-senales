import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useAccion } from '../lib/hooks'
import { irA, rutas } from '../lib/shell'
import { Confirmacion, useVolverFoco } from './Confirmacion'
import { Boton, ErrorCaja } from './ui'
import './EliminarGrupo.css'

/** Se monta solo para quien organiza; la RPC vuelve a comprobar su rol actual. */
export function EliminarGrupo({ espacioId, nombre, deshabilitado, alConfirmar }: {
  espacioId: string
  nombre: string
  deshabilitado: boolean
  alConfirmar: (abierta: boolean) => void
}) {
  const [confirmar, setConfirmar] = useState(false)
  const { ocupado, error, ejecutar, limpiarError } = useAccion()
  const { zona, volver } = useVolverFoco<HTMLDivElement>()
  useEffect(() => () => alConfirmar(false), [alConfirmar])

  async function eliminar() {
    if (deshabilitado || ocupado) return
    const r = await ejecutar(`eliminar-grupo:${espacioId}`, intento => api.deleteSpace(espacioId, intento))
    if (r?.ok) irA(rutas.inicio())
  }

  return (
    <details className="tarjeta plegable s2-fila administrar-grupo" onToggle={e => {
      if (e.currentTarget.open || !confirmar) return
      if (ocupado || error?.resultadoIncierto) { e.currentTarget.open = true; return }
      setConfirmar(false)
      limpiarError()
      alConfirmar(false)
    }}>
      <summary><span className="summary-texto"><span>Administrar grupo</span></span></summary>
      <div className="eliminar-grupo" ref={zona}>
        {confirmar ? (
          <Confirmacion titulo={`¿Eliminar «${nombre}»?`}>
            <p>Se borrarán el grupo, sus planes, confirmaciones, historial y preferencias. Todos los integrantes perderán el acceso y el enlace de invitación dejará de funcionar.</p>
            <p><strong>No se puede deshacer.</strong></p>
            {error?.resultadoIncierto ? <p>La eliminación todavía no está confirmada. Reintenta para comprobar el resultado de esta misma acción.</p> : null}
            <div className="fila-botones">
              <Boton variante="secundario" disabled={ocupado} onClick={() => {
                if (error?.resultadoIncierto) { irA(rutas.inicio()); return }
                volver(() => { setConfirmar(false); limpiarError(); alConfirmar(false) })
              }}>
                {error?.resultadoIncierto ? 'Ir a mis grupos' : 'Conservar grupo'}
              </Boton>
              <Boton variante="peligro" disabled={deshabilitado} ocupado={ocupado} ocupadoTexto="Eliminando…" onClick={() => void eliminar()}>
                {error?.reintentable ? 'Reintentar eliminación' : 'Eliminar definitivamente'}
              </Boton>
            </div>
            {error ? <ErrorCaja error={error} enfocar /> : null}
          </Confirmacion>
        ) : (
          <>
            <p className="suave">Solo quien administra el grupo puede eliminarlo para todos sus integrantes.</p>
            <Boton variante="peligro" disabled={deshabilitado} onClick={() => { alConfirmar(true); setConfirmar(true) }} data-abre-confirmacion>
              Eliminar grupo
            </Boton>
          </>
        )}
      </div>
    </details>
  )
}
