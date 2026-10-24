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
import type { ApiError, ApiResult } from '../lib/types'
import { Aviso, Boton, Card, Cargando, Chip, ErrorCaja, RotuloSimulacion } from '../components/ui'
import { PreferenciaTema } from '../components/PreferenciaTema'
import { Icono } from '../components/Icono'
import '../estilo/seccion-s6.css'
import './gru-preferencias.css'
import { ConsentimientoInvitaciones } from './ConsentimientoInvitaciones'
import { AgenteSocial } from './AgenteSocial'
import { socialApi } from './socialApi'
import { GruPersonaje } from './GruPersonaje'
import { actualizarEstadoGru, useEstadoGru } from './gruEstado'
import {
  AVISO_REINTENTO,
  TEXTO_FALTAN_PERSONAS,
  agenteApi,
  guardarBorradorAgente,
  mensajeFijo,
  textoQuorum,
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
const MOMENTO_CORTO: Record<string, string> = { manana: 'mañana', tarde: 'tarde', noche: 'noche' }

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
    <fieldset className="grupo gru-prefs-grupo" disabled={deshabilitado}>
      <legend>{titulo}</legend>
      <div className="opciones">
        {opciones.map((o) => {
          const id = `${nombre}-${o.v || 'sin-respuesta'}`
          return (
            <label key={o.v || 'sin-respuesta'} htmlFor={id} className={`opcion-radio ${valor === o.v ? 'opcion-activa' : ''}`}>
              <input id={id} type="radio" name={nombre} checked={valor === o.v} onChange={() => onCambio(o.v)} />
              <span className="gru-prefs-opcion-texto">{o.texto}</span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}

function MisPreferencias({ espacioId, soloLectura, primario }: { espacioId: string; soloLectura?: boolean; primario?: boolean }) {
  const [cargando, setCargando] = useState(true)
  const [errorCarga, setErrorCarga] = useState<ApiError | null>(null)
  const [actividades, setActividades] = useState<ActividadOpcion[]>([])
  const [borrador, setBorrador] = useState<Preferencias>(VACIAS)
  // Enmienda 8: la casilla es un borrador; el permiso cambia al guardar y recibir confirmación.
  const [usar, setUsar] = useState(true)
  const [usarConfirmado, setUsarConfirmado] = useState<boolean | null>(null)
  const [recibirInicial, setRecibirInicial] = useState<boolean | null>(null)
  const [guardadas, setGuardadas] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)
  // #108: la primera llamada tardó demasiado y se está reintentando una vez.
  const [reintentando, setReintentando] = useState(false)
  // Rincones O-15: "Me gustaría" se marca en rojo recién al intentar guardar sin ninguna actividad.
  const [intentoSinActividad, setIntentoSinActividad] = useState(false)
  const refGustos = useRef<HTMLFieldSetElement>(null)
  // Pedido de Nico (24 oct, 01:50): menos scroll. Con preferencias guardadas se ve un resumen y "Editar mis
  // preferencias"; en el formulario, "Cómo llegas" y "Permisos" se abren a pedido (plegados no se dibujan).
  const [editando, setEditando] = useState(false)
  const [verViaje, setVerViaje] = useState(false)
  const [verPermisos, setVerPermisos] = useState(false)
  const [guardado, setGuardado] = useState<Preferencias | null>(null)
  const { ocupado, error, ejecutar } = useAccion()
  const refError = useFocoEnError(error)

  const cargar = useCallback(async () => {
    setCargando(true)
    setReintentando(false)
    const r = await agenteApi.getMyPreferences(espacioId, { alReintentar: () => setReintentando(true) })
    setReintentando(false)
    if (r.ok) {
      setActividades(r.data.opciones.actividades)
      if (r.data.preferencias) setBorrador(r.data.preferencias)
      setUsar(r.data.usar_en_agente)
      setUsarConfirmado(r.data.usar_en_agente)
      setRecibirInicial(r.data.recibir_invitaciones_agente)
      setGuardadas(Boolean(r.data.preferencias))
      setGuardado(r.data.preferencias ?? null)
      setEditando(!r.data.preferencias)
      setErrorCarga(null)
    } else setErrorCarga(r.error)
    setCargando(false)
  }, [espacioId])

  useEffect(() => {
    void cargar()
  }, [cargar])

  // El permiso de invitaciones lo guarda su propio componente (E11). Al volver al resumen o plegar "Permisos" se
  // relee del servidor para no mostrar un valor viejo; si no responde, queda "sin dato".
  const refrescarRecibir = useCallback(async () => {
    const r = await agenteApi.getMyPreferences(espacioId)
    setRecibirInicial(r.ok ? r.data.recibir_invitaciones_agente : null)
  }, [espacioId])

  if (cargando) return <Cargando esqueleto texto={reintentando ? AVISO_REINTENTO : 'Cargando tus preferencias…'} />
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
    if (sinActividades) {
      setIntentoSinActividad(true)
      refGustos.current?.querySelector('input')?.focus()
      return
    }
    setReintentando(false)
    const r = await ejecutar(`preferencias:${espacioId}`, () =>
      agenteApi.saveMyPreferences(espacioId, borrador, usar, { alReintentar: () => setReintentando(true) }),
    )
    setReintentando(false)
    if (r?.ok) {
      setGuardadas(true)
      setUsarConfirmado(r.data.usar_en_agente)
      setAviso(r.data.usar_en_agente !== usar
        ? 'El servidor confirmó otro permiso. Tu cambio sigue sin guardar; revisa y vuelve a guardar.'
        : r.data.usar_en_agente ? 'Guardado. Nadie más ve tus preferencias.' : 'Guardado. El agente no usa tus preferencias; siguen guardadas solo para ti.')
      // Guardado y confirmado tal cual: vuelve al resumen. Si el servidor confirmó otro permiso, sigue editando.
      if (r.data.usar_en_agente === usar) {
        setGuardado(borrador)
        setEditando(false)
        void refrescarRecibir()
      }
    }
  }

  function cancelar() {
    if (guardado) setBorrador(guardado)
    if (usarConfirmado !== null) setUsar(usarConfirmado)
    setIntentoSinActividad(false)
    setAviso(null)
    setEditando(false)
    void refrescarRecibir()
  }

  const textoDe = <T extends string>(lista: { v: T | SinRespuesta; texto: string }[], v: string | undefined) =>
    lista.find((o) => o.v === v)?.texto ?? null
  const viaje = [textoDe(ZONA, borrador.zona), textoDe(MOVILIDAD, borrador.movilidad), textoDe(TIEMPO, borrador.tiempo_max), textoDe(MOMENTO, borrador.momento)]
    .filter((t): t is string => Boolean(t))
  const resumenViaje = viaje.length > 0 ? viaje.join(', ') : 'sin responder'
  const resumenPermisos = `${usar ? 'el agente puede usarlas' : 'el agente no las usa'} · invitaciones ${recibirInicial === true ? 'activadas' : recibirInicial === false ? 'desactivadas' : 'sin dato'}`
  const privacidad = (
    <div className="gru-prefs-privacidad">
      <Icono n="candado" tam={20} />
      <div>
        <strong>Solo las ves tú</strong>
        <p className="suave">GRU las usa con tu permiso. Al grupo le llega la propuesta, nunca tus respuestas.</p>
      </div>
    </div>
  )

  if (!editando) {
    // Pantalla 7 del mockup: una línea ("Asado, Pádel · algo barato · tranquilo · Providencia, transporte público ·
    // tarde"), "Editar ›" y la nota de privacidad.
    const gustos = actividades.filter((a) => borrador.me_gustaria.includes(a.clave)).map((a) => a.etiqueta)
    const minuscula = (t: string | null) => (t ? t.toLocaleLowerCase('es') : null)
    const ritmo = borrador.ambiente !== 'da_igual' ? textoDe(AMBIENTE, borrador.ambiente) : textoDe(ENERGIA, borrador.energia)
    const llegar = [textoDe(ZONA, borrador.zona), minuscula(textoDe(MOVILIDAD, borrador.movilidad))].filter(Boolean).join(', ')
    const linea = [
      gustos.length > 0 ? gustos.join(', ') : 'Sin actividades marcadas',
      borrador.presupuesto !== 'da_igual' ? minuscula(textoDe(PRESUPUESTO, borrador.presupuesto)) : null,
      minuscula(ritmo),
      llegar || null,
      borrador.momento && borrador.momento !== 'da_igual' ? MOMENTO_CORTO[borrador.momento] : null,
    ]
      .filter(Boolean)
      .join(' · ')
    return (
      <div className="bloque agente-prefs-linea gru-prefs-resumen">
        <div className="agente-linea-fila">
          <div className="gru-prefs-resumen-datos" aria-label="Tus preferencias guardadas">
            {linea.split(' · ').map((texto, i) => <span className="gru-prefs-resumen-chip" key={`${texto}-${i}`}>{texto}</span>)}
          </div>
          <button type="button" className="agente-enlace" onClick={() => { setAviso(null); setEditando(true) }} disabled={soloLectura}>
            Editar ›
          </button>
        </div>
        <div className="gru-prefs-privacidad">
          <Icono n="candado" tam={20} />
          <p>Solo las ves tú: al grupo le llega la propuesta, nunca lo que pusiste.</p>
        </div>
        {aviso ? <Aviso tono="ok">{aviso}</Aviso> : null}
        <p className="agente-sr" aria-live="polite">
          {aviso ?? ''}
        </p>
      </div>
    )
  }

  return (
    <div className="bloque gru-prefs-form">
      {privacidad}
      <section className="gru-prefs-seccion" aria-labelledby="gru-prefs-gustos">
        <div className="gru-prefs-cabecera">
          <Icono n="chispa" tam={24} />
          <div>
            <h3 id="gru-prefs-gustos" className="agente-subtitulo">Qué te gusta</h3>
            <p>Marca los planes que te entusiasman. Puedes elegir varios.</p>
          </div>
        </div>
        <fieldset
          ref={refGustos}
          className={`grupo gru-prefs-actividades ${sinActividades && intentoSinActividad ? 'grupo-error' : ''}`}
          disabled={soloLectura || ocupado}
          aria-describedby={sinActividades ? 'pref-gusta-ayuda' : undefined}
        >
          <legend>Me gustaría</legend>
          <div className="opciones">
            {actividades.map((a) => {
              const id = `pref-gusta-${a.clave}`
              const activa = borrador.me_gustaria.includes(a.clave)
              return (
                <label key={a.clave} htmlFor={id} className={`opcion-radio ${activa ? 'opcion-activa' : ''}`}>
                  <input id={id} type="checkbox" checked={activa} onChange={() => alternar(a.clave)} />
                  <Icono
                    n={a.clave === 'asado' ? 'asado'
                      : ['futbol', 'padel', 'tenis', 'basquet'].includes(a.clave) ? 'futbol'
                        : ['cena', 'comida', 'restaurante', 'cafe'].includes(a.clave) ? 'cena'
                          : a.clave === 'cine' ? 'cine'
                            : a.clave === 'fiesta' ? 'fiesta'
                              : ['parque', 'paseo', 'senderismo'].includes(a.clave) ? 'paseo' : 'chispa'}
                    tam={21}
                  />
                  <span className="gru-prefs-opcion-texto">{a.etiqueta}</span>
                </label>
              )
            })}
          </div>
          {sinActividades ? (
            <small id="pref-gusta-ayuda" role={intentoSinActividad ? 'alert' : undefined}>
              Marca al menos una actividad para guardar.
            </small>
          ) : null}
        </fieldset>
      </section>
      <section className="gru-prefs-seccion" aria-labelledby="gru-prefs-plan">
        <div className="gru-prefs-cabecera">
          <Icono n="rayo" tam={24} />
          <div>
            <h3 id="gru-prefs-plan" className="agente-subtitulo">Tu plan ideal</h3>
            <p>Cuéntale a GRU qué prefieres para este finde.</p>
          </div>
        </div>
        <div className="gru-prefs-disposicion">
          <Opciones nombre="pref-presupuesto" titulo="Presupuesto este finde" opciones={PRESUPUESTO} valor={borrador.presupuesto} onCambio={(v) => poner('presupuesto', v)} deshabilitado={soloLectura || ocupado} />
          <Opciones nombre="pref-energia" titulo="Energía" opciones={ENERGIA} valor={borrador.energia} onCambio={(v) => poner('energia', v)} deshabilitado={soloLectura || ocupado} />
          <Opciones nombre="pref-ambiente" titulo="Ambiente" opciones={AMBIENTE} valor={borrador.ambiente} onCambio={(v) => poner('ambiente', v)} deshabilitado={soloLectura || ocupado} />
          <Opciones nombre="pref-lugar" titulo="Lugar" opciones={LUGAR} valor={borrador.lugar} onCambio={(v) => poner('lugar', v)} deshabilitado={soloLectura || ocupado} />
        </div>
      </section>
      <div className="gru-prefs-extras">
      <Plegable id="pref-sec-viaje" titulo="Cómo llegas (opcional)" resumen={resumenViaje} abierto={verViaje} onCambio={setVerViaje}>
        <p className="suave">Sirve para elegir un lugar que te quede a mano. Nadie del grupo ve tu zona ni cómo te mueves.</p>
        <Opciones nombre="pref-zona" titulo="Tu zona" opciones={ZONA} valor={borrador.zona ?? ''} onCambio={(v) => ponerOpcional('zona', v)} deshabilitado={soloLectura || ocupado} />
        <Opciones nombre="pref-movilidad" titulo="Cómo te mueves" opciones={MOVILIDAD} valor={borrador.movilidad ?? ''} onCambio={(v) => ponerOpcional('movilidad', v)} deshabilitado={soloLectura || ocupado} />
        <Opciones nombre="pref-tiempo" titulo="Hasta cuánto viajas" opciones={TIEMPO} valor={borrador.tiempo_max ?? ''} onCambio={(v) => ponerOpcional('tiempo_max', v)} deshabilitado={soloLectura || ocupado} />
        <Opciones nombre="pref-momento" titulo="Momento del día" opciones={MOMENTO} valor={borrador.momento ?? ''} onCambio={(v) => ponerOpcional('momento', v)} deshabilitado={soloLectura || ocupado} />
      </Plegable>
      <Plegable
        id="pref-sec-permisos"
        titulo="Permisos"
        resumen={resumenPermisos}
        abierto={verPermisos}
        mantener
        onCambio={(v) => {
          setVerPermisos(v)
          if (!v) void refrescarRecibir()
        }}
      >
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
          <small id="pref-usar-ayuda">Se aplica al guardar. Tus preferencias siguen siendo privadas.</small>
        </span>
      </label>
      <p role="status">
        {usarConfirmado === true ? 'Permiso guardado: el agente puede usar tus preferencias.' : usarConfirmado === false ? 'Permiso guardado: el agente no usa tus preferencias.' : 'Permiso guardado pendiente de lectura.'}
        {usarConfirmado !== null && usar !== usarConfirmado ? ' Cambio sin guardar: el permiso anterior sigue vigente.' : ''}
      </p>
      {/* E11 (integracion-codex-juan): el consentimiento de invitaciones, junto al otro permiso. */}
      <ConsentimientoInvitaciones key={String(recibirInicial)} espacioId={espacioId} inicial={recibirInicial} soloLectura={soloLectura} />
      </Plegable>
      </div>
      <div ref={refError}>{error ? <ErrorCaja error={error} onReintentar={() => void guardar()} /> : null}</div>
      {ocupado && reintentando ? <Aviso tono="aviso">{AVISO_REINTENTO}</Aviso> : null}
      {aviso ? <Aviso tono={usarConfirmado !== null && usar !== usarConfirmado ? 'info' : 'ok'}>{aviso}</Aviso> : null}
      <p className="agente-sr" aria-live="polite">
        {ocupado ? (reintentando ? AVISO_REINTENTO : 'Guardando tus preferencias…') : aviso ?? ''}
      </p>
      <div className="fila-botones gru-prefs-acciones">
        {/* Un solo primario por pantalla: para quien organiza, el primario es el del agente. */}
        <Boton variante={primario ? 'primario' : 'secundario'} onClick={() => void guardar()} ocupado={ocupado} ocupadoTexto="Guardando…" disabled={soloLectura}>
          {guardadas ? 'Actualizar mis preferencias' : 'Guardar mis preferencias'}
        </Boton>
        {guardadas ? (
          <Boton variante="claro" onClick={cancelar} disabled={ocupado}>
            Cancelar
          </Boton>
        ) : null}
      </div>
    </div>
  )
}

/**
 * Sección que se abre a pedido. Plegada no se dibuja: nada oculto que tocar ni que leer en voz alta.
 * Con `mantener`, plegada queda montada pero oculta, para no perder el estado de un componente con su propio guardado.
 */
function Plegable({
  id,
  titulo,
  resumen,
  abierto,
  mantener,
  onCambio,
  children,
}: {
  id: string
  titulo: string
  resumen: string
  abierto: boolean
  mantener?: boolean
  onCambio: (v: boolean) => void
  children: ReactNode
}) {
  return (
    <div className="agente-plegable-seccion">
      <button type="button" className="agente-plegable-boton" aria-expanded={abierto} aria-controls={id} onClick={() => onCambio(!abierto)}>
        <span className="agente-plegable-titulo">{titulo}</span>
        {!abierto && resumen ? <span className="agente-plegable-resumen">{resumen}</span> : null}
        <span aria-hidden="true" className="agente-plegable-flecha">{abierto ? '▴' : '▾'}</span>
      </button>
      {abierto || mantener ? (
        <div id={id} className="agente-plegable-cuerpo" hidden={!abierto}>
          {children}
        </div>
      ) : null}
    </div>
  )
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

/**
 * El resultado del agente, como la pantalla 7 del mockup: tarjeta con borde grueso, "RECOMENDADO · N OPCIONES", el
 * título grande, fecha y viaje, el mensaje de la IA entre comillas con "Lo redactó la IA", un desplegable con lo que
 * hizo el agente y las otras opciones, el primario "Usar esta opción" y, chico, que el agente invite al grupo.
 */
function BorradorTarjeta({
  espacioId,
  b,
  soloLectura,
  pasos,
  personasGrupo,
  invitar,
}: {
  espacioId: string
  b: BorradorAgente
  soloLectura?: boolean
  pasos?: string[]
  personasGrupo: number | null
  /** Abre "Revisar antes de invitar" (pantalla 20); null si el servicio no está o falta el clima. */
  invitar: { disponible: boolean | null; abrir: () => void } | null
}) {
  const [seleccion, setSeleccion] = useState(b.elegida_id)
  const [verMas, setVerMas] = useState(false)
  const elegida = b.candidatas.find((c) => c.id === seleccion) ?? b.candidatas[0]
  const esLaDestacada = elegida.id === b.elegida_id
  // La explicación y el mensaje del modelo son de la opción que destacó; para otra, el texto fijo.
  const explicacion = esLaDestacada
    ? b.explicacion
    : textoFijo(elegida.frases_grupo, false, b.clima.fuente === 'simulacion', b.perfil_grupo, elegida.actividad_etiqueta)
  const mensaje = esLaDestacada ? b.mensaje_al_grupo : mensajeFijo(elegida)
  const deModelo = esLaDestacada && b.explicacion_fuente === 'modelo'
  const canchas = enlacesCanchas(elegida.actividad, elegida.franjas[0])
  // Enmienda 10: el viaje de la opción que está mirando el organizador (null con menos de 4 personas con zona).
  const viaje = viajeDeOpcion(elegida, b)
  const lugar = elegida.lugar.nombre.replace(' (Simulación)', '')
  const total = b.candidatas.length
  const otras = total - 1
  const nPasos = pasos?.length ?? 0
  const partes = [
    nPasos > 0 ? `Lo que hizo el agente (${nPasos} pasos)` : null,
    otras > 0 ? (otras === 1 ? 'la otra opción' : `las otras ${otras} opciones`) : null,
  ].filter((t): t is string => Boolean(t))
  const desplegable = partes.length > 0 ? partes.join(' y ').replace(/^l/, 'L') : 'Por qué esta opción'
  // E5: "N opciones para N personas" dice a quiénes cuenta.
  const quienes = `${total > 1 ? `${total} opciones` : 'Opción'} para ${b.personas_consideradas} personas: cuenta a quienes cargaron preferencias y las habilitaron${
    personasGrupo && personasGrupo > b.personas_consideradas ? ` (${b.personas_consideradas} de ${personasGrupo} en el grupo)` : ''
  }.`

  function usar() {
    // Enmienda 14: la actividad y sus personas, para precargar actividad, mínimo y máximo en Nueva propuesta.
    guardarBorradorAgente(espacioId, {
      titulo: elegida.titulo,
      franjas: elegida.franjas,
      actividad: elegida.actividad ?? null,
      personas: elegida.personas ?? null,
    })
    irA(rutas.nueva(espacioId))
  }

  return (
    <div className="agente-resultado sd-aparecer sd-respira">
      <p className="agente-sobretitulo">
        {esLaDestacada ? 'Recomendado' : 'Elegido por ti'} · {total === 1 ? '1 opción' : `${total} opciones`}
      </p>
      {b.quorum ? <p className="suave agente-quorum">{textoQuorum(b.quorum)}</p> : null}
      <p className="t-titulo agente-recomendada-nombre">
        {elegida.actividad_etiqueta} en {lugar}
        {elegida.lugar.simulado ? <> <RotuloSimulacion /></> : null}
      </p>
      <ul className="agente-franjas">
        {elegida.franjas.map((f, i) => (
          <li key={i}>{franjaTexto(f.inicio, f.fin)}</li>
        ))}
      </ul>
      {viaje ? (
        <p className="agente-viaje-linea">
          <strong>Queda a menos de {viaje.max_minutos} minutos para todos{viaje.estimado ? ' (estimado)' : ''}.</strong>
        </p>
      ) : null}
      <blockquote className="agente-cita">“{mensaje}”</blockquote>
      <p className="suave">
        {deModelo ? 'Lo redactó la IA, que solo vio opciones válidas, el clima y totales del grupo.' : 'Texto fijo, armado con reglas.'}
      </p>
      <Plegable id="agente-mas" titulo={desplegable} resumen="" abierto={verMas} onCambio={setVerMas}>
        <p>
          <strong>Por qué: </strong>
          {explicacion}
        </p>
        {b.clima.fuente === 'simulacion' ? (
          <p className="suave">
            Clima de prueba <RotuloSimulacion />: {b.clima.resumen.replace('Simulación: ', '')} No es un pronóstico real.
          </p>
        ) : (
          <p className="suave">
            Clima: {b.clima.resumen}
            {b.clima.fuente === 'open-meteo' ? (
              <>
                {' '}
                (pronóstico de{' '}
                <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">
                  Open-Meteo
                </a>
                )
              </>
            ) : null}
          </p>
        )}
        {nPasos > 0 ? (
          <>
            <h3 className="agente-subtitulo">Lo que hizo el agente</h3>
            <PasosAgente pasos={pasos!} />
          </>
        ) : null}
        <fieldset className="grupo agente-candidatas">
          <legend>{quienes}</legend>
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
        {canchas.length > 0 ? (
          <div className="bloque agente-canchas">
            <p>
              <strong>Canchas reales cerca: </strong>
              {elegida.lugar.simulado ? 'el club de esta opción es de simulación; ' : ''}
              la disponibilidad se ve en cada sitio. CRUXE no reserva ni confirma.
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
      </Plegable>
      <Boton onClick={usar} disabled={soloLectura}>
        Usar esta opción
      </Boton>
      {invitar && !soloLectura ? (
        invitar.disponible === false ? (
          <p className="suave">Que el agente invite al grupo no está disponible ahora.</p>
        ) : (
          <>
            <button type="button" className="agente-enlace agente-enlace-chico" onClick={invitar.abrir} disabled={invitar.disponible === null}>
              o que el agente invite al grupo por mí (revisás y aprobás antes)
            </button>
            {invitar.disponible ? <p className="suave agente-estado-ok">Servicio disponible: puedes preparar el borrador social.</p> : null}
          </>
        )
      ) : null}
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
        El agente necesita las preferencias de al menos 2 personas. Pide al grupo que las cargue, o crea la propuesta a mano.
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
        {error.mensaje} No se creó nada; puedes reintentar o crear la propuesta a mano.
      </Aviso>
    )
  }
  return <ErrorCaja error={error} onReintentar={onReintentar} />
}

type ClimaElegido = 'real' | ClimaSimulado

type RecuerdoGru = {
  sabado: string
  clima: ClimaElegido
  conHerramientas: boolean
  resultado: ResultadoAgente | null
  error: ApiError | null
  peticion: Promise<ApiResult<ResultadoAgente>> | null
}

// Solo memoria de esta sesión: conserva el borrador y la búsqueda al navegar. No guarda preferencias.
const recuerdosGru = new Map<string, RecuerdoGru>()

function buscarConGru(espacioId: string, sabado: string, clima: ClimaElegido, demo: boolean | undefined, conHerramientas: boolean) {
  const anterior = recuerdosGru.get(espacioId)
  if (anterior?.peticion) return anterior.peticion

  const recuerdo: RecuerdoGru = { sabado, clima, conHerramientas, resultado: null, error: null, peticion: null }
  const climaPedido = demo && clima !== 'real' ? clima : undefined
  const peticion = agenteApi.proponer(espacioId, sabado, climaPedido, conHerramientas).catch((): ApiResult<ResultadoAgente> => ({
    ok: false,
    error: {
      codigo: 'fallo_temporal',
      detalle: 'reintentar',
      mensaje: 'No se pudo completar la búsqueda de GRU. Intenta de nuevo.',
      reintentable: true,
      state_rev: null,
    },
  }))
  recuerdo.peticion = peticion
  recuerdosGru.set(espacioId, recuerdo)
  actualizarEstadoGru(espacioId, 'buscando')

  // La petición sigue aunque se cierre el panel. Su resultado actualiza también la miniatura persistente.
  void peticion.then((r) => {
    if (recuerdosGru.get(espacioId) !== recuerdo) return
    recuerdo.peticion = null
    recuerdo.resultado = r.ok ? r.data : null
    recuerdo.error = r.ok ? null : r.error
    actualizarEstadoGru(espacioId, r.ok ? r.data.tipo === 'borrador' ? 'listo' : 'sin-opcion' : 'error')
  })
  return peticion
}

// Pantalla 7: chips de Clima "Real / Sol / Lluvia" (solo en el demo; con sol o lluvia es una simulación).
const CLIMA_DEMO: { v: ClimaElegido; texto: string }[] = [
  { v: 'real', texto: 'Real' },
  { v: 'seco', texto: 'Sol' },
  { v: 'lluvia', texto: 'Lluvia' },
]

/** Sábados para elegir: el del caso (31 oct) y los dos siguientes. "Sáb 31 oct". */
function sabadosParaElegir(): { v: string; texto: string }[] {
  const base = new Date(`${SABADO_DEL_CASO}T12:00:00Z`)
  return [0, 7, 14].map((d) => {
    const f = new Date(base.getTime() + d * 86400000)
    const v = f.toISOString().slice(0, 10)
    const texto = `Sáb ${f.getUTCDate()} ${f.toLocaleDateString('es-CL', { month: 'short', timeZone: 'UTC' }).replace('.', '')}`
    return { v, texto }
  })
}

function ProponerPlan({
  espacioId,
  soloLectura,
  demo,
  personasGrupo,
}: {
  espacioId: string
  soloLectura?: boolean
  demo?: boolean
  personasGrupo: number | null
}) {
  const recuerdo = recuerdosGru.get(espacioId)
  const [sabado, setSabado] = useState(recuerdo?.sabado ?? SABADO_DEL_CASO)
  const [clima, setClima] = useState<ClimaElegido>(recuerdo?.clima ?? 'real')
  const [resultado, setResultado] = useState<ResultadoAgente | null>(recuerdo?.resultado ?? null)
  const [errorRecuperado, setErrorRecuperado] = useState<ApiError | null>(recuerdo?.error ?? null)
  // Qué se tocó: "Que el agente arme un plan" (con herramientas, el primario) o "Propuesta rápida (sin herramientas)".
  const [conHerramientas, setConHerramientas] = useState(recuerdo?.conHerramientas ?? true)
  // Pantalla 20: "Revisar antes de invitar", abierta desde el enlace chico del resultado.
  const [hojaSocial, setHojaSocial] = useState(false)
  const [servicioSocial, setServicioSocial] = useState<boolean | null>(null)
  const { ocupado: ocupadoAccion, error: errorAccion, ejecutar, limpiarError } = useAccion()
  const { estado: estadoCompartido } = useEstadoGru(espacioId)
  const ocupado = ocupadoAccion || estadoCompartido === 'buscando'
  const error = errorAccion ?? errorRecuperado
  const montado = useRef(true)
  const sabados = sabadosParaElegir()

  useEffect(() => {
    montado.current = true
    return () => { montado.current = false }
  }, [])

  useEffect(() => {
    const guardado = recuerdosGru.get(espacioId)
    if (!guardado) return
    setSabado(guardado.sabado)
    setClima(guardado.clima)
    setConHerramientas(guardado.conHerramientas)
    setResultado(guardado.resultado)
    setErrorRecuperado(guardado.error)
  }, [espacioId, estadoCompartido])

  function limpiarBusqueda(sabadoElegido: string, climaElegido: ClimaElegido) {
    setResultado(null)
    setErrorRecuperado(null)
    limpiarError()
    recuerdosGru.set(espacioId, {
      sabado: sabadoElegido,
      clima: climaElegido,
      conHerramientas,
      resultado: null,
      error: null,
      peticion: null,
    })
    actualizarEstadoGru(espacioId, 'disponible')
  }

  function cambiarSabado(v: string) {
    if (ocupado) return
    // Un resultado de otro fin de semana no se puede usar: se limpia.
    setSabado(v)
    limpiarBusqueda(v, clima)
  }

  function cambiarClima(v: ClimaElegido) {
    if (ocupado) return
    setClima(v)
    limpiarBusqueda(sabado, v)
  }

  const climaPedido = demo && clima !== 'real' ? clima : undefined
  const estadoClimaValido = (v: string): v is 'seco' | 'lluvia' | 'desconocido' =>
    v === 'seco' || v === 'lluvia' || v === 'desconocido'
  const climaSocial = resultado?.tipo === 'borrador'
    && estadoClimaValido(resultado.clima.sabado) && estadoClimaValido(resultado.clima.domingo)
    ? { sabado: resultado.clima.sabado, domingo: resultado.clima.domingo } : null

  // "Comprobar servicio" ya no es un botón: con un borrador a la vista se consulta solo (sin modelo) y se dice en una línea.
  const hayBorrador = resultado?.tipo === 'borrador'
  useEffect(() => {
    if (!hayBorrador || soloLectura) return
    let vivo = true
    setServicioSocial(null)
    void socialApi.capacidad(espacioId).then((r) => { if (vivo) setServicioSocial(r.ok) })
    return () => { vivo = false }
  }, [hayBorrador, espacioId, soloLectura])

  const refError = useFocoEnError(error)
  // La respuesta puede tardar: pasados 8 s se avisa que sigue trabajando, para que no parezca trabado.
  const [largo, setLargo] = useState(false)
  useEffect(() => {
    if (!ocupado) {
      setLargo(false)
      return
    }
    const t = setTimeout(() => setLargo(true), 8000)
    return () => clearTimeout(t)
  }, [ocupado])

  // Región que siempre existe y anuncia los cambios (mejora #35). Los errores graves ya se anuncian solos (role="alert").
  const anuncio = ocupado
    ? largo
      ? 'GRU sigue trabajando: puede tardar hasta medio minuto.'
      : 'GRU está buscando un plan.'
    : error?.codigo === 'entrada_incompleta' && error.detalle === 'pocas_preferencias'
      ? 'Faltan preferencias: el agente necesita las de al menos 2 personas.'
      : resultado?.tipo === 'borrador'
      ? `GRU encontró ${resultado.candidatas.length === 1 ? 'una opción' : `${resultado.candidatas.length} opciones`}. Recomendada: ${resultado.titulo}. Es un borrador para revisar.`
      : resultado?.tipo === 'sin_plan_compatible'
        ? 'GRU no encontró un plan compatible.'
        : ''

  const estadoGru = ocupado ? 'buscando' : error ? 'error'
    : resultado?.tipo === 'borrador' ? 'listo'
      : resultado?.tipo === 'sin_plan_compatible' ? 'sin-opcion' : 'disponible'
  const tituloGru = ocupado ? 'Estoy buscando un plan'
    : error ? 'No pude completar la búsqueda'
      : resultado?.tipo === 'borrador' ? 'Tengo una propuesta para el grupo'
        : resultado?.tipo === 'sin_plan_compatible' ? 'Todavía no hay un plan compatible'
          : '¿Qué hacemos este finde?'
  const ayudaGru = ocupado
    ? 'Te aviso cuando la propuesta esté lista. Puedes seguir recorriendo la app.'
    : error ? 'Revisa el aviso de abajo para ver cómo seguir.'
      : resultado?.tipo === 'borrador' ? 'Es un borrador: revísalo antes de usarlo. El grupo decide.'
        : resultado?.tipo === 'sin_plan_compatible' ? 'Podemos volver a intentarlo con otro finde o crear una propuesta a mano.'
          : 'Soy GRU, tu asistente de IA. Te ayudo a encontrar un plan con el clima, los lugares y los gustos del grupo.'

  async function proponer(herramientas = conHerramientas) {
    if (ocupado) return
    const r = await ejecutar(`agente:${espacioId}:${sabado}:${climaPedido ?? 'real'}:${herramientas ? 'h' : 'd'}`, () => {
      setResultado(null)
      setErrorRecuperado(null)
      setHojaSocial(false)
      setConHerramientas(herramientas)
      return buscarConGru(espacioId, sabado, clima, demo, herramientas)
    })
    if (r?.ok && montado.current) setResultado(r.data)
  }

  return (
    <div className="bloque agente-idea">
      <div className="gru-presentacion">
        <GruPersonaje estado={estadoGru} tamano="grande" />
        <div className="gru-presentacion__contenido">
          <p className="gru-presentacion__etiqueta">GRU · Tu asistente de IA</p>
          <h3 className="gru-presentacion__titulo">{tituloGru}</h3>
          <p className="gru-presentacion__ayuda">{ayudaGru}</p>
          <p className="gru-presentacion__estado">{ocupado ? 'Buscando' : error ? 'Necesita atención' : resultado?.tipo === 'borrador' ? 'Propuesta lista' : resultado?.tipo === 'sin_plan_compatible' ? 'Sin opción compatible' : 'Disponible'}</p>
        </div>
      </div>
      <div className="agente-chips">
        <div className="agente-chips-fila" role="group" aria-label="Finde">
          <span className="agente-chips-rotulo">Finde</span>
          {sabados.map((o) => (
            <Chip key={o.v} activo={sabado === o.v} onClick={soloLectura || ocupado ? undefined : () => cambiarSabado(o.v)}>
              {o.texto}
            </Chip>
          ))}
        </div>
        {demo ? (
          <div className="agente-chips-fila" role="group" aria-label="Clima">
            <span className="agente-chips-rotulo">
              Clima <RotuloSimulacion />
            </span>
            {CLIMA_DEMO.map((o) => (
              <Chip key={o.v} activo={clima === o.v} onClick={soloLectura || ocupado ? undefined : () => cambiarClima(o.v)}>
                {o.texto}
              </Chip>
            ))}
          </div>
        ) : null}
      </div>
      <div className="agente-botones">
        {/* Un solo primario: con una opción a la vista, el primario pasa a "Usar esta opción". */}
        <Boton
          variante={resultado?.tipo === 'borrador' ? 'secundario' : 'primario'}
          onClick={() => void proponer(true)}
          ocupado={ocupado}
          ocupadoTexto="El agente está pensando…"
          disabled={soloLectura || !sabado}
        >
          Que el agente arme un plan
        </Boton>
        <small>
          Tarda unos 15 segundos.{' '}
          <button type="button" className="agente-enlace" onClick={() => void proponer(false)} disabled={soloLectura || !sabado || ocupado}>
            Propuesta rápida (sin herramientas)
          </button>
        </small>
      </div>
      {ocupado ? <AgenteTrabajando largo={largo} /> : null}
      <div ref={refError}>
        {error ? <ErrorAgente error={error} espacioId={espacioId} onReintentar={() => void proponer(conHerramientas)} /> : null}
      </div>
      <p className="agente-sr" aria-live="polite">
        {anuncio}
      </p>
      {resultado?.tipo === 'sin_plan_compatible' ? (
        <Aviso tono="aviso" titulo="Sin plan compatible" accion={<PropuestaAMano espacioId={espacioId} />}>
          {resultado.motivo === 'sin_lugar_cerca_para_todos'
            ? 'Ningún plan del catálogo queda dentro del tiempo de viaje de todos. Por privacidad no se dice para quién.'
            : resultado.motivo === 'faltan_personas'
              ? TEXTO_FALTAN_PERSONAS
              : 'Con las preferencias cargadas no hay un plan del catálogo que le sirva a todos. Por privacidad no se muestran los motivos.'}
        </Aviso>
      ) : null}
      {resultado?.tipo === 'borrador' ? (
        <BorradorTarjeta
          espacioId={espacioId}
          b={resultado}
          soloLectura={soloLectura}
          pasos={resultado.pasos}
          personasGrupo={personasGrupo}
          invitar={climaSocial ? { disponible: servicioSocial, abrir: () => setHojaSocial(true) } : null}
        />
      ) : null}
      {resultado?.tipo === 'borrador' && climaSocial && hojaSocial ? (
        <AgenteSocial espacioId={espacioId} sabado={sabado} soloLectura={soloLectura} clima={climaSocial} onCerrar={() => setHojaSocial(false)} />
      ) : null}
    </div>
  )
}

/** Criterios generales de la búsqueda. Los pasos realizados llegan del servidor al terminar. */
const PASOS_TRABAJO = [
  'Las preferencias habilitadas del grupo',
  'El clima disponible para el fin de semana',
  'Los planes del catálogo compatibles con el grupo',
  'Una explicación de la opción elegida',
]

/** La petición no informa progreso por herramienta. Estos son sus criterios, sin pasos completados ficticios. */
function AgenteTrabajando({ largo }: { largo: boolean }) {
  return (
    <div className="bloque agente-trabajando">
      <p className="agente-trabajando-titulo">GRU está trabajando en tu propuesta</p>
      <p className="suave">La búsqueda tiene en cuenta:</p>
      <ul className="sd-pasos">
        {PASOS_TRABAJO.map((p) => <li key={p}>{p}</li>)}
      </ul>
      {largo ? <p className="suave">GRU sigue trabajando: puede tardar hasta medio minuto…</p> : null}
    </div>
  )
}

/** Lo que hizo el agente con herramientas: textos fijos del servidor, sin nombres. */
function PasosAgente({ pasos }: { pasos: string[] }) {
  return (
    <div className="bloque agente-pasos">
      <ol className="sd-pasos sd-escalonado">
        {pasos.map((p, i) => (
          <li key={i} className="sd-paso-hecho">
            {p}
          </li>
        ))}
      </ol>
      <small>Cada paso pasó por las reglas de CRUXE: la IA solo eligió entre opciones que le sirven a todo el grupo.</small>
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
            El resto del espacio funciona igual: puedes crear la propuesta a mano.
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
  // Cuántas personas hay en el grupo, para decir a quiénes cuenta "N opciones para N personas" (E5).
  const [personasGrupo, setPersonasGrupo] = useState<number | null>(null)
  useEffect(() => {
    if (!esOrganizador) return
    let vivo = true
    void api.getSpace(espacioId).then((r) => {
      if (vivo && r.ok) setPersonasGrupo(r.data.espacio.miembros.length)
    })
    return () => {
      vivo = false
    }
  }, [espacioId, esOrganizador])

  return (
    <>
      {/* Pantalla 7 del mockup: arriba el agente (finde, clima y el botón); debajo, "Mis preferencias" en una línea. */}
      {esOrganizador ? (
        <Card id="agente-idea" className="agente-panel">
          <ProponerPlan key={espacioId} espacioId={espacioId} soloLectura={soloLectura} demo={demo} personasGrupo={personasGrupo} />
        </Card>
      ) : (
        <Card id="gru-saludo" className="agente-panel">
          <div className="gru-presentacion">
            <GruPersonaje estado="disponible" tamano="grande" />
            <div className="gru-presentacion__contenido">
              <p className="gru-presentacion__etiqueta">GRU · Tu asistente de IA</p>
              <h3 className="gru-presentacion__titulo">Tus gustos ayudan a encontrar un plan</h3>
              <p className="gru-presentacion__ayuda">Decide qué preferencias puede usar GRU. Son privadas: al grupo le llega la propuesta, nunca lo que pusiste.</p>
            </div>
          </div>
        </Card>
      )}
      <Card id="agente-preferencias" titulo="Mis preferencias" className="agente-panel">
        <PreferenciaTema />
        <MisPreferencias espacioId={espacioId} soloLectura={soloLectura} primario={!esOrganizador} />
      </Card>
    </>
  )
}

export default AgentePanel
