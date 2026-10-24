import { useEffect, useRef, useState } from 'react'
import { Aviso, Boton, Cargando, ErrorCaja, RotuloSimulacion } from '../components/ui'
import { momentoCorto, franjaTexto } from '../lib/format'
import { useAccion } from '../lib/hooks'
import type { ApiError } from '../lib/types'
import {
  claveSocial, crearSolicitudSocial, falloSocial, guardarPendienteSocial, leerPendienteSocial, socialApi,
  type ClimaSocial, type PendienteSocial, type ReciboSocial,
} from './socialApi'
import '../estilo/seccion-s6.css'

export interface AgenteSocialProps { espacioId: string; sabado: string; clima: ClimaSocial; soloLectura?: boolean; onCerrar: () => void }

/**
 * Pantalla 20 del mockup: "Revisar antes de invitar", una hoja con X. El agente prepara el borrador (sin publicar); la
 * persona lo revisa y "Aprobar e invitar" hace los dos pasos reales del circuito, aprobar y publicar, con un toque.
 * Por debajo no cambia nada: la solicitud y los identificadores de cada intento se guardan antes de mandar, así un
 * reintento repite exactamente lo mismo y el servidor no duplica la aprobación ni la propuesta. Al reabrir, preparar
 * con la misma solicitud recupera el recibo sin llamar al modelo.
 */
export function AgenteSocial(props: AgenteSocialProps) {
  return <HojaSocial key={`${props.espacioId}:${props.sabado}`} {...props} />
}

/** Un rechazo que dice que el borrador ya no es el que se revisó (cambiaron los destinatarios, el plan o el hash). */
function borradorCambiado(e: ApiError | null): boolean {
  return !!e && /opcion_desactualizada|borrador_cambiado|borrador_discordante/.test(`${e.codigo} ${e.detalle ?? ''}`)
}

function HojaSocial({ espacioId, sabado, clima, soloLectura = false, onCerrar }: AgenteSocialProps) {
  const accion = useAccion()
  const dialogo = useRef<HTMLDialogElement>(null)
  const pendienteRef = useRef<PendienteSocial | null>(null)
  const montado = useRef(true)
  const [recibo, setRecibo] = useState<ReciboSocial | null>(null)
  const [publicada, setPublicada] = useState<{ propuestaId: string; invitados: number | null } | null>(null)
  const [almacenamiento, setAlmacenamiento] = useState<'listo' | 'error'>('listo')
  const [incierto, setIncierto] = useState(false)
  const [cambio, setCambio] = useState(false)
  const [preparando, setPreparando] = useState(true)

  useEffect(() => {
    const d = dialogo.current
    if (d && !d.open) d.showModal()
    montado.current = true
    void preparar(false)
    return () => { montado.current = false }
    // Se prepara una vez al abrir; el wrapper remonta al cambiar de espacio o sábado.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** Prepara (o recupera) el borrador. `nuevo` descarta la solicitud guardada: el agente vuelve a armarlo. */
  async function preparar(nuevo: boolean) {
    setPreparando(true)
    setCambio(false)
    let p: PendienteSocial | null = null
    try {
      if (nuevo) sessionStorage.removeItem(claveSocial(espacioId, sabado))
      p = leerPendienteSocial(sessionStorage, espacioId, sabado)
      if (!p) p = { version: 1, solicitud: crearSolicitudSocial(espacioId, sabado, clima, crypto.randomUUID()), intentos: {} }
      // Si no se puede guardar la solicitud, no se manda nada: un reintento no podría repetirla.
      guardarPendienteSocial(sessionStorage, p)
      pendienteRef.current = p
      setAlmacenamiento('listo')
    } catch {
      setAlmacenamiento('error')
      setPreparando(false)
      return
    }
    const solicitud = p.solicitud
    await accion.ejecutar(`preparar:${espacioId}:${sabado}:${solicitud.social.ejecucion_id}`, async () => {
      const cap = await socialApi.capacidad(espacioId)
      if (!cap.ok) return cap
      const r = await socialApi.preparar(solicitud)
      if (montado.current) {
        if (r.ok) {
          setRecibo(r.data)
          setIncierto(false)
          setPublicada(r.data.propuestaId ? { propuestaId: r.data.propuestaId, invitados: null } : null)
        } else if (r.error.resultadoIncierto) setIncierto(true)
      }
      return r.ok ? { ok: true as const, data: null } : r
    })
    if (montado.current) setPreparando(false)
  }

  const borrador = recibo?.borrador ?? null
  const propio = recibo?.propia === true
  const puedeInvitar = !soloLectura && almacenamiento === 'listo' && !!borrador && !!recibo?.ejecucionId && propio && !publicada

  /** "Aprobar e invitar": aprobar y publicar, en ese orden, con los identificadores guardados antes de mandar. */
  async function aprobarEInvitar() {
    if (!puedeInvitar || !borrador || !recibo?.ejecucionId) return
    const ejecucionId = recibo.ejecucionId
    const hash = borrador.hash
    setCambio(false)
    const r = await accion.ejecutar(`invitar:${espacioId}:${sabado}:${hash}`, async () => {
      let p = pendienteRef.current
      if (!p) return falloSocial('almacenamiento_no_disponible', false, false)
      try {
        const de = (op: 'aprobar' | 'publicar') => (p!.intentos[op]?.hash === hash ? p!.intentos[op]! : { hash, id: crypto.randomUUID() })
        p = { ...p, intentos: { aprobar: de('aprobar'), publicar: de('publicar') } }
        guardarPendienteSocial(sessionStorage, p)
        pendienteRef.current = p
      } catch {
        if (montado.current) setAlmacenamiento('error')
        return falloSocial('almacenamiento_no_disponible', false, false)
      }
      if (recibo.aprobacionHash !== hash) {
        const a = await socialApi.aprobar(ejecucionId, hash, p.intentos.aprobar!.id)
        if (!a.ok) {
          if (montado.current) setIncierto(!!a.error.resultadoIncierto)
          return a
        }
        if (montado.current) setRecibo((x) => (x ? { ...x, aprobacionHash: hash } : x))
      }
      const pub = await socialApi.publicar(ejecucionId, hash, p.intentos.publicar!.id)
      if (montado.current) {
        if (pub.ok) {
          setIncierto(false)
          setPublicada(pub.data)
        } else setIncierto(!!pub.error.resultadoIncierto)
      }
      return pub.ok ? { ok: true as const, data: null } : pub
    })
    // Si algo cambió en el medio (por ejemplo, alguien dejó de aceptar invitaciones), se avisa y se vuelve a revisar.
    if (r && !r.ok && borradorCambiado(r.error) && montado.current) setCambio(true)
  }

  function descartar() {
    // Descartar no borra nada en el servidor: el borrador nunca se publicó y queda sin aprobar.
    try { sessionStorage.removeItem(claveSocial(espacioId, sabado)) } catch { /* sin almacenamiento no hay nada que olvidar */ }
    cerrar()
  }

  function cerrar() {
    dialogo.current?.close()
    onCerrar()
  }

  const plan = borrador?.plan
  const etiquetaClima = (c: ClimaSocial['sabado']) => (c === 'seco' ? 'sin lluvia' : c === 'lluvia' ? 'lluvia' : 'sin dato')
  const errorVisible = accion.error && !cambio ? accion.error : null

  return (
    <dialog ref={dialogo} className="agente-hoja" aria-labelledby="agente-hoja-titulo" onCancel={(e) => { e.preventDefault(); cerrar() }}>
      <section className="agente-hoja-cuerpo" aria-label="Preparar y publicar con aprobación humana">
        <div className="agente-hoja-cabeza">
          <div>
            <h2 id="agente-hoja-titulo">Revisar antes de invitar</h2>
            <p className="suave">Paso 1 de 2 · el agente propone, tú decides</p>
          </div>
          <button type="button" className="agente-hoja-cerrar" aria-label="Cerrar" onClick={cerrar}>
            ×
          </button>
        </div>

        {preparando && accion.ocupado ? <Cargando texto="El agente está preparando el borrador…" /> : null}
        {almacenamiento === 'error' ? (
          <Aviso tono="error" titulo="No podemos conservar la solicitud">
            No se envió nada. Para invitar hace falta el almacenamiento de esta pestaña.
          </Aviso>
        ) : null}
        {soloLectura ? <Aviso>Vista de solo lectura. No puedes aprobar ni invitar desde aquí.</Aviso> : null}
        {recibo?.estado === 'sin_plan' ? (
          <Aviso titulo="No hay un plan disponible">No se invitó a nadie. Revisa las preferencias y permisos con el grupo.</Aviso>
        ) : null}

        {plan ? (
          <div className="agente-borrador">
            <p className="agente-sobretitulo">Borrador del agente</p>
            <p className="t-titulo agente-recomendada-nombre">
              {plan.titulo}
              {plan.lugar.simulado ? <> <RotuloSimulacion /></> : null}
            </p>
            <p className="suave">{plan.lugar.nombre.replace(' (Simulación)', '')}</p>
            <dl className="agente-filas">
              <div>
                <dt>Cuándo</dt>
                <dd>
                  {plan.franjas.map((f, i) => (
                    <span key={i} className="agente-fila-linea">
                      {franjaTexto(f.inicio, f.fin)}
                    </span>
                  ))}
                </dd>
              </div>
              <div>
                <dt>Cupos</dt>
                <dd>
                  {plan.minimo} a {plan.maximo}
                </dd>
              </div>
              <div>
                <dt>No puede faltar</dt>
                <dd>{plan.imprescindible.nombre}</dd>
              </div>
              <div>
                <dt>Cierre</dt>
                <dd>{momentoCorto(plan.plazo)}</dd>
              </div>
              <div>
                <dt>Invita a</dt>
                <dd>{plan.invitados === 1 ? '1 que acepta invitaciones' : `${plan.invitados} que aceptan invitaciones`}</dd>
              </div>
            </dl>
            {recibo?.texto ? <blockquote className="agente-cita">“{recibo.texto}”</blockquote> : null}
            <p className="suave">
              {recibo?.explicacionFuente === 'modelo' ? 'Lo redactó la IA.' : 'Texto fijo, armado con reglas.'} Clima del borrador: sábado{' '}
              {etiquetaClima(clima.sabado)}, domingo {etiquetaClima(clima.domingo)}.
            </p>
          </div>
        ) : null}

        {plan && !publicada ? <p>Esto es exactamente lo que se va a invitar. Nadie queda confirmado.</p> : null}
        {recibo && !propio && borrador ? <Aviso>Este borrador es de otra solicitud. Puedes verlo, pero no aprobarlo ni invitar.</Aviso> : null}
        {cambio ? (
          <Aviso tono="aviso" titulo="Algo cambió desde que lo revisaste" accion={<Boton variante="secundario" onClick={() => void preparar(true)}>Volver a revisar</Boton>}>
            No se invitó a nadie con el borrador anterior. El agente arma uno nuevo para que lo revises.
          </Aviso>
        ) : null}
        {incierto ? (
          <Aviso tono="aviso" titulo="Falta confirmar el resultado">
            Pudo haberse registrado. Toca «Aprobar e invitar» otra vez: repite exactamente lo mismo y no duplica nada.
          </Aviso>
        ) : null}

        {publicada ? (
          <Aviso tono="ok" titulo={publicada.invitados === null ? 'Invitaciones enviadas' : `Invitaciones enviadas a ${publicada.invitados}`}>
            Nadie queda confirmado: cada persona responde en el plan.
          </Aviso>
        ) : null}

        {errorVisible ? <ErrorCaja error={errorVisible} onReintentar={accion.ocupado || soloLectura ? undefined : () => void (plan ? aprobarEInvitar() : preparar(false))} enfocar /> : null}

        {!publicada ? (
          <div className="agente-hoja-acciones">
            <Boton data-social-operacion="invitar" onClick={() => void aprobarEInvitar()} ocupado={accion.ocupado && !preparando} ocupadoTexto="Invitando…" disabled={!puedeInvitar || cambio || (accion.ocupado && preparando)}>
              Aprobar e invitar
            </Boton>
            <Boton variante="secundario" onClick={descartar} disabled={accion.ocupado}>
              Descartar el borrador
            </Boton>
          </div>
        ) : (
          <div className="agente-hoja-acciones">
            <Boton variante="secundario" onClick={cerrar}>
              Cerrar
            </Boton>
          </div>
        )}
      </section>
    </dialog>
  )
}

export default AgenteSocial
