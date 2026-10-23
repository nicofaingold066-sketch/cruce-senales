import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { api } from '../lib/api'
import type { ApiError, Espacio as EspacioT, PropuestaResumen } from '../lib/types'
import { CODIGOS_SIGUIENTE } from '../lib/types'
import { useAccion, useSondeo } from '../lib/hooks'
import { rutas, tomarAviso, useIdentidad, useShell } from '../lib/shell'
import { momentoCorto } from '../lib/format'
import { Avatar, AvatarPila, Aviso, Boton, Cargando, ErrorCaja, InsigniaEstado, Nombre, Progreso, Vacio } from '../components/ui'
import { Icono } from '../components/Icono'
// El panel del agente va en su propia parte del paquete (mejora #14): se descarga solo al abrir el bloque.
const AgentePanel = lazy(() => import('../agente/AgentePanel').then((m) => ({ default: m.AgentePanel })))

export default function Espacio({ espacioId }: { espacioId: string }) {
  const { soloLectura } = useShell()
  const [agenteAbierto, setAgenteAbierto] = useState(false)
  const [espacio, setEspacio] = useState<EspacioT | null>(null)
  const [propuestas, setPropuestas] = useState<PropuestaResumen[] | null>(null)
  const [errorEspacio, setErrorEspacio] = useState<ApiError | null>(null)
  const [errorLista, setErrorLista] = useState<ApiError | null>(null)
  const [aviso, setAviso] = useState<string | null>(() => tomarAviso())

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
    // #52 (F1 de revision-codex-6): en la carga inicial la lista sale antes de conocer la generación (null).
    // Si get_space responde primero, esa lista no es de una generación anterior: se aplica igual, sin otra petición.
    if (mia < aplLista.current || (gen !== null && gen !== generacion.current)) return
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
      setErrorEspacio(null)
      if (reinicio) {
        // Hubo un reinicio real: la lista vieja y las pedidas antes ya no valen.
        setPropuestas([])
        void cargarLista()
      }
    } else setErrorEspacio(r.error)
  }, [espacioId, cargarLista])

  const cargarTodo = useCallback(async () => {
    await Promise.all([cargarEspacio(), cargarLista()])
  }, [cargarEspacio, cargarLista])

  useEffect(() => {
    void cargarTodo()
  }, [cargarTodo])
  // Contrato 4: con la lista visible, list_proposals cada 10 s.
  useSondeo(cargarTodo, 10000)

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

  return (
    <div className="vista">
      <section className="escena" aria-labelledby="espacio-titulo">
        <a className="escena-volver" href={rutas.inicio()}>
          <Icono n="atras" tam={20} /> Tus espacios
        </a>
        <span className="escena-eyebrow">{espacio.demo ? 'Espacio demo · datos ficticios' : 'Tu grupo'}</span>
        <h1 id="espacio-titulo">{espacio.nombre}</h1>
        <div className="espacio-cabeza">
          <AvatarPila personas={espacio.miembros} max={6} />
          <span className="suave">
            {espacio.miembros.length} {espacio.miembros.length === 1 ? 'persona' : 'personas'}
            {yoEnEspacio ? ` · tú: ${esOrganizador ? 'organizador' : 'miembro'}` : ''}
          </span>
        </div>
        <div className="invitar">
          <div className="invitar-codigo">
            <span>Código de invitación</span>
            <strong className="codigo">{espacio.codigo_invitacion}</strong>
          </div>
          <CopiarCodigo codigo={espacio.codigo_invitacion} />
        </div>
      </section>

      <div className="hoja">
        {aviso ? (
          <Aviso tono="ok" accion={<button type="button" className="btn btn-secundario btn-chico" onClick={() => setAviso(null)}>Entendido</button>}>
            {aviso}
          </Aviso>
        ) : null}

        <section aria-labelledby="propuestas-titulo">
          <div className="seccion-titulo" style={{ marginTop: 4 }}>
            <h2 id="propuestas-titulo">Propuestas</h2>
            {propuestas && propuestas.length > 0 ? <span className="etiqueta num">{propuestas.length}</span> : null}
          </div>
          {errorLista && propuestas === null ? <ErrorCaja error={errorLista} onReintentar={cargarLista} /> : null}
          {errorLista && propuestas !== null ? (
            <Aviso tono="aviso">No pudimos actualizar la lista. Se muestra la última información recibida.</Aviso>
          ) : null}
          {propuestas === null && !errorLista ? <Cargando texto="Cargando propuestas…" esqueleto /> : null}
          {propuestas && propuestas.length === 0 ? (
            <Vacio
              titulo="Todavía no hay propuestas"
              texto="Crea la primera: eliges las franjas, los cupos y la persona imprescindible."
              accion={
                <a className="btn btn-primario" href={rutas.nueva(espacioId)} aria-disabled={soloLectura}>
                  <Icono n="mas" tam={20} /> Crear propuesta
                </a>
              }
            />
          ) : null}
          {propuestas && propuestas.length > 0 ? (
            <>
              <ul className="lista-planes">
                {propuestas.map((p) => (
                  <li key={p.id}>
                    <TarjetaPropuesta p={p} espacioId={espacioId} />
                  </li>
                ))}
              </ul>
              <div className="barra-accion">
                <a className="btn btn-primario" href={rutas.nueva(espacioId)}>
                  <Icono n="mas" tam={20} /> Nueva propuesta
                </a>
              </div>
            </>
          ) : null}
        </section>

        <section className="tarjeta" aria-labelledby="personas-titulo">
          <div className="tarjeta-cabeza">
            <h2 id="personas-titulo">Personas del espacio</h2>
            <span className="etiqueta num">{espacio.miembros.length}</span>
          </div>
          <ul className="miembros">
            {espacio.miembros.map((m) => (
              <li key={m.miembro_id}>
                <Avatar nombre={m.nombre} simulado={m.simulado} yo={m.es_yo} />
                <Nombre m={m} yo={m.es_yo} />
                {m.rol === 'organizador' ? <span className="etiqueta">organizador</span> : null}
              </li>
            ))}
          </ul>
          {espacio.demo ? <p className="suave">Espacio de demostración con datos ficticios.</p> : null}
        </section>

        {/* Agente del círculo (enmienda 4): plegado para no estorbar el recorrido de la demo. */}
        <details className="tarjeta plegable agente-plegable" onToggle={(e) => setAgenteAbierto(e.currentTarget.open)}>
          <summary>
            <span className="agente-icono" aria-hidden="true">
              <Icono n="chispa" tam={22} />
            </span>
            <span className="summary-texto">
              <span>Agente del círculo</span>
              <small>Opcional: tus preferencias y una idea de plan</small>
            </span>
          </summary>
          {/* Se monta solo al abrir: plegado no hace llamadas al servidor. */}
          {agenteAbierto ? (
            <Suspense fallback={<Cargando texto="Cargando el agente…" />}>
              <AgentePanel espacioId={espacio.id} esOrganizador={esOrganizador} soloLectura={soloLectura} demo={espacio.demo} />
            </Suspense>
          ) : null}
        </details>

        {/* Enmienda 7 (E7.3): agregar simulados y reiniciar solo existen en espacios demo. */}
        {esOrganizador && espacio.demo ? (
          <HerramientasOrganizador espacio={espacio} deshabilitado={soloLectura} onCambio={cargarTodo} />
        ) : null}
      </div>
    </div>
  )
}

function CopiarCodigo({ codigo }: { codigo: string }) {
  const [copiado, setCopiado] = useState<'si' | 'no' | 'enlace' | null>(null)
  async function compartir() {
    const url = `${window.location.origin}${window.location.pathname}${rutas.unirse(codigo)}`
    try {
      if (navigator.share) {
        await navigator.share({ title: 'CRUXE', text: 'Súmate al plan en CRUXE', url })
        return
      }
      await navigator.clipboard.writeText(url)
      setCopiado('enlace')
    } catch {
      // Cancelar el menú de compartir no es un error para la persona.
    }
  }
  async function copiar() {
    try {
      await navigator.clipboard.writeText(codigo)
      setCopiado('si')
    } catch {
      setCopiado('no')
    }
  }
  return (
    <>
      <div className="invitar-botones">
        <button type="button" className="btn btn-claro btn-chico" onClick={copiar}>
          <Icono n="copiar" tam={18} /> Copiar código
        </button>
        <button type="button" className="btn btn-blanco btn-chico" onClick={() => void compartir()}>
          <Icono n="compartir" tam={18} /> Compartir enlace
        </button>
      </div>
      {copiado === 'si' ? <span role="status">Copiado.</span> : null}
      {copiado === 'no' ? <span role="status">No se pudo copiar; selecciónalo a mano.</span> : null}
      {copiado === 'enlace' ? <span role="status">Enlace copiado: ábrelo en otro teléfono.</span> : null}
    </>
  )
}

function TarjetaPropuesta({ p, espacioId }: { p: PropuestaResumen; espacioId: string }) {
  // Mejora #31: el estado destacado (color + punto) y "Tu turno" salen del servidor:
  // estado de la propuesta y siguiente_accion.codigo (enmienda 3); el booleano solo como respaldo.
  const cod = p.siguiente_accion.codigo
  const conocido = (CODIGOS_SIGUIENTE as readonly string[]).includes(cod)
  const turno = cod === 'te_toca_aceptar' || (!conocido && p.mi_situacion.puede_aceptar)
  const conVersion = p.version != null
  return (
    <a className={`plan-vivo plan-vivo-${p.estado} ${turno ? 'plan-vivo-turno' : ''}`} href={rutas.propuesta(espacioId, p.id)}>
      <span className="pv-arriba">
        <InsigniaEstado estado={p.estado} etiqueta={p.estado_etiqueta} />
        {conVersion ? <span className="etiqueta num">Versión {p.version}</span> : null}
      </span>
      <span className="pv-titulo">{p.titulo}</span>
      {turno || p.mi_situacion?.retirado ? (
        <span className="pv-estado">
          {turno ? <span className="pastilla pastilla-turno">Tu turno</span> : null}
          {p.mi_situacion?.retirado ? <span className="etiqueta">Te retiraste</span> : null}
        </span>
      ) : null}
      <span className={`pv-siguiente ${turno ? 'pv-siguiente-turno' : ''}`}>{p.siguiente_accion.texto}</span>
      {conVersion ? (
        <span className="pv-progreso" style={{ display: 'block' }}>
          <Progreso
            valor={p.confirmados}
            minimo={p.minimo}
            maximo={p.maximo}
            ok={p.estado === 'grupo_confirmado'}
            etiqueta={`${p.confirmados} de ${p.minimo} confirmaron`}
          />
        </span>
      ) : null}
      <span className="pv-meta">
        <span className="num">
          {conVersion ? `${p.confirmados} de ${p.minimo} confirmaron · máx. ${p.maximo}` : `Mínimo ${p.minimo}, máximo ${p.maximo}`} ·{' '}
          {p.plazo_vencido ? 'plazo cerrado' : `cierre ${momentoCorto(p.plazo)}`}
        </span>
        <span className="pv-abrir" aria-hidden="true">
          Abrir <Icono n="chevron" tam={14} />
        </span>
      </span>
    </a>
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
        <span className="fila-icono" aria-hidden="true">
          <Icono n="llave" tam={20} />
        </span>
        <span className="summary-texto">
          <span>
            Herramientas del organizador <span className="rotulo-sim">Simulación</span>
          </span>
          <small>Solo las ves tú, como organizador del espacio.</small>
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
    <div className="bloque">
      <h3>Reiniciar demo</h3>
      <p className="suave">
        Elimina todas las propuestas de este espacio y sus aceptaciones. Conserva las personas.
        {espacio.ultimo_reinicio ? ` Último reinicio: ${momentoCorto(espacio.ultimo_reinicio)}.` : ''}
      </p>
      {!confirmar ? (
        <Boton variante="secundario" onClick={() => setConfirmar(true)} disabled={deshabilitado}>
          Reiniciar demo
        </Boton>
      ) : (
        <Aviso tono="aviso" titulo="¿Reiniciar la demo?">
          Se borran las propuestas de este espacio. No se puede deshacer.
          <div className="fila-botones">
            <Boton variante="peligro" onClick={hacer} ocupado={ocupado} ocupadoTexto="Reiniciando…">
              Sí, reiniciar
            </Boton>
            <Boton variante="secundario" onClick={() => setConfirmar(false)} disabled={ocupado}>
              Cancelar
            </Boton>
          </div>
        </Aviso>
      )}
      {hecho ? <p role="status">{hecho}</p> : null}
      {error ? <ErrorCaja error={error} enfocar /> : null}
    </div>
  )
}
