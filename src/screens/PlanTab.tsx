import { useState } from 'react'
import { api } from '../lib/api'
import type { EstadoPropuesta } from '../lib/types'
import { useAhora, useMutacion } from '../lib/hooks'
import { cuentaRegresiva, describirEvento, diaDe, franjaTexto, hora, momentoCorto, ZONA_VISIBLE } from '../lib/format'
import { Avatar, Aviso, Boton, DiaTile, ErrorCaja, Nombre, Progreso } from '../components/ui'
import type { PestanaProps } from './tabs'
import { Icono } from '../components/Icono'
import { Confeti } from '../components/Confeti'
import { Resaltado } from '../components/Resaltado'
import { descargarCalendario, urlWhatsApp } from '../lib/compartir'
import { vibrar } from '../lib/tacto'
import { AvisoParaMi } from '../componentes-nuevos/AvisoParaMi'
import { avisoParaMi } from '../componentes-nuevos/avisoPersonal'
import { BuscarLugar } from '../componentes-nuevos/BuscarLugar'
import { RearmarConLoNuevo } from '../componentes-nuevos/RearmarConLoNuevo'
import { RecordarFaltan } from '../componentes-nuevos/RecordarFaltan'
import { AsiNoPuedo } from '../friccion/AsiNoPuedo'
import { FaltaTuRespuesta } from '../friccion/FaltaTuRespuesta'
import { InvitacionAgente } from '../agente/InvitacionAgente'

export default function PlanTab({ p, viva, soloLectura, irAPestana, espacio }: PestanaProps) {
  const codigo = espacio?.codigo_invitacion ?? null
  const organiza = p.mi_situacion.es_organizador
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
  // "Esta versión no te incluye" con la disponibilidad completa diría "con lo que marcaste, esta fecha no te queda", un
  // motivo que puede ser falso: la elegibilidad es una foto al publicar (0002_utilidades.sql:262) y se pudo completar con
  // "Sí" después (7930e66). En ese caso el aviso va igual arriba, con un texto cierto y sin motivo (avisoSinTi). Con el
  // plazo vencido, "si la completas, cuenta si el plan se rearma" ya no es cierto: lo dice solo razonNoAceptar.
  // Pedido a ux-flujo: el texto de avisoPersonal.ts para este caso; cuando cambie, este reemplazo sobra.
  const sinTi = avisoParaMi(p)?.clave === 'version_sin_ti'
  const sinTiSinAviso = sinTi && (p.mi_situacion.condiciones === 'completas' || p.plazo_vencido)
  const avisoSinTi = sinTi && p.mi_situacion.condiciones === 'completas' && !p.plazo_vencido
  // El énfasis sigue al servidor: "Buscar opción compatible" es la acción principal solo cuando su próxima acción es
  // `buscar_opcion` (ya respondieron al menos el mínimo) o para volver a buscar después de "Sin opción". Un toque temprano
  // deja "Sin opción compatible" a la vista de todo el grupo (D-3 de la revisión UX).
  const buscarSecundario = p.estado === 'reuniendo_interes' && p.siguiente_accion.codigo !== 'buscar_opcion' && !sinOpcion

  return (
    <div>
      {sinTiSinAviso ? null : (
        <AvisoParaMi p={p} servidorAhora={viva.servidorAhora} irARespuesta={() => irAPestana('respuesta')} />
      )}
      {avisoSinTi ? (
        <Aviso tono="info" titulo="Esta versión no te incluye">
          Se armó sin ti. No tienes que hacer nada: si el plan se rearma, cuenta lo que marcaste.
        </Aviso>
      ) : null}
      <InvitacionAgente situacion={p.mi_situacion} onResponder={() => irAPestana('respuesta')} />

      {p.estado === 'cancelado' || p.estado === 'expirado' ? (
        // O-09 (rincones): "Cancelado"/"Expirado" ya está en el encabezado del plan; el aviso no lo repite.
        <Aviso tono="aviso">
          {p.siguiente_accion.texto}
        </Aviso>
      ) : null}

      {enRevision ? <BloqueRevision p={p} /> : null}

      {versionReparada && p.opcion ? <CambioDeVersion p={p} /> : null}

      {p.estado === 'borrador' ? <AbrirPropuesta p={p} viva={viva} soloLectura={soloLectura} /> : null}

      {/* El cierre (calendario, aviso) es para quien va: quien confirmó esta versión. */}
      {p.estado === 'grupo_confirmado' && p.opcion && p.mi_situacion.acepte_version ? <CierrePlan p={p} codigo={codigo} /> : null}

      {conOpcion && p.opcion ? (
        <OpcionVigente
          key={p.opcion.version}
          p={p}
          viva={viva}
          soloLectura={soloLectura}
          irAPestana={irAPestana}
          demo={espacio?.demo ?? true}
        />
      ) : null}

      {/* Enmienda 13 (b): solo para quien organiza, con 2 o más "así no puedo"; se oculta solo si no corresponde. */}
      {p.estado === 'esperando_compromisos' && organiza ? <RearmarConLoNuevo p={p} viva={viva} soloLectura={soloLectura} /> : null}

      {/* Solo si el servidor dice que queda lugar para otros: con el último cupo reservado al anfitrión, "si vas,
          confírmala" invitaría a todo el grupo a algo que el servidor rechaza. */}
      {p.estado === 'esperando_compromisos' && organiza && codigo && p.opcion && p.opcion.cupos.libres_para_otros > 0 ? (
        <section className="tarjeta" aria-labelledby="avisar-version">
          <h2 id="avisar-version">Avisar al grupo</h2>
          <RecordarFaltan
            codigo={codigo}
            titulo={p.titulo}
            motivo={p.opcion_anterior ? 'reparacion' : 'version_nueva'}
            cuando={franjaTexto(p.opcion.franja.inicio, p.opcion.franja.fin)}
          />
        </section>
      ) : null}

      {enRevision ? (
        <AlternativaOrganizador p={p} viva={viva} soloLectura={soloLectura} sinAlternativa={sinAlternativa} />
      ) : null}

      {enRevision && p.opcion ? <OpcionAnterior p={p} /> : null}

      {reuniendo ? <ReuniendoInteres p={p} irAPestana={irAPestana} /> : null}

      <FaltaTuRespuesta p={p} espacioId={p.espacio_id} />

      {p.estado === 'reuniendo_interes' && organiza && codigo ? (
        <section className="tarjeta" aria-labelledby="avisar-faltan">
          <h2 id="avisar-faltan">Avisar al grupo</h2>
          <RecordarFaltan codigo={codigo} titulo={p.titulo} motivo="faltan" />
        </section>
      ) : null}

      {p.estado === 'reuniendo_interes' ? (
        <BuscarOpcion p={p} viva={viva} soloLectura={soloLectura} sinOpcion={sinOpcion} secundaria={buscarSecundario} />
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
    <details className="tarjeta plegable ficha" open={!p.opcion}>
      <summary>
        <h2>Ficha del plan</h2>
      </summary>
      <dl className="datos">
        <dt>Organiza</dt>
        <dd>
          <Nombre m={p.organizador} />
        </dd>
        <dt>No puede faltar</dt>
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
  if (s.elegible_en_version === false) {
    // Va antes del plazo: un grupo confirmado no vence, pero `plazo_vencido` sí, y solo con "El plazo cerró" no se
    // entera de que la versión es sin ella. Con el plazo vencido AvisoParaMi no se dibuja (sinTiSinAviso): esta es la
    // única línea, sin dar motivo ni prometer un rearme que ya no puede pasar (7930e66).
    if (p.plazo_vencido) return 'Esta versión se armó sin ti y el plazo de aceptación ya cerró.'
    return 'No formas parte de las personas que pueden aceptar esta versión.'
  }
  if (p.plazo_vencido) return 'El plazo de aceptación ya cerró.'
  if (s.motivo_aceptar === 'cupo_reservado') {
    return 'El último cupo está reservado para quien no puede faltar. Si se libera otro, podrás confirmar.'
  }
  if (p.opcion && p.opcion.cupos.disponibles <= 0) return 'Ya se completaron los cupos de esta versión.'
  return 'Ahora no puedes confirmar esta versión.'
}

// Mejora #56: con más confirmaciones que el mínimo, "5 de 4" se lee raro; se dice "5 (mínimo 4)".
function cuentaConfirmados(confirmados: number, minimo: number): string {
  return confirmados > minimo ? `${confirmados} (mínimo ${minimo})` : `${confirmados} de ${minimo}`
}

function OpcionVigente({
  p,
  viva,
  soloLectura,
  irAPestana,
  demo,
}: VivaProps & { irAPestana: PestanaProps['irAPestana']; demo: boolean }) {
  const o = p.opcion!
  const { ocupado, error, correr } = useMutacion(viva)
  const confirmado = p.estado === 'grupo_confirmado'
  const sobreMinimo = o.cupos.confirmados > o.cupos.minimo
  const cuenta = cuentaConfirmados(o.cupos.confirmados, o.cupos.minimo)
  // #79 (sinteticos, ux-flujo): si arriba ya está "Tu confirmación solo vale si llegan N", no se apila otra nota bajo el botón.
  const avisoArriba = avisoParaMi(p)?.clave === 'solo_vale_si_llegan'

  async function aceptar() {
    // Siempre se envía la versión que la persona está viendo, nunca una calculada.
    const r = await correr(`aceptar:${p.id}:${o.version}`, (intento) => api.acceptVersion(p.id, o.version, intento))
    if (r?.ok) vibrar([14, 50, 22])
  }

  return (
    <section className={`tarjeta opcion ${confirmado ? 'opcion-confirmada' : ''}`} aria-labelledby="opcion-titulo">
      <h2 id="opcion-titulo">Opción vigente · Versión {o.version}</h2>
      <div className="opcion-cuando">
        <DiaTile local={o.franja.inicio.local} />
        <div>
          <p className="franja-grande">{franjaTexto(o.franja.inicio, o.franja.fin)}</p>
          <p className="suave">
            Franja {o.franja.clave} · hora de Santiago ({ZONA_VISIBLE}) · publicada {momentoCorto(o.publicada_en)}
          </p>
        </div>
      </div>
      <BuscarLugar titulo={p.titulo} demo={demo} />

      {/* Solo dibuja los números que entrega el servidor: confirmados, mínimo (la marca) y máximo. */}
      <div>
        <Progreso
          valor={o.cupos.confirmados}
          minimo={o.cupos.minimo}
          maximo={o.cupos.maximo}
          ok={confirmado}
          etiqueta={`Confirmaron ${cuenta}${sobreMinimo ? '' : ' necesarias'}`}
        />
        <div className="progreso-leyenda" aria-hidden="true">
          <span>
            <strong>{o.cupos.confirmados}</strong> {o.cupos.confirmados === 1 ? 'confirmó' : 'confirmaron'}
          </span>
          <span>
            mín. {o.cupos.minimo} · máx. {o.cupos.maximo} · {o.cupos.disponibles} {o.cupos.disponibles === 1 ? 'libre' : 'libres'}
          </span>
        </div>
      </div>
      {/* Cifras en una fila (número arriba, rótulo abajo): todo a la vista sin desplazar. Solo números del servidor. */}
      <dl className="cifras">
        <div className="cifra">
          <dt>{sobreMinimo ? `Aceptaciones (mínimo ${o.cupos.minimo})` : 'Aceptaciones necesarias'}</dt>
          <dd>
            <strong>{sobreMinimo ? o.cupos.confirmados : `${o.cupos.confirmados} de ${o.cupos.minimo}`}</strong>
            <span className="visualmente-oculto">
              {' '}
              (máximo {o.cupos.maximo}, disponibles {o.cupos.disponibles})
            </span>
          </dd>
        </div>
        <div className="cifra">
          <dt>No puede faltar ({p.imprescindible.nombre})</dt>
          <dd>
            <span className={`etiqueta ${o.cupos.imprescindible_acepto ? 'etiqueta-ok' : 'etiqueta-pendiente'}`}>
              {o.cupos.imprescindible_acepto ? 'Ya confirmó' : 'Pendiente'}
            </span>
          </dd>
        </div>
        {/* Enmienda 7 (E7.2): solo el organizador recibe este conteo; con null no se muestra. */}
        {o.cupos.pendientes != null ? (
          <div className="cifra">
            <dt>Faltan por confirmar</dt>
            <dd>
              <strong>{o.cupos.pendientes}</strong>
              <span className="visualmente-oculto"> {o.cupos.pendientes === 1 ? 'persona' : 'personas'}</span>
            </dd>
          </div>
        ) : null}
      </dl>
      {o.cupos.reservado_imprescindible ? (
        <p className="nota-linea nota-reserva">
          <Icono n="anfitrion" tam={16} />
          <span>
            <strong>Cupo reservado</strong> para {p.imprescindible.nombre} (no puede faltar) hasta que confirme. Libres para el resto:{' '}
            {o.cupos.libres_para_otros}.
          </span>
        </p>
      ) : null}

      <h3>Quién confirmó esta versión</h3>
      {o.aceptaron.length === 0 ? (
        <p className="suave">Todavía nadie confirmó la versión {o.version}.</p>
      ) : (
        <ul className="chips-personas">
          {o.aceptaron.map((a) => (
            <li key={a.miembro.miembro_id} title={`Confirmó ${momentoCorto(a.aceptado_en)}`}>
              <Avatar nombre={a.miembro.nombre} simulado={a.miembro.simulado} yo={a.miembro.miembro_id === p.mi_situacion.miembro_id} tam={26} />
              <Nombre m={a.miembro} yo={a.miembro.miembro_id === p.mi_situacion.miembro_id} />
            </li>
          ))}
        </ul>
      )}
      <p className="suave">Las condiciones de cada persona son privadas y no se muestran.</p>

      {p.mi_situacion.puede.aceptar ? (
        <div className="barra-accion">
          <Boton
            variante="turno"
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
          ) : avisoArriba ? null : (
            <p className="suave">
              Tu confirmación vale solo para la versión {o.version}. Si el plan cambia, tendrás que confirmar de nuevo.
            </p>
          )}
        </div>
      ) : (
        <p className="nota-linea" role="note">
          <Icono n={p.mi_situacion.acepte_version ? 'check' : 'candado'} tam={16} />
          {razonNoAceptar(p)}
        </p>
      )}
      <AsiNoPuedo p={p} viva={viva} soloLectura={soloLectura} irAPestana={irAPestana} />
      {/* Si el servidor ya muestra la confirmación hecha, la duda de "pudo haberse registrado o no" quedó resuelta (E-1). */}
      {error && error.codigo !== 'sin_alternativa' && !(error.resultadoIncierto && p.mi_situacion.acepte_version) ? (
        <ErrorCaja error={error} enfocar />
      ) : null}
    </section>
  )
}

// ------------------------------------------------------------------ cambio y alternativa

function BloqueRevision({ p }: { p: EstadoPropuesta }) {
  return (
    <Aviso tono="aviso" titulo="Una baja dejó el plan sin cumplir">
      {/* Enmienda 14, 0050: texto neutro; nombrar la causa ("perdió al anfitrión") junto a los conteos dejaba deducir quién se fue. */}
      {p.opcion ? `La versión ${p.opcion.version} ya no reúne lo necesario para juntarse. ` : ''}
      Sus confirmaciones ya no bastan para confirmar el encuentro. El plan está <strong>En revisión</strong> hasta que se
      publique una alternativa y se reúnan de nuevo las confirmaciones necesarias.
    </Aviso>
  )
}

/**
 * Comparación versión anterior → vigente tras una reparación. Solo reordena datos del servidor:
 * quién confirmó la anterior sale del historial, quién se bajó de `bajas`, y la vigente de `opcion`.
 * La franja de la versión anterior sale de `opcion_anterior` (enmienda 6); si no viene, no se muestra.
 */
function CambioDeVersion({ p }: { p: EstadoPropuesta }) {
  const o = p.opcion!
  const reparacion = [...p.historial].reverse().find((e) => e.tipo === 'reparacion_publicada' && e.version_nueva === o.version)
  const ant = p.opcion_anterior ?? null
  const vAnt = ant?.version ?? reparacion?.version_previa ?? o.version - 1
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
      {ant ? (
        <p className="cv-resumen">
          {/* H8 (sinteticos): con la misma franja, "sáb 20:00 → sáb 20:00" parecía un error; lo que cambió es quién puede ir. */}
          {ant.inicio.local === o.franja.inicio.local && ant.fin.local === o.franja.fin.local ? (
            <>Misma fecha y hora; cambió quién puede ir.</>
          ) : (
            <>
              {diaDe(ant.inicio.local)} {hora(ant.inicio.local)} → <strong>{diaDe(o.franja.inicio.local)} {hora(o.franja.inicio.local)}</strong>
            </>
          )}
        </p>
      ) : null}
      <div className="cv-grilla">
        <div className="cv-col cv-vieja">
          <span className="cv-rotulo">Versión {vAnt} · ya no vale</span>
          {ant ? <p className="cv-franja cv-franja-vieja">{franjaBreve(ant.inicio.local, ant.fin.local)}</p> : null}
          {confirmaronAnt.length > 0 ? (
            <ul className="cv-personas">
              {confirmaronAnt.map((m) => (
                <li key={m.miembro_id} className={seBajo.has(m.miembro_id) ? 'cv-bajo' : ''}>
                  <Nombre m={m} />
                  <span className="cv-nota"> había confirmado</span>
                </li>
              ))}
            </ul>
          ) : null}
          {/* Enmienda 13 (c): la baja va aparte y sin nombre, fuera de la lista de quienes confirmaron, para no dejar deducir quién fue. */}
          {bajasAnt.length > 0 ? (
            <p className="cv-nota">{bajasAnt.length === 1 ? 'Una persona se retiró.' : `${bajasAnt.length} personas se retiraron.`}</p>
          ) : null}
          <p className="cv-pie">Estas confirmaciones no pasan a la versión {o.version}.</p>
        </div>
        <span className="cv-flecha" aria-hidden="true">
          →
        </span>
        <div className="cv-col cv-nueva">
          <span className="cv-rotulo">Versión {o.version} · vigente</span>
          <p className="cv-franja">{franjaBreve(o.franja.inicio.local, o.franja.fin.local)}</p>
          {o.aceptaron.length === 0 ? (
            <p className="cv-pie">
              <strong>Nadie confirmó todavía:</strong> empieza de cero. Se confirma con {o.cupos.minimo} confirmaciones de esta
              versión, entre ellas la de {p.imprescindible.nombre}.
            </p>
          ) : (
            <p className="cv-pie">
              Confirmaron {cuentaConfirmados(o.cupos.confirmados, o.cupos.minimo)}:{' '}
              {o.aceptaron.map((a) => a.miembro.nombre).join(', ')}.
            </p>
          )}
        </div>
      </div>
    </section>
  )
}

/** "Sábado 31 oct · 14:00–17:00" para las columnas angostas de la comparación; si cruza de día, la franja completa. */
function franjaBreve(inicio: string, fin: string): string {
  return inicio.slice(0, 10) === fin.slice(0, 10) ? `${diaDe(inicio)} · ${hora(inicio)}–${hora(fin)}` : franjaTexto(inicio, fin)
}

function OpcionAnterior({ p }: { p: EstadoPropuesta }) {
  const o = p.opcion!
  return (
    <section className="tarjeta opcion-anterior">
      <h2>Versión {o.version} (en revisión, no confirmada)</h2>
      <p>{franjaTexto(o.franja.inicio, o.franja.fin)}</p>
      {/* Enmienda 14, 0050: en revisión no se compara con el mínimo; con el mínimo cumplido a la vista se deducía que se fue quien no podía faltar. */}
      <p className="suave">Sus confirmaciones no pasan a la próxima versión.</p>
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
        <div className="barra-accion">
          <Boton onClick={buscar} ocupado={ocupado} ocupadoTexto="Buscando alternativa…" disabled={soloLectura}>
            {error?.reintentable ? 'Reintentar búsqueda de alternativa' : sinAltAhora ? 'Volver a buscar alternativa' : 'Buscar alternativa'}
          </Boton>
          <p className="suave">La nueva versión empieza con cero aceptaciones.</p>
        </div>
      ) : p.mi_situacion.retirado ? null : ( // E-7: a quien se retiró no se le pide nada (ya lo dice AvisoParaMi arriba).
        <p className="suave">
          El organizador ({p.organizador.nombre}) debe buscar una alternativa.
          {p.mi_situacion.puede.guardar_condiciones ? ' Mientras tanto puedes actualizar tus condiciones en "Mi respuesta".' : ''}
        </p>
      )}
      {error && error.codigo !== 'sin_alternativa' ? <ErrorCaja error={error} enfocar /> : null}
    </section>
  )
}

function Bajas({ p }: { p: EstadoPropuesta }) {
  return (
    <section className="tarjeta">
      <h2>Cambios en el grupo</h2>
      <ul className="chips-personas chips-bajas">
        {p.bajas.map((b, i) => (
          <li key={`${b.miembro.miembro_id}-${i}`} title={momentoCorto(b.en)}>
            {/* Enmienda 13 (c), psico §16: sin nombre y sin "había confirmado" (el servidor ya manda "Una persona"). */}
            <span className="chip-texto">
              <span className="chip-nota">Una persona se retiró{b.version != null ? ` (versión ${b.version})` : ''}.</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="suave">Quien se retira no vuelve a entrar en este plan.</p>
    </section>
  )
}

function HistorialResumido({ p, irAPestana }: { p: EstadoPropuesta; irAPestana: PestanaProps['irAPestana'] }) {
  const ultimos = p.historial.slice(-3).reverse()
  return (
    <section className="tarjeta">
      <h2>Historial resumido</h2>
      <ul className="linea linea-resumen">
        {ultimos.map((e) => (
          <li key={e.state_rev + e.tipo + e.en.utc}>
            <span className="linea-hora num">{hora(e.en.local)}</span>
            <span className="linea-texto">
              {describirEvento(e)}
              {e.actor_tipo === 'simulacion' ? <> <span className="rotulo-sim">Simulación</span></> : null}
              <span className="visualmente-oculto"> · {momentoCorto(e.en)}</span>
            </span>
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

// El motor arma la opción con las respuestas (condiciones completas), no con el interés: la tarjeta pone primero
// lo que cuenta y deja "Me interesa" como lo que es, una señal opcional que ve el grupo.
function ReuniendoInteres({ p, irAPestana }: { p: EstadoPropuesta; irAPestana: PestanaProps['irAPestana'] }) {
  return (
    <section className="tarjeta">
      <h2>Respuestas del grupo</h2>
      {/* Las cifras, solo para quien organiza (E7.2): respuestas frente al mínimo. "Con interés" no va como cifra:
          al lado del mínimo se leía como avance hacia él, y el motor no lo usa (los nombres siguen abajo). */}
      {p.personas_con_condiciones != null ? (
        <div className="stats">
          <div className="stat">
            <span className="stat-etiqueta">Con condiciones</span>
            <span className="stat-valor">{p.personas_con_condiciones}</span>
          </div>
          <div className="stat">
            <span className="stat-etiqueta">Mínimo</span>
            <span className="stat-valor">{p.minimo}</span>
          </div>
        </div>
      ) : null}
      <p className="suave">
        {p.personas_con_condiciones != null
          ? 'La opción sale de lo que cada persona marca en privado, Sí o No en cada franja: aquí solo se cuenta quién respondió.'
          : `La opción sale de lo que cada uno marca en privado, Sí o No en cada franja. Hacen falta al menos ${p.minimo} que puedan en el mismo horario, contando a quien no puede faltar.`}{' '}
        "Me interesa" es opcional: lo ve el grupo y no es una confirmación.
      </p>
      {p.interesados.miembros.length > 0 ? (
        <ul className="chips-personas" aria-label="Marcaron Me interesa">
          {p.interesados.miembros.map((m) => (
            <li key={m.miembro_id}>
              <Avatar nombre={m.nombre} simulado={m.simulado} yo={m.miembro_id === p.mi_situacion.miembro_id} tam={26} />
              <Nombre m={m} yo={m.miembro_id === p.mi_situacion.miembro_id} />
            </li>
          ))}
        </ul>
      ) : null}
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
      <p>Nadie más puede responder cuándo puede hasta que la propuesta se abra.</p>
      {p.mi_situacion.puede.abrir ? (
        <div className="barra-accion">
          <Boton onClick={() => void correr(`abrir:${p.id}`, () => api.openProposal(p.id))} ocupado={ocupado} ocupadoTexto="Abriendo…" disabled={soloLectura}>
            Abrir propuesta
          </Boton>
        </div>
      ) : (
        <p className="suave">Solo el organizador puede abrirla.</p>
      )}
      {error ? <ErrorCaja error={error} enfocar /> : null}
    </section>
  )
}

function BuscarOpcion({ p, viva, soloLectura, sinOpcion, secundaria }: VivaProps & { sinOpcion: boolean; secundaria: boolean }) {
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
        <p className="suave">
          {secundaria && p.personas_con_condiciones != null && p.personas_con_condiciones < p.minimo
            ? `Con menos de ${p.minimo} personas que respondieron no puede salir una opción: conviene esperar. `
            : ''}
          Quien todavía no respondió no entra en la versión que se publique; contaría solo si el plan se rearma.
        </p>
      ) : null}
      {p.mi_situacion.puede.evaluar ? (
        <div className="barra-accion">
          <Boton
            variante={secundaria ? 'secundario' : 'primario'}
            onClick={evaluar}
            ocupado={ocupado}
            ocupadoTexto="Buscando…"
            disabled={soloLectura}
          >
            {error?.reintentable ? 'Reintentar búsqueda' : sinOpcion ? 'Volver a buscar opción' : 'Buscar opción compatible'}
          </Boton>
        </div>
      ) : null}
      {error ? <ErrorCaja error={error} enfocar /> : null}
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
    <section className={`tarjeta zona-peligro ${confirmar ? '' : 'zona-peligro-fila'}`} aria-labelledby="cancelar-titulo">
      <div className="zona-peligro-texto">
        <h2 id="cancelar-titulo">¿Ya no va?</h2>
        <p className="suave">Pasa a Cancelado y no se puede reabrir.</p>
      </div>
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
      {error ? <ErrorCaja error={error} enfocar /> : null}
    </section>
  )
}

// ------------------------------------------------------------------ cierre: el encuentro ocurre

/** Final del recorrido: el servidor confirmó el grupo. Llevarlo al calendario y avisar afuera de CRUXE. */
function CierrePlan({ p, codigo }: { p: EstadoPropuesta; codigo: string | null }) {
  const o = p.opcion!
  const [nota, setNota] = useState<string | null>(null)
  const cuando = franjaTexto(o.franja.inicio, o.franja.fin)
  const quienes = o.aceptaron.map((a) => a.miembro.nombre).join(', ')
  const texto = `Confirmado en CRUXE: ${p.titulo}, ${cuando} (hora de Santiago). Van: ${quienes}.`
  function agendar() {
    const ok = descargarCalendario({
      id: `${p.id}-v${o.version}`,
      titulo: p.titulo,
      inicioUtc: o.franja.inicio.utc,
      finUtc: o.franja.fin.utc,
      descripcion: `Plan confirmado en CRUXE (versión ${o.version}). Van: ${quienes}.`,
    })
    setNota(ok ? 'Listo: se descargó el evento para tu calendario.' : 'No se pudo armar el evento en este navegador.')
  }
  return (
    <section className="tarjeta cierre" aria-labelledby="cierre-titulo">
      <Confeti />
      <div className="cierre-cabeza">
        <span className="cierre-icono" aria-hidden="true">
          <Icono n="fiesta" tam={22} />
        </span>
        <div>
          <h2 id="cierre-titulo">
            <Resaltado tipo="marcador" color="var(--ok)">¡Se juntan!</Resaltado>
          </h2>
          <p className="cierre-cuando">{cuando}</p>
        </div>
      </div>
      <p className="suave">
        {o.aceptaron.length} {o.aceptaron.length === 1 ? 'persona confirmó' : 'personas confirmaron'} la versión {o.version}. CRUXE
        coordina el plan; no reserva nada.
      </p>
      <div className="cierre-botones">
        <button type="button" className="btn btn-primario btn-chico" onClick={agendar} aria-label="Agregar al calendario">
          <Icono n="agendar" tam={18} /> Calendario
        </button>
        {codigo ? null : (
          <a className="btn btn-secundario btn-chico" href={urlWhatsApp(texto)} target="_blank" rel="noopener noreferrer" aria-label="Avisar por WhatsApp">
            <Icono n="whatsapp" tam={18} /> WhatsApp
          </a>
        )}
      </div>
      {/* Con el código, el aviso lleva el enlace y los cupos libres (sin nombres) para que se sume quien no confirmó. */}
      {codigo ? (
        <RecordarFaltan codigo={codigo} titulo={p.titulo} motivo="confirmado" cuando={cuando} cuposLibres={o.cupos.disponibles} />
      ) : null}
      {nota ? <p role="status">{nota}</p> : null}
    </section>
  )
}
