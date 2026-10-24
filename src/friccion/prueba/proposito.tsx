// Banco sin base (datos ficticios) de <CampoProposito/> (enmienda 14). Abrir con el servidor de desarrollo:
// /src/friccion/prueba/proposito.html
import { createRoot } from 'react-dom/client'
import { useState } from 'react'
import '../../styles.css'
import { CampoProposito } from '../Proposito'
import { textoInvitacion } from '../../lib/compartir'
import type { Proposito } from '../propositos'

function Banco() {
  const [p, setP] = useState<Proposito>('libre')
  ;(window as unknown as { proposito: string }).proposito = p
  return (
    <main className="contenido" style={{ padding: 16 }}>
      <CampoProposito valor={p} cambiar={setP} />
      <p id="invitacion">{textoInvitacion('Los del fútbol', 'ABCD1234', null, p)}</p>
    </main>
  )
}
createRoot(document.getElementById('root')!).render(<Banco />)
