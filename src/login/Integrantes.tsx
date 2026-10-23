// Enmienda 9, fase 2: los nombres del grupo al crearlo. Cada persona elige el suyo al abrir la invitación
// ("¿Quién eres?"). Solo nombres o apodos: nada de correos ni teléfonos. El servidor valida nombres y tope.
import { useRef, useState } from 'react'
import { Boton } from '../components/ui'
import './login.css'

export const MAX_INTEGRANTES = 12

export function CampoIntegrantes({
  integrantes,
  cambiar,
  tuNombre,
}: {
  integrantes: string[]
  cambiar: (lista: string[]) => void
  /** El nombre de quien crea: no se puede repetir en la lista. */
  tuNombre: string
}) {
  const [nuevo, setNuevo] = useState('')
  const [aviso, setAviso] = useState<string | null>(null)
  const campo = useRef<HTMLInputElement>(null)

  function agregar() {
    const n = nuevo.trim()
    if (!n) return
    const igual = (a: string) => a.trim().toLocaleLowerCase('es') === n.toLocaleLowerCase('es')
    if (igual(tuNombre) || integrantes.some(igual)) {
      setAviso(`${n} ya está en la lista.`)
    } else if (integrantes.length >= MAX_INTEGRANTES) {
      setAviso(`Hasta ${MAX_INTEGRANTES} personas por ahora.`)
    } else {
      cambiar([...integrantes, n])
      setNuevo('')
      setAviso(`Agregaste a ${n}.`)
    }
    campo.current?.focus()
  }

  return (
    <fieldset className="form-seccion">
      <legend>Quiénes son</legend>
      <label className="campo">
        <span>Agregar a alguien del grupo</span>
        <input
          ref={campo}
          value={nuevo}
          onChange={(e) => setNuevo(e.target.value)}
          onKeyDown={(e) => {
            // Enter agrega el nombre en vez de enviar el formulario.
            if (e.key === 'Enter') {
              e.preventDefault()
              agregar()
            }
          }}
          maxLength={30}
          autoComplete="off"
        />
        <small>Opcional. Solo un nombre o apodo: al abrir la invitación, cada persona elige el suyo.</small>
      </label>
      <Boton variante="secundario" onClick={agregar} disabled={nuevo.trim() === ''}>
        Agregar
      </Boton>
      <p className="visualmente-oculto" aria-live="polite">
        {aviso}
      </p>
      {integrantes.length > 0 ? (
        <ul className="quien-integrantes" aria-label="Integrantes que agregaste">
          {integrantes.map((n) => (
            <li key={n}>
              <span>{n}</span>
              <button
                type="button"
                className="btn btn-secundario btn-chico"
                aria-label={`Quitar a ${n}`}
                onClick={() => {
                  cambiar(integrantes.filter((x) => x !== n))
                  setAviso(`Quitaste a ${n}.`)
                  campo.current?.focus()
                }}
              >
                Quitar
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </fieldset>
  )
}
