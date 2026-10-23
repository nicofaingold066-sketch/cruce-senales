// Banco de prueba de RecordarFaltan (#89) y AvisoParaMi, sin base ni red. Datos ficticios.
// Abrir con el servidor de desarrollo: /src/componentes-nuevos/prueba/recordar.html
import { createRoot } from 'react-dom/client'
import '../../styles.css'
import { RecordarFaltan } from '../RecordarFaltan'
import { AvisoParaMi } from '../AvisoParaMi'
import type { DatosAvisoParaMi } from '../avisoPersonal'

const vale = { miembro_id: 'm-vale', nombre: 'Vale', simulado: false }
const yo = (extra: Partial<DatosAvisoParaMi['mi_situacion']>): DatosAvisoParaMi['mi_situacion'] => ({
  miembro_id: 'm-vale', nombre: 'Vale', es_organizador: true, es_organizador_espacio: true, interesado: false,
  condiciones: 'sin_cargar', retirado: false, elegible_en_version: null, acepte_version: false,
  puede: {} as DatosAvisoParaMi['mi_situacion']['puede'], ...extra,
})

function Banco() {
  return (
    <div className="vista">
      <div className="hoja">
        <AvisoParaMi p={{ estado: 'reuniendo_interes', imprescindible: vale, mi_situacion: yo({}) }} irARespuesta={() => {}} />
        <AvisoParaMi
          p={{ estado: 'grupo_confirmado', imprescindible: vale, mi_situacion: yo({ miembro_id: 'm-coni', condiciones: 'completas', elegible_en_version: false }) }}
        />
        <AvisoParaMi p={{ estado: 'reuniendo_interes', imprescindible: vale, mi_situacion: yo({ retirado: true }) }} />
        <AvisoParaMi p={{ estado: 'grupo_confirmado', imprescindible: vale, mi_situacion: yo({ condiciones: 'completas', elegible_en_version: true }) }} />
        <section className="tarjeta">
          <h2>Reuniendo interés (organizador)</h2>
          <RecordarFaltan codigo="ABCD1234" titulo="Pádel y algo después" />
        </section>
        <section className="tarjeta">
          <h2>Versión nueva</h2>
          <RecordarFaltan codigo="ABCD1234" titulo="Pádel y algo después" motivo="version_nueva" cuando="sábado 31 oct, 20:00" />
        </section>
        <section className="tarjeta">
          <h2>Confirmado</h2>
          <RecordarFaltan codigo="ABCD1234" titulo="Pádel y algo después" motivo="confirmado" cuando="sábado 31 oct, 20:00" cuposLibres={2} />
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
