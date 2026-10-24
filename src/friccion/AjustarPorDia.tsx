// "Ajustar día por día" (pantalla 6, abajo y chico): el editor fino de siempre (Sí / No / Pendiente por franja) para
// quien tiene 3+ franjas o quiere algo que las respuestas de un toque no dicen. Cerrado por defecto; se abre solo si no hay
// respuestas de un toque. El servidor decide si se puede guardar (`puede.guardar_condiciones`); acá solo se edita el borrador.
import { useCallback, useEffect, useState } from 'react'
import { api } from '../lib/api'
import type { ApiError, Condiciones, EstadoPropuesta } from '../lib/types'
import { useAccion, useBorradorCondiciones } from '../lib/hooks'
import { vibrar } from '../lib/tacto'
import { Boton, Cargando, ErrorCaja } from '../components/ui'
import { EditorCondiciones } from '../components/Condiciones'
import '../estilo/seccion-s5.css'

export function AjustarPorDia({
  p,
  abierto,
  deshabilitado,
  onGuardado,
}: {
  p: EstadoPropuesta
  /** Abierto desde el inicio (no hay respuestas de un toque). */
  abierto: boolean
  deshabilitado: boolean
  onGuardado: (p: EstadoPropuesta, c: Condiciones) => void
}) {
  const [cond, setCond] = useState<Condiciones | null>(null)
  const [errorCarga, setErrorCarga] = useState<ApiError | null>(null)
  const [visible, setVisible] = useState(abierto)
  const claves = p.franjas.map((f) => f.clave)
  const b = useBorradorCondiciones(cond?.disponibilidad ?? null, claves)
  const guardar = useAccion()
  const puede = p.mi_situacion.puede.guardar_condiciones && !deshabilitado

  const cargar = useCallback(async () => {
    const r = await api.getMyConditions(p.id)
    if (r.ok) {
      setCond(r.data.condiciones)
      setErrorCarga(null)
    } else setErrorCarga(r.error)
  }, [p.id])
  useEffect(() => {
    if (visible && cond === null) void cargar()
  }, [visible, cond, cargar])

  async function hacer() {
    const r = await guardar.ejecutar(`cond:${p.id}:${JSON.stringify(b.draft)}`, () => api.saveMyConditions(p.id, b.draft))
    if (r?.ok) {
      vibrar(10)
      setCond(r.data.condiciones)
      onGuardado(r.data.propuesta, r.data.condiciones)
    }
  }

  const hayPendiente = Object.values(b.draft).includes('pendiente')
  return (
    <details className="s5-detalle s5-ajustar" open={visible} onToggle={(e) => setVisible(e.currentTarget.open)}>
      <summary>Ajustar día por día</summary>
      <div className="s5-detalle-cuerpo">
        {cond === null && !errorCarga ? <Cargando texto="Cargando tus condiciones…" /> : null}
        {errorCarga && cond === null ? <ErrorCaja error={errorCarga} onReintentar={cargar} /> : null}
        {cond !== null ? (
          <>
            <EditorCondiciones franjas={p.franjas} valor={b.draft} onCambio={(c, v) => b.poner(c, v)} deshabilitado={!puede} prefijo={`ajuste-${p.id}`} />
            <p className="suave nota-seccion">
              {hayPendiente
                ? '"Pendiente" = aún no lo sabes. Con alguna franja en "Pendiente" no entras en ninguna opción. Cuando sepas, marca Sí o No en cada una.'
                : 'Es privado: nadie del grupo ve lo que marcas.'}
            </p>
            <div className="fila-botones">
              <Boton variante="secundario" onClick={() => void hacer()} ocupado={guardar.ocupado} ocupadoTexto="Guardando…" disabled={!puede || !b.sucio}>
                Guardar condiciones
              </Boton>
              {b.sucio ? (
                <Boton variante="secundario" onClick={b.descartar} disabled={guardar.ocupado}>
                  Descartar cambios
                </Boton>
              ) : null}
            </div>
            {guardar.error ? <ErrorCaja error={guardar.error} enfocar /> : null}
          </>
        ) : null}
      </div>
    </details>
  )
}
