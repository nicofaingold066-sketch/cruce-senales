// D3 (aprobada por Nico): la modalidad de la juntada es una regla del GRUPO para esta vez ("solo el grupo", "con parejas",
// "abierta"), no un dato de nadie (D2: no se pide ni se infiere el género ni la pareja de una persona). Sin migración:
// va como marca al final del nombre del grupo o del título del plan ("Los del pádel · con parejas") y en el texto de la
// invitación (src/lib/compartir.ts). front-juan la conecta en "Crear un grupo" (y, si quiere, en "Nueva propuesta"):
//   const [quienViene, setQuienViene] = useState<QuienViene | null>(null)
//   <CampoQuienViene valor={quienViene} cambiar={setQuienViene} nombre={nombre} />
//   api.createSpace(conQuienViene(nombre.trim(), quienViene), tipo, nombreVisible, integrantes)
import { useId } from 'react'
import { cabeQuienViene, FRASE_QUIEN_VIENE, OPCIONES_QUIEN_VIENE } from '../lib/compartir'
import type { QuienViene } from '../lib/compartir'
import './friccion.css'

export function CampoQuienViene({
  valor,
  cambiar,
  nombre,
  deshabilitado,
}: {
  valor: QuienViene | null
  cambiar: (q: QuienViene | null) => void
  /** El nombre del grupo o título al que se le suma la marca: avisa si no cabe en el tope del servidor. */
  nombre?: string
  deshabilitado?: boolean
}) {
  const id = useId()
  const opciones: { v: QuienViene | null; texto: string }[] = [{ v: null, texto: 'Sin definir' }, ...OPCIONES_QUIEN_VIENE]
  const noCabe = valor != null && nombre != null && !cabeQuienViene(nombre, valor)
  return (
    <fieldset className="form-seccion quien-viene" disabled={deshabilitado}>
      <legend>¿Quién viene?</legend>
      <p className="suave">Opcional. Es una regla del grupo para esta vez; no se le pregunta nada a nadie.</p>
      <div className="opciones quien-viene-opciones">
        {opciones.map((o) => {
          const k = o.v ?? 'ninguna'
          const iid = `${id}-${k}`
          return (
            <label key={k} htmlFor={iid} className={`opcion-radio ${valor === o.v ? 'opcion-activa' : ''}`}>
              <input id={iid} type="radio" name={`${id}-quien-viene`} checked={valor === o.v} onChange={() => cambiar(o.v)} />
              {o.texto}
            </label>
          )
        })}
      </div>
      {valor ? <p className="suave">En la invitación dirá: «{FRASE_QUIEN_VIENE[valor]}»</p> : null}
      {noCabe ? <p className="aviso-linea">El nombre es muy largo para sumarle la marca: acórtalo o deja «Sin definir».</p> : null}
    </fieldset>
  )
}
