import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../lib/api'
import { DEMO_MAKANA, esDemoMakana } from '../lib/casoDemo'
import { RONDA_HORAS } from '../lib/types'
import type { ActividadClave, ApiError, Espacio, ReglaMotor, RondaHoras } from '../lib/types'
import { useAccion } from '../lib/hooks'
import { ZONA_VISIBLE } from '../lib/format'
import { dejarAviso, irA, rutas, useIdentidad, useShell } from '../lib/shell'
import { ATAJOS, atajosParaEspacio, ejemploPorSemilla, placeholderPlan } from '../lib/ejemplos'
import type { Atajo } from '../lib/ejemplos'
import { Avatar, Aviso, Boton, Cargando, ErrorCaja } from '../components/ui'
import { Icono } from '../components/Icono'
import { tomarBorradorAgente } from '../agente/api'
import '../estilo/seccion-s3.css'

// C4 (computadora): Nuevo plan es una hoja centrada sobre el grupo atenuado; el grupo se dibuja detrás, inerte.
const EspacioFondo = lazy(() => import('./Espacio'))
const ANCHO = '(min-width: 960px)'

function useAncho(): boolean {
  const [ancho, setAncho] = useState(() => window.matchMedia(ANCHO).matches)
  useEffect(() => {
    const m = window.matchMedia(ANCHO)
    const f = () => setAncho(m.matches)
    m.addEventListener('change', f)
    return () => m.removeEventListener('change', f)
  }, [])
  return ancho
}

// Una propuesta se arma con dos momentos posibles (A y B), cada uno un día y una hora de encuentro,
// y una duración aproximada: la hora de fin se calcula sola. El contrato sigue recibiendo inicio y fin
// ("YYYY-MM-DDTHH:MM", hora de Santiago, sin convertir zonas); el servidor valida todo.
type Cierre = 'dia_antes' | 'dos_dias' | 'otro'

// Enmienda 15: las pantallas quedan listas pero APAGADAS hasta el aviso de cada migración (antes, el servidor
// rechaza los parámetros nuevos). E-c (ronda de opiniones) llega con la 0052; E-d (nombre por plan y "Gana") con la 0053.
const E15_RONDA = true
const E15_DOS_PLANES = true

interface Formulario {
  titulo: string
  aDia: string
  aHora: string
  bDia: string
  bHora: string
  /** Minutos. */
  duracion: number
  minimo: string
  maximo: string
  imprescindibleId: string
  cierre: Cierre
  /** Solo con cierre "otro". */
  plazoOtro: string
  /** Enmienda 14: clave de la actividad del atajo elegido (null = sin actividad; vale en un grupo libre). */
  actividad: ActividadClave | null
  /** Enmienda 15 (E-c): horas de la ronda de opiniones; null = sin ronda (como siempre). */
  rondaHoras: RondaHoras | null
  /** Enmienda 15 (E-d): cómo gana una opción si sirven las dos. */
  regla: ReglaMotor
  /** Enmienda 15 (E-d): nombre corto de cada plan (vacío = sin nombre). */
  aEtiqueta: string
  bEtiqueta: string
}

/** Lo que la enmienda 15 agrega al formulario, con los valores de siempre. */
const SIN_E15 = { rondaHoras: null, regla: 'temprana', aEtiqueta: '', bEtiqueta: '' } as const satisfies Partial<Formulario>

// Valores exactos del caso canónico (contrato, sección 5): A sáb 31 oct y B dom 1 nov, 14:00 a 17:00; cierre jue 29 oct 20:00.
const CASO = {
  titulo: 'Asado en casa de Tomi',
  aDia: '2026-10-31',
  aHora: '14:00',
  bDia: '2026-11-01',
  bHora: '14:00',
  duracion: 180,
  minimo: '4',
  maximo: '6',
  cierre: 'dos_dias' as Cierre,
  plazoOtro: '',
  // El demo es un espacio libre: sin actividad, igual que siempre.
  actividad: null as ActividadClave | null,
  ...SIN_E15,
}

const HORAS = ['12:00', '13:00', '14:00', '17:00', '19:00', '20:00', '21:00']
const DURACIONES = [60, 120, 180, 240]
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

// ---- Aritmética de calendario sobre la hora de pared (UTC solo como contenedor neutro, sin zonas) ----
const dos = (n: number) => String(n).padStart(2, '0')
function enUTC(dia: string, hora = '00:00'): Date {
  const [y, m, d] = dia.split('-').map(Number)
  const [hh, mm] = hora.split(':').map(Number)
  return new Date(Date.UTC(y, m - 1, d, hh || 0, mm || 0))
}
const aTexto = (d: Date) => d.toISOString().slice(0, 16)
const sumarMinutos = (dia: string, hora: string, min: number) => aTexto(new Date(enUTC(dia, hora).getTime() + min * 60000))
const sumarDias = (dia: string, n: number) => aTexto(new Date(enUTC(dia).getTime() + n * 86400000)).slice(0, 10)
function hoy(): string {
  const d = new Date()
  return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`
}
/** Primer sábado con al menos dos días de margen: deja tiempo para que el grupo responda antes del cierre. */
function proximoSabado(): string {
  let d = sumarDias(hoy(), 2)
  while (enUTC(d).getUTCDay() !== 6) d = sumarDias(d, 1)
  return d
}
function partesDia(dia: string) {
  const f = enUTC(dia)
  return { dia: DIAS[f.getUTCDay()], num: f.getUTCDate(), mes: MESES[f.getUTCMonth()] }
}
function plazoDe(form: Formulario): string {
  if (form.cierre === 'otro') return form.plazoOtro
  if (!form.aDia || !form.bDia) return ''
  const primero = form.aDia < form.bDia ? form.aDia : form.bDia
  return `${sumarDias(primero, form.cierre === 'dia_antes' ? -1 : -2)}T20:00`
}
function duracionTexto(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h} h ${m} min` : `${h} h`
}

type Campo = 'titulo' | 'franjas' | 'cupos' | 'plazo' | 'imprescindible'

/** Qué sección del formulario marcar según el error tipado del servidor (contrato 0.5). */
function campoDeError(e: ApiError | null): Campo | null {
  if (!e || e.codigo !== 'entrada_incompleta') return null
  switch (e.detalle) {
    case 'franjas_invalidas':
      return 'franjas'
    case 'cupos_invalidos':
      return 'cupos'
    case 'plazo_invalido':
      return 'plazo'
    case 'imprescindible_invalido':
      return 'imprescindible'
    case 'campo_faltante':
    case 'formato_invalido':
    case 'fuera_de_proposito': // enmienda 14: el mensaje del servidor (TEXTO_FUERA_DE_PROPOSITO) lo muestra ErrorCaja
      return 'titulo'
    default:
      return null
  }
}

export default function NuevaPropuesta({ espacioId }: { espacioId: string }) {
  const ancho = useAncho()
  const { soloLectura } = useShell()
  const [espacio, setEspacio] = useState<Espacio | null>(null)
  const [errorEspacio, setErrorEspacio] = useState<ApiError | null>(null)
  // Mockup validado (pantalla 4): sin paso de revisión; los atajos muestran cuatro y "Más…", y "Más opciones" se abre a mano.
  const [todasLasActividades, setTodasLasActividades] = useState(false)
  const [verMasOpciones, setVerMasOpciones] = useState(false)
  const [f, setF] = useState<Formulario | null>(null)
  const { ocupado, error, ejecutar, limpiarError } = useAccion()
  const [faltantes, setFaltantes] = useState(false)
  const [abrirUltimo, setAbrirUltimo] = useState(true)
  const [desdeAgente, setDesdeAgente] = useState(false)
  // Duración fuera de DURACIONES que trajo un atajo (Pádel 1 h 30 min, Cine 2 h 30 min) o la precarga (borrador del
  // agente): queda como opción más aunque se elija otra, para poder volver a ella.
  const [duracionExtra, setDuracionExtra] = useState<number | null>(null)
  const flujo = useRef(false)
  const [enCurso, setEnCurso] = useState(false)

  const yo = espacio?.miembros.find((m) => m.es_yo) ?? null
  // El caso Makana ofrece Parque primero; los demás grupos conservan el orden por nombre y familia.
  // El ejemplo del placeholder sale del id del grupo y no cambia al escribir.
  const actividades = useMemo(() => atajosParaEspacio(esDemoMakana(espacio) ? 'parque' : espacio?.nombre ?? '', espacio?.familia), [espacio?.nombre, espacio?.familia, espacio?.demo_caso])
  const ej = useMemo(() => ejemploPorSemilla(espacioId), [espacioId])
  useIdentidad(espacio?.nombre ?? null, yo?.nombre ?? null, espacio ? (espacio.mi_rol === 'organizador' ? 'organizador' : 'miembro') : null)

  const cargar = useCallback(async () => {
    const r = await api.getSpace(espacioId)
    if (r.ok) {
      setEspacio(r.data.espacio)
      setErrorEspacio(null)
    } else setErrorEspacio(r.error)
  }, [espacioId])

  useEffect(() => {
    void cargar()
  }, [cargar])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  // Precarga solo una vez que se conoce el espacio. En el espacio demo se usan los valores del caso.
  // En un grupo propio ya viene armado el próximo fin de semana a las 20:00 (crear es tocar dos veces).
  // Si el agente dejó un borrador (se lee una sola vez), su título y sus dos momentos reemplazan esos valores.
  const precargado = useRef(false)
  useEffect(() => {
    if (!espacio || f || precargado.current) return
    precargado.current = true
    const yoM = espacio.miembros.find((m) => m.es_yo)
    const tomi = espacio.miembros.find((m) => m.nombre.toLowerCase() === 'tomi')
    const borrador = tomarBorradorAgente(espacio.id)
    const sabado = proximoSabado()
    const base: Formulario = esDemoMakana(espacio)
      ? { ...CASO, ...DEMO_MAKANA.propuesta, imprescindibleId: yoM?.miembro_id ?? '' }
      : espacio.demo
      ? { ...CASO, imprescindibleId: (tomi ?? yoM)?.miembro_id ?? '' }
      : {
          titulo: '',
          aDia: sabado,
          aHora: '20:00',
          bDia: sumarDias(sabado, 1),
          bHora: '20:00',
          duracion: 120,
          minimo: '2',
          maximo: '6',
          imprescindibleId: yoM?.miembro_id ?? '',
          cierre: 'dia_antes',
          plazoOtro: '',
          actividad: null,
          ...SIN_E15,
        }
    if (borrador) {
      const [a, b] = borrador.franjas
      const dur = Math.round((enUTC(a.fin.slice(0, 10), a.fin.slice(11, 16)).getTime() - enUTC(a.inicio.slice(0, 10), a.inicio.slice(11, 16)).getTime()) / 60000)
      const duracion = dur > 0 ? dur : base.duracion
      setDesdeAgente(true)
      if (!DURACIONES.includes(duracion)) setDuracionExtra(duracion)
      setF({
        ...base,
        // El borrador no trae cupos: el mínimo 4 del caso del asado no vale para un parque. Se parte del 2 de siempre
        // y quien organiza lo ajusta; el servidor valida el cupo (el mínimo real lo calcula el flujo social).
        minimo: '2',
        titulo: borrador.titulo,
        actividad: (borrador.actividad ?? null) as ActividadClave | null,
        minimo: String(borrador.personas?.min ?? 2),
        maximo: String(Math.max(borrador.personas?.min ?? 2, Math.min(Number(base.maximo), borrador.personas?.max ?? 20))),
        aDia: a.inicio.slice(0, 10),
        aHora: a.inicio.slice(11, 16),
        bDia: b.inicio.slice(0, 10),
        bHora: b.inicio.slice(11, 16),
        duracion,
      })
      return
    }
    if (!DURACIONES.includes(base.duracion)) setDuracionExtra(base.duracion)
    setF(base)
  }, [espacio, f])

  if (errorEspacio && !espacio) {
    return (
      <div className="pantalla">
        <ErrorCaja error={errorEspacio} onReintentar={cargar} />
      </div>
    )
  }
  if (!espacio || !f) {
    return (
      <div className="vista">
        <section className="escena escena-compacta">
          <a className="escena-volver" href={rutas.espacio(espacioId)}>
            <Icono n="atras" tam={20} /> Volver al espacio
          </a>
          <h1>Nueva propuesta</h1>
        </section>
        <div className="hoja">
          <Cargando texto="Preparando el formulario…" esqueleto />
        </div>
      </div>
    )
  }

  const form = f
  function poner<K extends keyof Formulario>(k: K, v: Formulario[K]) {
    setF({ ...form, [k]: v })
    if (error) limpiarError()
  }
  function elegirActividad(a: Atajo) {
    const esAtajo = form.titulo.trim() === '' || ATAJOS.some((x) => x.titulo === form.titulo.trim())
    setF({ ...form, titulo: esAtajo ? a.titulo : form.titulo, duracion: a.min, actividad: (a.actividad as ActividadClave | null) ?? null })
    if (!DURACIONES.includes(a.min)) setDuracionExtra(a.min)
    if (error) limpiarError()
  }

  const aInicio = form.aDia && form.aHora ? `${form.aDia}T${form.aHora}` : ''
  const bInicio = form.bDia && form.bHora ? `${form.bDia}T${form.bHora}` : ''
  const aFin = aInicio ? sumarMinutos(form.aDia, form.aHora, form.duracion) : ''
  const bFin = bInicio ? sumarMinutos(form.bDia, form.bHora, form.duracion) : ''
  const plazo = plazoDe(form)
  // Como la hora «propia» de SelectorHora: si un atajo (Pádel 1 h 30 min, Cine 2 h 30 min) o el borrador del agente
  // trae una duración fuera de la lista, aparece como opción más, marcada, y se puede volver a ella (duracionExtra).
  const duraciones = duracionExtra == null ? DURACIONES : [...DURACIONES, duracionExtra].sort((x, y) => x - y)

  const completo =
    form.titulo.trim() !== '' &&
    aInicio !== '' &&
    bInicio !== '' &&
    form.duracion > 0 &&
    form.minimo !== '' &&
    form.maximo !== '' &&
    form.imprescindibleId !== '' &&
    plazo !== ''

  const imprescindible = espacio.miembros.find((m) => m.miembro_id === form.imprescindibleId)
  const marcado = campoDeError(error)
  // Enmienda 15: lo que se manda. Sin la llave encendida, nada (el formulario queda como siempre).
  const etiquetaA = E15_DOS_PLANES ? form.aEtiqueta.trim() : ''
  const etiquetaB = E15_DOS_PLANES ? form.bEtiqueta.trim() : ''
  const reglaEnviar: ReglaMotor | null = E15_DOS_PLANES && form.regla === 'mas_si' ? 'mas_si' : null
  const rondaEnviar: RondaHoras | null = E15_RONDA ? form.rondaHoras : null

  function enviar() {
    if (!completo) {
      setFaltantes(true)
      return
    }
    setFaltantes(false)
    void crear(true)
  }

  async function crear(abrir: boolean) {
    // U2 (revisión de Codex): un solo flujo crear → abrir → navegar. El bloqueo cubre también la apertura,
    // así un segundo clic no puede pedir otra creación con otro intento.
    if (flujo.current) return
    flujo.current = true
    setEnCurso(true)
    try {
      await crearYAbrir(abrir)
    } finally {
      flujo.current = false
      setEnCurso(false)
    }
  }

  async function crearYAbrir(abrir: boolean) {
    setAbrirUltimo(abrir)
    // La huella incluye todos los datos: si cambian, es otro intento (contrato 0.7).
    const huella = JSON.stringify(form)
    const r = await ejecutar(huella, (intentoId) =>
      api.createProposal({
        espacioId,
        titulo: form.titulo.trim(),
        franjas: [
          { inicio: aInicio, fin: aFin, ...(etiquetaA ? { etiqueta: etiquetaA } : {}) },
          { inicio: bInicio, fin: bFin, ...(etiquetaB ? { etiqueta: etiquetaB } : {}) },
        ],
        minimo: Number(form.minimo),
        maximo: Number(form.maximo),
        imprescindibleId: form.imprescindibleId,
        plazo,
        actividad: form.actividad,
        // Enmienda 15: solo se mandan si se apartan de lo de siempre (y con la llave de su migración encendida).
        ...(reglaEnviar ? { regla: reglaEnviar } : {}),
        ...(rondaEnviar ? { rondaHoras: rondaEnviar } : {}),
        intentoId,
      }),
    )
    if (!r) return
    if (!r.ok) {
      if (r.error.resultadoIncierto || r.error.codigo === 'intento_obsoleto') await cargar() // refresca el espacio
      // queda en el formulario con el campo marcado y todo lo elegido intacto
      return
    }
    const propuestaId = r.data.resultado.propuesta_id
    if (abrir) {
      const o = await api.openProposal(propuestaId)
      // Si abrir falla, no se vuelve a crear: se va a ESA propuesta, que queda en borrador con el botón "Abrir".
      if (!o.ok) dejarAviso(`La propuesta se creó, pero no se pudo abrir al grupo (${o.error.mensaje}). Ábrela con el botón "Abrir".`)
    }
    irA(rutas.propuesta(espacioId, propuestaId))
  }

  const actividadesVisibles = todasLasActividades ? actividades : actividades.slice(0, 4)
  const masActividades = actividades.length > 4

  return (
    <>
      {ancho ? (
        <>
          <div className="s3-fondo" aria-hidden="true" inert>
            <Suspense fallback={null}>
              <EspacioFondo espacioId={espacioId} fondo />
            </Suspense>
          </div>
          <div className="sd-velo s3-velo" aria-hidden="true" />
        </>
      ) : null}
    <div className={`vista vista-s3${ancho ? ' s3-centrada sd-hoja-modal' : ''}`} role={ancho ? 'dialog' : undefined} aria-modal={ancho || undefined} aria-labelledby={ancho ? 'nueva-titulo' : undefined}>
      <section className="escena escena-compacta" aria-labelledby="nueva-titulo">
        {/* Mockup validado (pantalla 4): hoja del nivel Grupo, con ✕, "Nuevo plan" y el nombre del grupo. */}
        <div className="s3-cabeza">
          <a className="s3-cerrar" href={rutas.espacio(espacioId)} aria-label={`Cerrar y volver a ${espacio.nombre}`}>
            <Icono n="cerrar" tam={20} />
          </a>
          <div className="s3-titulo">
            <h1 id="nueva-titulo">Nuevo plan</h1>
            <span className="s3-grupo">{espacio.nombre}</span>
          </div>
          <span className="s3-cerrar-espacio" aria-hidden="true" />
        </div>
      </section>

      <div className="hoja">
        <form
          className="form-compacto"
          onSubmit={(e) => {
            e.preventDefault()
            enviar()
          }}
          noValidate
        >
          {desdeAgente ? (
            <Aviso tono="info" titulo="Borrador del agente">
              Título y fechas vienen del agente. Revisa cupos, quién no puede faltar y cierre. El agente no crea ni confirma nada.
            </Aviso>
          ) : null}
          {faltantes ? <Aviso tono="error">Completa el título y las dos fechas.</Aviso> : null}
          {error ? <ErrorCaja error={error} onReintentar={() => void crear(abrirUltimo)} enfocar /> : null}

          <fieldset className="form-seccion s3-bloque">
            <legend>Qué hacen</legend>
            <div className="s3-chips" role="group" aria-label="Atajos de actividad">
              {actividadesVisibles.map((a) => (
                <button
                  key={a.titulo}
                  type="button"
                  className={`chip-actividad ${form.titulo.trim() === a.titulo ? 'chip-activo' : ''}`}
                  aria-pressed={form.titulo.trim() === a.titulo}
                  onClick={() => elegirActividad(a)}
                >
                  {a.titulo}
                </button>
              ))}
              {masActividades && !todasLasActividades ? (
                <button type="button" className="chip-actividad" onClick={() => setTodasLasActividades(true)}>
                  Más…
                </button>
              ) : null}
            </div>
            <label className="campo s3-titulo-plan">
              {/* El rótulo queda para lectores y guiones ("Propósito de la propuesta"); a la vista, solo el campo. */}
              <span className="visualmente-oculto">Propósito de la propuesta</span>
              <input
                value={form.titulo}
                onChange={(e) => poner('titulo', e.target.value)}
                maxLength={80}
                placeholder={placeholderPlan(ej, espacio.familia)}
                aria-invalid={marcado === 'titulo' || (faltantes && form.titulo.trim() === '') ? true : undefined}
              />
            </label>
          </fieldset>

          <fieldset className={`form-seccion s3-bloque ${marcado === 'franjas' ? 'grupo-error' : ''}`}>
            <legend>Cuándo · dos opciones</legend>
            {(['A', 'B'] as const).map((clave) => {
              const dia = clave === 'A' ? form.aDia : form.bDia
              const horaSel = clave === 'A' ? form.aHora : form.bHora
              const etiqueta = clave === 'A' ? form.aEtiqueta : form.bEtiqueta
              return (
                <details key={clave} className="s3-fila s3-momento">
                  <summary>
                    <span className="s3-fila-texto">
                      <strong>{clave}</strong> {diaBreve(dia)}
                      {E15_DOS_PLANES && etiqueta.trim() ? <span className="s3-fila-nota"> · {etiqueta.trim()}</span> : null}
                    </span>
                    <span className="s3-fila-valor">
                      {horaSel} · {duracionTexto(form.duracion)}
                    </span>
                    <span className="s3-fila-icono" aria-hidden="true">
                      <Icono n="borrador" tam={16} />
                    </span>
                    <span className="visualmente-oculto">Editar la opción {clave}</span>
                  </summary>
                  <div className="s3-fila-cuerpo">
                    <SelectorDia clave={clave} valor={dia} alElegir={(d) => poner(clave === 'A' ? 'aDia' : 'bDia', d)} />
                    <SelectorHora clave={clave} valor={horaSel} alElegir={(h) => poner(clave === 'A' ? 'aHora' : 'bHora', h)} />
                    <div className="duracion" role="radiogroup" aria-label={`Duración aproximada de la opción ${clave}`}>
                      <span className="duracion-etiqueta">Dura aprox.</span>
                      <div className="opciones opciones-compactas">
                        {duraciones.map((d) => (
                          <label key={d} className={`opcion-radio ${form.duracion === d ? 'opcion-activa' : ''}`}>
                            <input type="radio" name={`duracion-${clave}`} checked={form.duracion === d} onChange={() => poner('duracion', d)} />
                            {duracionTexto(d)}
                          </label>
                        ))}
                      </div>
                    </div>
                    {E15_DOS_PLANES ? (
                      <label className="campo campo-etiqueta-plan">
                        <span>Nombre de este plan (opcional)</span>
                        <input
                          value={etiqueta}
                          onChange={(e) => poner(clave === 'A' ? 'aEtiqueta' : 'bEtiqueta', e.target.value)}
                          maxLength={40}
                          placeholder={clave === 'A' ? 'Ej.: encuentro tranquilo en el parque' : 'Ej.: café y conversación'}
                        />
                      </label>
                    ) : null}
                  </div>
                </details>
              )
            })}
            <p className="suave nota-seccion s3-gana">
              <span>{reglaEnviar === 'mas_si' ? 'Gana la que pueden más.' : 'Gana la que empieza antes.'}</span>{' '}
              {E15_RONDA || E15_DOS_PLANES ? (
                <>
                  <button type="button" className="enlace" aria-expanded={verMasOpciones} onClick={() => setVerMasOpciones((v) => !v)}>
                    Más opciones
                  </button>{' '}
                  (ronda de opiniones, la que pueden más)
                </>
              ) : null}
            </p>
            {verMasOpciones ? <MasOpciones form={form} poner={poner} /> : null}
          </fieldset>

          <fieldset className={`form-seccion s3-bloque ${marcado === 'cupos' || marcado === 'imprescindible' ? 'grupo-error' : ''}`}>
            <legend className="visualmente-oculto">Quiénes</legend>
            <div className="cupos-fila">
              <Contador id="cupo-minimo" etiqueta="Mínimo" valor={form.minimo} onCambio={(v) => poner('minimo', v)} />
              <Contador id="cupo-maximo" etiqueta="Máximo" valor={form.maximo} onCambio={(v) => poner('maximo', v)} />
            </div>
            <div className="anfitrion-elegir" role="radiogroup" aria-label="Persona que no puede faltar">
              <span className="duracion-etiqueta">No puede faltar</span>
              <div className="s3-avatares">
                {espacio.miembros.map((m) => (
                  <label
                    key={m.miembro_id}
                    className={`s3-avatar-opcion ${form.imprescindibleId === m.miembro_id ? 'chip-activo' : ''}`}
                    title={m.nombre}
                  >
                    <input
                      type="radio"
                      name="imprescindible"
                      checked={form.imprescindibleId === m.miembro_id}
                      onChange={() => poner('imprescindibleId', m.miembro_id)}
                    />
                    <Avatar nombre={m.nombre} simulado={m.simulado} tam={40} />
                    <span className="visualmente-oculto">
                      {m.nombre}
                      {m.simulado ? ' (Simulación)' : ''}
                      {m.pendiente ? ' (por entrar)' : ''}
                    </span>
                  </label>
                ))}
              </div>
              {/* Enmienda 9: `pendiente` = lo anotó el organizador y todavía no entró con el enlace. */}
              {imprescindible?.pendiente ? (
                <p className="suave nota-seccion" role="note">
                  {imprescindible.nombre} todavía no entró con el enlace. Si no entra y marca cuándo puede, no va a haber opción.
                </p>
              ) : null}
            </div>
          </fieldset>

          <fieldset className={`form-seccion s3-bloque ${marcado === 'plazo' ? 'grupo-error' : ''}`}>
            <legend className="visualmente-oculto">Cierre para confirmar</legend>
            <details className="s3-fila s3-cierre" open={form.cierre === 'otro' || marcado === 'plazo' || undefined}>
              <summary>
                <span className="s3-fila-texto">Cierre para confirmar</span>
                <span className="s3-fila-valor">{plazo ? cierreBreve(plazo) : '—'}</span>
                <span className="s3-fila-icono s3-chevron" aria-hidden="true">
                  <Icono n="chevron" tam={16} />
                </span>
              </summary>
              <div className="s3-fila-cuerpo">
                <div className="opciones opciones-compactas" role="radiogroup" aria-label="Cierre de aceptación">
                  {(
                    [
                      ['dia_antes', 'El día antes, 20:00'],
                      ['dos_dias', 'Dos días antes, 20:00'],
                      ['otro', 'Elegir'],
                    ] as const
                  ).map(([v, t]) => (
                    <label key={v} className={`opcion-radio ${form.cierre === v ? 'opcion-activa' : ''}`}>
                      <input type="radio" name="cierre" checked={form.cierre === v} onChange={() => poner('cierre', v)} />
                      {t}
                    </label>
                  ))}
                </div>
                {form.cierre === 'otro' ? (
                  <label className="campo" style={{ marginTop: 10 }}>
                    <span>Cierre de aceptación (hora de {ZONA_VISIBLE})</span>
                    <input type="datetime-local" value={form.plazoOtro} onChange={(e) => poner('plazoOtro', e.target.value)} />
                  </label>
                ) : null}
              </div>
            </details>
          </fieldset>

          <div className="barra-accion">
            <Boton type="submit" ocupado={ocupado || enCurso} ocupadoTexto="Creando…" disabled={soloLectura}>
              Crear y abrir al grupo
            </Boton>
            <p className="s3-nota-final">Cada uno marca en privado cuándo puede. Nadie queda confirmado.</p>
          </div>
        </form>
      </div>
    </div>
    </>
  )
}

/** "Sáb 31 oct" para la fila de una opción. */
function diaBreve(dia: string): string {
  if (!dia) return '—'
  const p = partesDia(dia)
  const d = p.dia.slice(0, 3)
  return `${d.charAt(0).toLocaleUpperCase('es')}${d.slice(1)} ${p.num} ${p.mes}`
}

/** "Jue 29, 20:00" para la fila del cierre. */
function cierreBreve(plazo: string): string {
  const p = partesDia(plazo.slice(0, 10))
  const d = p.dia.slice(0, 3)
  return `${d.charAt(0).toLocaleUpperCase('es')}${d.slice(1)} ${p.num}, ${plazo.slice(11, 16)}`
}

/**
 * Enmienda 15, opcional y plegado: ronda de opiniones (E-c) y cómo gana una opción (E-d). Lo de siempre queda
 * elegido por defecto ("Sin ronda", "La que empieza antes"). El servidor decide el cierre de la ronda y el ganador.
 */
function MasOpciones({ form, poner }: { form: Formulario; poner: <K extends keyof Formulario>(k: K, v: Formulario[K]) => void }) {
  const cambiado = form.rondaHoras !== null || form.regla !== 'temprana'
  return (
    <div className="mas-opciones" data-cambiado={cambiado || undefined}>
      {E15_RONDA ? (
        <div className="mas-opciones-bloque">
          <div className="opciones opciones-compactas" role="radiogroup" aria-label="Ronda de opiniones">
            {([null, ...RONDA_HORAS] as (RondaHoras | null)[]).map((h) => (
              <label key={h ?? 'sin'} className={`opcion-radio ${form.rondaHoras === h ? 'opcion-activa' : ''}`}>
                <input type="radio" name="ronda" checked={form.rondaHoras === h} onChange={() => poner('rondaHoras', h)} />
                {h === null ? 'Sin ronda' : `${h} h`}
              </label>
            ))}
          </div>
          <p className="suave nota-seccion">
            Ronda de opiniones: cuando sale cada versión, el grupo tiene ese tiempo para decir «así no puedo, pero sigo»
            antes de rearmar. Confirmar sigue abierto. Si no cabe antes del cierre, esa versión sale sin ronda.
          </p>
        </div>
      ) : null}
      {E15_DOS_PLANES ? (
        <div className="mas-opciones-bloque">
          <div className="opciones opciones-compactas" role="radiogroup" aria-label="Si sirven las dos, gana">
            {(
              [
                ['temprana', 'La que empieza antes'],
                ['mas_si', 'La que pueden más'],
              ] as const
            ).map(([v, t]) => (
              <label key={v} className={`opcion-radio ${form.regla === v ? 'opcion-activa' : ''}`}>
                <input type="radio" name="regla" checked={form.regla === v} onChange={() => poner('regla', v)} />
                {t}
              </label>
            ))}
          </div>
          <p className="suave nota-seccion">
            Si sirven las dos, ¿cuál gana? Con «La que pueden más», el servidor cuenta en privado cuántos pueden en cada una;
            nadie ve quién eligió qué.
          </p>
        </div>
      ) : null}
    </div>
  )
}

/** Centra el chip elegido dentro de su tira (solo en horizontal: la página no se mueve). */
function useCentrarElegido(valor: string) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const tira = ref.current
    const chip = tira?.querySelector<HTMLElement>('.chip-activo')
    if (!tira || !chip) return
    const izquierda = chip.offsetLeft - tira.clientWidth / 2 + chip.clientWidth / 2
    tira.scrollTo({ left: Math.max(0, izquierda), behavior: 'smooth' })
  }, [valor])
  return ref
}

/** Tira de próximos días (14) para elegir el día de una opción. Si el elegido queda fuera, se agrega al principio. */
function SelectorDia({ clave, valor, alElegir }: { clave: string; valor: string; alElegir: (d: string) => void }) {
  const inicio = hoy()
  const dias = Array.from({ length: 14 }, (_, i) => sumarDias(inicio, i))
  if (valor && !dias.includes(valor)) dias.unshift(valor)
  const ref = useCentrarElegido(valor)
  return (
    <div className="carrusel carrusel-dias" role="radiogroup" aria-label={`Día de la opción ${clave}`} ref={ref}>
      {dias.map((d) => {
        const p = partesDia(d)
        const activo = d === valor
        return (
          <label key={d} className={`chip-dia ${activo ? 'chip-activo' : ''}`} aria-label={`${p.dia} ${p.num} ${p.mes}`}>
            <input type="radio" name={`dia-${clave}`} checked={activo} onChange={() => alElegir(d)} />
            <span className="chip-dia-sem" aria-hidden="true">
              {p.dia.slice(0, 3)}
            </span>
            <span className="chip-dia-num" aria-hidden="true">
              {p.num}
            </span>
          </label>
        )
      })}
    </div>
  )
}

/** Horas de encuentro habituales y una propia. Solo se elige el inicio: la duración define el fin. */
function SelectorHora({ clave, valor, alElegir }: { clave: string; valor: string; alElegir: (h: string) => void }) {
  const propia = valor !== '' && !HORAS.includes(valor)
  const ref = useCentrarElegido(valor)
  return (
    <div className="carrusel carrusel-horas" role="radiogroup" aria-label={`Hora de encuentro de la opción ${clave}`} ref={ref}>
      {HORAS.map((h) => (
        <label key={h} className={`chip-hora ${valor === h ? 'chip-activo' : ''}`}>
          <input type="radio" name={`hora-${clave}`} checked={valor === h} onChange={() => alElegir(h)} />
          {h}
        </label>
      ))}
      <label className={`chip-hora chip-hora-otra ${propia ? 'chip-activo' : ''}`}>
        <span className="visualmente-oculto">Otra hora para la opción {clave}</span>
        <input type="time" value={propia ? valor : ''} onChange={(e) => e.target.value && alElegir(e.target.value)} aria-label={`Otra hora para la opción ${clave}`} />
      </label>
    </div>
  )
}

/** Contador − n + para cupos. Solo ayuda a escribir el número; el servidor valida los cupos. */
function Contador({
  id,
  etiqueta,
  valor,
  onCambio,
}: {
  id: string
  etiqueta: string
  valor: string
  onCambio: (v: string) => void
}) {
  const n = Number(valor)
  const mover = (d: number) => onCambio(String(Math.min(20, Math.max(2, (Number.isFinite(n) && valor !== '' ? n : 2) + d))))
  return (
    <div className="cupo">
      <label htmlFor={id} className="cupo-etiqueta">
        {etiqueta}
      </label>
      <div className="contador">
        <button type="button" onClick={() => mover(-1)} disabled={valor !== '' && n <= 2} aria-label={`Restar uno al ${etiqueta.toLowerCase()}`}>
          <Icono n="menos" tam={18} />
        </button>
        <input id={id} type="number" inputMode="numeric" min={2} max={20} value={valor} onChange={(e) => onCambio(e.target.value)} />
        <button type="button" onClick={() => mover(1)} disabled={valor !== '' && n >= 20} aria-label={`Sumar uno al ${etiqueta.toLowerCase()}`}>
          <Icono n="mas" tam={18} />
        </button>
      </div>
    </div>
  )
}
