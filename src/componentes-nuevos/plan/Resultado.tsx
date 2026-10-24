// El bloque de resultado del plan (S4). Construido como el mockup validado por Nico y Juan (03:05, obligatorio):
// pantallas 5 (esperando confirmaciones), 15 (reuniendo respuestas), 16 (¡se juntan!), 17 (en revisión) y 21 (invitación
// del agente). Todo sale del servidor (estado, cupos, `siguiente_accion`, `puede.*`); la interfaz no decide nada.
// La región `role=status` con `.estado-hero-etiqueta` y `siguiente_accion.texto` se conserva para los lectores de pantalla.
import { useState } from 'react'
import { api } from '../../lib/api'
import { diaDe, fechaCorta, hora, horarioTexto } from '../../lib/format'
import { useMutacion } from '../../lib/hooks'
import type { PropuestaViva } from '../../lib/hooks'
import { rutas } from '../../lib/shell'
import { CODIGOS_SIGUIENTE } from '../../lib/types'
import type { Espacio, EstadoPropuesta, MiembroRef } from '../../lib/types'
import { vibrar } from '../../lib/tacto'
import { Avatar, Aviso, Boton, ErrorCaja } from '../../components/ui'
import { Confeti } from '../../components/Confeti'
import { Icono } from '../../components/Icono'
import type { Pestana } from '../../screens/tabs'
import { AvisoParaMi } from '../AvisoParaMi'
import { avisoParaMi } from '../avisoPersonal'
import { RearmarConLoNuevo } from '../RearmarConLoNuevo'
import { ETAPAS, accionPrimaria, cuentaConfirmados, etapaDe, etiquetaPlan, porQueNoConfirmo, textoComoSalio } from './accion'

/** "Tomi, Luna, Mati y Caro". */
function lista(nombres: string[]): string {
  return nombres.length <= 1 ? (nombres[0] ?? '') : `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`
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
  const confirmado = p.estado === 'grupo_confirmado'
  const enRevision = p.estado === 'en_revision'
  const reuniendo = p.estado === 'reuniendo_interes' || p.estado === 'borrador'
  const vigente = (p.estado === 'esperando_compromisos' || confirmado) && o
  // Enmienda 3: el código decide el acento; los booleanos solo si llega un código desconocido.
  const cod = p.siguiente_accion.codigo
  const conocido = (CODIGOS_SIGUIENTE as readonly string[]).includes(cod)
  const turno = cod === 'te_toca_aceptar' || (!conocido && s.puede.aceptar)
  const accion = activa === 'plan' ? accionPrimaria(p) : null
  const razon = porQueNoConfirmo(p)
  const etapa = etapaDe(p.estado)
  const etiqueta = o ? (o.franja.etiqueta ?? p.franjas.find((f) => f.clave === o.franja.clave)?.etiqueta ?? null) : null
  const c = o?.cupos
  const sinPrimario = !accion || accion.clave === 'calendario'

  return (
    <>
      {/* Pantalla 21: la invitación del agente, una línea punteada arriba del bloque. */}
      {s.invitacion_agente ? (
        <p className="resultado-invitacion">
          El agente de {p.organizador.nombre} te invita. {p.organizador.nombre} revisó y aprobó este plan. Lo redactó la IA; no es una confirmación.
        </p>
      ) : null}

      {/* key: el bloque "respira" una vez al cambiar de estado (`sd-respira`, sistema). */}
      <section
        key={p.estado}
        className={`resultado resultado-${p.estado} ${turno ? 'resultado-turno' : ''} sd-respira`}
        aria-labelledby="propuesta-titulo"
        data-codigo={cod}
      >
        <div className="resultado-estado" role="status" aria-live="polite" aria-atomic="true">
          <p className="resultado-rotulo">
            <strong className="estado-hero-etiqueta">{etiquetaPlan(p.estado, p.estado_etiqueta)}</strong>
            {enRevision && p.bajas.length > 0 ? <span className="resultado-rotulo-extra"> · Una persona se retiró</span> : null}
          </p>
          {/* La frase del servidor se ve cuando no hay botón (mockup: "si no me toca nada, una frase"); si hay, la lee el lector. */}
          <p className={sinPrimario && !reuniendo && !enRevision ? 'resultado-frase' : 'visualmente-oculto'}>
            <span className="visualmente-oculto">Próxima acción: </span>
            {p.siguiente_accion.texto}
          </p>
        </div>

        {confirmado && s.acepte_version ? <Confeti /> : null}

        {/* Cuándo */}
        {o && (vigente || enRevision) ? (
          <div className={`resultado-cuando ${enRevision ? 'resultado-cuando-vieja' : ''}`}>
            <span className="visualmente-oculto">{enRevision ? `Versión ${o.version} (en revisión, no confirmada)` : `Opción vigente · Versión ${o.version}`}</span>
            <p className="resultado-fecha">{diaDe(o.franja.inicio.local)}</p>
            <p className="resultado-hora">
              {confirmado ? `${hora(o.franja.inicio.local)}${etiqueta ? ` · ${etiqueta}` : ''}` : `${horarioTexto(o.franja.inicio, o.franja.fin)}${etiqueta ? ` · ${etiqueta}` : ''}`}
            </p>
            {enRevision && c && c.faltan_para_minimo > 0 ? <p className="resultado-nota">ya no llega al mínimo ({c.minimo})</p> : null}
          </div>
        ) : null}

        <h1 id="propuesta-titulo" className={`resultado-plan ${reuniendo ? 'resultado-plan-grande' : ''}`} style={{ viewTransitionName: `plan-${p.id}` }}>
          {p.titulo}
        </h1>

        {reuniendo ? (
          <p className="resultado-fechas">
            {p.franjas.map((f, i) => (
              <span key={f.clave}>
                {i > 0 ? ' · ' : ''}
                {f.etiqueta ? `${f.etiqueta}, ` : ''}
                {fechaCorta(f.inicio.local)} {hora(f.inicio.local)}
              </span>
            ))}
          </p>
        ) : null}

        <Quienes p={p} total={espacio ? espacio.miembros.length : null} />

        {etapa !== null ? (
          <ol className="pasos resultado-pasos" aria-label="Etapas del plan">
            {ETAPAS.map((t, n) => (
              <li key={t} className={`paso ${n < etapa || (confirmado && n === etapa) ? 'paso-hecho' : ''} ${n === etapa ? 'paso-actual' : ''}`} aria-current={n === etapa ? 'step' : undefined}>
                <span className="paso-barra" aria-hidden="true" />
                <span className="paso-texto">{t}</span>
              </li>
            ))}
          </ol>
        ) : null}

        <Linea p={p} />

        <AvisoUnico p={p} viva={viva} irARespuesta={() => irAPestana('respuesta')} />

        {s.acepte_version && vigente && !confirmado ? (
          <p className="resultado-hecho sd-confirmado" role="note">
            <Icono n="check" tam={16} /> Confirmado ✓
          </p>
        ) : razon && !s.acepte_version ? (
          <p className="resultado-nota" role="note">
            {razon}
          </p>
        ) : null}

        {activa === 'plan' ? (
          <Accion p={p} viva={viva} soloLectura={soloLectura} accion={accion} />
        ) : turno ? (
          <div className="barra-accion">
            <button type="button" className="btn btn-turno ir-confirmar" onClick={() => irAPestana('plan')}>
              Ir a confirmar
            </button>
          </div>
        ) : null}
      </section>
    </>
  )
}

/** Avatares y la cifra, por estado. Solo lo público: quién confirmó, cuántos (del servidor); nunca quién respondió qué. */
function Quienes({ p, total: total_ }: { p: EstadoPropuesta; total: number | null }) {
  const o = p.opcion
  const c = o?.cupos
  const yo = p.mi_situacion.miembro_id
  const fila = (personas: MiembroRef[], punteados: number, interrogacion = false) => (
    <span className="resultado-avatares" aria-hidden="true">
      {personas.map((m) => (
        <Avatar key={m.miembro_id} nombre={m.nombre} simulado={m.simulado} yo={m.miembro_id === yo} tam={32} />
      ))}
      {Array.from({ length: Math.max(0, Math.min(punteados, 8)) }, (_, i) => (
        <span key={`p${i}`} className="avatar avatar-punteado" />
      ))}
      {interrogacion ? <span className="avatar avatar-punteado avatar-interrogacion">?</span> : null}
    </span>
  )
  if (p.estado === 'esperando_compromisos' && o && c) {
    const nombres = o.aceptaron.map((a) => a.miembro)
    return (
      <div className="resultado-quienes">
        {fila(nombres, c.faltan_para_minimo)}
        <p className="resultado-cuenta">
          {c.confirmados > c.minimo ? `${c.confirmados} confirmaron (mínimo ${c.minimo})` : `${cuentaConfirmados(c.confirmados, c.minimo)} confirmaron`}
          {c.faltan_para_minimo > 0 ? ` · faltan ${c.faltan_para_minimo}` : ''}
        </p>
        {nombres.length > 0 ? <p className="visualmente-oculto">Confirmaron: {lista(nombres.map((m) => m.nombre))}.</p> : null}
      </div>
    )
  }
  if (p.estado === 'grupo_confirmado' && o) {
    const nombres = o.aceptaron.map((a) => a.miembro)
    return (
      <div className="resultado-quienes">
        {fila(nombres, 0)}
        <p className="resultado-cuenta">
          Van {nombres.length}: {lista(nombres.map((m) => (m.miembro_id === yo ? 'tú' : m.nombre)))}
        </p>
      </div>
    )
  }
  if (p.estado === 'en_revision' && o && c) {
    const siguen = o.aceptaron.map((a) => a.miembro)
    // Enmienda 14 (0050): "faltan N para el mínimo" solo si faltan; con el mínimo cumplido se deduciría quién se fue.
    return (
      <div className="resultado-quienes">
        {fila(siguen, 0, p.bajas.length > 0)}
        <p className="resultado-cuenta">
          {siguen.length} {siguen.length === 1 ? 'sigue' : 'siguen'}
          {c.faltan_para_minimo > 0 ? ` · faltan ${c.faltan_para_minimo} para el mínimo` : ''}
        </p>
      </div>
    )
  }
  if (p.estado === 'reuniendo_interes' && p.personas_con_condiciones != null) {
    // E7.2: el número solo le llega a quien organiza; los avatares son de conteo, sin nombre (nadie ve quién respondió).
    const n = p.personas_con_condiciones
    const total = Math.max(total_ ?? n, n)
    return (
      <div className="resultado-quienes">
        <span className="resultado-avatares" aria-hidden="true">
          {Array.from({ length: Math.min(n, 8) }, (_, i) => (
            <span key={i} className="avatar avatar-lleno" />
          ))}
          {Array.from({ length: Math.max(0, Math.min(total - n, 8)) }, (_, i) => (
            <span key={`f${i}`} className="avatar avatar-punteado" />
          ))}
        </span>
        <p className="resultado-cuenta">
          {n} de {total} respondieron
        </p>
      </div>
    )
  }
  return null
}

/** La línea de debajo de la tira (mockup): cómo salió, qué falta o qué pasa ahora. */
function Linea({ p }: { p: EstadoPropuesta }) {
  const s = p.mi_situacion
  const n = p.personas_con_condiciones
  if (p.estado === 'borrador') return <p className="resultado-linea">Nadie más puede responder cuándo puede hasta que la propuesta se abra.</p>
  if (p.estado === 'reuniendo_interes') {
    if (s.puede.guardar_condiciones && s.condiciones !== 'completas') return <p className="resultado-linea">Te toca decir cuándo puedes. Es privado.</p>
    if (s.puede.evaluar && p.siguiente_accion.codigo === 'buscar_opcion' && n != null) {
      return <p className="resultado-linea">Con {n} respuestas ya se puede buscar una opción. Quien no respondió no entra en esta versión.</p>
    }
    if (s.puede.evaluar) return <p className="resultado-linea">{textoComoSalio(p)}</p>
    return <p className="resultado-linea">{s.retirado ? p.siguiente_accion.texto : 'Respondiste. Te avisamos cuando haya plan.'}</p>
  }
  if (p.estado === 'en_revision') {
    return (
      <p className="resultado-linea">
        La actividad del grupo muestra quién se bajó, sin motivos. Si hay otra fecha que sirva, sale una versión nueva y todos vuelven a confirmar: nada se hereda.
        {s.puede.proponer_reparacion ? '' : ' Quien organiza busca alternativa.'}
      </p>
    )
  }
  if (p.estado === 'esperando_compromisos' && p.opcion) {
    const reparada = p.ultima_evaluacion?.resultado === 'reparacion_publicada' && p.ultima_evaluacion.version === p.opcion.version
    return (
      <>
        <p className="resultado-linea">{textoComoSalio(p)}</p>
        {/* Enmienda 15 (E-c): la ronda la decide el servidor (`abierta` no se recalcula con el reloj del teléfono). */}
        {p.ronda ? (
          <p className="resultado-nota">
            {p.ronda.abierta
              ? `Opiniones hasta ${fechaCorta(p.ronda.cierra.local)}, ${hora(p.ronda.cierra.local)}. Mientras tanto no se rearma; confirmar sigue abierto.`
              : `La ronda de opiniones cerró ${fechaCorta(p.ronda.cierra.local)}, ${hora(p.ronda.cierra.local)}.`}
          </p>
        ) : null}
        {reparada && p.opcion.aceptaron.length === 0 ? (
          <p className="resultado-linea">
            El plan cambió: versión {p.opcion.version - 1} → versión {p.opcion.version}. Nadie confirmó todavía: las confirmaciones anteriores no pasan a esta versión.
          </p>
        ) : null}
      </>
    )
  }
  return null
}

/** Un solo aviso, solo para los casos que el mockup no dibuja (te retiraste, sin ti, hoy conviene recordar, sin opción). */
function AvisoUnico({ p, viva, irARespuesta }: { p: EstadoPropuesta; viva: PropuestaViva; irARespuesta: () => void }) {
  const personal = avisoParaMi(p)
  // Lo que el bloque ya dice no se repite: "solo vale si llegan" (la nota del botón), "así no puedo" (fila de la hoja),
  // "cambió el plan" (la línea de revisión) y "se armó la juntada" (¡se juntan!).
  const yaDicho = new Set(['solo_vale_si_llegan', 'marcaste_asi_no_puedo', 'cambio_el_plan', 'gracias_por_moverlo'])
  if (personal && !yaDicho.has(personal.clave)) {
    // "Esta versión no te incluye" con la disponibilidad completa: texto cierto y sin motivo (la elegibilidad es una foto al publicar).
    if (personal.clave === 'version_sin_ti') {
      if (p.plazo_vencido) return null
      if (p.mi_situacion.condiciones === 'completas') {
        return (
          <Aviso tono="info" titulo="Esta versión no te incluye">
            Se armó sin ti. No tienes que hacer nada: si el plan se rearma, cuenta lo que marcaste.
          </Aviso>
        )
      }
    }
    return <AvisoParaMi p={p} servidorAhora={viva.servidorAhora} irARespuesta={irARespuesta} />
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

/** El único primario, con su nota (mockup). En la barra fija de abajo. */
function Accion({ p, viva, soloLectura, accion }: { p: EstadoPropuesta; viva: PropuestaViva; soloLectura: boolean; accion: ReturnType<typeof accionPrimaria> }) {
  const { ocupado, error, correr } = useMutacion(viva)
  const [confirmo, setConfirmo] = useState(false)

  async function aceptar(version: number) {
    // Siempre se envía la versión que la persona está viendo, nunca una calculada.
    const r = await correr(`aceptar:${p.id}:${version}`, (intento) => api.acceptVersion(p.id, version, intento))
    if (r?.ok) {
      vibrar([14, 50, 22])
      setConfirmo(true)
    }
  }
  const evaluar = () => correr(`evaluar:${p.id}:${p.state_rev}`, (intento) => api.evaluateAndPublish(p.id, intento))
  const reparar = () => correr(`reparar:${p.id}:${p.state_rev}`, (intento) => api.proposeRepair(p.id, intento))
  const abrir = () => correr(`abrir:${p.id}`, () => api.openProposal(p.id))
  const reintentar = Boolean(error?.reintentable)
  const sinAlternativa = p.estado === 'en_revision' && (p.ultima_evaluacion?.resultado === 'sin_alternativa' || error?.codigo === 'sin_alternativa')

  let boton = null
  let nota: string | null = null
  switch (accion?.clave) {
    case 'confirmar':
      boton = (
        <Boton variante="turno" onClick={() => void aceptar(accion.version)} ocupado={ocupado} ocupadoTexto="Enviando…" disabled={soloLectura}>
          {reintentar ? `Reintentar confirmación de la versión ${accion.version}` : accion.texto}
        </Boton>
      )
      nota = ocupado ? 'Enviando tu confirmación. Todavía no está confirmada hasta que el servidor responda.' : 'Tu confirmación vale solo para esta versión.'
      break
    case 'responder':
      boton = (
        <a className="btn btn-primario" href={rutas.responder(p.espacio_id, p.id)}>
          {accion.texto}
        </a>
      )
      break
    case 'buscar_opcion':
      boton = (
        <Boton variante={accion.secundaria ? 'secundario' : 'primario'} onClick={() => void evaluar()} ocupado={ocupado} ocupadoTexto="Buscando…" disabled={soloLectura}>
          {reintentar ? 'Reintentar búsqueda' : accion.texto}
        </Boton>
      )
      nota = 'Lo decide el servidor con lo que cada uno marcó en privado.'
      break
    case 'buscar_alternativa':
      boton = (
        <Boton onClick={() => void reparar()} ocupado={ocupado} ocupadoTexto="Buscando alternativa…" disabled={soloLectura}>
          {reintentar ? 'Reintentar búsqueda de alternativa' : sinAlternativa ? 'Volver a buscar alternativa' : accion.texto}
        </Boton>
      )
      nota = 'Si no hay alternativa: «Sin opción compatible», sin bajar el mínimo.'
      break
    case 'abrir':
      boton = (
        <Boton onClick={() => void abrir()} ocupado={ocupado} ocupadoTexto="Abriendo…" disabled={soloLectura}>
          {accion.texto}
        </Boton>
      )
      break
    case 'rearmar':
      // Enmienda 13 (b): la pieza decide con los totales del servidor y maneja sus propios estados (sin alternativa, tope).
      return (
        <div className="resultado-rearmar">
          <RearmarConLoNuevo p={p} viva={viva} soloLectura={soloLectura} compacto />
        </div>
      )
    default:
      boton = null
  }

  return (
    <>
      {sinAlternativa ? (
        <Aviso tono="aviso" titulo="Sin opción compatible">
          Con las respuestas actuales no hay alternativa. No se baja el mínimo ni se finge una reparación.
        </Aviso>
      ) : null}
      {boton ? (
        <div className={`barra-accion ${confirmo ? 'sd-confirmado' : ''}`}>
          {boton}
          {nota ? (
            <p className="resultado-nota" role={ocupado ? 'status' : undefined}>
              {nota}
            </p>
          ) : null}
        </div>
      ) : null}
      {/* Si el servidor ya muestra la confirmación hecha, la duda de "pudo haberse registrado o no" quedó resuelta (E-1). */}
      {/* Con el cupo reservado, la línea de «por qué no puedes confirmar» ya lo dice: no se repite en la caja de error. */}
      {error && error.codigo !== 'sin_alternativa' && !(error.resultadoIncierto && p.mi_situacion.acepte_version) && !(error.codigo === 'cupo_completo' && porQueNoConfirmo(p)) ? <ErrorCaja error={error} enfocar /> : null}
    </>
  )
}
