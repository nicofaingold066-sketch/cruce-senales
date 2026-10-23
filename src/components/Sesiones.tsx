// Sesiones guardadas en este navegador (mejora #47). Se usa en la portada y en el perfil.
import { useRef, useState } from 'react'
import { leerGuardada, olvidarGuardada, volverAGuardada } from '../lib/sesiones'
import { Aviso, Boton } from './ui'

/** Mejora #47: si alguien entró como otra persona en este navegador, la sesión anterior se puede retomar. */
export function OtraSesion() {
  const [guardada, setGuardada] = useState(() => leerGuardada())
  const [confirmarOlvido, setConfirmarOlvido] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const enVuelo = useRef(false)

  async function volver() {
    if (enVuelo.current || !guardada) return
    enVuelo.current = true
    setOcupado(true)
    setError(null)
    const r = await volverAGuardada(guardada)
    if (r.ok) {
      // Todo lo que está en pantalla es de la sesión de ahora: se empieza de cero con la recuperada.
      window.location.reload()
      return
    }
    enVuelo.current = false
    setOcupado(false)
    setError(r.mensaje)
    setGuardada(leerGuardada())
  }

  if (!guardada) return error ? <Aviso tono="error" titulo="No se pudo volver a la otra sesión">{error}</Aviso> : null
  return (
    <Aviso
      tono="info"
      titulo={`Este navegador guarda otra sesión: ${guardada.etiqueta}`}
      accion={
        confirmarOlvido ? (
          <div className="fila-botones">
            <Boton
              variante="peligro"
              onClick={() => {
                olvidarGuardada()
                setGuardada(null)
              }}
            >
              Sí, olvidarla
            </Boton>
            <Boton variante="secundario" onClick={() => setConfirmarOlvido(false)}>
              Cancelar
            </Boton>
          </div>
        ) : (
          <div className="fila-botones">
            <Boton onClick={volver} ocupado={ocupado} ocupadoTexto="Volviendo…">
              Volver a esa sesión
            </Boton>
            <Boton variante="secundario" onClick={() => setConfirmarOlvido(true)} disabled={ocupado}>
              Olvidarla
            </Boton>
          </div>
        )
      }
    >
      {confirmarOlvido
        ? `Si la olvidas, este navegador ya no podrá volver a ser ${guardada.etiqueta}.`
        : 'Alguien entró como otra persona en este navegador. Al volver, la sesión abierta ahora deja de estar en este navegador. Cualquiera que use este navegador puede volver a esa sesión: para separarlas de verdad, usa una ventana privada.'}
      {error ? <p className="suave">{error}</p> : null}
    </Aviso>
  )
}
