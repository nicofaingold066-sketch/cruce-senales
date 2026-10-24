import { useId, useSyncExternalStore } from 'react'
import { Monitor, Moon, Sun } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cambiarTema, leerTema, suscribirTema } from '../lib/tema'
import type { ModoTema } from '../lib/tema'
import './PreferenciaTema.css'

const OPCIONES: { valor: ModoTema; titulo: string; icono: LucideIcon }[] = [
  { valor: 'light', titulo: 'Claro', icono: Sun },
  { valor: 'dark', titulo: 'Oscuro', icono: Moon },
  { valor: 'system', titulo: 'Sistema', icono: Monitor },
]

export function PreferenciaTema() {
  const id = useId()
  const modo = useSyncExternalStore(suscribirTema, leerTema)

  return (
    <fieldset className="preferencia-tema" aria-describedby={`${id}-ayuda`}>
      <legend>Apariencia</legend>
      <div className="preferencia-tema-opciones">
        {OPCIONES.map(({ valor, titulo, icono: Icono }) => (
          <label key={valor} className="preferencia-tema-opcion">
            <Icono size={20} strokeWidth={2} aria-hidden="true" focusable="false" />
            <input
              type="radio"
              name={`${id}-tema`}
              value={valor}
              checked={modo === valor}
              onChange={() => cambiarTema(valor)}
            />
            <span>{titulo}</span>
          </label>
        ))}
      </div>
      <p id={`${id}-ayuda`} className="preferencia-tema-ayuda">
        Se aplica al instante en este navegador, sin guardar tus gustos. Sistema sigue la apariencia de tu dispositivo.
      </p>
    </fieldset>
  )
}
