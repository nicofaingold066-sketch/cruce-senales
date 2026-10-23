// Pantalla del agente del círculo (docs/agente-ia.md). Dos partes:
// 1) "Mis preferencias": cada miembro real carga las suyas, en privado (opciones cerradas).
// 2) "Que el agente proponga": solo el organizador. Muestra el borrador que eligió el servidor y,
//    si quiere, lo lleva a la pantalla de nueva propuesta. El agente nunca crea ni confirma nada.
// Para engancharla: <AgentePanel espacioId={...} esOrganizador={...} soloLectura={...} />.
import { Component, useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
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
  type PerfilGrupo,
  type Energia,
  type LugarPref,
  type MomentoDia,
  type Movilidad,
  type Preferencias,
  type Presupuesto,
  type ResultadoAgente,
  type TiempoMax,
  viajeDeOpcion,
  type Zona,
} from './api'
import { enlacesCanchas } from './canchas'

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

// Enmienda 10: cuatro preguntas opcionales para elegir un lugar a mano. "Prefiero no responder" no aporta la variable.
type SinRespuesta = ''
const NO_RESPONDER = { v: '' as SinRespuesta, texto: 'Prefiero no responder' }
const ZONA: { v: Zona | SinRespuesta; texto: string }[] = [
  { v: 'providencia', texto: 'Providencia' },
  { v: 'nunoa', texto: 'Ñuñoa' },
  { v: 'las_condes', texto: 'Las Condes' },
  { v: 'santiago_centro', texto: 'Santiago Centro' },
  { v: 'maipu', texto: 'Maipú' },
  { v: 'la_florida', texto: 'La Florida' },
  { v: 'puente_alto', texto: 'Puente Alto' },
  { v: 'vitacura', texto: 'Vitacura' },
  NO_RESPONDER,
]
const MOVILIDAD: { v: Movilidad | SinRespuesta; texto: string }[] = [
  { v: 'auto_con_lugar', texto: 'Tengo auto y puedo llevar gente' },
  { v: 'auto_sin_lugar', texto: 'Tengo auto, sin lugar para llevar' },
  { v: 'transporte_publico', texto: 'Transporte público' },
  { v: 'bici_o_pie', texto: 'Bici o a pie' },
  { v: 'me_llevan', texto: 'Necesito que me lleven' },
  NO_RESPONDER,
]
const TIEMPO: { v: TiempoMax | SinRespuesta; texto: string }[] = [
  { v: '15', texto: 'Hasta 15 min' },
  { v: '30', texto: 'Hasta 30 min' },
  { v: '45', texto: 'Hasta 45 min' },
  { v: '60', texto: '60 min o más' },
  NO_RESPONDER,
]
const MOMENTO: { v: MomentoDia | SinRespuesta; texto: string }[] = [
  { v: 'manana', texto: 'Mañana (antes de las 13)' },
  { v: 'tarde', texto: 'Tarde (13 a 19)' },
  { v: 'noche', texto: 'Noche (después de las 19)' },
  { v: 'da_igual', texto: 'Da igual' },
  NO_RESPONDER,
]
type Opcional = 'zona' | 'movilidad' | 'tiempo_max' | 'momento'

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
          const id = `${nombre}-${o.v || 'sin-respuesta'}`
          return (
            <label key={o.v || 'sin-respuesta'} htmlFor={id} className={`opcion-radio ${valor === o.v ? 'opcion-activa' : ''}`}>
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
  // Enmienda 8 (mejora #72): marcada por defecto; desmarcada, el agente no usa estas preferencias.
  const [usar, setUsar] = useState(true)
  const [guardadas, setGuardadas] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)
  const { ocupado, error, ejecutar } = useAccion()
  const refError = useFocoEnError(error)

  const cargar = useCallback(async () => {
    setCargando(true)
    const r = await agenteApi.getMyPreferences(espacioId)
    if (r.ok) {
      setActividades(r.data.opciones.actividades)
      if (r.data.preferencias) setBorrador(r.data.preferencias)
      setUsar(r.data.usar_en_agente)
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
  // Enmienda 10: "Prefiero no responder" saca la clave (no se manda; el servidor no usa esa variable).
  const ponerOpcional = (k: Opcional, v: string) => {
    setBorrador((b) => {
      const n = { ...b } as Record<string, unknown>
      if (v === '') delete n[k]
      else n[k] = v
      return n as unknown as Preferencias
    })
    setAviso(null)
  }
  const alternar = (clave: string) =>
    poner(
      'me_gustaria',
      borrador.me_gustaria.includes(clave) ? borrador.me_gustaria.filter((c) => c !== clave) : [...borrador.me_gustaria, clave],
    )
  const sinActividades = borrador.me_gustaria.length === 0

  async function guardar() {
    const r = await ejecutar(`preferencias:${espacioId}`, () => agenteApi.saveMyPreferences(espacioId, borrador, usar))
    if (r?.ok) {
      setGuardadas(true)
      setUsar(r.data.usar_en_agente)
      setAviso(r.data.usar_en_agente ? 'Guardado. Nadie más ve tus preferencias.' : 'Guardado. El agente no usa tus preferencias; siguen guardadas solo para ti.')
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
      <div className="bloque agente-viaje">
        <h3 className="agente-subtitulo">Para elegir un lugar a mano (opcional)</h3>
        <p className="suave">Solo lo usa el servidor para elegir un lugar que te quede a mano. Nadie del grupo ve tu zona ni cómo te movés.</p>
        <Opciones nombre="pref-zona" titulo="Tu zona" opciones={ZONA} valor={borrador.zona ?? ''} onCambio={(v) => ponerOpcional('zona', v)} deshabilitado={soloLectura || ocupado} />
        <Opciones nombre="pref-movilidad" titulo="Cómo te movés" opciones={MOVILIDAD} valor={borrador.movilidad ?? ''} onCambio={(v) => ponerOpcional('movilidad', v)} deshabilitado={soloLectura || ocupado} />
        <Opciones nombre="pref-tiempo" titulo="Hasta cuánto viajás" opciones={TIEMPO} valor={borrador.tiempo_max ?? ''} onCambio={(v) => ponerOpcional('tiempo_max', v)} deshabilitado={soloLectura || ocupado} />
        <Opciones nombre="pref-momento" titulo="Momento del día" opciones={MOMENTO} valor={borrador.momento ?? ''} onCambio={(v) => ponerOpcional('momento', v)} deshabilitado={soloLectura || ocupado} />
      </div>
      <label htmlFor="pref-usar" className="agente-casilla">
        <input
          id="pref-usar"
          type="checkbox"
          checked={usar}
          disabled={soloLectura || ocupado}
          aria-describedby="pref-usar-ayuda"
          onChange={(e) => {
            setUsar(e.target.checked)
            setAviso(null)
          }}
        />
        <span>
          Que el agente use mis preferencias
          <small id="pref-usar-ayuda">Si la desmarcas, el agente no las usa; siguen guardadas solo para ti.</small>
        </span>
      </label>
      <div ref={refError}>{error ? <ErrorCaja error={error} onReintentar={() => void guardar()} /> : null}</div>
      {aviso ? <Aviso tono="ok">{aviso}</Aviso> : null}
      <p className="agente-sr" aria-live="polite">
        {ocupado ? 'Guardando tus preferencias…' : aviso ?? ''}
      </p>
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

const RITMO: Record<string, string> = { con_todo: 'con todo', algo_tranquilo: 'algo tranquilo' }
const AMBIENTE_GRUPO: Record<string, string> = { fiesta: 'de fiesta', tranquilo: 'tranquilo' }

/**
 * Lo que eligió el grupo, solo en totales (mejora #26). Con 3 personas o menos no se muestra nada, y una
 * actividad que eligió una sola persona tampoco: en ambos casos se podría adivinar quién fue.
 * El presupuesto no se muestra nunca.
 */
function PerfilDelGrupo({ perfil }: { perfil: PerfilGrupo | null | undefined }) {
  const gustos = perfil?.gustos?.filter((g) => g.cuantos >= 2) ?? []
  if (!perfil || perfil.personas <= 3 || gustos.length === 0) return null
  const ritmo = perfil.energia_mayoritaria ? RITMO[perfil.energia_mayoritaria] : null
  const ambiente = perfil.ambiente_mayoritario ? AMBIENTE_GRUPO[perfil.ambiente_mayoritario] : null
  return (
    <div className="bloque">
      <p>
        <strong>Lo que eligió el grupo ({perfil.personas} personas): </strong>
        {gustos.map((g) => `${g.actividad_etiqueta} ${g.cuantos} de ${perfil.personas}`).join(' · ')}.
        {ritmo ? ` La mayoría prefiere ${ritmo === 'con todo' ? 'ir con todo' : 'algo tranquilo'}.` : ''}
        {ambiente ? ` Ambiente ${ambiente}.` : ''}
      </p>
      <p className="suave">Son totales del grupo: nadie ve lo que eligió cada uno.</p>
    </div>
  )
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
  const explicacion = esLaDestacada
    ? b.explicacion
    : textoFijo(elegida.frases_grupo, false, b.clima.fuente === 'simulacion', b.perfil_grupo, elegida.actividad_etiqueta)
  const mensaje = esLaDestacada ? b.mensaje_al_grupo : mensajeFijo(elegida)
  const deModelo = esLaDestacada && b.explicacion_fuente === 'modelo'
  const canchas = enlacesCanchas(elegida.actividad, elegida.franjas[0])
  // Enmienda 10: el viaje de la opción que está mirando el organizador (null con menos de 4 personas con zona).
  const viaje = viajeDeOpcion(elegida, b)

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
      <PerfilDelGrupo perfil={b.perfil_grupo} />
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
      {viaje ? (
        <p className="agente-viaje-linea">
          <strong>Queda a menos de {viaje.max_minutos} minutos para todos{viaje.estimado ? ' (estimado)' : ''}.</strong>
        </p>
      ) : null}
      {canchas.length > 0 ? (
        <div className="bloque agente-canchas">
          <p>
            <strong>Posibles canchas reales: </strong>
            {elegida.lugar.simulado ? 'el club de esta opción es de simulación, pero estos enlaces son reales. ' : ''}
            La disponibilidad se ve en cada sitio: CRUXE no reserva ni confirma nada.
          </p>
          <div className="fila-botones agente-compartir">
            {canchas.map((e) => (
              <a key={e.clave} className="btn btn-secundario btn-chico" href={e.url} target="_blank" rel="noopener noreferrer">
                {e.texto}
              </a>
            ))}
          </div>
          <small>Google Maps muestra lo que está cerca de quien toca el enlace: CRUXE no conoce la ubicación de nadie.</small>
        </div>
      ) : null}
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

/**
 * Cuando aparece un error, lleva el foco al primer botón o enlace útil del aviso (mejora #35),
 * para que con lector de pantalla o teclado no haya que buscar cómo seguir.
 */
function useFocoEnError(error: ApiError | null): RefObject<HTMLDivElement | null> {
  const ref = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    if (!error) return
    ref.current?.querySelector<HTMLElement>('button, a[href]')?.focus()
  }, [error])
  return ref
}

/** Salida que nunca falla: crear la propuesta a mano, como siempre. */
function PropuestaAMano({ espacioId }: { espacioId: string }) {
  return (
    <a className="btn btn-secundario btn-chico" href={rutas.nueva(espacioId)}>
      Crear la propuesta a mano
    </a>
  )
}

/** Errores del agente con texto claro para la demo y siempre una salida (mejora #32). */
function ErrorAgente({ error, espacioId, onReintentar }: { error: ApiError; espacioId: string; onReintentar: () => void }) {
  if (error.codigo === 'entrada_incompleta' && error.detalle === 'pocas_preferencias') {
    return (
      <Aviso tono="aviso" titulo="Faltan preferencias" accion={<PropuestaAMano espacioId={espacioId} />}>
        El agente necesita las preferencias de al menos 2 personas. Pedile al grupo que las cargue, o creá la propuesta a mano.
      </Aviso>
    )
  }
  if (error.codigo === 'fallo_temporal' || error.codigo === 'contrato_incompatible') {
    const titulo = error.sinConexion ? 'Sin conexión' : error.detalle === 'tiempo_agotado' ? 'El agente tardó demasiado' : 'El agente no respondió'
    return (
      <Aviso
        tono="error"
        titulo={titulo}
        accion={
          <div className="fila-botones agente-compartir">
            {error.reintentable ? (
              <button type="button" className="btn btn-secundario btn-chico" onClick={onReintentar}>
                Reintentar
              </button>
            ) : null}
            <PropuestaAMano espacioId={espacioId} />
          </div>
        }
      >
        {error.mensaje} No se creó nada; podés reintentar o crear la propuesta a mano.
      </Aviso>
    )
  }
  return <ErrorCaja error={error} onReintentar={onReintentar} />
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

  const refError = useFocoEnError(error)

  // Región que siempre existe y anuncia los cambios (mejora #35). Los errores graves ya se anuncian solos (role="alert").
  const anuncio = ocupado
    ? 'El agente está buscando opciones para el grupo.'
    : error?.codigo === 'entrada_incompleta' && error.detalle === 'pocas_preferencias'
      ? 'Faltan preferencias: el agente necesita las de al menos 2 personas.'
      : resultado?.tipo === 'borrador'
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
      {ocupado ? <Cargando texto="El agente está leyendo las preferencias del grupo y el clima…" /> : null}
      <div ref={refError}>
        {error ? <ErrorAgente error={error} espacioId={espacioId} onReintentar={() => void proponer()} /> : null}
      </div>
      <p className="suave" aria-live="polite">
        {anuncio}
      </p>
      {resultado?.tipo === 'sin_plan_compatible' ? (
        <Aviso tono="aviso" titulo="Sin plan compatible" accion={<PropuestaAMano espacioId={espacioId} />}>
          {resultado.motivo === 'sin_lugar_cerca_para_todos'
            ? 'Ningún plan del catálogo queda dentro del tiempo de viaje de todos. Por privacidad no se dice para quién.'
            : 'Con las preferencias cargadas no hay un plan del catálogo que le sirva a todos. Por privacidad no se muestran los motivos.'}
        </Aviso>
      ) : null}
      {resultado?.tipo === 'borrador' ? <BorradorTarjeta espacioId={espacioId} b={resultado} soloLectura={soloLectura} invitacion={invitacion} /> : null}
    </div>
  )
}

/**
 * Barrera de errores: si algo del agente falla al dibujarse, se ve un aviso y el resto del espacio
 * sigue funcionando (mejora #32). La demo nunca depende de este panel.
 */
class BarreraAgente extends Component<{ children: ReactNode }, { fallo: boolean }> {
  state = { fallo: false }
  static getDerivedStateFromError() {
    return { fallo: true }
  }
  componentDidCatch(e: unknown) {
    // Solo el tipo de error, nunca datos del grupo.
    console.error('agente: el panel falló al dibujarse', e instanceof Error ? e.name : 'desconocido')
  }
  render() {
    if (this.state.fallo) {
      return (
        <div className="agente-panel">
          <Aviso
            tono="aviso"
            titulo="El agente no está disponible ahora"
            accion={
              <button type="button" className="btn btn-secundario btn-chico" onClick={() => this.setState({ fallo: false })}>
                Reintentar
              </button>
            }
          >
            El resto del espacio funciona igual: podés crear la propuesta a mano.
          </Aviso>
        </div>
      )
    }
    return this.props.children
  }
}

export function AgentePanel(props: {
  espacioId: string
  esOrganizador: boolean
  soloLectura?: boolean
  demo?: boolean
}) {
  return (
    <BarreraAgente>
      <PanelAgente {...props} />
    </BarreraAgente>
  )
}

function PanelAgente({
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
      <section className="tarjeta agente-panel">
        <h2>Mis preferencias</h2>
        <MisPreferencias espacioId={espacioId} soloLectura={soloLectura} />
      </section>
      {esOrganizador ? (
        <section className="tarjeta agente-panel">
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
