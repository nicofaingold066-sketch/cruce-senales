// Galería de las piezas de ux-flujo en todos sus estados, sin base ni red. Datos ficticios.
// Abrir con el servidor de desarrollo: /src/componentes-nuevos/prueba/galeria.html
// RearmarConLoNuevo recibe una propuesta y un `viva` falsos: no tocar su botón (llamaría a la base). Sus estados de
// error se muestran con la vista pura (`vistaRearmar`), con el mismo marcado que el componente.
import { createRoot } from 'react-dom/client'
import type { ReactNode } from 'react'
import '../../styles.css'
import { Aviso } from '../../components/ui'
import type { PropuestaViva } from '../../lib/hooks'
import type { EstadoPropuesta } from '../../lib/types'
import { AvisoParaMi } from '../AvisoParaMi'
import { AyudaRetiro } from '../AyudaRetiro'
import { BuscarLugar } from '../BuscarLugar'
import { RearmarConLoNuevo } from '../RearmarConLoNuevo'
import { RecordarFaltan } from '../RecordarFaltan'
import type { DatosAvisoParaMi } from '../avisoPersonal'
import { vistaRearmar } from '../rearmar'
import type { DatosRearmar, ErrorRearmar } from '../rearmar'
import type { DatosAyudaRetiro } from '../textoRetiro'

type Yo = DatosAvisoParaMi['mi_situacion']
const vale = { miembro_id: 'm-vale', nombre: 'Vale', simulado: false }
const puede = (extra: Partial<Yo['puede']> = {}): Yo['puede'] => ({
  abrir: false, marcar_interes: false, guardar_condiciones: false, evaluar: false, aceptar: false,
  retirarme: true, proponer_reparacion: false, cancelar: false, simular: false, ...extra,
})
const yo = (extra: Partial<Yo> = {}): Yo => ({
  miembro_id: 'm-ana', nombre: 'Ana', es_organizador: false, es_organizador_espacio: false, interesado: false,
  condiciones: 'completas', retirado: false, elegible_en_version: true, acepte_version: false, puede: puede(), ...extra,
})
const org = (extra: Partial<Yo> = {}) => yo({ miembro_id: 'm-vale', nombre: 'Vale', es_organizador: true, es_organizador_espacio: true, ...extra })
const cupos = (extra: Record<string, unknown>) => ({ cupos: extra }) as unknown as DatosAvisoParaMi['opcion']
const ahora = { utc: '2026-10-29T08:00:00Z', local: '2026-10-29T05:00:00' }
const plazo = { utc: '2026-10-30T23:00:00Z', local: '2026-10-30T20:00:00' }

const vivaFalsa = { aplicarResultado: () => {}, refrescar: async () => {} } as unknown as PropuestaViva
const propuestaRearmar = (version: number, n: number | null, puedeRearmar = true) =>
  ({
    id: 'p1', titulo: 'Pádel y algo después', state_rev: 1, estado: 'esperando_compromisos',
    opcion: { version, franja: { inicio: { local: '2026-11-01T20:00:00', utc: '2026-11-01T23:00:00Z' }, fin: { local: '2026-11-01T22:00:00', utc: '2026-11-02T01:00:00Z' } } },
    opiniones_totales: { asi_no_puedo: n },
    mi_situacion: org({ puede: puede({ proponer_reparacion: puedeRearmar }) }),
  }) as unknown as EstadoPropuesta

function VistaRearmar({ p, error }: { p: DatosRearmar; error: ErrorRearmar }) {
  const v = vistaRearmar(p, error)
  if (!v) return <p className="suave">(no dibuja nada)</p>
  return (
    <section className="tarjeta">
      <h2>{v.titulo}</h2>
      <Aviso tono={v.clave === 'ya_no_hace_falta' ? 'info' : 'aviso'}>{v.texto}</Aviso>
      {v.boton ? <p className="suave">Botón: «{v.boton}»</p> : null}
    </section>
  )
}

function Caso({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="galeria-caso" style={{ marginBottom: 20 }}>
      <p className="suave" style={{ fontSize: 13, margin: '0 0 6px' }}>
        <strong>{titulo}</strong>
      </p>
      {children}
    </div>
  )
}

function Seccion({ id, titulo, children }: { id: string; titulo: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} style={{ marginBottom: 32 }}>
      <h2 id={id} style={{ marginBottom: 12 }}>
        {titulo}
      </h2>
      {children}
    </section>
  )
}

const avisos: { titulo: string; p: DatosAvisoParaMi; conIr?: boolean; conHora?: boolean }[] = [
  { titulo: 'No elegible, con lo que marcó', p: { estado: 'grupo_confirmado', imprescindible: vale, mi_situacion: yo({ elegible_en_version: false }) } },
  { titulo: 'No elegible, disponibilidad incompleta (puede completarla)', p: { estado: 'esperando_compromisos', imprescindible: vale, mi_situacion: yo({ condiciones: 'incompletas', elegible_en_version: false, puede: puede({ guardar_condiciones: true }) }) }, conIr: true },
  { titulo: 'Puede confirmar: solo vale si llegan al mínimo', p: { estado: 'esperando_compromisos', imprescindible: vale, minimo: 4, mi_situacion: yo() } },
  { titulo: 'Marcó «así no puedo» (enmienda 13)', p: { estado: 'esperando_compromisos', imprescindible: vale, minimo: 4, mi_situacion: { ...yo({ puede: puede({ guardar_condiciones: true }) }), mi_opinion: 'asi_no_puedo' } }, conIr: true },
  { titulo: 'Organizador a menos de 36 h del cierre, con pendientes', p: { estado: 'esperando_compromisos', imprescindible: vale, minimo: 4, opcion: cupos({ pendientes: 2 }), mi_situacion: org({ acepte_version: true }) }, conHora: true },
  { titulo: 'En revisión, organizador (sin nombre ni motivo)', p: { estado: 'en_revision', imprescindible: vale, opcion: cupos({ faltan_para_minimo: 1 }), mi_situacion: org() } },
  { titulo: 'En revisión, resto del grupo', p: { estado: 'en_revision', imprescindible: vale, opcion: cupos({ faltan_para_minimo: 2 }), mi_situacion: yo() } },
  { titulo: 'Grupo confirmado, organizador', p: { estado: 'grupo_confirmado', imprescindible: vale, mi_situacion: org({ acepte_version: true }) } },
  { titulo: 'Se retiró', p: { estado: 'esperando_compromisos', imprescindible: vale, mi_situacion: yo({ retirado: true }) } },
]

const retiros: { titulo: string; p: DatosAyudaRetiro }[] = [
  { titulo: 'Antes de la opción', p: { estado: 'reuniendo_interes', mi_situacion: yo({ elegible_en_version: null }) } },
  { titulo: 'Versión publicada, con la enmienda 13', p: { estado: 'esperando_compromisos', mi_situacion: { ...yo(), mi_opinion: null } } },
  { titulo: 'Versión publicada, sin la enmienda 13', p: { estado: 'esperando_compromisos', mi_situacion: yo() } },
  { titulo: 'Ya confirmó, con la enmienda 13', p: { estado: 'grupo_confirmado', mi_situacion: { ...yo({ acepte_version: true }), mi_opinion: null } } },
]

function Galeria() {
  return (
    <div className="vista">
      <section className="escena">
        <span className="escena-eyebrow">ux-flujo · sin base ni red</span>
        <h1>Galería de piezas</h1>
        <p className="escena-sub">Cada pieza en cada estado. Datos ficticios.</p>
      </section>
      <div className="hoja">
        <Seccion id="g-aviso" titulo="AvisoParaMi">
          {avisos.map((a) => (
            <Caso key={a.titulo} titulo={a.titulo}>
              <AvisoParaMi
                p={{ ...a.p, plazo }}
                servidorAhora={a.conHora ? ahora : null}
                irARespuesta={a.conIr ? () => {} : undefined}
              />
            </Caso>
          ))}
          <Caso titulo="Imprescindible sin responder (no dibuja nada: lo dicen el servidor y FaltaTuRespuesta)">
            <AvisoParaMi p={{ estado: 'reuniendo_interes', imprescindible: vale, mi_situacion: org({ condiciones: 'sin_cargar' }) }} />
            <p className="suave">(vacío)</p>
          </Caso>
        </Seccion>

        <Seccion id="g-recordar" titulo="RecordarFaltan">
          <Caso titulo="Faltan respuestas">
            <RecordarFaltan codigo="ABCD1234" titulo="Pádel y algo después" />
          </Caso>
          <Caso titulo="Versión nueva">
            <RecordarFaltan codigo="ABCD1234" titulo="Pádel y algo después" motivo="version_nueva" cuando="sábado 31 oct, 20:00" />
          </Caso>
          <Caso titulo="Reparación (versión nueva tras un cambio)">
            <RecordarFaltan codigo="ABCD1234" titulo="Pádel y algo después" motivo="reparacion" cuando="domingo 1 nov, 20:00" />
          </Caso>
          <Caso titulo="Confirmado, con cupos libres">
            <RecordarFaltan codigo="ABCD1234" titulo="Pádel y algo después" motivo="confirmado" cuando="sábado 31 oct, 20:00" cuposLibres={2} />
          </Caso>
        </Seccion>

        <Seccion id="g-rearmar" titulo="RearmarConLoNuevo">
          <Caso titulo="Con 2 «así no puedo», versión 1">
            <RearmarConLoNuevo p={propuestaRearmar(1, 2)} viva={vivaFalsa} />
          </Caso>
          <Caso titulo="Con 3, versión 2 (la última posible)">
            <RearmarConLoNuevo p={propuestaRearmar(2, 3)} viva={vivaFalsa} />
          </Caso>
          <Caso titulo="Versión 3 con 2 que no pueden (tope)">
            <RearmarConLoNuevo p={propuestaRearmar(3, 2, false)} viva={vivaFalsa} />
          </Caso>
          <Caso titulo="Con 1 «así no puedo» (no dibuja nada: delataría)">
            <RearmarConLoNuevo p={propuestaRearmar(1, null, true)} viva={vivaFalsa} />
            <p className="suave">(vacío)</p>
          </Caso>
          <Caso titulo="Después de intentar: sin otra fecha posible (vista)">
            <VistaRearmar p={propuestaRearmar(1, 2)} error={{ codigo: 'sin_alternativa', detalle: 'sin_alternativa' }} />
          </Caso>
          <Caso titulo="Después de intentar: cambiaron las respuestas (vista)">
            <VistaRearmar p={propuestaRearmar(1, 2)} error={{ codigo: 'opcion_desactualizada', detalle: 'estado_no_admite' }} />
          </Caso>
        </Seccion>

        <Seccion id="g-retiro" titulo="AyudaRetiro">
          {retiros.map((r) => (
            <Caso key={r.titulo} titulo={r.titulo}>
              <section className="tarjeta zona-peligro">
                <h2>No voy</h2>
                <AyudaRetiro p={r.p} />
              </section>
            </Caso>
          ))}
        </Seccion>

        <Seccion id="g-lugar" titulo="BuscarLugar">
          <Caso titulo="Grupo real">
            <section className="tarjeta">
              <BuscarLugar titulo="Pádel y algo después" demo={false} />
            </section>
          </Caso>
          <Caso titulo="Espacio demo (no dibuja nada)">
            <BuscarLugar titulo="Asado en casa de Tomi" demo />
            <p className="suave">(vacío)</p>
          </Caso>
        </Seccion>
      </div>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(<Galeria />)
