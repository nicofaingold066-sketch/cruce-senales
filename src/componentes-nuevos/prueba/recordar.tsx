// Banco de prueba de RecordarFaltan (#89), sin base ni red. Datos ficticios.
// Abrir con el servidor de desarrollo: /src/componentes-nuevos/prueba/recordar.html
import { createRoot } from 'react-dom/client'
import '../../styles.css'
import { RecordarFaltan } from '../RecordarFaltan'

function Banco() {
  return (
    <div className="vista">
      <div className="hoja">
        <section className="tarjeta">
          <h2>Reuniendo interés (organizador)</h2>
          <RecordarFaltan codigo="ABCD1234" titulo="Pádel y algo después" />
        </section>
        <section className="tarjeta">
          <h2>Versión nueva</h2>
          <RecordarFaltan codigo="ABCD1234" titulo="Pádel y algo después" motivo="version_nueva" cuando="sábado 31 oct, 20:00" />
        </section>
        <section className="tarjeta">
          <h2>Reparación</h2>
          <RecordarFaltan codigo="ABCD1234" titulo="Pádel y algo después" motivo="reparacion" cuando="domingo 1 nov, 20:00" />
        </section>
      </div>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(<Banco />)
