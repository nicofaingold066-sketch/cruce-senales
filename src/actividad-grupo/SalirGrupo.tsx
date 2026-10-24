import { useState } from 'react'
import { api } from '../lib/api'
import { useAccion } from '../lib/hooks'
import { irA, rutas } from '../lib/shell'
import { Confirmacion, useVolverFoco } from '../components/Confirmacion'
import { Boton, ErrorCaja } from '../components/ui'
import './salir-grupo.css'

export function SalirGrupo({ espacioId, nombre, esOrganizador, deshabilitado }: {
  espacioId: string
  nombre: string
  esOrganizador: boolean
  deshabilitado: boolean
}) {
  const [confirmar, setConfirmar] = useState(false)
  const { ocupado, error, ejecutar, limpiarError } = useAccion()
  const { zona, volver } = useVolverFoco<HTMLDivElement>()

  async function salir() {
    const r = await ejecutar(`salir-grupo:${espacioId}`, (intento) => api.leaveSpace(espacioId, intento))
    if (r?.ok) irA(rutas.inicio())
    else if (r && !r.ok && r.error.resultadoIncierto) {
      // Puede haber salido aunque se haya cortado la respuesta. Verificamos el acceso real antes de repetir.
      const actual = await api.getSpace(espacioId)
      if (!actual.ok && actual.error.codigo === 'fuera_de_audiencia') irA(rutas.inicio())
    }
  }

  return (
    <div className="salir-grupo" ref={zona}>
      {esOrganizador ? (
        <p className="suave">Organizas este grupo. Para salir, primero hay que transferir la organización; esa opción todavía no está disponible.</p>
      ) : confirmar ? (
        <Confirmacion titulo={`¿Salir de ${nombre}?`}>
          <p>Dejarás de tener acceso al grupo y te bajarás de sus planes activos. Los demás verán tu nombre en la actividad, sin motivos.</p>
          <div className="fila-botones">
            <Boton variante="peligro" onClick={() => void salir()} ocupado={ocupado} ocupadoTexto="Saliendo…" disabled={deshabilitado}>
              Sí, salir del grupo
            </Boton>
            <Boton variante="secundario" disabled={ocupado} onClick={() => volver(() => { setConfirmar(false); limpiarError() })}>
              Quedarme
            </Boton>
          </div>
          {error ? <ErrorCaja error={error} enfocar /> : null}
        </Confirmacion>
      ) : (
        <Boton variante="secundario" disabled={deshabilitado} onClick={() => setConfirmar(true)} data-abre-confirmacion>
          Salir del grupo
        </Boton>
      )}
    </div>
  )
}
