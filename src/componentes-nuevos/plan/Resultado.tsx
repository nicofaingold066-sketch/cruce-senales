// El resultado del plan (S4, rediseño; pantalla 5 del mockup validado por Nico, 02:40). Es la escena oscura de arriba:
// estado, cuándo (grande), el cruce con quiénes confirmaron, la cifra, la tira de etapas, cómo salió, un aviso y UNA acción.
// Todo sale del servidor (estado, cupos, `siguiente_accion`, `puede.*`); la interfaz no decide cupos, plazos ni quién puede.
// La región `role=status` con `.estado-hero-etiqueta` y `siguiente_accion.texto` se conserva: la leen los guiones de qa y rincones.
import { useState } from 'react'
import { api } from '../../lib/api'
import { descargarCalendario } from '../../lib/compartir'
import { diaDe, hora } from '../../lib/format'
import { useMutacion } from '../../lib/hooks'
import type { PropuestaViva } from '../../lib/hooks'
import { rutas } from '../../lib/shell'
import { CODIGOS_SIGUIENTE } from '../../lib/types'
import type { Espacio, EstadoPropuesta } from '../../lib/types'
import { vibrar } from '../../lib/tacto'
import { Aviso, Boton, DiaTile, ErrorCaja } from '../../components/ui'
import { Confeti } from '../../components/Confeti'
import { Cruce } from '../../components/Cruce'
import type { NodoCruce, TonoCruce } from '../../components/Cruce'
import { Icono } from '../../components/Icono'
import type { NombreIcono } from '../../components/Icono'
import { Resaltado } from '../../components/Resaltado'
import { InvitacionAgente } from '../../agente/InvitacionAgente'
import type { Pestana } from '../../screens/tabs'
import { AvisoParaMi } from '../AvisoParaMi'
import { avisoParaMi } from '../avisoPersonal'
import { RearmarConLoNuevo } from '../RearmarConLoNuevo'
import { ETAPAS, accionPrimaria, cuentaConfirmados, etapaDe, porQueNoConfirmo, textoComoSalio } from './accion'

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

export interface EscenaCruce {
  nodos: NodoCruce[]
  valor: string
  etiqueta: string
  fraccion: number
  tono: TonoCruce
}

export function Resultado({
  p,
  viva,
  soloLectura,
  espacio,
  activa,
  irAPestana,
  cruce,
}: {
  p: EstadoPropuesta
  viva: PropuestaViva
  soloLectura: boolean
  espacio: Espacio | null
  activa: Pestana
  irAPestana: (t: Pestana) => void
  cruce: EscenaCruce
}) {
  const o = p.opcion
  const s = p.mi_situacion
  const confirmado = p.estado === 'grupo_confirmado'
  const enRevision = p.estado === 'en_revision'
  const vigente = (p.estado === 'esperando_compromisos' || confirmado) && o
  // Enmienda 3: el código decide el acento; los booleanos solo si llega un código desconocido.
  const cod = p.siguiente_accion.codigo
  const conocido = (CODIGOS_SIGUIENTE as readonly string[]).includes(cod)
  const turno = cod === 'te_toca_aceptar' || (!conocido && s.puede.aceptar)
  const yaAcepte = cod === 'ya_aceptaste' || (!conocido && !turno && s.acepte_version && p.estado === 'esperando_compromisos')
  const accion = accionPrimaria(p)
  const razon = porQueNoConfirmo(p)
  const etapa = etapaDe(p.estado)
  const etiqueta = o ? (o.franja.etiqueta ?? p.franjas.find((f) => f.clave === o.franja.clave)?.etiqueta ?? null) : null

  return (
    // key: el bloque "respira" (aparece de nuevo) una vez cada vez que cambia el estado o la versión.
    <div key={`${p.estado}-${o?.version ?? 0}`} className={`resultado estado-hero-${p.estado} ${turno ? 'resultado-turno' : ''} sd-aparecer`} data-codigo={cod}>
      <div className="resultado-estado" role="status" aria-live="polite" aria-atomic="true">
        <p className="estado-hero-fila">
          <span className="estado-hero-icono" aria-hidden="true">
            <Icono n={ICONO_ESTADO[p.estado] ?? 'esperando'} tam={16} />
          </span>
          <strong className="estado-hero-etiqueta">{p.estado_etiqueta}</strong>
        </p>
        {turno && cod !== 'te_toca_aceptar' ? <span className="pastilla pastilla-turno">Tu turno: confirma la versión {o?.version}</span> : null}
        {yaAcepte && cod !== 'ya_aceptaste' ? <span className="pastilla pastilla-ok">Ya confirmaste la versión {o?.version}</span> : null}
        <p className="estado-hero-siguiente">
          <span className="visualmente-oculto">Próxima acción: </span>
          {p.siguiente_accion.texto}
        </p>
      </div>

      {confirmado && o ? (
        <div className="resultado-fiesta sd-exito">
          {s.acepte_version ? <Confeti /> : null}
          <p className="resultado-titulo">
            <Resaltado tipo="marcador" color="var(--ok)">
              ¡Se juntan!
            </Resaltado>
          </p>
        </div>
      ) : null}

      {o && (vigente || enRevision) ? (
        <div className={`resultado-cuando ${enRevision ? 'resultado-cuando-vieja' : ''}`}>
          <DiaTile local={o.franja.inicio.local} />
          <div>
            <p className="resultado-eyebrow">{enRevision ? `Versión ${o.version} (en revisión, no confirmada)` : `Opción vigente · Versión ${o.version}`}</p>
            <p className="resultado-fecha">
              {etiqueta ? `${etiqueta} · ` : ''}
              {diaDe(o.franja.inicio.local)}
            </p>
            <p className="resultado-hora">
              {hora(o.franja.inicio.local)} a {hora(o.franja.fin.local)}
            </p>
          </div>
        </div>
      ) : !o && p.estado !== 'cancelado' && p.estado !== 'expirado' ? (
        <p className="resultado-candidatas">
          <span className="resultado-eyebrow">Opciones</span>
          {p.franjas.map((f, i) => (
            <span key={f.clave} className="resultado-candidata">
              {i > 0 ? <span className="resultado-o"> o </span> : null}
              <strong>
                {f.etiqueta ? `${f.etiqueta} · ` : ''}
                {diaDe(f.inicio.local)}
              </strong>{' '}
              {hora(f.inicio.local)}
            </span>
          ))}
        </p>
      ) : null}

      <h1 id="propuesta-titulo" className="resultado-plan" style={{ viewTransitionName: `plan-${p.id}` }}>
        {p.titulo}
      </h1>

      <div className="resultado-cruce">
        <Cruce nodos={cruce.nodos} valor={cruce.valor} etiqueta={cruce.etiqueta} fraccion={cruce.fraccion} tono={cruce.tono} confirmado={confirmado} />
      </div>

      <Cifra p={p} />

      {etapa !== null ? (
        <ol className="pasos resultado-pasos" aria-label="Etapas del plan">
          {ETAPAS.map((t, n) => (
            <li key={t} className={`paso ${n < etapa ? 'paso-hecho' : ''} ${n === etapa ? 'paso-actual' : ''}`} aria-current={n === etapa ? 'step' : undefined}>
              <span className="paso-barra" aria-hidden="true" />
              <span className="paso-texto">{t}</span>
            </li>
          ))}
        </ol>
      ) : null}
      {etapa !== null && p.estado !== 'borrador' ? <p className="resultado-como">{textoComoSalio(p)}</p> : null}

      <AvisoUnico p={p} viva={viva} irARespuesta={() => irAPestana('respuesta')} />

      {razon && s.acepte_version && vigente ? (
        <p className="resultado-hecho sd-exito" role="note">
          <Icono n="check" tam={16} /> Confirmado ✓ · {razon}
        </p>
      ) : razon ? (
        <p className="nota-linea resultado-razon" role="note">
          <Icono n="candado" tam={16} />
          <span>{razon}</span>
        </p>
      ) : null}

      {activa === 'plan' ? (
        <Accion p={p} viva={viva} soloLectura={soloLectura} codigo={espacio?.codigo_invitacion ?? null} accion={accion} irAPestana={irAPestana} />
      ) : accion && accion.clave !== 'calendario' ? (
        <div className="barra-accion">
          <button type="button" className={`btn ${accion.clave === 'confirmar' ? 'btn-turno' : 'btn-claro'} ir-confirmar`} onClick={() => irAPestana('plan')}>
            {accion.clave === 'confirmar' ? 'Ir a confirmar' : 'Ir al plan'}
          </button>
        </div>
      ) : null}
    </div>
  )
}

/** "Confirmaron 2 de 4 · faltan 2 para el mínimo" (o "5 (mínimo 4)"); mientras se juntan respuestas, lo que el servidor deja ver. */
function Cifra({ p }: { p: EstadoPropuesta }) {
  const o = p.opcion
  const vigente = (p.estado === 'esperando_compromisos' || p.estado === 'grupo_confirmado') && o
  if (vigente) {
    const c = o.cupos
    const partes = [
      c.faltan_para_minimo > 0 && p.estado === 'esperando_compromisos' ? `faltan ${c.faltan_para_minimo} para el mínimo` : null,
      c.imprescindible_acepto ? null : `${p.imprescindible.nombre} (no puede faltar): pendiente`,
      c.pendientes != null ? `Faltan por confirmar: ${c.pendientes}` : null,
      c.reservado_imprescindible ? `cupo reservado para quien no puede faltar; libres para el resto: ${c.libres_para_otros}` : null,
      p.estado === 'grupo_confirmado' && c.disponibles > 0 ? `${c.disponibles} ${c.disponibles === 1 ? 'cupo libre' : 'cupos libres'}` : null,
    ].filter((x): x is string => x !== null)
    return (
      <p className="resultado-cuenta">
        <strong className="num">Confirmaron {cuentaConfirmados(c.confirmados, c.minimo)}</strong>
        {partes.length > 0 ? <span className="resultado-detalle"> · {partes.join(' · ')}</span> : null}
      </p>
    )
  }
  if (p.estado === 'borrador') return <p className="resultado-detalle">Nadie más puede responder cuándo puede hasta que la propuesta se abra.</p>
  if (p.estado !== 'reuniendo_interes') return null
  const s = p.mi_situacion
  // E7.2: cuántos respondieron solo le llega a quien organiza; los demás ven lo propio.
  if (p.personas_con_condiciones != null) {
    return (
      <p className="resultado-cuenta">
        <strong className="num">Con condiciones: {p.personas_con_condiciones}</strong>
        <span className="resultado-detalle"> · mínimo {p.minimo}</span>
      </p>
    )
  }
  if (s.retirado) return null
  return (
    <p className="resultado-detalle">
      {s.condiciones === 'completas'
        ? 'Respondiste. Cuando salga la opción, la ves acá.'
        : s.condiciones === 'incompletas'
          ? 'Te queda algún día sin marcar; con la respuesta completa entras en la búsqueda.'
          : `Hacen falta al menos ${p.minimo} que puedan en el mismo horario, contando a ${p.imprescindible.nombre}.`}
    </p>
  )
}

/** Un solo aviso (hoy se apilaban dos o tres). Orden: lo personal, la invitación del agente, la revisión, sin opción. */
function AvisoUnico({ p, viva, irARespuesta }: { p: EstadoPropuesta; viva: PropuestaViva; irARespuesta: () => void }) {
  const personal = avisoParaMi(p)
  const sinTi = personal?.clave === 'version_sin_ti'
  // Marcado "así no puedo": lo dice la pieza de friccion en la hoja (con deshacer); no se repite arriba.
  if (personal?.clave === 'marcaste_asi_no_puedo') return null
  // "Esta versión no te incluye" con la disponibilidad completa diría un motivo que puede ser falso (la elegibilidad es una
  // foto al publicar): texto cierto y sin motivo. Con el plazo vencido ya lo dice la línea de "por qué no confirmo".
  if (sinTi && !p.plazo_vencido) {
    if (p.mi_situacion.condiciones !== 'completas') return <AvisoParaMi p={p} servidorAhora={viva.servidorAhora} irARespuesta={irARespuesta} />
    return (
      <Aviso tono="info" titulo="Esta versión no te incluye">
        Se armó sin ti. No tienes que hacer nada: si el plan se rearma, cuenta lo que marcaste.
      </Aviso>
    )
  }
  if (personal && !sinTi) return <AvisoParaMi p={p} servidorAhora={viva.servidorAhora} irARespuesta={irARespuesta} />
  if (p.mi_situacion.invitacion_agente) return <InvitacionAgente situacion={p.mi_situacion} onResponder={irARespuesta} />
  if (p.estado === 'en_revision') {
    return (
      <Aviso tono="aviso" titulo="Una baja dejó el plan sin cumplir">
        {/* Enmienda 14, 0050: texto neutro; nombrar la causa junto a los conteos dejaba deducir quién se fue. */}
        Hasta que salga una alternativa y se reúnan de nuevo las confirmaciones, nadie queda comprometido.
      </Aviso>
    )
  }
  if (p.estado === 'reuniendo_interes' && p.ultima_evaluacion?.resultado === 'sin_opcion') {
    return (
      <Aviso tono="aviso" titulo="Sin opción compatible">
        Con las respuestas de hoy no hay una franja posible. El mínimo no cambia y, por privacidad, no se muestran los motivos.
      </Aviso>
    )
  }
  return null
}

/** La acción primaria (una), en la barra fija de abajo. Solo la que el servidor habilita. */
function Accion({
  p,
  viva,
  soloLectura,
  codigo,
  accion,
  irAPestana,
}: {
  p: EstadoPropuesta
  viva: PropuestaViva
  soloLectura: boolean
  codigo: string | null
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

  const sinAlternativa = p.estado === 'en_revision' && (p.ultima_evaluacion?.resultado === 'sin_alternativa' || error?.codigo === 'sin_alternativa')
  const reintentar = Boolean(error?.reintentable)

  let boton = null
  let pie: string | null = null
  switch (accion?.clave) {
    case 'confirmar':
      boton = (
        <Boton variante="turno" onClick={() => void aceptar(accion.version)} ocupado={ocupado} ocupadoTexto="Enviando…" disabled={soloLectura}>
          {reintentar ? `Reintentar confirmación de la versión ${accion.version}` : accion.texto}
        </Boton>
      )
      pie = ocupado ? 'Enviando tu confirmación. Todavía no está confirmada hasta que el servidor responda.' : 'Tu confirmación vale solo para esta versión.'
      break
    case 'responder':
      boton = (
        <a className="btn btn-claro" href={rutas.responder(p.espacio_id, p.id)}>
          {accion.texto}
        </a>
      )
      break
    case 'buscar_opcion':
      boton = (
        <Boton variante={accion.secundaria ? 'secundario' : 'claro'} onClick={() => void evaluar()} ocupado={ocupado} ocupadoTexto="Buscando…" disabled={soloLectura}>
          {reintentar ? 'Reintentar búsqueda' : accion.texto}
        </Boton>
      )
      pie = accion.secundaria ? 'Quien todavía no respondió no entra en la versión que se publique.' : null
      break
    case 'buscar_alternativa':
      boton = (
        <Boton variante="claro" onClick={() => void reparar()} ocupado={ocupado} ocupadoTexto="Buscando alternativa…" disabled={soloLectura}>
          {reintentar ? 'Reintentar búsqueda de alternativa' : sinAlternativa ? 'Volver a buscar alternativa' : accion.texto}
        </Boton>
      )
      pie = 'La nueva versión empieza con cero aceptaciones.'
      break
    case 'abrir':
      boton = (
        <Boton variante="claro" onClick={() => void abrir()} ocupado={ocupado} ocupadoTexto="Abriendo…" disabled={soloLectura}>
          {accion.texto}
        </Boton>
      )
      break
    case 'calendario':
      boton = (
        <button type="button" className="btn btn-claro" onClick={agendar} aria-label="Agregar al calendario">
          <Icono n="agendar" tam={18} /> {accion.texto}
        </button>
      )
      break
    case 'rearmar':
      // Enmienda 13 (b): la pieza decide con los totales del servidor y maneja sus propios estados (sin alternativa, tope).
      return (
        <div className="resultado-rearmar">
          <RearmarConLoNuevo p={p} viva={viva} codigo={codigo} soloLectura={soloLectura} compacto />
        </div>
      )
    default:
      boton = null
  }

  return (
    <>
      {sinAlternativa ? (
        <Aviso tono="aviso" titulo="Sin opción compatible">
          Con las respuestas actuales no hay alternativa. No se baja el mínimo ni se finge una reparación: si alguien actualiza cuándo puede, se vuelve a buscar.
        </Aviso>
      ) : null}
      {p.estado === 'en_revision' && !p.mi_situacion.puede.proponer_reparacion && !p.mi_situacion.retirado ? (
        <p className="resultado-detalle">
          El organizador ({p.organizador.nombre}) debe buscar una alternativa.
          {p.mi_situacion.puede.guardar_condiciones ? ' Mientras tanto puedes actualizar cuándo puedes en «Mi respuesta».' : ''}
        </p>
      ) : null}
      {boton ? (
        <div className="barra-accion">
          {boton}
          {accion?.clave === 'responder' ? (
            <button type="button" className="btn btn-secundario" onClick={() => irAPestana('respuesta')}>
              Ir a Mi respuesta
            </button>
          ) : null}
          {pie ? (
            <p className="resultado-detalle" role={ocupado ? 'status' : undefined}>
              {pie}
            </p>
          ) : null}
        </div>
      ) : null}
      {nota ? (
        <p role="status" className="resultado-detalle">
          {nota}
        </p>
      ) : null}
      {/* Si el servidor ya muestra la confirmación hecha, la duda de "pudo haberse registrado o no" quedó resuelta (E-1). */}
      {error && error.codigo !== 'sin_alternativa' && !(error.resultadoIncierto && p.mi_situacion.acepte_version) ? <ErrorCaja error={error} enfocar /> : null}
    </>
  )
}
