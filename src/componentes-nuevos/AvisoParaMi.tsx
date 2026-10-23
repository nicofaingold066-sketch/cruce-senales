// Aviso personal arriba de la propuesta (ux-flujo). Lo conecta front-juan en `PlanTab.tsx`, antes de la tarjeta
// de estado. Sin RPC nuevas: usa el estado que la pantalla ya tiene.
import { Aviso } from '../components/ui'
import { momentoCorto } from '../lib/format'
import type { Momento } from '../lib/types'
import { avisoParaMi } from './avisoPersonal'
import type { DatosAvisoParaMi } from './avisoPersonal'

export function AvisoParaMi({
  p,
  irARespuesta,
  servidorAhora,
}: {
  p: DatosAvisoParaMi & { plazo?: Momento }
  irARespuesta?: () => void
  /** `servidor_ahora` de la última respuesta (lo guarda `useEstadoPropuesta`); sin él no se calcula el cierre. */
  servidorAhora?: Momento | null
}) {
  const plazoTexto = p.plazo ? momentoCorto(p.plazo) : null
  const horasAlCierre =
    p.plazo && servidorAhora ? (Date.parse(p.plazo.utc) - Date.parse(servidorAhora.utc)) / 3_600_000 : null
  const a = avisoParaMi(p, { plazoTexto, horasAlCierre: Number.isFinite(horasAlCierre) ? horasAlCierre : null })
  if (!a) return null
  return (
    <Aviso
      tono={a.tono}
      titulo={a.titulo}
      accion={
        a.irARespuesta && irARespuesta ? (
          <button type="button" className="btn btn-secundario" onClick={irARespuesta}>
            Ir a Mi respuesta
          </button>
        ) : undefined
      }
    >
      {a.texto}
    </Aviso>
  )
}
