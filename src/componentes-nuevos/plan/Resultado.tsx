// El resultado del plan, arriba de todo (S4, rediseño): estado, cuándo, cuántos van, el aviso que me toca y UNA acción.
// Todo sale del servidor (estado, cupos, `siguiente_accion`, `puede.*`); la interfaz no decide cupos, plazos ni quién puede.
// La región `role=status` con `.estado-hero-etiqueta` y `siguiente_accion.texto` se conserva: la leen los guiones de qa y rincones.
import { useState } from 'react'
import { api } from '../../lib/api'
import { descargarCalendario, enlaceInvitacion } from '../../lib/compartir'
import { diaDe, fechaCorta, franjaTexto, hora } from '../../lib/format'
import { useMutacion } from '../../lib/hooks'
import type { PropuestaViva } from '../../lib/hooks'
import { rutas } from '../../lib/shell'
import { CODIGOS_SIGUIENTE } from '../../lib/types'
import type { Espacio, EstadoPropuesta } from '../../lib/types'
import { vibrar } from '../../lib/tacto'
import { Aviso, Boton, DiaTile, ErrorCaja, Progreso } from '../../components/ui'
import { Confeti } from '../../components/Confeti'
import { Icono } from '../../components/Icono'
import type { NombreIcono } from '../../components/Icono'
import { Resaltado } from '../../components/Resaltado'
import { AsiNoPuedo } from '../../friccion/AsiNoPuedo'
import { InvitacionAgente } from '../../agente/InvitacionAgente'
import type { Pestana } from '../../screens/tabs'
import { AvisoParaMi } from '../AvisoParaMi'
import { avisoParaMi } from '../avisoPersonal'
import { BuscarLugar } from '../BuscarLugar'
import { RearmarConLoNuevo } from '../RearmarConLoNuevo'
import { urlAviso } from '../recordar'
import { accionPrimaria, cuentaConfirmados, porQueNoConfirmo } from './accion'

/** Ícono por estado: el estado nunca se distingue solo por color. */
const ICONO_ESTADO: Record<string, NombreIcono> = {
  borrador: 'borrador',
  reuniendo_interes: 'grupo',
  esperando_compromisos: 'esperando',
  grupo_confirmado: 'confirmado',
  en_revision: 'alerta',
  expirado: 'cerrado',
  cancelado: 'cerrado',
}

export function Resultado({
  p,
  viva,
  soloLectura,
  espacio,
  activa,
  irAPestana,
}: {
  p: EstadoPropuesta
  viva: PropuestaViva
  soloLectura: boolean
  espacio: Espacio | null
  activa: Pestana
  irAPestana: (t: Pestana) => void
}) {
  const o = p.opcion
  const s = p.mi_situacion
  const codigo = espacio?.codigo_invitacion ?? null
  const confirmado = p.estado === 'grupo_confirmado'
  const enRevision = p.estado === 'en_revision'
  const conOpcion = (p.estado === 'esperando_compromisos' || confirmado) && o
  // Enmienda 3: el código decide el acento; los booleanos solo si llega un código desconocido.
  const cod = p.siguiente_accion.codigo
  const conocido = (CODIGOS_SIGUIENTE as readonly string[]).includes(cod)
  const turno = cod === 'te_toca_aceptar' || (!conocido && s.puede.aceptar)
  const yaAcepte = cod === 'ya_aceptaste' || (!conocido && !turno && s.acepte_version && p.estado === 'esperando_compromisos')
  const accion = accionPrimaria(p)
  const razon = porQueNoConfirmo(p)

  return (
    <section
      className={`tarjeta resultado estado-hero estado-hero-${p.estado} ${turno ? 'estado-hero-turno' : ''}`}
      aria-labelledby="resultado-estado"
      data-codigo={cod}
    >
      {/* key: al cambiar el estado o el código, la región se vuelve a montar y el lector de pantalla la anuncia. */}
      <div key={`${p.estado}-${cod}`} className="resultado-estado" role="status" aria-live="polite" aria-atomic="true">
        <div className="estado-hero-fila">
          <span className="estado-hero-icono" aria-hidden="true">
            <Icono n={ICONO_ESTADO[p.estado] ?? 'esperando'} tam={20} />
          </span>
          <strong className="estado-hero-etiqueta" id="resultado-estado">
            {p.estado_etiqueta}
          </strong>
          {o ? (
            <span className="estado-hero-version">
              <span aria-hidden="true">v{o.version}</span>
              <span className="visualmente-oculto">Versión {o.version}</span>
            </span>
          ) : null}
        </div>
        {turno && cod !== 'te_toca_aceptar' ? <span className="pastilla pastilla-turno">Tu turno: confirma la versión {o?.version}</span> : null}
        {yaAcepte && cod !== 'ya_aceptaste' ? <span className="pastilla pastilla-ok">Ya confirmaste la versión {o?.version}</span> : null}
        <p className="estado-hero-siguiente">
          <span className="visualmente-oculto">Próxima acción: </span>
          {p.siguiente_accion.texto}
        </p>
      </div>

      {confirmado && o ? (
        <div className="resultado-fiesta">
          {s.acepte_version ? <Confeti /> : null}
          <h2 className="resultado-titulo">
            <Resaltado tipo="marcador" color="var(--ok)">
              ¡Se juntan!
            </Resaltado>
          </h2>
        </div>
      ) : null}

      {conOpcion ? <Cuando p={p} /> : null}
      {enRevision && o ? (
        <div className="resultado-cuando resultado-cuando-vieja">
          <DiaTile local={o.franja.inicio.local} />
          <div>
            <p className="resultado-eyebrow">Versión {o.version} (en revisión, no confirmada)</p>
            <p className="resultado-fecha">{diaDe(o.franja.inicio.local)}</p>
            <p className="resultado-hora">
              {hora(o.franja.inicio.local)} a {hora(o.franja.fin.local)} · sus confirmaciones no pasan a la próxima versión
            </p>
          </div>
        </div>
      ) : null}
      {!o && p.estado !== 'cancelado' && p.estado !== 'expirado' ? <Candidatas p={p} /> : null}

      {conOpcion ? <Cifra p={p} /> : null}
      {p.estado === 'reuniendo_interes' || p.estado === 'borrador' ? <Respuestas p={p} espacio={espacio} /> : null}

      <AvisoUnico p={p} viva={viva} irARespuesta={() => irAPestana('respuesta')} />

      {activa === 'plan' ? (
        <Acciones p={p} viva={viva} soloLectura={soloLectura} codigo={codigo} demo={espacio?.demo ?? true} accion={accion} irAPestana={irAPestana} />
      ) : accion && accion.clave !== 'calendario' ? (
        <div className="resultado-acciones">
          <button type="button" className={`btn ${accion.clave === 'confirmar' ? 'btn-turno' : 'btn-secundario'} ir-confirmar`} onClick={() => irAPestana('plan')}>
            {accion.clave === 'confirmar' ? 'Ir a confirmar' : 'Ir al plan'}
          </button>
        </div>
      ) : null}

      {razon && activa === 'plan' ? (
        <p className="nota-linea resultado-razon" role="note">
          <Icono n={s.acepte_version ? 'check' : 'candado'} tam={16} />
          <span>{razon}</span>
        </p>
      ) : null}
      {/* Enmienda 15 (E-c): la ronda la decide el servidor (`abierta` no se recalcula con el reloj del teléfono). */}
      {p.ronda && conOpcion ? (
        <p className="nota-linea resultado-ronda" role="note">
          <Icono n="reloj" tam={16} />
          <span>
            {p.ronda.abierta
              ? `Opiniones hasta ${fechaCorta(p.ronda.cierra.local)}, ${hora(p.ronda.cierra.local)}. Mientras tanto no se rearma; confirmar sigue abierto.`
              : `La ronda de opiniones cerró ${fechaCorta(p.ronda.cierra.local)}, ${hora(p.ronda.cierra.local)}. Todavía se puede confirmar o retirarse.`}
          </span>
        </p>
      ) : null}

    </section>
  )
}

/** La opción vigente, grande: hoja de calendario, día y hora; el nombre del plan de esa franja si lo tiene (E15). */
function Cuando({ p }: { p: EstadoPropuesta }) {
  const o = p.opcion!
  const etiqueta = o.franja.etiqueta ?? p.franjas.find((f) => f.clave === o.franja.clave)?.etiqueta ?? null
  return (
    <div className="resultado-cuando">
      <DiaTile local={o.franja.inicio.local} />
      <div>
        <p className="resultado-eyebrow">Opción vigente · Versión {o.version}</p>
        <p className="resultado-fecha">{etiqueta ? `${etiqueta} · ` : ''}{diaDe(o.franja.inicio.local)}</p>
        <p className="resultado-hora">
          {hora(o.franja.inicio.local)} a {hora(o.franja.fin.local)}
        </p>
      </div>
    </div>
  )
}

/** Sin opción publicada: las franjas candidatas, en una línea ("Franja A/B" solo en la ficha). */
function Candidatas({ p }: { p: EstadoPropuesta }) {
  return (
    <p className="resultado-candidatas">
      <span className="resultado-eyebrow">Opciones</span>
      {p.franjas.map((f, i) => (
        <span key={f.clave} className="resultado-candidata">
          {i > 0 ? <span className="resultado-o"> o </span> : null}
          <strong>{f.etiqueta ? `${f.etiqueta} · ` : ''}{diaDe(f.inicio.local)}</strong> {hora(f.inicio.local)}
        </span>
      ))}
    </p>
  )
}

/** Cuántos confirmaron, una sola cifra con la barra; "No puede faltar: pendiente" solo si falta esa persona (E7.2 para "faltan"). */
function Cifra({ p }: { p: EstadoPropuesta }) {
  const o = p.opcion!
  const c = o.cupos
  const sobre = c.confirmados > c.minimo
  const cuenta = cuentaConfirmados(c.confirmados, c.minimo)
  const detalles = [
    c.imprescindible_acepto ? null : `No puede faltar: ${p.imprescindible.nombre} · pendiente`,
    c.pendientes != null ? `Faltan por confirmar: ${c.pendientes}` : null,
    c.reservado_imprescindible ? `Cupo reservado para quien no puede faltar · libres para el resto: ${c.libres_para_otros}` : null,
    p.estado === 'grupo_confirmado' && c.disponibles > 0 ? `${c.disponibles} ${c.disponibles === 1 ? 'cupo libre' : 'cupos libres'}` : null,
  ].filter((x): x is string => x !== null)
  return (
    <div className="resultado-cifra">
      <p className="resultado-cuenta">
        <strong className="num">Confirmaron {cuenta}</strong>
        <span className="resultado-max num"> · máx. {c.maximo}</span>
      </p>
      <Progreso valor={c.confirmados} minimo={c.minimo} maximo={c.maximo} ok={p.estado === 'grupo_confirmado'} etiqueta={`Confirmaron ${cuenta}${sobre ? '' : ' necesarias'}`} />
      {detalles.length > 0 ? <p className="resultado-detalle">{detalles.join(' · ')}</p> : null}
    </div>
  )
}

/**
 * Mientras se juntan respuestas: a quien organiza el servidor le da cuántas hay (E7.2); los demás ven solo lo propio.
 * "Me interesa" no es una cifra: el motor no lo usa (los nombres van en «Quiénes»).
 */
function Respuestas({ p, espacio }: { p: EstadoPropuesta; espacio: Espacio | null }) {
  const n = p.personas_con_condiciones
  const s = p.mi_situacion
  const total = espacio?.miembros.length ?? null
  if (p.estado === 'borrador') return <p className="resultado-nota">Nadie más puede responder cuándo puede hasta que la propuesta se abra.</p>
  if (n != null) {
    return (
      <div className="resultado-cifra">
        <p className="resultado-cuenta">
          <strong className="num">
            Con condiciones: {n}
            {total != null ? ` de ${total}` : ''}
          </strong>
          <span className="resultado-max num"> · mínimo {p.minimo}</span>
        </p>
        <Progreso valor={n} minimo={p.minimo} maximo={Math.max(total ?? p.maximo, p.minimo)} etiqueta={`Con condiciones ${n}, mínimo ${p.minimo}`} />
        <p className="resultado-detalle">Cada respuesta es privada: aquí solo se cuenta quién respondió.</p>
      </div>
    )
  }
  if (s.retirado) return null
  return (
    <p className="resultado-nota">
      {s.condiciones === 'completas'
        ? 'Respondiste. Cuando salga la opción, la ves acá.'
        : s.condiciones === 'incompletas'
          ? 'Te queda algún día sin marcar; con la respuesta completa entras en la búsqueda.'
          : `Hacen falta al menos ${p.minimo} personas que puedan en el mismo horario, contando a ${p.imprescindible.nombre}, que no puede faltar.`}
    </p>
  )
}

/** Un solo aviso bajo el resultado (hoy se apilaban dos o tres). Orden: lo personal, la invitación del agente, la revisión. */
function AvisoUnico({ p, viva, irARespuesta }: { p: EstadoPropuesta; viva: PropuestaViva; irARespuesta: () => void }) {
  const personal = avisoParaMi(p)
  // "Esta versión no te incluye" con la disponibilidad completa diría un motivo que puede ser falso (la elegibilidad es una
  // foto al publicar); con el plazo vencido ya lo dice la línea de "por qué no confirmo". En esos casos, texto cierto y sin motivo.
  const sinTi = personal?.clave === 'version_sin_ti'
  // Marcado "así no puedo": lo dice la pieza de friccion junto a las acciones (con deshacer); no se repite arriba.
  if (personal?.clave === 'marcaste_asi_no_puedo') return null
  if (sinTi && p.mi_situacion.condiciones === 'completas' && !p.plazo_vencido) {
    return (
      <Aviso tono="info" titulo="Esta versión no te incluye">
        Se armó sin ti. No tienes que hacer nada: si el plan se rearma, cuenta lo que marcaste.
      </Aviso>
    )
  }
  if (personal && !(sinTi && (p.mi_situacion.condiciones === 'completas' || p.plazo_vencido))) {
    return <AvisoParaMi p={p} servidorAhora={viva.servidorAhora} irARespuesta={irARespuesta} />
  }
  if (p.mi_situacion.invitacion_agente) return <InvitacionAgente situacion={p.mi_situacion} onResponder={irARespuesta} />
  if (p.estado === 'en_revision') {
    return (
      <Aviso tono="aviso" titulo="Una baja dejó el plan sin cumplir">
        {/* Enmienda 14, 0050: texto neutro; nombrar la causa junto a los conteos dejaba deducir quién se fue. */}
        Hasta que salga una alternativa y se reúnan de nuevo las confirmaciones, nadie queda comprometido.
      </Aviso>
    )
  }
  return null
}

/** La acción primaria (una) y las secundarias en una fila. Solo las que el servidor habilita. */
function Acciones({
  p,
  viva,
  soloLectura,
  codigo,
  demo,
  accion,
  irAPestana,
}: {
  p: EstadoPropuesta
  viva: PropuestaViva
  soloLectura: boolean
  codigo: string | null
  /** Mientras no se sabe si el grupo es demo, no se ofrece el mapa (D10). */
  demo: boolean
  accion: ReturnType<typeof accionPrimaria>
  irAPestana: (t: Pestana) => void
}) {
  const o = p.opcion
  const { ocupado, error, correr } = useMutacion(viva)
  const [nota, setNota] = useState<string | null>(null)

  async function aceptar(version: number) {
    // Siempre se envía la versión que la persona está viendo, nunca una calculada.
    const r = await correr(`aceptar:${p.id}:${version}`, (intento) => api.acceptVersion(p.id, version, intento))
    if (r?.ok) vibrar([14, 50, 22])
  }
  const evaluar = () => correr(`evaluar:${p.id}:${p.state_rev}`, (intento) => api.evaluateAndPublish(p.id, intento))
  const reparar = () => correr(`reparar:${p.id}:${p.state_rev}`, (intento) => api.proposeRepair(p.id, intento))
  const abrir = () => correr(`abrir:${p.id}`, () => api.openProposal(p.id))
  function agendar() {
    if (!o) return
    const quienes = o.aceptaron.map((a) => a.miembro.nombre).join(', ')
    const ok = descargarCalendario({
      id: `${p.id}-v${o.version}`,
      titulo: p.titulo,
      inicioUtc: o.franja.inicio.utc,
      finUtc: o.franja.fin.utc,
      descripcion: `Plan confirmado en CRUXE (versión ${o.version}). Van: ${quienes}.`,
    })
    setNota(ok ? 'Listo: se descargó el evento para tu calendario.' : 'No se pudo armar el evento en este navegador.')
  }

  const sinOpcion = p.estado === 'reuniendo_interes' && p.ultima_evaluacion?.resultado === 'sin_opcion'
  const sinAlternativa = p.estado === 'en_revision' && (p.ultima_evaluacion?.resultado === 'sin_alternativa' || error?.codigo === 'sin_alternativa')
  const reintentar = error?.reintentable ? 'Reintentar' : null

  let primaria = null
  switch (accion?.clave) {
    case 'confirmar':
      primaria = (
        <Boton variante="turno" onClick={() => void aceptar(accion.version)} ocupado={ocupado} ocupadoTexto="Enviando…" disabled={soloLectura}>
          {reintentar ? `Reintentar confirmación de la versión ${accion.version}` : accion.texto}
        </Boton>
      )
      break
    case 'responder':
      primaria = (
        <a className="btn btn-primario" href={rutas.responder(p.espacio_id, p.id)}>
          {accion.texto}
        </a>
      )
      break
    case 'buscar_opcion':
      primaria = (
        <Boton variante={accion.secundaria ? 'secundario' : 'primario'} onClick={() => void evaluar()} ocupado={ocupado} ocupadoTexto="Buscando…" disabled={soloLectura}>
          {reintentar ? 'Reintentar búsqueda' : accion.texto}
        </Boton>
      )
      break
    case 'buscar_alternativa':
      primaria = (
        <Boton onClick={() => void reparar()} ocupado={ocupado} ocupadoTexto="Buscando alternativa…" disabled={soloLectura}>
          {reintentar ? 'Reintentar búsqueda de alternativa' : sinAlternativa ? 'Volver a buscar alternativa' : accion.texto}
        </Boton>
      )
      break
    case 'abrir':
      primaria = (
        <Boton onClick={() => void abrir()} ocupado={ocupado} ocupadoTexto="Abriendo…" disabled={soloLectura}>
          {accion.texto}
        </Boton>
      )
      break
    case 'calendario':
      primaria = (
        <button type="button" className="btn btn-primario" onClick={agendar} aria-label="Agregar al calendario">
          <Icono n="agendar" tam={18} /> {accion.texto}
        </button>
      )
      break
    case 'rearmar':
      // Enmienda 13 (b): la pieza decide con los totales del servidor y maneja sus propios estados (sin alternativa, tope).
      primaria = <RearmarConLoNuevo p={p} viva={viva} codigo={codigo} soloLectura={soloLectura} compacto />
      break
    default:
      primaria = null
  }

  const vigente = (p.estado === 'esperando_compromisos' || p.estado === 'grupo_confirmado') && o
  const avisarConfirmado =
    p.estado === 'grupo_confirmado' && o && p.mi_situacion.acepte_version && codigo
      ? urlAviso({ motivo: 'confirmado', titulo: p.titulo, cuando: franjaTexto(o.franja.inicio, o.franja.fin), cuposLibres: o.cupos.disponibles, enlace: enlaceInvitacion(codigo) })
      : null

  return (
    <>
      {sinOpcion || sinAlternativa ? (
        <Aviso tono="aviso" titulo="Sin opción compatible">
          {sinOpcion
            ? 'Con las respuestas de hoy no hay una franja posible. El mínimo no cambia y, por privacidad, no se muestran los motivos. Se puede esperar más respuestas o cancelar.'
            : 'Con las respuestas actuales no hay alternativa. No se baja el mínimo ni se finge una reparación: si alguien actualiza cuándo puede, se vuelve a buscar.'}
        </Aviso>
      ) : null}
      {p.estado === 'en_revision' && !p.mi_situacion.puede.proponer_reparacion && !p.mi_situacion.retirado ? (
        <p className="resultado-nota">
          El organizador ({p.organizador.nombre}) debe buscar una alternativa.
          {p.mi_situacion.puede.guardar_condiciones ? ' Mientras tanto puedes actualizar cuándo puedes en «Mi respuesta».' : ''}
        </p>
      ) : null}
      {primaria || vigente ? (
        <div className="resultado-acciones">
          {primaria}
          {/* Enmienda 13 (a): "Así no puedo, pero sigo" junto a confirmar; marcado, la misma pieza (de friccion) ofrece actualizar o volver a «puedo». */}
          {vigente ? <AsiNoPuedo p={p} viva={viva} soloLectura={soloLectura} irAPestana={irAPestana} /> : null}
          {avisarConfirmado ? (
            <a className="btn btn-secundario" href={avisarConfirmado} target="_blank" rel="noopener noreferrer">
              <Icono n="whatsapp" tam={18} /> Avisar al grupo
            </a>
          ) : null}
          {vigente ? <BuscarLugar titulo={p.titulo} demo={demo} /> : null}
        </div>
      ) : null}
      {ocupado && accion?.clave === 'confirmar' ? (
        <p role="status" className="resultado-nota">
          Enviando tu confirmación. Todavía no está confirmada hasta que el servidor responda.
        </p>
      ) : null}
      {nota ? <p role="status" className="resultado-nota">{nota}</p> : null}
      {/* Si el servidor ya muestra la confirmación hecha, la duda de "pudo haberse registrado o no" quedó resuelta (E-1). */}
      {error && error.codigo !== 'sin_alternativa' && !(error.resultadoIncierto && p.mi_situacion.acepte_version) ? <ErrorCaja error={error} enfocar /> : null}
    </>
  )
}
