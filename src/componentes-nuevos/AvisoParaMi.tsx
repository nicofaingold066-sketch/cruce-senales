// Aviso personal arriba de la propuesta (ux-flujo). Lo conecta front-juan en `PlanTab.tsx`, antes de la tarjeta
// de estado. Sin RPC nuevas: usa el estado que la pantalla ya tiene.
import { Aviso } from '../components/ui'
import { avisoParaMi } from './avisoPersonal'
import type { DatosAvisoParaMi } from './avisoPersonal'

export function AvisoParaMi({ p, irARespuesta }: { p: DatosAvisoParaMi; irARespuesta?: () => void }) {
  const a = avisoParaMi(p)
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
