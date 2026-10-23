import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { api } from '../lib/api'
import type { ApiError, Espacio as EspacioT, PropuestaResumen } from '../lib/types'
import { useAccion, useSondeo } from '../lib/hooks'
import { rutas, tomarAviso, useIdentidad, useShell } from '../lib/shell'
import { momentoCorto } from '../lib/format'
import { Aviso, Boton, Cargando, ErrorCaja, InsigniaEstado, Nombre, Vacio } from '../components/ui'

export default function Espacio({ espacioId }: { espacioId: string }) {
  const { soloLectura } = useShell()
  const [espacio, setEspacio] = useState<EspacioT | null>(null)
  const [propuestas, setPropuestas] = useState<PropuestaResumen[] | null>(null)
  const [errorEspacio, setErrorEspacio] = useState<ApiError | null>(null)
  const [errorLista, setErrorLista] = useState<ApiError | null>(null)
  const [aviso, setAviso] = useState<string | null>(() => tomarAviso())

  const yo = espacio?.miembros.find((m) => m.es_yo) ?? null
  useIdentidad(espacio?.nombre ?? null, yo?.nombre ?? null, espacio ? (espacio.mi_rol === 'organizador' ? 'organizador' : 'miembro') : null)

  const cargarEspacio = useCallback(async () => {
    const r = await api.getSpace(espacioId)
    if (r.ok) {
      setEspacio(r.data.espacio)
      setErrorEspacio(null)
    } else setErrorEspacio(r.error)
  }, [espacioId])

  const cargarLista = useCallback(async () => {
    const r = await api.listProposals(espacioId)
    if (r.ok) {
      setPropuestas(r.data.propuestas)
      setErrorLista(null)
    } else setErrorLista(r.error)
  }, [espacioId])

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
      <div className="pantalla">
        <Cargando texto="Cargando el espacio…" />
      </div>
    )
  }

  const esOrganizador = espacio.mi_rol === 'organizador'

  return (
    <div className="pantalla">
      <p>
        <a href={rutas.inicio()}>← Tus espacios</a>
      </p>
      {aviso ? (
        <Aviso tono="ok" accion={<button type="button" className="btn btn-secundario" onClick={() => setAviso(null)}>Entendido</button>}>
          {aviso}
        </Aviso>
      ) : null}

      <h1>{espacio.nombre}</h1>

      <section className="tarjeta">
        <h2>Propuestas</h2>
        {errorLista && propuestas === null ? <ErrorCaja error={errorLista} onReintentar={cargarLista} /> : null}
        {errorLista && propuestas !== null ? (
          <Aviso tono="aviso">No pudimos actualizar la lista. Se muestra la última información recibida.</Aviso>
        ) : null}
        {propuestas === null && !errorLista ? <Cargando texto="Cargando propuestas…" /> : null}
        {propuestas && propuestas.length === 0 ? (
          <Vacio
            titulo="Todavía no hay propuestas"
            texto="Crea la primera: eliges las franjas, los cupos y la persona imprescindible."
            accion={
              <a className="btn btn-primario" href={rutas.nueva(espacioId)} aria-disabled={soloLectura}>
                Crear propuesta
              </a>
            }
          />
        ) : null}
        {propuestas && propuestas.length > 0 ? (
          <>
            <ul className="lista-tarjetas">
              {propuestas.map((p) => (
                <li key={p.id}>
                  <TarjetaPropuesta p={p} espacioId={espacioId} />
                </li>
              ))}
            </ul>
            <a className="btn btn-primario" href={rutas.nueva(espacioId)}>
              Nueva propuesta
            </a>
          </>
        ) : null}
      </section>

      <section className="tarjeta">
        <h2>Personas del espacio</h2>
        <ul className="miembros">
          {espacio.miembros.map((m) => (
            <li key={m.miembro_id}>
              <Nombre m={m} yo={m.es_yo} />
              {m.rol === 'organizador' ? <span className="etiqueta">organizador</span> : null}
            </li>
          ))}
        </ul>
        <p className="suave">
          Código de invitación: <strong className="codigo">{espacio.codigo_invitacion}</strong> <CopiarCodigo codigo={espacio.codigo_invitacion} />
        </p>
        {espacio.demo ? <p className="suave">Espacio de demostración con datos ficticios.</p> : null}
      </section>

      {esOrganizador ? (
        <HerramientasOrganizador espacio={espacio} deshabilitado={soloLectura} onCambio={cargarTodo} />
      ) : null}
    </div>
  )
}

function CopiarCodigo({ codigo }: { codigo: string }) {
  const [copiado, setCopiado] = useState<'si' | 'no' | null>(null)
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
      <button type="button" className="btn btn-secundario btn-chico" onClick={copiar}>
        Copiar código
      </button>
      {copiado === 'si' ? <span role="status"> Copiado.</span> : null}
      {copiado === 'no' ? <span role="status"> No se pudo copiar; selecciónalo a mano.</span> : null}
    </>
  )
}

function TarjetaPropuesta({ p, espacioId }: { p: PropuestaResumen; espacioId: string }) {
  return (
    <a className="tarjeta tarjeta-enlace" href={rutas.propuesta(espacioId, p.id)}>
      <span className="tarjeta-fila">
        <span className="tarjeta-titulo">{p.titulo}</span>
        <InsigniaEstado estado={p.estado} etiqueta={p.estado_etiqueta} />
      </span>
      <span className="tarjeta-meta">
        {p.version != null
          ? `Versión ${p.version} · Confirmaron ${p.confirmados} de ${p.minimo} necesarias · Máximo ${p.maximo}`
          : `Cupos: mínimo ${p.minimo}, máximo ${p.maximo} · Sin versión publicada`}
      </span>
      <span className="tarjeta-meta">
        {p.plazo_vencido ? 'Plazo de aceptación cerrado' : `Cierre de aceptación: ${momentoCorto(p.plazo)}`} · hora de Santiago
      </span>
      <span className="tarjeta-siguiente">
        <strong>Próxima acción:</strong> {p.siguiente_accion.texto}
      </span>
      {p.mi_situacion.puede_aceptar ? <span className="etiqueta etiqueta-destacada">Te toca confirmar</span> : null}
      {p.mi_situacion.retirado ? <span className="etiqueta">Te retiraste</span> : null}
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
    <section className="tarjeta tarjeta-sim">
      <h2>
        Herramientas del organizador <span className="rotulo-sim">Simulación</span>
      </h2>
      <p className="suave">Solo las ves tú, como organizador del espacio.</p>
      <AgregarSimulado espacioId={espacio.id} deshabilitado={deshabilitado} onCambio={onCambio} />
      {espacio.demo ? <ReiniciarDemo espacio={espacio} deshabilitado={deshabilitado} onCambio={onCambio} /> : null}
    </section>
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
      {error ? <ErrorCaja error={error} /> : null}
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
      {error ? <ErrorCaja error={error} /> : null}
    </div>
  )
}
