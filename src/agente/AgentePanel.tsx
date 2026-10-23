// Pantalla del agente del círculo (docs/agente-ia.md). Dos partes:
// 1) "Mis preferencias": cada miembro real carga las suyas, en privado (opciones cerradas).
// 2) "Que el agente proponga": solo el organizador. Muestra el borrador que eligió el servidor y,
//    si quiere, lo lleva a la pantalla de nueva propuesta. El agente nunca crea ni confirma nada.
// Para engancharla: <AgentePanel espacioId={...} esOrganizador={...} soloLectura={...} />.
import { useCallback, useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useAccion } from '../lib/hooks'
import { franjaTexto } from '../lib/format'
import { irA, rutas } from '../lib/shell'
import type { ApiError } from '../lib/types'
import { Aviso, Boton, Cargando, ErrorCaja, RotuloSimulacion } from '../components/ui'
import './agente.css'
import {
  agenteApi,
  guardarBorradorAgente,
  mensajeFijo,
  textoFijo,
  type ActividadOpcion,
  type Ambiente,
  type BorradorAgente,
  type CandidataAgente,
  type ClimaSimulado,
  type Energia,
  type LugarPref,
  type Preferencias,
  type Presupuesto,
  type ResultadoAgente,
} from './api'

// Fin de semana del caso canónico: franjas A y B del sábado 31 oct y domingo 1 nov 2026.
const SABADO_DEL_CASO = '2026-10-31'

const PRESUPUESTO: { v: Presupuesto; texto: string }[] = [
  { v: 'da_igual', texto: 'Da igual' },
  { v: 'algo_barato', texto: 'Algo barato' },
  { v: 'ojala_gratis', texto: 'Ojalá gratis' },
]
const ENERGIA: { v: Energia; texto: string }[] = [
  { v: 'con_todo', texto: 'Con todo' },
  { v: 'algo_tranquilo', texto: 'Algo tranquilo' },
]
const AMBIENTE: { v: Ambiente; texto: string }[] = [
  { v: 'fiesta', texto: 'Fiesta' },
  { v: 'tranquilo', texto: 'Tranquilo' },
  { v: 'da_igual', texto: 'Da igual' },
]
const LUGAR: { v: LugarPref; texto: string }[] = [
  { v: 'da_igual', texto: 'Da igual' },
  { v: 'bajo_techo', texto: 'Prefiero bajo techo' },
]

const VACIAS: Preferencias = {
  presupuesto: 'da_igual',
  energia: 'algo_tranquilo',
  ambiente: 'da_igual',
  lugar: 'da_igual',
  me_gustaria: [],
}

function Opciones<T extends string>({
  nombre,
  titulo,
  opciones,
  valor,
  onCambio,
  deshabilitado,
}: {
  nombre: string
  titulo: string
  opciones: { v: T; texto: string }[]
  valor: T
  onCambio: (v: T) => void
  deshabilitado?: boolean
}) {
  return (
    <fieldset className="grupo" disabled={deshabilitado}>
      <legend>{titulo}</legend>
      <div className="opciones">
        {opciones.map((o) => {
          const id = `${nombre}-${o.v}`
          return (
            <label key={o.v} htmlFor={id} className={`opcion-radio ${valor === o.v ? 'opcion-activa' : ''}`}>
              <input id={id} type="radio" name={nombre} checked={valor === o.v} onChange={() => onCambio(o.v)} />
              {o.texto}
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}

function MisPreferencias({ espacioId, soloLectura }: { espacioId: string; soloLectura?: boolean }) {
  const [cargando, setCargando] = useState(true)
  const [errorCarga, setErrorCarga] = useState<ApiError | null>(null)
  const [actividades, setActividades] = useState<ActividadOpcion[]>([])
  const [borrador, setBorrador] = useState<Preferencias>(VACIAS)
  const [guardadas, setGuardadas] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)
  const { ocupado, error, ejecutar } = useAccion()

  const cargar = useCallback(async () => {
    setCargando(true)
    const r = await agenteApi.getMyPreferences(espacioId)
    if (r.ok) {
      setActividades(r.data.opciones.actividades)
      if (r.data.preferencias) setBorrador(r.data.preferencias)
      setGuardadas(Boolean(r.data.preferencias))
      setErrorCarga(null)
    } else setErrorCarga(r.error)
    setCargando(false)
  }, [espacioId])

  useEffect(() => {
    void cargar()
  }, [cargar])

  if (cargando) return <Cargando texto="Cargando tus preferencias…" />
  if (errorCarga) return <ErrorCaja error={errorCarga} onReintentar={() => void cargar()} />

  const poner = <K extends keyof Preferencias>(k: K, v: Preferencias[K]) => {
    setBorrador((b) => ({ ...b, [k]: v }))
    setAviso(null)
  }
  const alternar = (clave: string) =>
    poner(
      'me_gustaria',
      borrador.me_gustaria.includes(clave) ? borrador.me_gustaria.filter((c) => c !== clave) : [...borrador.me_gustaria, clave],
    )
  const sinActividades = borrador.me_gustaria.length === 0

  async function guardar() {
    const r = await ejecutar(`preferencias:${espacioId}`, () => agenteApi.saveMyPreferences(espacioId, borrador))
    if (r?.ok) {
      setGuardadas(true)
      setAviso('Guardado. Nadie más ve tus preferencias.')
    }
  }

  return (
    <div className="bloque">
      <p className="suave">
        Solo las ves tú. El agente las usa para elegir el plan, pero al grupo le llega solo la propuesta, nunca lo que pusiste.
      </p>
      <Opciones nombre="pref-presupuesto" titulo="Presupuesto este finde" opciones={PRESUPUESTO} valor={borrador.presupuesto} onCambio={(v) => poner('presupuesto', v)} deshabilitado={soloLectura || ocupado} />
      <Opciones nombre="pref-energia" titulo="Energía" opciones={ENERGIA} valor={borrador.energia} onCambio={(v) => poner('energia', v)} deshabilitado={soloLectura || ocupado} />
      <Opciones nombre="pref-ambiente" titulo="Ambiente" opciones={AMBIENTE} valor={borrador.ambiente} onCambio={(v) => poner('ambiente', v)} deshabilitado={soloLectura || ocupado} />
      <Opciones nombre="pref-lugar" titulo="Lugar" opciones={LUGAR} valor={borrador.lugar} onCambio={(v) => poner('lugar', v)} deshabilitado={soloLectura || ocupado} />
      <fieldset className={`grupo ${sinActividades ? 'grupo-error' : ''}`} disabled={soloLectura || ocupado}>
        <legend>Me gustaría</legend>
        <div className="opciones">
          {actividades.map((a) => {
            const id = `pref-gusta-${a.clave}`
            const activa = borrador.me_gustaria.includes(a.clave)
            return (
              <label key={a.clave} htmlFor={id} className={`opcion-radio ${activa ? 'opcion-activa' : ''}`}>
                <input id={id} type="checkbox" checked={activa} onChange={() => alternar(a.clave)} />
                {a.etiqueta}
              </label>
            )
          })}
        </div>
        {sinActividades ? <small>Marcá al menos una.</small> : null}
      </fieldset>
      {error ? <ErrorCaja error={error} onReintentar={() => void guardar()} /> : null}
      {aviso ? <Aviso tono="ok">{aviso}</Aviso> : null}
      <Boton onClick={() => void guardar()} ocupado={ocupado} ocupadoTexto="Guardando…" disabled={soloLectura || sinActividades}>
        {guardadas ? 'Actualizar mis preferencias' : 'Guardar mis preferencias'}
      </Boton>
    </div>
  )
}

function CopiarMensaje({ texto }: { texto: string }) {
  const [estado, setEstado] = useState<'si' | 'no' | null>(null)
  useEffect(() => {
    if (estado !== 'si') return
    const t = setTimeout(() => setEstado(null), 2000)
    return () => clearTimeout(t)
  }, [estado])
  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto)
      setEstado('si')
    } catch {
      setEstado('no')
    }
  }
  return (
    <>
      <button type="button" className="btn btn-secundario btn-chico" onClick={() => void copiar()}>
        {estado === 'si' ? 'Copiado' : 'Copiar mensaje'}
      </button>
      {estado === 'no' ? <small> No se pudo copiar: seleccioná el texto.</small> : null}
    </>
  )
}

/**
 * Enlace wa.me con el mensaje del agente y el enlace de invitación (mejora #25). No es una integración:
 * abre WhatsApp con el texto escrito y la persona decide si lo manda. El texto solo trae el plan, nada privado.
 */
function enlaceWhatsApp(mensaje: string, invitacion: string | null): string {
  const texto = invitacion ? `${mensaje} ${invitacion}` : mensaje
  return `https://wa.me/?text=${encodeURIComponent(texto)}`
}

function etiquetaOpcion(c: CandidataAgente): string {
  return `${c.actividad_etiqueta} · ${c.lugar.nombre.replace(' (Simulación)', '')}`
}

function BorradorTarjeta({
  espacioId,
  b,
  soloLectura,
  invitacion,
}: {
  espacioId: string
  b: BorradorAgente
  soloLectura?: boolean
  invitacion: string | null
}) {
  const [seleccion, setSeleccion] = useState(b.elegida_id)
  const elegida = b.candidatas.find((c) => c.id === seleccion) ?? b.candidatas[0]
  const esLaDestacada = elegida.id === b.elegida_id
  const [titulo, setTitulo] = useState(elegida.titulo)
  useEffect(() => setTitulo(elegida.titulo), [elegida.titulo])
  const tituloValido = titulo.trim().length >= 1 && titulo.trim().length <= 80
  // La explicación y el mensaje del modelo son de la opción que destacó; para otra, el texto fijo.
  const explicacion = esLaDestacada ? b.explicacion : textoFijo(elegida.frases_grupo, false, b.clima.fuente === 'simulacion')
  const mensaje = esLaDestacada ? b.mensaje_al_grupo : mensajeFijo(elegida)
  const deModelo = esLaDestacada && b.explicacion_fuente === 'modelo'

  function usar() {
    guardarBorradorAgente(espacioId, { titulo: titulo.trim(), franjas: elegida.franjas })
    irA(rutas.nueva(espacioId))
  }

  return (
    <div className="bloque">
      <Aviso tono="info" titulo="Opciones del agente">
        Todas le sirven al grupo según lo que cargó cada uno. Elegís vos: todavía nadie está invitado ni confirmado.
      </Aviso>
      <fieldset className="grupo agente-candidatas">
        <legend>
          {b.candidatas.length > 1 ? `${b.candidatas.length} opciones` : 'Opción'} para {b.personas_consideradas} personas
        </legend>
        <div className="opciones">
          {b.candidatas.map((c) => {
            const id = `agente-opcion-${c.id}`
            return (
              <label key={c.id} htmlFor={id} className={`opcion-radio ${seleccion === c.id ? 'opcion-activa' : ''}`}>
                <input id={id} type="radio" name="agente-opcion" checked={seleccion === c.id} onChange={() => setSeleccion(c.id)} />
                {etiquetaOpcion(c)}
                {c.lugar.simulado ? <> <RotuloSimulacion /></> : null}
                {c.id === b.elegida_id ? (
                  <span className="etiqueta etiqueta-destacada">
                    {b.eleccion_fuente === 'modelo' ? 'Recomendada por el agente' : 'Recomendada'}
                  </span>
                ) : null}
              </label>
            )
          })}
        </div>
      </fieldset>
      <label className={`campo ${tituloValido ? '' : 'campo-error'}`}>
        <span>Título</span>
        <input value={titulo} maxLength={80} onChange={(e) => setTitulo(e.target.value)} disabled={soloLectura} />
      </label>
      <p>
        <strong>{elegida.actividad_etiqueta}</strong> en {elegida.lugar.nombre.replace(' (Simulación)', '')}{' '}
        {elegida.lugar.simulado ? <RotuloSimulacion /> : null}
      </p>
      <ul>
        {elegida.franjas.map((f, i) => (
          <li key={i}>
            Franja {i === 0 ? 'A' : 'B'}: {franjaTexto(f.inicio, f.fin)}
          </li>
        ))}
      </ul>
      {b.clima.fuente === 'simulacion' ? (
        <p className="suave">
          Clima de prueba <RotuloSimulacion />: {b.clima.resumen.replace('Simulación: ', '')} No es un pronóstico real.
        </p>
      ) : (
        <p className="suave">
          Clima: {b.clima.resumen}
          {b.clima.fuente === 'open-meteo' ? ' (pronóstico de Open-Meteo)' : ''}
        </p>
      )}
      <p>
        <strong>Por qué: </strong>
        {explicacion}
      </p>
      <div className="bloque">
        <p>
          <strong>Mensaje para el grupo: </strong>
          {mensaje}
        </p>
        <div className="fila-botones agente-compartir">
          <CopiarMensaje key={mensaje} texto={mensaje} />
          {soloLectura ? null : (
            <a className="btn btn-primario btn-chico" href={enlaceWhatsApp(mensaje, invitacion)} target="_blank" rel="noopener noreferrer">
              Compartir por WhatsApp
            </a>
          )}
        </div>
        <small>WhatsApp sirve para avisar; las respuestas y la confirmación se hacen en CRUXE.</small>
      </div>
      <p className="suave">
        {deModelo
          ? 'Lo redactó la IA, que solo vio las opciones válidas, el clima y totales del grupo: nunca lo que puso cada uno.'
          : 'Texto fijo. Las opciones las armó el servidor con reglas fijas a partir de las preferencias de todos.'}
      </p>
      <p className="suave">El mínimo, el máximo, la persona imprescindible y el cierre los completás vos en el paso siguiente.</p>
      <Boton onClick={usar} disabled={soloLectura || !tituloValido}>
        Usar esta opción
      </Boton>
    </div>
  )
}

type ClimaElegido = 'real' | ClimaSimulado

const CLIMA_DEMO: { v: ClimaElegido; texto: string }[] = [
  { v: 'real', texto: 'Clima real' },
  { v: 'seco', texto: 'Simular sol' },
  { v: 'lluvia', texto: 'Simular lluvia' },
]

function ProponerPlan({
  espacioId,
  soloLectura,
  demo,
  invitacion,
}: {
  espacioId: string
  soloLectura?: boolean
  demo?: boolean
  invitacion: string | null
}) {
  const [sabado, setSabado] = useState(SABADO_DEL_CASO)
  const [clima, setClima] = useState<ClimaElegido>('real')
  const [resultado, setResultado] = useState<ResultadoAgente | null>(null)
  const { ocupado, error, ejecutar, limpiarError } = useAccion()

  function cambiarSabado(v: string) {
    // Un resultado de otro fin de semana no se puede usar: se limpia.
    setSabado(v)
    setResultado(null)
    limpiarError()
  }

  function cambiarClima(v: ClimaElegido) {
    setClima(v)
    setResultado(null)
    limpiarError()
  }

  const climaPedido = demo && clima !== 'real' ? clima : undefined

  const anuncio =
    resultado?.tipo === 'borrador'
      ? `El agente encontró ${resultado.candidatas.length === 1 ? 'una opción' : `${resultado.candidatas.length} opciones`}. Recomendada: ${resultado.titulo}.`
      : resultado?.tipo === 'sin_plan_compatible'
        ? 'Sin plan compatible.'
        : ''

  async function proponer() {
    setResultado(null)
    const r = await ejecutar(`agente:${espacioId}:${sabado}:${climaPedido ?? 'real'}`, () =>
      agenteApi.proponer(espacioId, sabado, climaPedido),
    )
    if (r?.ok) setResultado(r.data)
  }

  return (
    <div className="bloque">
      <label className="campo">
        <span>Fin de semana (sábado)</span>
        <input type="date" value={sabado} onChange={(e) => cambiarSabado(e.target.value)} disabled={soloLectura || ocupado} />
        <small>El agente propone dos franjas: ese sábado y el domingo siguiente.</small>
      </label>
      {demo ? (
        <fieldset className="grupo" disabled={soloLectura || ocupado}>
          <legend>
            Clima para la demo <RotuloSimulacion />
          </legend>
          <div className="opciones">
            {CLIMA_DEMO.map((o) => {
              const id = `agente-clima-${o.v}`
              return (
                <label key={o.v} htmlFor={id} className={`opcion-radio ${clima === o.v ? 'opcion-activa' : ''}`}>
                  <input id={id} type="radio" name="agente-clima" checked={clima === o.v} onChange={() => cambiarClima(o.v)} />
                  {o.texto}
                </label>
              )
            })}
          </div>
          <small>Solo en el espacio de demostración. Con sol o lluvia simulados, el pronóstico no es real.</small>
        </fieldset>
      ) : null}
      <Boton onClick={() => void proponer()} ocupado={ocupado} ocupadoTexto="El agente está pensando…" disabled={soloLectura || !sabado}>
        Que el agente proponga
      </Boton>
      {error ? <ErrorCaja error={error} onReintentar={() => void proponer()} /> : null}
      <p className="suave" aria-live="polite">
        {anuncio}
      </p>
      {resultado?.tipo === 'sin_plan_compatible' ? (
        <Aviso tono="aviso" titulo="Sin plan compatible">
          Con las preferencias cargadas no hay un plan del catálogo que le sirva a todos. Por privacidad no se muestran los motivos.
        </Aviso>
      ) : null}
      {resultado?.tipo === 'borrador' ? <BorradorTarjeta espacioId={espacioId} b={resultado} soloLectura={soloLectura} invitacion={invitacion} /> : null}
    </div>
  )
}

export function AgentePanel({
  espacioId,
  esOrganizador,
  soloLectura,
  demo,
}: {
  espacioId: string
  esOrganizador: boolean
  soloLectura?: boolean
  /** Espacio de demostración: muestra el selector de clima de simulación (la función igual lo comprueba). */
  demo?: boolean
}) {
  // Enlace de invitación del espacio, para sumarlo al mensaje de WhatsApp. Si no se puede leer, va sin enlace.
  const [invitacion, setInvitacion] = useState<string | null>(null)
  useEffect(() => {
    if (!esOrganizador) return
    let vivo = true
    void api.getSpace(espacioId).then((r) => {
      if (vivo && r.ok) {
        setInvitacion(`${window.location.origin}${window.location.pathname}${rutas.unirse(r.data.espacio.codigo_invitacion)}`)
      }
    })
    return () => {
      vivo = false
    }
  }, [espacioId, esOrganizador])

  return (
    <>
      <section className="tarjeta">
        <h2>Mis preferencias</h2>
        <MisPreferencias espacioId={espacioId} soloLectura={soloLectura} />
      </section>
      {esOrganizador ? (
        <section className="tarjeta">
          <h2>Agente del círculo</h2>
          <p className="suave">
            Lee las preferencias de todo el grupo, mira el clima y un catálogo de lugares (de Simulación) y te propone opciones que le sirven a todos. Propone, pero no decide por nadie.
          </p>
          <ProponerPlan espacioId={espacioId} soloLectura={soloLectura} demo={demo} invitacion={invitacion} />
        </section>
      ) : null}
    </>
  )
}

export default AgentePanel
