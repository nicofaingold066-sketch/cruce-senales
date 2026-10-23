// Banco de prueba de #90 sin base (datos ficticios). Abrir con el servidor de desarrollo:
// /src/friccion/prueba/calendario.html?semilla=<texto>
import { createRoot } from 'react-dom/client'
import { useState } from 'react'
import '../../styles.css'
import { TomarDeCalendario } from '../Calendario'
import type { Disponibilidad, Franja } from '../../lib/types'

const fr = (clave: string, dia: string): Franja => ({ clave, inicio: { utc: '', local: `${dia}T14:00:00` }, fin: { utc: '', local: `${dia}T17:00:00` } })
const franjas = [fr('A', '2026-10-31'), fr('B', '2026-11-01')]
const semilla = new URLSearchParams(location.search).get('semilla') ?? 'ana'

function Banco() {
  const [tomada, setTomada] = useState<Disponibilidad | null>(null)
  return (
    <main className="contenido" style={{ padding: 16 }}>
      <TomarDeCalendario franjas={franjas} semilla={semilla} onTomar={setTomada} />
      <p id="resultado">{tomada ? JSON.stringify(tomada) : 'sin tomar'}</p>
    </main>
  )
}
createRoot(document.getElementById('root')!).render(<Banco />)
