import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { api } from '../lib/api'
import type { ApiError, Espacio as EspacioT, Momento, PropuestaResumen } from '../lib/types'
import { useAccion, useSondeo } from '../lib/hooks'
import { irA, parseRuta, rutas, tomarAviso, useIdentidad, useShell } from '../lib/shell'
import { momentoCorto } from '../lib/format'
import { Avatar, AvatarPila, Aviso, Boton, Cargando, ErrorCaja, IconoGrupo, Nombre, Vacio } from '../components/ui'
import { Confirmacion, useVolverFoco } from '../components/Confirmacion'
import { Icono } from '../components/Icono'
import { PlanVivo } from '../components/PlanVivo'
import { ActividadGrupo } from '../actividad-grupo/ActividadGrupo'
import { SalirGrupo } from '../actividad-grupo/SalirGrupo'
import { textoInvitacion, urlWhatsApp } from '../lib/compartir'
import '../estilo/seccion-s2.css'
// El panel del agente va en su propia parte del paquete (mejora #14): se descarga solo al abrir el bloque.
const AgentePanel = lazy(() => import('../agente/AgentePanel').then((m) => ({ default: m.AgentePanel })))

/** `fondo`: dibujado atenuado detrás de Nuevo plan en computadora (C4); no toma el aviso ni sondea. */
export default function Espacio({ espacioId, fondo = false }: { espacioId: string; fondo?: boolean }) {
  const { soloLectura } = useShell()
  // "Contar mis gustos y presupuesto" (Responder, de friccion) deja esta marca para abrir "Mis preferencias".
  const [desdeResponder] = useState(() => {
    try {
      const marca = sessionStorage.getItem('cruxe:abrir-preferencias') === '1'
      sessionStorage.removeItem('cruxe:abrir-preferencias')
      return marca
    } catch {
      return false
    }
  })
  // Pantalla 7 del mockup: el agente es una pantalla propia (#/e/<id>/agente) que monta este mismo componente,
  // así el grupo ya cargado no se vuelve a pedir al ir y volver.
  const [enAgente, setEnAgente] = useState(() => esVistaAgente())
  useEffect(() => {
    const f = () => setEnAgente(esVistaAgente())
    window.addEventListener('hashchange', f)
    return () => window.removeEventListener('hashchange', f)
  }, [])
  // Desde "Contar mis gustos y presupuesto" se llega directo a la pantalla del agente.
  useEffect(() => {
    if (desdeResponder) window.location.replace(rutas.agente(espacioId))
  }, [desdeResponder, espacioId])
  const [verPersonas, setVerPersonas] = useState(false)
  const [gustos, setGustos] = useState<string>('Tus gustos son privados: solo los usa el agente.')
  const [espacio, setEspacio] = useState<EspacioT | null>(null)
  const [servidorAhora, setServidorAhora] = useState<Momento | undefined>()
  const [propuestas, setPropuestas] = useState<PropuestaResumen[] | null>(null)
  const [errorEspacio, setErrorEspacio] = useState<ApiError | null>(null)
  const [errorLista, setErrorLista] = useState<ApiError | null>(null)
  const [aviso, setAviso] = useState<string | null>(() => (fondo ? null : tomarAviso()))

  const yo = espacio?.miembros.find((m) => m.es_yo) ?? null
  useIdentidad(espacio?.nombre ?? null, yo?.nombre ?? null, espacio ? (espacio.mi_rol === 'organizador' ? 'organizador' : 'miembro') : null)


  // U1 (revisión de Codex): las cargas se solapan (sondeo, volver a la pestaña, refresco tras reiniciar).
  // Se aplica solo la respuesta más nueva de cada carga, una lista pedida en otra generación del espacio
  // se descarta, y dentro de la misma generación ninguna propuesta retrocede a un state_rev menor.
  const secEspacio = useRef(0)
  const aplEspacio = useRef(0)
  const secLista = useRef(0)
  const aplLista = useRef(0)
  const generacion = useRef<number | null>(null)

  const cargarLista = useCallback(async () => {
    const mia = ++secLista.current
    const gen = generacion.current
    const r = await api.listProposals(espacioId)
    if (mia < aplLista.current || gen !== generacion.current) return
    aplLista.current = mia
    if (r.ok) {
      const nuevas = r.data.propuestas
      setPropuestas((previas) => {
        const porId = new Map((previas ?? []).map((x) => [x.id, x]))
        return nuevas.map((n) => {
          const v = porId.get(n.id)
          return v && v.state_rev > n.state_rev ? v : n
        })
      })
      setErrorLista(null)
    } else setErrorLista(r.error)
  }, [espacioId])

  const cargarEspacio = useCallback(async () => {
    const mia = ++secEspacio.current
    const r = await api.getSpace(espacioId)
    if (mia < aplEspacio.current) return
    aplEspacio.current = mia
    if (r.ok) {
      // La generación ACTUAL sale de espacio.generacion (enmienda 2, O1), nunca del eco de reset_demo.
      const g = r.data.espacio.generacion
      if (generacion.current != null && g < generacion.current) return // respuesta de antes de un reinicio
      const reinicio = generacion.current != null && g > generacion.current
      generacion.current = g
      setEspacio(r.data.espacio)
      setServidorAhora(r.data.servidor_ahora)
      setErrorEspacio(null)
      if (reinicio) {
        // Hubo un reinicio real: la lista vieja y las pedidas antes ya no valen.
        setPropuestas([])
        void cargarLista()
      }
    } else {
      setErrorEspacio(r.error)
      if (r.error.codigo === 'fuera_de_audiencia') {
        setEspacio(null)
        setPropuestas(null)
      }
    }
  }, [espacioId, cargarLista])

  const cargarTodo = useCallback(async () => {
    // F1 (revisión 6 de Codex): mientras no se conoce la generación, la lista se pide después de get_space.
    // Si se pidieran juntas, la lista quedaría con generación null y se descartaría al llegar get_space primero.
    // Con la generación fijada, se piden en paralelo como siempre.
    if (generacion.current == null) {
      await cargarEspacio()
      await cargarLista()
      return
    }
    await Promise.all([cargarEspacio(), cargarLista()])
  }, [cargarEspacio, cargarLista])

  useEffect(() => {
    void cargarTodo()
  }, [cargarTodo])

  // Agente del círculo (mockup): una línea con tus gustos resumidos. Son tuyos y privados: solo se ven acá.
  // Se pide al cargar y otra vez al volver del agente, por si los cambiaste ahí.
  useEffect(() => {
    if (enAgente) return
    let vivo = true
    void api.getMyPreferences(espacioId).then((r) => {
      if (!vivo || !r.ok) return
      const pr = r.data.preferencias
      if (!pr) {
        setGustos('Todavía no contaste tus gustos. Son privados: solo los usa el agente.')
        return
      }
      const etiqueta = new Map(r.data.opciones.actividades.map((a) => [a.clave, a.etiqueta]))
      const cosas = pr.me_gustaria.map((c) => etiqueta.get(c) ?? c).slice(0, 3)
      const plata = pr.presupuesto === 'ojala_gratis' ? 'ojalá gratis' : pr.presupuesto === 'algo_barato' ? 'algo barato' : null
      setGustos(['Te gusta: ' + cosas.join(', '), plata].filter(Boolean).join(' · ') + '.')
    })
    return () => {
      vivo = false
    }
  }, [espacioId, enAgente])
  // Contrato 4: con la lista visible, list_proposals cada 10 s.
  useSondeo(cargarTodo, 10000, !fondo)

  if (errorEspacio && !espacio) {
    const fuera = errorEspacio.codigo === 'fuera_de_audiencia'
    return (
      <div className="pantalla">
        <ErrorCaja error={errorEspacio} onReintentar={cargarTodo} />
        {fuera ? (
          <a className="btn btn-secundario" href={rutas.inicio()}>
            Volver a tus espacios
          </a>
        ) : null}
      </div>
    )
  }
  if (!espacio) {
    return (
      <div className="vista">
        <section className="escena">
          <a className="escena-volver" href={rutas.inicio()}>
            <Icono n="atras" tam={20} /> Tus espacios
          </a>
        </section>
        <div className="hoja">
          <Cargando texto="Cargando el espacio…" esqueleto />
        </div>
      </div>
    )
  }

  const esOrganizador = espacio.mi_rol === 'organizador'

  const yoEnEspacio = espacio.miembros.find((m) => m.es_yo)
  // Enmienda 9: get_space incluye a quienes el organizador anotó y todavía no entraron (`pendiente`).
  const porEntrar = espacio.miembros.filter((m) => m.pendiente)
  const dentro = espacio.miembros.length - porEntrar.length
  const organizador = espacio.miembros.find((m) => m.rol === 'organizador')

  if (enAgente) {
    return (
      <div className="vista vista-s2 vista-agente">
        {/* Mockup, pantalla 7 (y C7 en computadora): "‹ grupo", título y el panel del agente (agente-ia). */}
        <section className="escena" aria-labelledby="agente-pantalla-titulo">
          <a className="escena-volver" href={rutas.espacio(espacioId)}>
            <Icono n="atras" tam={20} /> {espacio.nombre}
          </a>
          <h1 id="agente-pantalla-titulo">GRU · Planes para el grupo</h1>
        </section>
        <div className="hoja">
          {/* Siempre abierto: el summary oculto queda para los guiones que lo tocan (no lo pliega). */}
          <details id="mis-preferencias" className="agente-plegable s2-agente-pantalla" open>
            <summary className="visualmente-oculto" tabIndex={-1} onClick={(e) => e.preventDefault()}>
              GRU · Planes para el grupo
            </summary>
            <Suspense fallback={<Cargando texto="Cargando el agente…" esqueleto />}>
              <AgentePanel espacioId={espacio.id} esOrganizador={esOrganizador} soloLectura={soloLectura} demo={espacio.demo} />
            </Suspense>
          </details>
        </div>
      </div>
    )
  }

  const ultimaPropuesta = propuestas && propuestas.length > 0 ? propuestas[0] : null

  return (
    <div className="vista vista-s2">
      {/* Mockup validado, pantalla 3 (Nico y Juan, 03:05: exacto). Nivel Grupo: cabecera oscura propia. */}
      <section className="escena" aria-labelledby="espacio-titulo">
        <a className="escena-volver" href={rutas.inicio()}>
          <Icono n="atras" tam={20} /> Grupos
        </a>
        <div className="grupo-cabeza">
          <IconoGrupo nombre={espacio.nombre} />
          <div className="grupo-cabeza-texto">
            <h1 id="espacio-titulo">{espacio.nombre}</h1>
            <span className="grupo-sub">
              {espacio.miembros.length} {espacio.miembros.length === 1 ? 'persona' : 'personas'}
              {yoEnEspacio && esOrganizador ? ' · organizas tú' : ''}
              {espacio.demo ? ' · demo' : ''}
            </span>
          </div>
        </div>
        <div className="espacio-cabeza">
          <AvatarPila personas={espacio.miembros} max={6} />
          <button type="button" className="enlace grupo-personas" onClick={() => setVerPersonas(true)} aria-haspopup="dialog">
            Personas ›
          </button>
        </div>
      </section>

      <div className="hoja">
        <ActividadGrupo actividad={espacio.actividad} espacioId={espacio.id} ahora={servidorAhora} />
        {aviso ? (
          <Aviso tono="ok" accion={<button type="button" className="btn btn-secundario btn-chico" onClick={() => setAviso(null)}>Entendido</button>}>
            {aviso}
          </Aviso>
        ) : null}

        {/* Invitación disponible junto a la actividad compartida y los planes del grupo. */}
        <section className="tarjeta invitar-tarjeta" aria-labelledby="invitar-titulo">
          <div className="invitar-cabeza">
            <h2 id="invitar-titulo">Invitar al grupo</h2>
            <strong className="codigo invitar-codigo-mono">{espacio.codigo_invitacion}</strong>
          </div>
          <CopiarCodigo codigo={espacio.codigo_invitacion} espacioNombre={espacio.nombre} />
          {!espacio.demo && porEntrar.length > 0 ? (
            <p className="suave invitar-nota">
              Faltan: {porEntrar.map((m) => m.nombre).join(', ')}. Cada uno toca su nombre en el enlace, sin cuenta.
            </p>
          ) : null}
          {/* Grupo creado sin la lista: al abrir el enlace no hay nombre para tocar y cada uno escribe el suyo. */}
          {!espacio.demo && esOrganizador && porEntrar.length === 0 && dentro <= 1 ? (
            <p className="suave invitar-nota">Sin la lista, cada uno escribe su nombre en «No estoy en la lista».</p>
          ) : null}
        </section>

        <section className="s2-col-planes" aria-labelledby="propuestas-titulo">
          <div className="seccion-titulo">
            <h2 id="propuestas-titulo">Planes</h2>
            <a className="enlace s2-nuevo-plan" href={rutas.nueva(espacioId)} aria-disabled={soloLectura}>
              + Nuevo plan
              {/* Veinte guiones buscan el enlace por «Crear propuesta»; el nombre accesible lleva los dos. */}
              <span className="visualmente-oculto"> (Crear propuesta)</span>
            </a>
          </div>
          {errorLista && propuestas === null ? <ErrorCaja error={errorLista} onReintentar={cargarLista} /> : null}
          {errorLista && propuestas !== null ? (
            <Aviso tono="aviso">No pudimos actualizar la lista. Se muestra la última información recibida.</Aviso>
          ) : null}
          {propuestas === null && !errorLista ? <Cargando texto="Cargando planes…" esqueleto /> : null}
          {propuestas && propuestas.length === 0 ? (
            <Vacio
              titulo="Todavía no hay planes"
              texto={
                esOrganizador
                  ? 'Elige dos fechas y quién no puede faltar.'
                  : `${organizador ? organizador.nombre : 'Quien organiza'} todavía no armó el plan. Cuando lo haga, te toca decir cuándo puedes.`
              }
            />
          ) : null}
          {propuestas && propuestas.length > 0 ? (
            <ul className="lista-planes">
              {propuestas.map((p) => (
                <li key={p.id}>
                  <PlanVivo p={p} espacioId={espacioId} />
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        {/* Agente del círculo: una línea con tus gustos (privados, solo los ves tú), "Abrir ›" y el botón del agente.
            Las dos cosas llevan a la pantalla del agente. El summary mantiene details.agente-plegable para los guiones. */}
        <section className="tarjeta s2-agente" aria-labelledby="agente-titulo">
          <details className="plegable agente-plegable">
            <summary
              onClick={(e) => {
                e.preventDefault()
                irA(rutas.agente(espacioId))
              }}
            >
              <span className="summary-texto">
                <span id="agente-titulo">GRU · Planes para el grupo</span>
              </span>
              <span className="s2-abrir">Abrir ›</span>
            </summary>
          </details>
          <p className="suave s2-gustos">{gustos}</p>
          {esOrganizador ? (
            <a className="btn btn-secundario s2-agente-boton" href={rutas.agente(espacioId)}>
              Que el agente proponga un plan
            </a>
          ) : null}
        </section>

        {/* Filas plegadas: Simulación (demo, solo quien organiza) e Historial (los planes del grupo). */}
        {esOrganizador && espacio.demo ? (
          <HerramientasOrganizador espacio={espacio} deshabilitado={soloLectura} onCambio={cargarTodo} />
        ) : null}
        <details className="tarjeta plegable s2-fila">
          <summary>
            <span className="summary-texto">
              <span>Historial</span>
            </span>
          </summary>
          {propuestas && propuestas.length > 0 ? (
            <ul className="s2-historial">
              {propuestas.map((p) => (
                <li key={p.id}>
                  <a href={rutas.propuesta(espacioId, p.id)}>
                    <span>{p.titulo}</span>
                    <span className="suave">{p.estado_etiqueta}</span>
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="suave">Todavía no pasó nada en este grupo.</p>
          )}
          {ultimaPropuesta ? (
            <p className="suave">El detalle de cada versión está en el historial de cada plan.</p>
          ) : null}
        </details>
      </div>

      {verPersonas ? (
        <HojaPersonas espacio={espacio} deshabilitado={soloLectura || fondo} cerrar={() => setVerPersonas(false)} />
      ) : null}
    </div>
  )
}

/** "Personas ›": hoja desde abajo con la gente del grupo (sistema: .sd-velo y .sd-hoja-modal). */
function HojaPersonas({ espacio, deshabilitado, cerrar }: { espacio: EspacioT; deshabilitado: boolean; cerrar: () => void }) {
  const { miembros, demo } = espacio
  const caja = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null
    caja.current?.focus()
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cerrar()
    }
    window.addEventListener('keydown', tecla)
    return () => {
      window.removeEventListener('keydown', tecla)
      anterior?.focus()
    }
  }, [cerrar])
  return (
    <>
      <div className="sd-velo" onClick={cerrar} aria-hidden="true" />
      <div ref={caja} className="sd-hoja-modal" role="dialog" aria-modal="true" aria-labelledby="personas-titulo" tabIndex={-1}>
        <div className="s2-hoja-cabeza">
          <h2 id="personas-titulo">Personas del espacio</h2>
          <button type="button" className="s2-cerrar" onClick={cerrar} aria-label="Cerrar">
            <Icono n="cerrar" tam={20} />
          </button>
        </div>
        <ul className="chips-personas">
          {miembros.map((m) => (
            <li key={m.miembro_id} className={m.pendiente ? 'persona-por-entrar' : undefined}>
              <Avatar nombre={m.nombre} simulado={m.simulado} yo={m.es_yo} tam={26} />
              <span className="chip-texto">
                <Nombre m={m} yo={m.es_yo} />
                {m.rol === 'organizador' ? <span className="chip-nota">organizador</span> : null}
                {/* #73: lo anotó el organizador y todavía no entró con el enlace (enmienda 9). */}
                {m.pendiente ? <span className="chip-nota">por entrar</span> : null}
              </span>
            </li>
          ))}
        </ul>
        {demo ? <p className="suave">Grupo de demostración con datos ficticios.</p> : null}
        {espacio.actividad !== undefined ? (
          <SalirGrupo espacioId={espacio.id} nombre={espacio.nombre} esOrganizador={espacio.mi_rol === 'organizador'} deshabilitado={deshabilitado} />
        ) : null}
      </div>
    </>
  )
}

function CopiarCodigo({ codigo, espacioNombre }: { codigo: string; espacioNombre: string }) {
  const [copiado, setCopiado] = useState<'si' | 'no' | 'enlace' | null>(null)
  // El botón confirma la copia por un momento ("¡Copiado!") y vuelve a su estado.
  useEffect(() => {
    if (copiado !== 'si') return
    const t = window.setTimeout(() => setCopiado(null), 1800)
    return () => window.clearTimeout(t)
  }, [copiado])
  // Compartir y Copiar mandan el mismo texto que WhatsApp: el nombre del grupo, qué hacer y el enlace (C-9).
  const texto = textoInvitacion(espacioNombre, codigo)
  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto)
      setCopiado('si')
    } catch {
      setCopiado('no')
    }
  }
  return (
    <>
      {/* Dos botones (mockup): copiar el mensaje con el enlace y mandarlo por WhatsApp. */}
      <div className="invitar-botones s2-invitar-botones">
        <button
          type="button"
          className={`btn btn-secundario ${copiado === 'si' ? 'btn-hecho' : ''}`}
          onClick={copiar}
          aria-label={copiado === 'si' ? 'Invitación copiada' : 'Copiar invitación'}
        >
          {copiado === 'si' ? '¡Listo!' : 'Copiar enlace'}
        </button>
        <a
          className="btn btn-secundario"
          href={urlWhatsApp(textoInvitacion(espacioNombre, codigo))}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Invitar por WhatsApp"
        >
          WhatsApp
        </a>
      </div>
      {copiado === 'si' ? <span role="status">Invitación copiada: pégala en el chat del grupo.</span> : null}
      {copiado === 'no' ? <span role="status">No se pudo copiar; selecciónalo a mano.</span> : null}
      {copiado === 'enlace' ? <span role="status">Enlace copiado: ábrelo en otro teléfono.</span> : null}
    </>
  )
}

function HerramientasOrganizador({
  espacio,
  deshabilitado,
  onCambio,
}: {
  espacio: EspacioT
  deshabilitado: boolean
  onCambio: () => Promise<void>
}) {
  return (
    <details className="tarjeta tarjeta-sim plegable">
      <summary>
        <span className="summary-texto">
          <span>
            Simulación (demo)
            {/* El recorrido e2e comprueba que quien organiza ve estas herramientas por este nombre. */}
            <span className="visualmente-oculto"> Herramientas del organizador</span>
          </span>
        </span>
      </summary>
      <AgregarSimulado espacioId={espacio.id} deshabilitado={deshabilitado} onCambio={onCambio} />
      <ReiniciarDemo espacio={espacio} deshabilitado={deshabilitado} onCambio={onCambio} />
    </details>
  )
}

function AgregarSimulado({
  espacioId,
  deshabilitado,
  onCambio,
}: {
  espacioId: string
  deshabilitado: boolean
  onCambio: () => Promise<void>
}) {
  const [nombre, setNombre] = useState('')
  const { ocupado, error, ejecutar } = useAccion()
  const [hecho, setHecho] = useState<string | null>(null)
  async function hacer(e: FormEvent) {
    e.preventDefault()
    if (!nombre.trim()) return
    const r = await ejecutar(`sim:${nombre.trim()}`, () => api.addSimulatedMember(espacioId, nombre.trim()))
    if (r?.ok) {
      setHecho(`Se agregó a ${nombre.trim()} como persona simulada.`)
      setNombre('')
      await onCambio()
    }
  }
  return (
    <form onSubmit={hacer} noValidate>
      <label className="campo">
        <span>Agregar persona simulada</span>
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={30} />
      </label>
      <Boton type="submit" variante="secundario" ocupado={ocupado} ocupadoTexto="Agregando…" disabled={!nombre.trim() || deshabilitado}>
        Agregar a la simulación
      </Boton>
      {hecho ? <p role="status">{hecho}</p> : null}
      {error ? <ErrorCaja error={error} enfocar /> : null}
    </form>
  )
}

function ReiniciarDemo({
  espacio,
  deshabilitado,
  onCambio,
}: {
  espacio: EspacioT
  deshabilitado: boolean
  onCambio: () => Promise<void>
}) {
  const [confirmar, setConfirmar] = useState(false)
  const { ocupado, error, ejecutar } = useAccion()
  const { zona, volver } = useVolverFoco<HTMLDivElement>()
  const [hecho, setHecho] = useState<string | null>(null)
  async function hacer() {
    // El intento se genera por acción y se reutiliza en los reintentos del mismo clic (useAccion); un reintento
    // con el mismo id no borra nada nuevo.
    const r = await ejecutar(`reset:${espacio.id}`, (intentoId) => api.resetDemo(espacio.id, intentoId))
    if (r && !r.ok && (r.error.resultadoIncierto || r.error.codigo === 'intento_obsoleto')) {
      await onCambio() // refresca el estado real; el intento original se conserva para reintentar
    }
    if (r?.ok) {
      setConfirmar(false)
      setHecho(`Demo reiniciada: se eliminaron ${r.data.resultado.propuestas_eliminadas} propuesta(s). Las personas del espacio se conservan.`)
      await onCambio()
    }
  }
  return (
    <div ref={zona} className="bloque">
      <h3>Reiniciar demo</h3>
      <p className="suave">
        Elimina todas las propuestas de este espacio y sus aceptaciones. Conserva las personas.
        {espacio.ultimo_reinicio ? ` Último reinicio: ${momentoCorto(espacio.ultimo_reinicio)}.` : ''}
      </p>
      {!confirmar ? (
        <Boton variante="secundario" onClick={() => setConfirmar(true)} disabled={deshabilitado} data-abre-confirmacion>
          Reiniciar demo
        </Boton>
      ) : (
        <Confirmacion titulo="¿Reiniciar la demo?">
          Se borran las propuestas de este espacio. No se puede deshacer.
          <div className="fila-botones">
            <Boton variante="peligro" onClick={hacer} ocupado={ocupado} ocupadoTexto="Reiniciando…">
              Sí, reiniciar
            </Boton>
            <Boton variante="secundario" onClick={() => volver(() => setConfirmar(false))} disabled={ocupado}>
              Cancelar
            </Boton>
          </div>
        </Confirmacion>
      )}
      {hecho ? <p role="status">{hecho}</p> : null}
      {error ? <ErrorCaja error={error} enfocar /> : null}
    </div>
  )
}

function esVistaAgente(): boolean {
  const r = parseRuta(window.location.hash)
  return r.nombre === 'espacio' && r.vista === 'agente'
}
