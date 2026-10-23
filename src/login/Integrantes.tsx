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

  /** Agrega uno o varios nombres (una lista pegada o escrita con comas, punto y coma o saltos de línea). */
  function agregarVarios(texto: string) {
    const nombres = texto.split(/[,;\n\r]+/).map((x) => x.replace(/\s+/g, ' ').trim()).filter(Boolean)
    if (nombres.length === 0) return
    const igual = (a: string, b: string) => a.trim().toLocaleLowerCase('es') === b.toLocaleLowerCase('es')
    const lista = [...integrantes]
    const agregados: string[] = []
    const avisos: string[] = []
    for (const n of nombres) {
      if (n.length > 30) avisos.push(`${n.slice(0, 30)}… es muy largo (hasta 30 letras).`)
      else if (igual(tuNombre, n) || lista.some((a) => igual(a, n))) avisos.push(`${n} ya está en la lista.`)
      else if (lista.length >= MAX_INTEGRANTES) {
        avisos.push(`Hasta ${MAX_INTEGRANTES} personas por ahora.`)
        break
      } else {
        lista.push(n)
        agregados.push(n)
      }
    }
    if (agregados.length) {
      cambiar(lista)
      setNuevo('')
    }
    setAviso([agregados.length ? `Agregaste a ${agregados.join(', ')}.` : null, ...avisos].filter(Boolean).join(' '))
    campo.current?.focus()
  }

  function agregar() {
    agregarVarios(nuevo)
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
          onPaste={(e) => {
            // Una lista pegada (por ejemplo, copiada del chat del grupo) se agrega entera; un nombre suelto se pega normal.
            const t = e.clipboardData.getData('text')
            if (/[,;\n\r]/.test(t)) {
              e.preventDefault()
              agregarVarios(`${nuevo}${nuevo ? ',' : ''}${t}`)
            }
          }}
          onKeyDown={(e) => {
            // Enter agrega el nombre en vez de enviar el formulario.
            if (e.key === 'Enter') {
              e.preventDefault()
              agregar()
            }
          }}
          maxLength={200}
          autoComplete="off"
        />
        <small>
          Opcional. Escribe los nombres como les gusta que los llamen; puedes pegar varios separados por comas. Al abrir la
          invitación, cada persona elige el suyo.
        </small>
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
