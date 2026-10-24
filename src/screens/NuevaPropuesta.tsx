import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'
import type { ActividadClave, ApiError, Espacio } from '../lib/types'
import { useAccion } from '../lib/hooks'
import { franjaTexto, momentoCorto, ZONA_VISIBLE } from '../lib/format'
import { dejarAviso, irA, rutas, useIdentidad, useShell } from '../lib/shell'
import { Avatar, Aviso, Boton, Cargando, ErrorCaja } from '../components/ui'
import { Icono } from '../components/Icono'
import type { NombreIcono } from '../components/Icono'
import { tomarBorradorAgente } from '../agente/api'
import { ATAJOS, atajosParaEspacio, ejemploPorSemilla, placeholderPlan } from '../lib/ejemplos'

// Una propuesta se arma con dos momentos posibles (A y B), cada uno un día y una hora de encuentro,
// y una duración aproximada: la hora de fin se calcula sola. El contrato sigue recibiendo inicio y fin
// ("YYYY-MM-DDTHH:MM", hora de Santiago, sin convertir zonas); el servidor valida todo.
type Cierre = 'dia_antes' | 'dos_dias' | 'otro'

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
}

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
}

// Atajos de actividad (apertura, `src/lib/ejemplos.ts`): el que nombra el grupo va primero; "Asado" ya no encabeza siempre.
type Actividad = { titulo: string; icono: NombreIcono; min: number; actividad: string | null }
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
  const { soloLectura } = useShell()
  const [espacio, setEspacio] = useState<Espacio | null>(null)
  const [errorEspacio, setErrorEspacio] = useState<ApiError | null>(null)
  const [paso, setPaso] = useState<'editar' | 'revisar'>('editar')
  const [f, setF] = useState<Formulario | null>(null)
  const { ocupado, error, ejecutar, limpiarError } = useAccion()
  const [faltantes, setFaltantes] = useState(false)
  const [abrirUltimo, setAbrirUltimo] = useState(true)
  const [desdeAgente, setDesdeAgente] = useState(false)
  const flujo = useRef(false)
  const [enCurso, setEnCurso] = useState(false)

  const yo = espacio?.miembros.find((m) => m.es_yo) ?? null
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

  // Cada paso del formulario empieza arriba, como una pantalla nueva.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [paso])

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
    const base: Formulario = espacio.demo
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
        }
    if (borrador) {
      const [a, b] = borrador.franjas
      const dur = Math.round((enUTC(a.fin.slice(0, 10), a.fin.slice(11, 16)).getTime() - enUTC(a.inicio.slice(0, 10), a.inicio.slice(11, 16)).getTime()) / 60000)
      setDesdeAgente(true)
      setF({
        ...base,
        titulo: borrador.titulo,
        aDia: a.inicio.slice(0, 10),
        aHora: a.inicio.slice(11, 16),
        bDia: b.inicio.slice(0, 10),
        bHora: b.inicio.slice(11, 16),
        duracion: dur > 0 ? dur : base.duracion,
      })
      return
    }
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
  function elegirActividad(a: Actividad) {
    const esAtajo = form.titulo.trim() === '' || ATAJOS.some((x) => x.titulo === form.titulo.trim())
    setF({ ...form, titulo: esAtajo ? a.titulo : form.titulo, duracion: a.min, actividad: (a.actividad as ActividadClave | null) ?? null })
    if (error) limpiarError()
  }

  const aInicio = form.aDia && form.aHora ? `${form.aDia}T${form.aHora}` : ''
  const bInicio = form.bDia && form.bHora ? `${form.bDia}T${form.bHora}` : ''
  const aFin = aInicio ? sumarMinutos(form.aDia, form.aHora, form.duracion) : ''
  const bFin = bInicio ? sumarMinutos(form.bDia, form.bHora, form.duracion) : ''
  const plazo = plazoDe(form)

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

  function revisar() {
    if (!completo) {
      setFaltantes(true)
      return
    }
    setFaltantes(false)
    setPaso('revisar')
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
          { inicio: aInicio, fin: aFin },
          { inicio: bInicio, fin: bFin },
        ],
        minimo: Number(form.minimo),
        maximo: Number(form.maximo),
        imprescindibleId: form.imprescindibleId,
        plazo,
        actividad: form.actividad,
        intentoId,
      }),
    )
    if (!r) return
    if (!r.ok) {
      if (r.error.resultadoIncierto || r.error.codigo === 'intento_obsoleto') await cargar() // refresca el espacio
      setPaso('editar') // vuelve al formulario con el campo marcado y todo lo elegido intacto
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

  return (
    <div className="vista">
      <section className="escena escena-compacta" aria-labelledby="nueva-titulo">
        <a className="escena-volver" href={rutas.espacio(espacioId)}>
          <Icono n="atras" tam={20} /> {espacio.nombre}
        </a>
        <span className="escena-eyebrow">{paso === 'editar' ? 'Paso 1 de 2 · El plan' : 'Paso 2 de 2 · Revisar y crear'}</span>
        <h1 id="nueva-titulo">Nueva propuesta</h1>
        <div className="pasos-form" aria-hidden="true">
          <span className="hecho" />
          <span className={paso === 'revisar' ? 'hecho' : ''} />
        </div>
      </section>

      <div className="hoja">
        {paso === 'editar' ? (
          <form
            className="form-compacto"
            onSubmit={(e) => {
              e.preventDefault()
              revisar()
            }}
            noValidate
          >
            {desdeAgente ? (
              <Aviso tono="info" titulo="Borrador del agente">
                Título y momentos vienen del borrador del agente. Revisa cupos, quién no puede faltar y cierre: el agente no crea ni confirma nada.
              </Aviso>
            ) : null}
            {espacio.demo && !desdeAgente ? (
              <p className="nota-caso">
                Precargado con el caso «Los del asado».{' '}
                <button
                  type="button"
                  className="enlace"
                  onClick={() => {
                    const tomi = espacio.miembros.find((m) => m.nombre.toLowerCase() === 'tomi')
                    setF({ ...CASO, imprescindibleId: tomi?.miembro_id ?? form.imprescindibleId })
                  }}
                >
                  Restablecer valores del caso
                </button>
              </p>
            ) : null}
            {faltantes ? <Aviso tono="error">Completa el título y los dos momentos antes de revisar.</Aviso> : null}
            {error ? <ErrorCaja error={error} onReintentar={() => void crear(abrirUltimo)} enfocar /> : null}

            <fieldset className="form-seccion">
              <legend>Qué hacen</legend>
              <div className="carrusel" role="group" aria-label="Atajos de actividad">
                {atajosParaEspacio(espacio.nombre, espacio.familia).map((a) => (
                  <button
                    key={a.titulo}
                    type="button"
                    className={`chip-actividad ${form.titulo.trim() === a.titulo ? 'chip-activo' : ''}`}
                    aria-pressed={form.titulo.trim() === a.titulo}
                    onClick={() => elegirActividad(a)}
                  >
                    <Icono n={a.icono} tam={18} />
                    {a.titulo}
                  </button>
                ))}
              </div>
              <label className="campo">
                <span>Propósito de la propuesta</span>
                <input
                  value={form.titulo}
                  onChange={(e) => poner('titulo', e.target.value)}
                  maxLength={80}
                  placeholder={placeholderPlan(ejemploPorSemilla(espacio.nombre), espacio.familia)}
                  aria-invalid={marcado === 'titulo' || (faltantes && form.titulo.trim() === '') ? true : undefined}
                />
              </label>
            </fieldset>

            <fieldset className={`form-seccion ${marcado === 'franjas' ? 'grupo-error' : ''}`}>
              <legend>Cuándo · dos opciones</legend>
              <p className="suave nota-seccion">El grupo dice en privado cuál le sirve. Si sirven las dos, gana la A.</p>
              {(['A', 'B'] as const).map((clave) => {
                const dia = clave === 'A' ? form.aDia : form.bDia
                const horaSel = clave === 'A' ? form.aHora : form.bHora
                const inicio = clave === 'A' ? aInicio : bInicio
                const fin = clave === 'A' ? aFin : bFin
                return (
                  <div key={clave} className="momento">
                    <div className="momento-cabeza">
                      <span className="franja-letra" aria-hidden="true">
                        {clave}
                      </span>
                      <strong>Opción {clave}</strong>
                      {inicio ? <span className="momento-resumen">{franjaTexto(inicio, fin)}</span> : null}
                    </div>
                    <SelectorDia clave={clave} valor={dia} alElegir={(d) => poner(clave === 'A' ? 'aDia' : 'bDia', d)} />
                    <SelectorHora clave={clave} valor={horaSel} alElegir={(h) => poner(clave === 'A' ? 'aHora' : 'bHora', h)} />
                  </div>
                )
              })}
              <div className="duracion" role="radiogroup" aria-label="Duración aproximada">
                <span className="duracion-etiqueta">
                  <Icono n="reloj" tam={16} /> Dura aprox.
                </span>
                <div className="opciones opciones-compactas">
                  {DURACIONES.map((d) => (
                    <label key={d} className={`opcion-radio ${form.duracion === d ? 'opcion-activa' : ''}`}>
                      <input type="radio" name="duracion" checked={form.duracion === d} onChange={() => poner('duracion', d)} />
                      {duracionTexto(d)}
                    </label>
                  ))}
                </div>
              </div>
            </fieldset>

            <fieldset className={`form-seccion ${marcado === 'cupos' || marcado === 'imprescindible' ? 'grupo-error' : ''}`}>
              <legend>Quiénes</legend>
              <div className="cupos-fila">
                <Contador id="cupo-minimo" etiqueta="Mínimo" valor={form.minimo} onCambio={(v) => poner('minimo', v)} />
                <Contador id="cupo-maximo" etiqueta="Máximo" valor={form.maximo} onCambio={(v) => poner('maximo', v)} />
              </div>
              <p className="suave nota-seccion">El mínimo cuenta a quien es imprescindible.</p>
              <div className="anfitrion-elegir" role="radiogroup" aria-label="Persona que no puede faltar">
                <span className="duracion-etiqueta">
                  <Icono n="anfitrion" tam={16} /> No puede faltar
                </span>
                <div className="carrusel">
                  {espacio.miembros.map((m) => (
                    <label key={m.miembro_id} className={`chip-persona ${form.imprescindibleId === m.miembro_id ? 'chip-activo' : ''}`}>
                      <input
                        type="radio"
                        name="imprescindible"
                        checked={form.imprescindibleId === m.miembro_id}
                        onChange={() => poner('imprescindibleId', m.miembro_id)}
                      />
                      <Avatar nombre={m.nombre} simulado={m.simulado} tam={28} />
                      <span>
                        {m.nombre}
                        {m.simulado ? <span className="visualmente-oculto"> (Simulación)</span> : null}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </fieldset>

            <fieldset className={`form-seccion ${marcado === 'plazo' ? 'grupo-error' : ''}`}>
              <legend>Cierre para confirmar</legend>
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
              {plazo ? (
                <p className="suave nota-seccion">
                  <Icono n="cierre" tam={14} /> Cierra {momentoCorto(plazo)} (hora de Santiago). El servidor decide si se cumplió.
                </p>
              ) : null}
            </fieldset>

            <div className="barra-accion">
              <Boton type="submit" disabled={soloLectura}>
                Revisar antes de crear
              </Boton>
            </div>
          </form>
        ) : (
          <div>
            <div className="ticket">
              <div className="ticket-cabeza">
                <small>Propósito</small>
                <strong>{form.titulo.trim()}</strong>
              </div>
              <dl className="datos">
                <dt>Franja A</dt>
                <dd>{franjaTexto(aInicio, aFin)}</dd>
                <dt>Franja B</dt>
                <dd>{franjaTexto(bInicio, bFin)}</dd>
                <dt>Zona horaria</dt>
                <dd>{ZONA_VISIBLE}</dd>
                <dt>Cupos</dt>
                <dd>
                  Mínimo {form.minimo} (contando a {imprescindible?.nombre ?? 'quien es imprescindible'}), máximo {form.maximo}
                </dd>
                <dt>Imprescindible</dt>
                <dd>{imprescindible?.nombre ?? '—'}</dd>
                <dt>Cierre de aceptación</dt>
                <dd>{momentoCorto(plazo)}</dd>
              </dl>
            </div>
            <p className="suave" style={{ marginTop: 12 }}>
              "Abrir" permite que cada persona marque su interés y cargue sus condiciones. Marcar interés no suma confirmados.
            </p>
            {error ? <ErrorCaja error={error} onReintentar={() => void crear(abrirUltimo)} enfocar /> : null}
            <div className="fila-botones">
              <Boton variante="secundario" onClick={() => void crear(false)} ocupado={ocupado || enCurso} ocupadoTexto="Creando…" disabled={soloLectura}>
                Crear solo el borrador
              </Boton>
              <Boton variante="secundario" onClick={() => setPaso('editar')} disabled={ocupado || enCurso}>
                Volver a editar
              </Boton>
            </div>
            <div className="barra-accion">
              <Boton onClick={() => void crear(true)} ocupado={ocupado || enCurso} ocupadoTexto="Creando…" disabled={soloLectura}>
                Crear y abrir al grupo
              </Boton>
            </div>
          </div>
        )}
      </div>
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
