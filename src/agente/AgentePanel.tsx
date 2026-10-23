// Pantalla del agente del círculo (docs/agente-ia.md). Dos partes:
// 1) "Mis preferencias": cada miembro real carga las suyas, en privado (opciones cerradas).
// 2) "Que el agente proponga": solo el organizador. Muestra el borrador que eligió el servidor y,
//    si quiere, lo lleva a la pantalla de nueva propuesta. El agente nunca crea ni confirma nada.
// Para engancharla: <AgentePanel espacioId={...} esOrganizador={...} soloLectura={...} />.
import { useCallback, useEffect, useState } from 'react'
import { useAccion } from '../lib/hooks'
import { franjaTexto } from '../lib/format'
import { irA, rutas } from '../lib/shell'
import type { ApiError } from '../lib/types'
import { Aviso, Boton, Cargando, ErrorCaja, RotuloSimulacion } from '../components/ui'
import {
  agenteApi,
  guardarBorradorAgente,
  type ActividadOpcion,
  type Ambiente,
  type BorradorAgente,
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
      <Opciones nombre="pref-presupuesto" titulo="Presupuesto este finde" opciones={PRESUPUESTO} valor={borrador.presupuesto} onCambio={(v) => poner('presupuesto', v)} deshabilitado={soloLectura} />
      <Opciones nombre="pref-energia" titulo="Energía" opciones={ENERGIA} valor={borrador.energia} onCambio={(v) => poner('energia', v)} deshabilitado={soloLectura} />
      <Opciones nombre="pref-ambiente" titulo="Ambiente" opciones={AMBIENTE} valor={borrador.ambiente} onCambio={(v) => poner('ambiente', v)} deshabilitado={soloLectura} />
      <Opciones nombre="pref-lugar" titulo="Lugar" opciones={LUGAR} valor={borrador.lugar} onCambio={(v) => poner('lugar', v)} deshabilitado={soloLectura} />
      <fieldset className={`grupo ${sinActividades ? 'grupo-error' : ''}`} disabled={soloLectura}>
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

function BorradorTarjeta({ espacioId, b, soloLectura }: { espacioId: string; b: BorradorAgente; soloLectura?: boolean }) {
  const [titulo, setTitulo] = useState(b.titulo)
  useEffect(() => setTitulo(b.titulo), [b.titulo])
  const tituloValido = titulo.trim().length >= 1 && titulo.trim().length <= 80

  function usar() {
    guardarBorradorAgente(espacioId, { titulo: titulo.trim(), franjas: b.franjas })
    irA(rutas.nueva(espacioId))
  }

  return (
    <div className="bloque" aria-live="polite">
      <Aviso tono="info" titulo="Borrador del agente">
        Todavía no es una propuesta: nadie está invitado ni confirmado.
      </Aviso>
      <label className={`campo ${tituloValido ? '' : 'campo-error'}`}>
        <span>Título</span>
        <input value={titulo} maxLength={80} onChange={(e) => setTitulo(e.target.value)} disabled={soloLectura} />
      </label>
      <p>
        <strong>{b.actividad_etiqueta}</strong> en {b.lugar.nombre.replace(' (Simulación)', '')}{' '}
        {b.lugar.simulado ? <RotuloSimulacion /> : null}
      </p>
      <ul>
        {b.franjas.map((f, i) => (
          <li key={i}>
            Franja {i === 0 ? 'A' : 'B'}: {franjaTexto(f.inicio, f.fin)}
          </li>
        ))}
      </ul>
      <p className="suave">
        Clima: {b.clima.resumen}
        {b.clima.fuente === 'open-meteo' ? ' (pronóstico de Open-Meteo)' : ''}
      </p>
      <p>{b.explicacion}</p>
      <p className="suave">
        {b.explicacion_fuente === 'modelo'
          ? 'Explicación redactada por IA a partir del plan y de datos del grupo entero. La IA no vio lo que puso cada uno.'
          : 'Explicación de texto fijo. El plan lo eligió el servidor con reglas fijas.'}
      </p>
      <p className="suave">El mínimo, el máximo, la persona imprescindible y el cierre los completás vos en el paso siguiente.</p>
      <Boton onClick={usar} disabled={soloLectura || !tituloValido}>
        Usar este borrador
      </Boton>
    </div>
  )
}

function ProponerPlan({ espacioId, soloLectura }: { espacioId: string; soloLectura?: boolean }) {
  const [sabado, setSabado] = useState(SABADO_DEL_CASO)
  const [resultado, setResultado] = useState<ResultadoAgente | null>(null)
  const { ocupado, error, ejecutar } = useAccion()

  async function proponer() {
    setResultado(null)
    const r = await ejecutar(`agente:${espacioId}:${sabado}`, () => agenteApi.proponer(espacioId, sabado))
    if (r?.ok) setResultado(r.data)
  }

  return (
    <div className="bloque">
      <label className="campo">
        <span>Fin de semana (sábado)</span>
        <input type="date" value={sabado} onChange={(e) => setSabado(e.target.value)} disabled={soloLectura || ocupado} />
        <small>El agente propone dos franjas: ese sábado y el domingo siguiente.</small>
      </label>
      <Boton onClick={() => void proponer()} ocupado={ocupado} ocupadoTexto="El agente está pensando…" disabled={soloLectura || !sabado}>
        Que el agente proponga
      </Boton>
      {error ? <ErrorCaja error={error} onReintentar={() => void proponer()} /> : null}
      {resultado?.tipo === 'sin_plan_compatible' ? (
        <Aviso tono="aviso" titulo="Sin plan compatible">
          Con las preferencias cargadas no hay un plan del catálogo que le sirva a todos. Por privacidad no se muestran los motivos.
        </Aviso>
      ) : null}
      {resultado?.tipo === 'borrador' ? <BorradorTarjeta espacioId={espacioId} b={resultado} soloLectura={soloLectura} /> : null}
    </div>
  )
}

export function AgentePanel({
  espacioId,
  esOrganizador,
  soloLectura,
}: {
  espacioId: string
  esOrganizador: boolean
  soloLectura?: boolean
}) {
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
            Mira las preferencias del grupo, el clima y un catálogo de lugares (de Simulación) y propone qué hacer. Propone, pero no decide por nadie.
          </p>
          <ProponerPlan espacioId={espacioId} soloLectura={soloLectura} />
        </section>
      ) : null}
    </>
  )
}

export default AgentePanel
