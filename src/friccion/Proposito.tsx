// Enmienda 14 (b): "¿Para qué es este grupo?" al crear el grupo. Opcional, "Libre" por defecto (el comportamiento de siempre).
// Un solo control nativo (compacto en el teléfono y accesible con teclado y lector): "Libre" primero y, por familia, "Cualquier …" y
// sus actividades. front-juan lo conecta en CrearGrupo.tsx debajo de <CampoIntegrantes/> con tres líneas:
//   const [proposito, setProposito] = useState<Proposito>('libre')
//   <CampoProposito valor={proposito} cambiar={setProposito} />
//   api.createSpace(nombre, tipo, nombreVisible, integrantes, proposito)   // quinto argumento: backend lo agrega a api.ts
// Con el valor por defecto ('libre') no cambia nada para los guiones. No se pregunta nada de ninguna persona (D2).
import { useId } from 'react'
import { esProposito, explicacionProposito, opcionesProposito } from './propositos'
import type { Proposito } from './propositos'
import './friccion.css'

export function CampoProposito({
  valor,
  cambiar,
  deshabilitado,
}: {
  valor: Proposito
  cambiar: (p: Proposito) => void
  deshabilitado?: boolean
}) {
  const id = useId()
  const { libre, grupos } = opcionesProposito()
  return (
    <div className="campo proposito">
      <label htmlFor={`${id}-sel`}>
        <span>¿Para qué es este grupo?</span>
      </label>
      <select id={`${id}-sel`} className="proposito-sel" value={valor} onChange={(e) => {
          // Los valores salen de opcionesProposito(): siempre son un Proposito válido.
          if (esProposito(e.target.value)) cambiar(e.target.value)
        }} disabled={deshabilitado} aria-describedby={`${id}-ayuda`}>
        <option value={libre.valor}>{libre.etiqueta}</option>
        {grupos.map((g) => (
          <optgroup key={g.familia} label={g.etiqueta}>
            {g.opciones.map((o) => (
              <option key={o.valor} value={o.valor}>
                {o.etiqueta}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      <small id={`${id}-ayuda`}>Opcional. {explicacionProposito(valor)}</small>
    </div>
  )
}
