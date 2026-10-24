import { useEffect, useRef, useState } from 'react'
import { Aviso, Boton, Cargando, ErrorCaja, RotuloSimulacion } from '../components/ui'
import { momentoCorto, franjaTexto } from '../lib/format'
import { useAccion } from '../lib/hooks'
import { rutas } from '../lib/shell'
import {
  crearSolicitudSocial, falloSocial, guardarPendienteSocial, leerPendienteSocial, socialApi,
  type ClimaSocial, type PendienteSocial, type ReciboSocial,
} from './socialApi'

export interface AgenteSocialProps { espacioId: string; sabado: string; clima: ClimaSocial; soloLectura?: boolean }
type Operacion = 'capacidad' | 'preparar' | 'aprobar' | 'publicar'

/** El caller monta este flujo solo tras recibir el borrador y su snapshot climático. */
export function AgenteSocial(props: AgenteSocialProps) {
  return <FlujoSocial key={`${props.espacioId}:${props.sabado}`} {...props} />
}

function FlujoSocial({ espacioId, sabado, clima, soloLectura = false }: AgenteSocialProps) {
  const accion = useAccion()
  const [capacidad, setCapacidad] = useState<boolean | null>(null)
  const [pendiente, setPendiente] = useState<PendienteSocial | null>(null)
  const [recibo, setRecibo] = useState<ReciboSocial | null>(null)
  const [publicada, setPublicada] = useState<{ propuestaId: string; invitados: number | null } | null>(null)
  const [almacenamiento, setAlmacenamiento] = useState<'cargando' | 'listo' | 'error'>('cargando')
  const [incierto, setIncierto] = useState<Operacion | null>(null)
  const [operacion, setOperacion] = useState<Operacion>('capacidad')
  const seccion = useRef<HTMLElement>(null)
  const pendienteRef = useRef<PendienteSocial | null>(null)
  const montado = useRef(true)

  function recuperarLocal() {
    try {
      const p = leerPendienteSocial(sessionStorage, espacioId, sabado)
      pendienteRef.current = p
      setPendiente(p)
      setAlmacenamiento('listo')
    } catch { setAlmacenamiento('error') }
  }
  useEffect(() => {
    montado.current = true
    recuperarLocal()
    // Solo lectura; nunca prepara ni publica al montar o recargar.
    void socialApi.capacidad(espacioId).then((r) => { if (montado.current) setCapacidad(r.ok) })
    return () => { montado.current = false }
    // El wrapper remonta al cambiar espacio o sábado; el clima no sustituye la solicitud guardada.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [espacioId, sabado])
  useEffect(() => {
    if (publicada) seccion.current?.querySelector<HTMLAnchorElement>('[data-social-propuesta]')?.focus()
  }, [publicada?.propuestaId])

  const borrador = recibo?.borrador ?? null
  const propio = recibo?.propia === true
  const aprobado = !!borrador && recibo?.aprobacionHash === borrador.hash
  const bloqueado = soloLectura || almacenamiento !== 'listo' || capacidad !== true

  async function correr(op: Operacion) {
    if (soloLectura || (op !== 'capacidad' && bloqueado)) return
    if ((op === 'aprobar' || op === 'publicar') && (!borrador || !recibo?.ejecucionId || !propio || publicada)) return
    if (op === 'publicar' && !aprobado) return
    const huella = `${op}:${espacioId}:${sabado}:${borrador?.hash ?? ''}`
    // Registrar la operación dentro del callback: useAccion descarta dobles envíos con un ref.
    await accion.ejecutar(huella, async (intentoId) => {
      setOperacion(op)
      if (op === 'capacidad') {
        const r = await socialApi.capacidad(espacioId)
        if (montado.current) setCapacidad(r.ok)
        return r.ok ? { ok: true as const, data: null } : r
      }
      let p = pendienteRef.current
      try {
        if (!p) p = { version: 1, solicitud: crearSolicitudSocial(espacioId, sabado, clima, crypto.randomUUID()), intentos: {} }
        if (op === 'aprobar' || op === 'publicar') {
          const anterior = p.intentos[op]
          p = { ...p, intentos: { ...p.intentos, [op]: anterior?.hash === borrador!.hash ? anterior : { hash: borrador!.hash, id: intentoId } } }
        }
        // Si falla persistir, no se envía ninguna mutación. El reintento recupera exactamente este cuerpo.
        guardarPendienteSocial(sessionStorage, p)
        pendienteRef.current = p
        setPendiente(p)
      } catch {
        setAlmacenamiento('error')
        return falloSocial('almacenamiento_no_disponible', false, false)
      }
      if (op === 'preparar') {
        const r = await socialApi.preparar(p.solicitud)
        if (montado.current) {
          if (r.ok) {
            setRecibo(r.data)
            setIncierto(null)
            setPublicada(r.data.propuestaId ? { propuestaId: r.data.propuestaId, invitados: null } : null)
          } else if (r.error.resultadoIncierto) setIncierto('preparar')
        }
        return r.ok ? { ok: true as const, data: null } : r
      }
      const id = p.intentos[op]!.id
      const r = op === 'aprobar'
        ? await socialApi.aprobar(recibo!.ejecucionId!, borrador!.hash, id)
        : await socialApi.publicar(recibo!.ejecucionId!, borrador!.hash, id)
      if (montado.current) {
        if (r.ok) {
          // Comprobar una aprobación no resuelve una publicación previa incierta.
          setIncierto((anterior) => anterior === op || op === 'publicar' ? null : anterior)
          if ('hash' in r.data) {
            const hash = r.data.hash
            setRecibo((anterior) => anterior ? { ...anterior, aprobacionHash: hash } : anterior)
          }
          else setPublicada(r.data)
        } else if (r.error.resultadoIncierto) setIncierto(op)
        else if (op === 'publicar') setRecibo((anterior) => anterior ? { ...anterior, aprobacionHash: null } : anterior)
      }
      return r.ok ? { ok: true as const, data: null } : r
    })
  }
  function reintentar() {
    seccion.current?.querySelector<HTMLButtonElement>(`[data-social-operacion="${operacion}"]`)?.focus()
    void correr(operacion)
  }
  const ocupado = (op: Operacion) => accion.ocupado && operacion === op
  const ocupadoOtro = (op: Operacion) => accion.ocupado && operacion !== op
  const etiquetaClima = (c: ClimaSocial['sabado']) => c === 'seco' ? 'sin lluvia' : c === 'lluvia' ? 'lluvia' : 'sin dato'
  const snapshot = pendiente?.solicitud.social

  return (
    <section ref={seccion} className="tarjeta agente-panel" aria-label="Preparar y publicar con aprobación humana">
      <h3>Del borrador a una propuesta</h3>
      <p className="suave">Primero revisas el plan, después lo apruebas y, en otro paso, publicas las invitaciones. Nadie queda confirmado.</p>
      {capacidad === null ? <Cargando texto="Comprobando si el flujo social está disponible…" /> : null}
      {capacidad === false ? <Aviso tono="aviso" titulo="Flujo social no disponible">No pudimos confirmar que el servidor admita este recorrido. No se enviará una preparación.</Aviso> : null}
      <Boton variante="secundario" data-social-operacion="capacidad" ocupado={ocupado('capacidad')} ocupadoTexto="Comprobando…"
        disabled={soloLectura || capacidad === null || ocupadoOtro('capacidad')} onClick={() => void correr('capacidad')}>Comprobar servicio</Boton>
      {almacenamiento === 'error' ? <Aviso tono="error" titulo="No podemos conservar la solicitud" accion={<Boton variante="secundario" onClick={recuperarLocal}>Comprobar almacenamiento</Boton>}>No se enviaron acciones nuevas. Para recuperar una solicitud previa necesitamos el almacenamiento de esta pestaña.</Aviso> : null}
      {soloLectura ? <Aviso>Vista de solo lectura. No puedes preparar, aprobar ni publicar desde aquí.</Aviso> : null}
      {snapshot ? <p className="suave">Solicitud guardada para {snapshot.sabado}. Clima del borrador: sábado {etiquetaClima(snapshot.clima.sabado)}, domingo {etiquetaClima(snapshot.clima.domingo)}. Comprobar conserva estos datos.</p> : null}
      {incierto ? <Aviso tono="aviso" titulo="Resultado pendiente de comprobar">La acción pudo haberse registrado. Conservamos la solicitud y sus identificadores; comprueba el recibo o reintenta la misma acción.</Aviso> : null}
      <div className="fila-botones">
        <Boton data-social-operacion="preparar" variante={recibo ? 'secundario' : 'primario'} ocupado={ocupado('preparar')}
          ocupadoTexto={pendiente ? 'Comprobando recibo…' : 'Preparando…'} disabled={bloqueado || ocupadoOtro('preparar')}
          onClick={() => void correr('preparar')}>{pendiente ? 'Comprobar recibo' : 'Preparar borrador social'}</Boton>
      </div>
      {recibo?.estado === 'sin_plan' ? <Aviso titulo="No hay un plan disponible">No se publicó una propuesta. Revisa las preferencias y permisos con el grupo; nadie quedó confirmado.</Aviso> : null}
      {borrador ? <div className="bloque">
        <h4>{borrador.plan.titulo}</h4>
        <p>{borrador.plan.lugar.nombre} {borrador.plan.lugar.simulado ? <RotuloSimulacion /> : null}</p>
        <p className="suave">Horarios propuestos · America/Santiago</p>
        <ul>{borrador.plan.franjas.map((f, i) => <li key={i}>{franjaTexto(f.inicio, f.fin)}</li>)}</ul>
        <p>Cupos: mínimo {borrador.plan.minimo}, máximo {borrador.plan.maximo}. Imprescindible: {borrador.plan.imprescindible.nombre}.</p>
        <p>Confirmar hasta: {momentoCorto(borrador.plan.plazo)} · America/Santiago.</p>
        <p>{borrador.plan.invitados} invitaciones previstas. Cada persona debe indicar su disponibilidad y aceptar la versión vigente.</p>
        <p className="suave">Elección: {recibo?.eleccionFuente === 'modelo' ? 'modelo' : recibo?.eleccionFuente === 'regla' ? 'regla' : 'fuente no informada'}.
          {' '}{recibo?.explicacionFuente === 'modelo' ? 'Texto del modelo.' : recibo?.explicacionFuente === 'texto_fijo' ? 'Texto fijo.' : 'Texto guardado; fuente no informada.'}</p>
        {recibo?.texto ? <blockquote>{recibo.texto}</blockquote> : null}
        {!propio ? <Aviso>El servidor devolvió una ejecución ya existente de otra solicitud. Aquí puedes consultar su recibo, sin aprobarla ni publicarla.</Aviso> : null}
        {!publicada ? <>
          <Aviso tono={aprobado ? 'ok' : 'info'} titulo={aprobado ? 'Aprobación registrada' : 'Pendiente de aprobación'}>{aprobado ? 'Este borrador tiene aprobación del servidor. Publicarlo requiere el siguiente botón y no confirma asistencia.' : 'Aprobar autoriza este borrador exacto; todavía no envía invitaciones ni confirma asistencia.'}</Aviso>
          <div className="fila-botones">
            <Boton variante="secundario" data-social-operacion="aprobar" ocupado={ocupado('aprobar')} ocupadoTexto="Registrando aprobación…"
              disabled={bloqueado || !propio || ocupadoOtro('aprobar')} onClick={() => void correr('aprobar')}>{aprobado ? 'Comprobar aprobación' : 'Aprobar este borrador'}</Boton>
            <Boton data-social-operacion="publicar" ocupado={ocupado('publicar')} ocupadoTexto="Publicando invitaciones…"
              disabled={bloqueado || !propio || !aprobado || ocupadoOtro('publicar')} onClick={() => void correr('publicar')}>Publicar invitaciones</Boton>
          </div>
        </> : null}
      </div> : null}
      {publicada ? <Aviso tono="ok" titulo="Propuesta publicada" accion={<a data-social-propuesta className="btn btn-primario" href={rutas.propuesta(espacioId, publicada.propuestaId)}>Ver propuesta y responder</a>}>
        {publicada.invitados === null ? 'El servidor confirmó la publicación.' : `${publicada.invitados} invitaciones registradas.`} Publicar no suma personas confirmadas. La propuesta muestra la versión, los cupos y las acciones para responder o darse de baja.
      </Aviso> : null}
      {accion.error ? <ErrorCaja error={accion.error} onReintentar={accion.ocupado || soloLectura ? undefined : reintentar} enfocar /> : null}
    </section>
  )
}

export default AgenteSocial
