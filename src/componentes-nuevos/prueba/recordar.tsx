// Banco de prueba de RecordarFaltan (#89), AvisoParaMi y RearmarConLoNuevo, sin base ni red. Datos ficticios.
// RearmarConLoNuevo recibe una propuesta y un `viva` falsos: no tocar el botón (llamaría a la base).
// Abrir con el servidor de desarrollo: /src/componentes-nuevos/prueba/recordar.html
import { createRoot } from 'react-dom/client'
import '../../styles.css'
import { RecordarFaltan } from '../RecordarFaltan'
import { AvisoParaMi } from '../AvisoParaMi'
import { RearmarConLoNuevo } from '../RearmarConLoNuevo'
import { BuscarLugar } from '../BuscarLugar'
import type { PropuestaViva } from '../../lib/hooks'
import type { EstadoPropuesta } from '../../lib/types'
import type { DatosAvisoParaMi } from '../avisoPersonal'

const vale = { miembro_id: 'm-vale', nombre: 'Vale', simulado: false }
const yo = (extra: Partial<DatosAvisoParaMi['mi_situacion']>): DatosAvisoParaMi['mi_situacion'] => ({
  miembro_id: 'm-vale', nombre: 'Vale', es_organizador: true, es_organizador_espacio: true, interesado: false,
  condiciones: 'sin_cargar', retirado: false, elegible_en_version: null, acepte_version: false,
  puede: {} as DatosAvisoParaMi['mi_situacion']['puede'], ...extra,
})

const vivaFalsa = { aplicarResultado: () => {}, refrescar: async () => {} } as unknown as PropuestaViva
const propuestaFalsa = (version: number, n: number | null) =>
  ({
    id: 'p1',
    titulo: 'Pádel y algo después',
    state_rev: 1,
    estado: 'esperando_compromisos',
    opcion: { version, franja: { inicio: { local: '2026-10-31T20:00:00', utc: '' }, fin: { local: '2026-10-31T22:00:00', utc: '' } } },
    opiniones_totales: { asi_no_puedo: n },
    mi_situacion: yo({ puede: { proponer_reparacion: true } as DatosAvisoParaMi['mi_situacion']['puede'] }),
  }) as unknown as EstadoPropuesta

function Banco() {
  return (
    <div className="vista">
      <div className="hoja">
        <AvisoParaMi
          p={{ estado: 'grupo_confirmado', imprescindible: vale, mi_situacion: yo({ miembro_id: 'm-coni', condiciones: 'completas', elegible_en_version: false }) }}
        />
        <AvisoParaMi p={{ estado: 'reuniendo_interes', imprescindible: vale, mi_situacion: yo({ retirado: true }) }} />
        <AvisoParaMi
          p={{ estado: 'esperando_compromisos', imprescindible: vale, minimo: 4, mi_situacion: { ...yo({ miembro_id: 'm-ana', es_organizador: false, elegible_en_version: true }), mi_opinion: 'asi_no_puedo' } }}
          irARespuesta={() => {}}
        />
        <section className="tarjeta">
          <h2>Opción vigente</h2>
          <BuscarLugar titulo="Pádel y algo después" demo={false} />
        </section>
        <RearmarConLoNuevo p={propuestaFalsa(1, 2)} viva={vivaFalsa} codigo="ABCD1234" />
        <RearmarConLoNuevo p={propuestaFalsa(3, 2)} viva={vivaFalsa} codigo="ABCD1234" />
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
