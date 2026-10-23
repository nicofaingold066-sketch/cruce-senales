import { useState } from 'react'
import { api } from '../lib/api'
import type { EstadoPropuesta } from '../lib/types'
import { useAhora, useMutacion } from '../lib/hooks'
import { cuentaRegresiva, describirEvento, franjaTexto, momentoCorto, ZONA_VISIBLE } from '../lib/format'
import { Aviso, Boton, ErrorCaja, Nombre } from '../components/ui'
import type { PestanaProps } from './tabs'

export default function PlanTab({ p, viva, soloLectura, irAPestana }: PestanaProps) {
  const enRevision = p.estado === 'en_revision'
  const conOpcion = p.estado === 'esperando_compromisos' || p.estado === 'grupo_confirmado'
  const reuniendo = p.estado === 'borrador' || p.estado === 'reuniendo_interes'
  const sinOpcion = p.estado === 'reuniendo_interes' && p.ultima_evaluacion?.resultado === 'sin_opcion'
  const sinAlternativa = enRevision && p.ultima_evaluacion?.resultado === 'sin_alternativa'
  // La versión vigente salió de una reparación (mejora #8: se muestra la comparación con la anterior).
  const versionReparada =
    (p.estado === 'esperando_compromisos' || p.estado === 'grupo_confirmado') &&
    p.ultima_evaluacion?.resultado === 'reparacion_publicada' &&
    p.ultima_evaluacion.version === p.opcion?.version

  return (
    <div>
      {p.estado === 'cancelado' || p.estado === 'expirado' ? (
        <Aviso tono="aviso" titulo={p.estado_etiqueta}>
          {p.siguiente_accion.texto}
        </Aviso>
      ) : null}

      {enRevision ? <BloqueRevision p={p} /> : null}

      {versionReparada && p.opcion ? <CambioDeVersion p={p} /> : null}

      {p.estado === 'borrador' ? <AbrirPropuesta p={p} viva={viva} soloLectura={soloLectura} /> : null}

      {conOpcion && p.opcion ? <OpcionVigente p={p} viva={viva} soloLectura={soloLectura} /> : null}

      {enRevision ? (
        <AlternativaOrganizador p={p} viva={viva} soloLectura={soloLectura} sinAlternativa={sinAlternativa} />
      ) : null}

      {enRevision && p.opcion ? <OpcionAnterior p={p} /> : null}

      {reuniendo ? <ReuniendoInteres p={p} irAPestana={irAPestana} /> : null}

      {p.estado === 'reuniendo_interes' ? (
        <BuscarOpcion p={p} viva={viva} soloLectura={soloLectura} sinOpcion={sinOpcion} />
      ) : null}

      {p.bajas.length > 0 ? <Bajas p={p} /> : null}

      {enRevision || p.bajas.length > 0 ? <HistorialResumido p={p} irAPestana={irAPestana} /> : null}

      <Ficha p={p} viva={viva} />

      {p.mi_situacion.puede.cancelar ? <Cancelar p={p} viva={viva} soloLectura={soloLectura} /> : null}
    </div>
  )
}

type VivaProps = Pick<PestanaProps, 'p' | 'viva' | 'soloLectura'>

// ------------------------------------------------------------------ ficha

function Ficha({ p, viva }: { p: EstadoPropuesta; viva: PestanaProps['viva'] }) {
  const ahora = useAhora(1000)
  return (
    <details className="tarjeta ficha" open={!p.opcion}>
      <summary>
        <h2>Ficha del plan</h2>
      </summary>
      <dl className="datos">
        <dt>Organiza</dt>
        <dd>
          <Nombre m={p.organizador} />
        </dd>
        <dt>Imprescindible (anfitrión)</dt>
        <dd>
          <Nombre m={p.imprescindible} />
        </dd>
        <dt>Franjas candidatas</dt>
        <dd>
          {p.franjas.map((f) => (
            <div key={f.clave}>
              <strong>Franja {f.clave}:</strong> {franjaTexto(f.inicio, f.fin)}
            </div>
          ))}
        </dd>
        <dt>Zona horaria</dt>
        <dd>{ZONA_VISIBLE}</dd>
        <dt>Cupos</dt>
        <dd>
          Mínimo {p.minimo} (cuenta a quien es imprescindible), máximo {p.maximo}
        </dd>
        <dt>Cierre de aceptación</dt>
        <dd>
          {momentoCorto(p.plazo)} (hora de Santiago)
          <PlazoInformativo p={p} viva={viva} ahora={ahora} />
        </dd>
      </dl>
    </details>
  )
}

function PlazoInformativo({ p, viva, ahora }: { p: EstadoPropuesta; viva: PestanaProps['viva']; ahora: number }) {
  // Cuenta regresiva SOLO informativa. El servidor decide si el plazo se cumplió.
  if (p.plazo_vencido) return <div className="suave">El plazo de aceptación cerró.</div>
  if (!viva.servidorAhora) return null
  const c = cuentaRegresiva(p.plazo.utc, viva.servidorAhora.utc, viva.recibidoEn, ahora)
  return (
    <div className="suave">
      {c ? `Faltan ${c} (solo informativo; lo decide el servidor)` : 'El servidor confirmará el cierre en la próxima actualización.'}
    </div>
  )
}

// ------------------------------------------------------------------ opción vigente

function razonNoAceptar(p: EstadoPropuesta): string {
  const s = p.mi_situacion
  const v = p.opcion?.version
  if (s.retirado) return 'Te retiraste de esta propuesta y ya no puedes participar en ella.'
  if (s.acepte_version) return `Ya confirmaste la versión ${v}. Tu confirmación vale solo para esa versión.`
  if (p.plazo_vencido) return 'El plazo de aceptación ya cerró.'
  if (s.elegible_en_version === false) return 'No formas parte de las personas que pueden aceptar esta versión.'
  if (s.motivo_aceptar === 'cupo_reservado') {
    return 'El último cupo está reservado para el anfitrión. Podrás confirmar cuando él confirme o se libere un cupo.'
  }
  if (p.opcion && p.opcion.cupos.disponibles <= 0) return 'Ya se completaron los cupos de esta versión.'
  return 'Ahora no puedes confirmar esta versión.'
}

function OpcionVigente({ p, viva, soloLectura }: VivaProps) {
  const o = p.opcion!
  const { ocupado, error, correr } = useMutacion(viva)
  const confirmado = p.estado === 'grupo_confirmado'

  async function aceptar() {
    // Siempre se envía la versión que la persona está viendo, nunca una calculada.
    await correr(`aceptar:${p.id}:${o.version}`, (intento) => api.acceptVersion(p.id, o.version, intento))
  }

  return (
    <section className={`tarjeta opcion ${confirmado ? 'opcion-confirmada' : ''}`} aria-labelledby="opcion-titulo">
      <h2 id="opcion-titulo">Opción vigente · Versión {o.version}</h2>
      {confirmado ? (
        <Aviso tono="ok" titulo={`Grupo confirmado en la versión ${o.version}`}>
          Quienes confirmaron aparecen abajo. CRUXE coordina el plan; no reserva nada.
        </Aviso>
      ) : null}
      <p className="franja-grande">{franjaTexto(o.franja.inicio, o.franja.fin)}</p>
      <p className="suave">
        Franja {o.franja.clave} · hora de Santiago ({ZONA_VISIBLE}) · publicada {momentoCorto(o.publicada_en)}
      </p>

      {/* Solo dibuja los números que entrega el servidor: un punto por cada confirmación necesaria. */}
      <div className="puntos" role="img" aria-label={`Confirmaron ${o.cupos.confirmados} de ${o.cupos.minimo} necesarias`}>
        {Array.from({ length: o.cupos.minimo }, (_, i) => (
          <span key={i} className={`punto ${i < o.cupos.confirmados ? 'punto-lleno' : ''}`} />
        ))}
        <span className="puntos-texto">
          {o.cupos.confirmados} de {o.cupos.minimo}
        </span>
      </div>
      <dl className="datos">
        <dt>Aceptaciones</dt>
        <dd>
          <strong>
            {o.cupos.confirmados} de {o.cupos.minimo}
          </strong>{' '}
          necesarias (máximo {o.cupos.maximo}, disponibles {o.cupos.disponibles})
        </dd>
        <dt>Anfitrión ({p.imprescindible.nombre})</dt>
        <dd>
          <span className={`etiqueta ${o.cupos.imprescindible_acepto ? 'etiqueta-ok' : 'etiqueta-pendiente'}`}>
            {o.cupos.imprescindible_acepto ? 'Confirmado' : 'Pendiente'}
          </span>
        </dd>
        <dt>Faltan por responder</dt>
        <dd>{o.cupos.pendientes} persona(s)</dd>
        {o.cupos.reservado_imprescindible ? (
          <>
            <dt>Cupo del anfitrión</dt>
            <dd>
              Reservado hasta que confirme. Cupos libres para el resto: {o.cupos.libres_para_otros}.
            </dd>
          </>
        ) : null}
      </dl>

      <h3>Quién confirmó esta versión</h3>
      {o.aceptaron.length === 0 ? (
        <p className="suave">Todavía nadie confirmó la versión {o.version}.</p>
      ) : (
        <ul className="miembros">
          {o.aceptaron.map((a) => (
            <li key={a.miembro.miembro_id}>
              <Nombre m={a.miembro} yo={a.miembro.miembro_id === p.mi_situacion.miembro_id} />
              <span className="suave"> · {momentoCorto(a.aceptado_en)}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="suave">Las condiciones de cada persona son privadas y no se muestran.</p>

      {p.mi_situacion.puede.aceptar ? (
        <div className="cta cta-fija">
          <Boton
            onClick={aceptar}
            ocupado={ocupado}
            ocupadoTexto="Enviando…"
            disabled={soloLectura}
          >
            {error?.reintentable ? `Reintentar confirmación de la versión ${o.version}` : `Confirmar versión ${o.version}`}
          </Boton>
          {ocupado ? (
            <p role="status" className="suave">
              Enviando tu confirmación. Todavía no está confirmada hasta que el servidor responda.
            </p>
          ) : (
            <p className="suave">
              Tu confirmación vale solo para la versión {o.version}. Si el plan cambia, tendrás que confirmar de nuevo.
            </p>
          )}
        </div>
      ) : (
        <Aviso tono="info">{razonNoAceptar(p)}</Aviso>
      )}
      {error && error.codigo !== 'sin_alternativa' ? <ErrorCaja error={error} /> : null}
    </section>
  )
}

// ------------------------------------------------------------------ cambio y alternativa

function BloqueRevision({ p }: { p: EstadoPropuesta }) {
  return (
    <Aviso tono="aviso" titulo="El grupo quedó por debajo del mínimo">
      {p.opcion ? `La versión ${p.opcion.version} dejó de cumplir el mínimo o la presencia del anfitrión. ` : ''}
      Sus confirmaciones ya no bastan para confirmar el encuentro. El plan está <strong>En revisión</strong> hasta que se
      publique una alternativa y todas las personas la confirmen de nuevo.
    </Aviso>
  )
}

/**
 * Comparación versión anterior → vigente tras una reparación. Solo reordena datos del servidor:
 * quién confirmó la anterior sale del historial, quién se bajó de `bajas`, y la vigente de `opcion`.
 * La franja de la versión anterior no viene en el estado, así que no se muestra.
 */
function CambioDeVersion({ p }: { p: EstadoPropuesta }) {
  const o = p.opcion!
  const reparacion = [...p.historial].reverse().find((e) => e.tipo === 'reparacion_publicada' && e.version_nueva === o.version)
  const vAnt = reparacion?.version_previa ?? o.version - 1
  const vistos = new Set<string>()
  const confirmaronAnt = p.historial
    .filter((e) => e.tipo === 'aceptacion' && (e.version_nueva ?? e.version_previa) === vAnt && e.actor)
    .map((e) => e.actor!)
    .filter((m) => (vistos.has(m.miembro_id) ? false : (vistos.add(m.miembro_id), true)))
  const bajasAnt = p.bajas.filter((b) => b.version === vAnt)
  const seBajo = new Set(bajasAnt.map((b) => b.miembro.miembro_id))
  return (
    <section className="tarjeta cambio-version" aria-labelledby="cambio-version-titulo">
      <h2 id="cambio-version-titulo">
        El plan cambió: versión {vAnt} → versión {o.version}
      </h2>
      <div className="cv-grilla">
        <div className="cv-col cv-vieja">
          <span className="cv-rotulo">Versión {vAnt} · ya no vale</span>
          {confirmaronAnt.length > 0 ? (
            <ul className="cv-personas">
              {confirmaronAnt.map((m) => (
                <li key={m.miembro_id} className={seBajo.has(m.miembro_id) ? 'cv-bajo' : ''}>
                  <Nombre m={m} />
                  {seBajo.has(m.miembro_id) ? <span className="cv-nota"> se bajó</span> : <span className="cv-nota"> había confirmado</span>}
                </li>
              ))}
            </ul>
          ) : null}
          {bajasAnt
            .filter((b) => !confirmaronAnt.some((m) => m.miembro_id === b.miembro.miembro_id))
            .map((b) => (
              <p key={b.miembro.miembro_id} className="cv-bajo">
                <Nombre m={b.miembro} /> <span className="cv-nota">se bajó</span>
              </p>
            ))}
          <p className="cv-pie">Estas confirmaciones no pasan a la versión {o.version}.</p>
        </div>
        <span className="cv-flecha" aria-hidden="true">
          →
        </span>
        <div className="cv-col cv-nueva">
          <span className="cv-rotulo">Versión {o.version} · vigente</span>
          <p className="cv-franja">{franjaTexto(o.franja.inicio, o.franja.fin)}</p>
          {o.aceptaron.length === 0 ? (
            <p className="cv-pie">
              <strong>Nadie confirmó todavía:</strong> empieza de cero. Cada persona tiene que confirmar de nuevo.
            </p>
          ) : (
            <p className="cv-pie">
              Confirmaron {o.cupos.confirmados} de {o.cupos.minimo}: {o.aceptaron.map((a) => a.miembro.nombre).join(', ')}.
            </p>
          )}
        </div>
      </div>
    </section>
  )
}

function OpcionAnterior({ p }: { p: EstadoPropuesta }) {
  const o = p.opcion!
  return (
    <section className="tarjeta opcion-anterior">
      <h2>Versión {o.version} (en revisión, no confirmada)</h2>
      <p>{franjaTexto(o.franja.inicio, o.franja.fin)}</p>
      <p className="suave">
        Conserva {o.cupos.confirmados} confirmación(es) de {o.cupos.minimo} necesarias. No se transfiere a la próxima versión.
      </p>
    </section>
  )
}

function AlternativaOrganizador({ p, viva, soloLectura, sinAlternativa }: VivaProps & { sinAlternativa: boolean }) {
  const { ocupado, error, correr } = useMutacion(viva)
  async function buscar() {
    await correr(`reparar:${p.id}:${p.state_rev}`, (intento) => api.proposeRepair(p.id, intento))
  }
  const sinAltAhora = sinAlternativa || error?.codigo === 'sin_alternativa'
  return (
    <section className="tarjeta">
      <h2>Alternativa</h2>
      {sinAltAhora ? (
        <Aviso tono="aviso" titulo="Sin opción compatible">
          Con las condiciones actuales no hay una alternativa. Por privacidad no se muestran los motivos. No se baja el
          mínimo ni se finge una reparación. Si las personas actualizan sus condiciones, se puede volver a buscar; el
          organizador también puede cancelar.
        </Aviso>
      ) : null}
      {p.mi_situacion.puede.proponer_reparacion ? (
        <>
          <Boton onClick={buscar} ocupado={ocupado} ocupadoTexto="Buscando alternativa…" disabled={soloLectura}>
            {error?.reintentable ? 'Reintentar búsqueda de alternativa' : sinAltAhora ? 'Volver a buscar alternativa' : 'Buscar alternativa'}
          </Boton>
          <p className="suave">La nueva ficha empieza con cero aceptaciones.</p>
        </>
      ) : (
        <p className="suave">El organizador ({p.organizador.nombre}) debe buscar una alternativa. Mientras tanto puedes actualizar tus condiciones en "Mi respuesta".</p>
      )}
      {error && error.codigo !== 'sin_alternativa' ? <ErrorCaja error={error} /> : null}
    </section>
  )
}

function Bajas({ p }: { p: EstadoPropuesta }) {
  return (
    <section className="tarjeta">
      <h2>Bajas registradas</h2>
      <ul className="miembros">
        {p.bajas.map((b, i) => (
          <li key={`${b.miembro.miembro_id}-${i}`}>
            <Nombre m={b.miembro} /> se bajó
            {b.version != null ? ` (versión ${b.version})` : ''}
            {b.habia_aceptado ? ' · había confirmado' : ''}
            <span className="suave"> · {momentoCorto(b.en)}</span>
          </li>
        ))}
      </ul>
      <p className="suave">Quien se baja no vuelve a ser elegible en esta propuesta.</p>
    </section>
  )
}

function HistorialResumido({ p, irAPestana }: { p: EstadoPropuesta; irAPestana: PestanaProps['irAPestana'] }) {
  const ultimos = p.historial.slice(-5).reverse()
  return (
    <section className="tarjeta">
      <h2>Historial resumido</h2>
      <ul className="linea">
        {ultimos.map((e) => (
          <li key={e.state_rev + e.tipo + e.en.utc}>
            <span>{describirEvento(e)}</span>
            {e.actor_tipo === 'simulacion' ? <span className="rotulo-sim">Simulación</span> : null}
            <span className="suave"> · {momentoCorto(e.en)}</span>
          </li>
        ))}
      </ul>
      <button type="button" className="enlace" onClick={() => irAPestana('historial')}>
        Ver historial completo
      </button>
    </section>
  )
}

// ------------------------------------------------------------------ fase de interés y evaluación

function ReuniendoInteres({ p, irAPestana }: { p: EstadoPropuesta; irAPestana: PestanaProps['irAPestana'] }) {
  return (
    <section className="tarjeta">
      <h2>Interés del grupo</h2>
      <dl className="datos">
        <dt>Marcaron "Me interesa"</dt>
        <dd>
          {p.interesados.cantidad}
          {p.interesados.miembros.length > 0 ? (
            <ul className="miembros">
              {p.interesados.miembros.map((m) => (
                <li key={m.miembro_id}>
                  <Nombre m={m} />
                </li>
              ))}
            </ul>
          ) : null}
        </dd>
        <dt>Confirmados</dt>
        <dd>
          <strong>{p.confirmados}</strong> · el interés no es una confirmación
        </dd>
        <dt>Con condiciones cargadas</dt>
        <dd>{p.personas_con_condiciones} persona(s) (sus condiciones son privadas)</dd>
      </dl>
      {p.estado === 'reuniendo_interes' && p.mi_situacion.condiciones !== 'completas' && !p.mi_situacion.retirado ? (
        <Aviso
          tono="info"
          accion={
            <button type="button" className="btn btn-secundario" onClick={() => irAPestana('respuesta')}>
              Ir a Mi respuesta
            </button>
          }
        >
          Aún no completaste tus condiciones.
        </Aviso>
      ) : null}
    </section>
  )
}

function AbrirPropuesta({ p, viva, soloLectura }: VivaProps) {
  const { ocupado, error, correr } = useMutacion(viva)
  return (
    <section className="tarjeta">
      <h2>Borrador</h2>
      <p>Nadie más puede marcar interés ni cargar condiciones hasta que la propuesta se abra.</p>
      {p.mi_situacion.puede.abrir ? (
        <Boton onClick={() => void correr(`abrir:${p.id}`, () => api.openProposal(p.id))} ocupado={ocupado} ocupadoTexto="Abriendo…" disabled={soloLectura}>
          Abrir propuesta
        </Boton>
      ) : (
        <p className="suave">Solo el organizador puede abrirla.</p>
      )}
      {error ? <ErrorCaja error={error} /> : null}
    </section>
  )
}

function BuscarOpcion({ p, viva, soloLectura, sinOpcion }: VivaProps & { sinOpcion: boolean }) {
  const { ocupado, error, correr } = useMutacion(viva)
  if (!p.mi_situacion.puede.evaluar && !sinOpcion) return null
  async function evaluar() {
    await correr(`evaluar:${p.id}:${p.state_rev}`, (intento) => api.evaluateAndPublish(p.id, intento))
  }
  return (
    <section className="tarjeta">
      <h2>Buscar opción</h2>
      {sinOpcion ? (
        <Aviso tono="aviso" titulo="Sin opción compatible">
          Con las condiciones cargadas hoy no hay una franja posible. Por privacidad no se muestran los motivos ni las
          condiciones de nadie, y el mínimo no se modifica. Se puede esperar a que más personas carguen su
          disponibilidad, o cancelar.
        </Aviso>
      ) : (
        <p className="suave">
          Cuando haya suficientes condiciones cargadas, el organizador pide al servidor una opción compatible.
        </p>
      )}
      {p.mi_situacion.puede.evaluar ? (
        <Boton onClick={evaluar} ocupado={ocupado} ocupadoTexto="Buscando…" disabled={soloLectura}>
          {error?.reintentable ? 'Reintentar búsqueda' : sinOpcion ? 'Volver a buscar opción' : 'Buscar opción compatible'}
        </Boton>
      ) : null}
      {error ? <ErrorCaja error={error} /> : null}
    </section>
  )
}

function Cancelar({ p, viva, soloLectura }: VivaProps) {
  const [confirmar, setConfirmar] = useState(false)
  const { ocupado, error, correr } = useMutacion(viva)
  async function hacer() {
    const r = await correr(`cancelar:${p.id}`, () => api.cancelProposal(p.id))
    if (r?.ok) setConfirmar(false)
  }
  return (
    <section className="tarjeta">
      <h2>Cancelar propuesta</h2>
      {!confirmar ? (
        <Boton variante="secundario" onClick={() => setConfirmar(true)} disabled={soloLectura}>
          Cancelar propuesta
        </Boton>
      ) : (
        <Aviso tono="aviso" titulo="¿Cancelar la propuesta?">
          La propuesta pasa a Cancelado y no se puede reabrir.
          <div className="fila-botones">
            <Boton variante="peligro" onClick={hacer} ocupado={ocupado} ocupadoTexto="Cancelando…">
              Sí, cancelar
            </Boton>
            <Boton variante="secundario" onClick={() => setConfirmar(false)} disabled={ocupado}>
              Volver
            </Boton>
          </div>
        </Aviso>
      )}
      {error ? <ErrorCaja error={error} /> : null}
    </section>
  )
}
