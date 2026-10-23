import { useCallback, useEffect, useRef, useState } from 'react'
import { api, nuevoIntento } from '../lib/api'
import type { ApiError, Disponibilidad, EstadoPropuesta, MiembroPanel } from '../lib/types'
import { normalizar, useBorradorCondiciones, useMutacion, useSondeo } from '../lib/hooks'
import { Aviso, Boton, Cargando, ErrorCaja, Nombre, Vacio } from '../components/ui'
import { EditorCondiciones, ETIQUETA_VALOR } from '../components/Condiciones'
import type { PestanaProps } from './tabs'

// Valores del caso canónico (contrato, sección 5). Datos ficticios; atajo opcional, nada se guarda hasta pulsar Guardar.
const CASO: Record<string, Disponibilidad> = {
  luna: { A: 'si', B: 'si' },
  mati: { A: 'si', B: 'si' },
  caro: { A: 'si', B: 'no' },
  fede: { A: 'no', B: 'si' },
  sofi: { A: 'no', B: 'si' },
}

export default function SimulacionTab({ p, viva, soloLectura }: PestanaProps) {
  const [miembros, setMiembros] = useState<MiembroPanel[] | null>(null)
  const [error, setError] = useState<ApiError | null>(null)
  const secuencia = useRef(0)
  const aplicada = useRef(0)

  // Gana siempre la última consulta emitida: una respuesta atrasada no pisa a una más nueva.
  const cargar = useCallback(async () => {
    const mia = ++secuencia.current
    const r = await api.getSimulationPanel(p.id)
    if (mia < aplicada.current) return
    aplicada.current = mia
    if (r.ok) {
      setMiembros(r.data.simulacion.miembros)
      setError(null)
    } else setError(r.error)
  }, [p.id])

  useEffect(() => {
    void cargar()
  }, [cargar, p.state_rev])
  useSondeo(cargar, 3000)

  const guardarTodos = useGuardarTodos(p, miembros, cargar, viva)

  return (
    <div className="panel-sim">
      <div className="banda-sim" role="note">
        <span className="rotulo-sim rotulo-sim-grande">Simulación</span>
        <span>
          Estás actuando por personas simuladas (ficticias). Cada acción queda en el historial como Simulación,
          ejecutada por ti. Solo el organizador ve este panel.
        </span>
      </div>

      {error && miembros === null ? <ErrorCaja error={error} onReintentar={cargar} /> : null}
      {error && miembros !== null ? (
        <Aviso tono="aviso">No pudimos actualizar el panel. Se muestra la última información recibida.</Aviso>
      ) : null}
      {miembros === null && !error ? <Cargando texto="Cargando el panel de simulación…" /> : null}
      {miembros && miembros.length === 0 ? (
        <Vacio
          titulo="No hay personas simuladas"
          texto="Las personas que reclamaron su lugar con el código ya no aparecen aquí. Puedes agregar personas simuladas desde la pantalla del espacio."
        />
      ) : null}

      {miembros && miembros.length > 0 ? (
        <>
          <section className="tarjeta tarjeta-sim">
            <h2>
              Atajos <span className="rotulo-sim">Simulación</span>
            </h2>
            <p className="suave">Guarda de una vez las condiciones del caso para las personas simuladas que puedan cambiarlas.</p>
            <Boton
              variante="secundario"
              onClick={guardarTodos.ejecutar}
              ocupado={guardarTodos.ocupado}
              ocupadoTexto="Guardando condiciones del caso…"
              disabled={soloLectura}
            >
              Cargar condiciones del caso a las personas simuladas
            </Boton>
            {guardarTodos.resumen ? <p role="status">{guardarTodos.resumen}</p> : null}
          </section>
          {miembros.map((m) => (
            <TarjetaSimulado key={m.miembro.miembro_id} m={m} p={p} viva={viva} soloLectura={soloLectura} alCambiar={cargar} />
          ))}
        </>
      ) : null}
    </div>
  )
}

function useGuardarTodos(
  p: EstadoPropuesta,
  miembros: MiembroPanel[] | null,
  recargar: () => Promise<void>,
  viva: PestanaProps['viva'],
) {
  const [ocupado, setOcupado] = useState(false)
  const [resumen, setResumen] = useState<string | null>(null)
  const intento = useRef<string | null>(null)
  async function ejecutar() {
    if (!miembros || ocupado) return
    setOcupado(true)
    setResumen(null)
    // Enmienda 3: una sola operación atómica. El intento se reutiliza si hay que reintentar el mismo clic.
    intento.current ??= nuevoIntento()
    const atomica = await api.simulateLoadCase(p.id, intento.current)
    if (atomica.ok || !atomica.error.reintentable) intento.current = null
    if (atomica.ok || atomica.error.detalle !== 'operacion_no_publicada') {
      viva.aplicarResultado(atomica)
      setResumen(
        atomica.ok
          ? 'Condiciones del caso cargadas a las personas simuladas, en una sola operación.'
          : atomica.error.mensaje,
      )
      setOcupado(false)
      await recargar()
      return
    }
    // El servidor todavía no publicó simulate_load_case: se guarda persona por persona, como antes.
    intento.current = null
    let ok = 0
    let omitidos = 0
    let fallos = 0
    for (const m of miembros) {
      const caso = CASO[m.miembro.nombre.trim().toLowerCase()]
      if (!caso || !m.puede.guardar_condiciones) {
        omitidos++
        continue
      }
      const r = await api.simulateSaveConditions(p.id, m.miembro.miembro_id, normalizar(caso, p.franjas.map((f) => f.clave)))
      if (r.ok) {
        ok++
        viva.aplicarResultado(r)
      } else fallos++
    }
    setResumen(`Guardadas: ${ok}. Omitidas (sin valores del caso o sin permiso ahora): ${omitidos}. Con error: ${fallos}.`)
    setOcupado(false)
    await recargar()
  }
  return { ocupado, resumen, ejecutar }
}

function TarjetaSimulado({
  m,
  p,
  viva,
  soloLectura,
  alCambiar,
}: {
  m: MiembroPanel
  p: EstadoPropuesta
  viva: PestanaProps['viva']
  soloLectura: boolean
  alCambiar: () => Promise<void>
}) {
  const claves = p.franjas.map((f) => f.clave)
  const b = useBorradorCondiciones(m.condiciones.disponibilidad, claves)
  const { ocupado, error, correr } = useMutacion(viva)
  const [confirmarBaja, setConfirmarBaja] = useState(false)
  const version = p.opcion?.version ?? null
  const id = m.miembro.miembro_id

  async function tras<T>(promesa: Promise<T>) {
    const r = await promesa
    await alCambiar()
    return r
  }

  const interes = (v: boolean) =>
    tras(correr(`s-int:${id}:${v}:${p.state_rev}`, () => api.simulateMarkInterest(p.id, id, v)))
  const guardar = () =>
    tras(correr(`s-cond:${id}:${JSON.stringify(b.draft)}`, () => api.simulateSaveConditions(p.id, id, b.draft)))
  const aceptar = () => {
    if (version == null) return Promise.resolve(null)
    return tras(correr(`s-acc:${p.id}:${id}:${version}`, (intento) => api.simulateAccept(p.id, id, version, intento)))
  }
  const bajar = async () => {
    const r = await tras(correr(`s-baja:${id}:${p.state_rev}`, () => api.simulateWithdraw(p.id, id)))
    if (r?.ok) setConfirmarBaja(false)
  }

  const caso = CASO[m.miembro.nombre.trim().toLowerCase()]

  return (
    <section className="tarjeta tarjeta-sim" aria-label={`Simulación de ${m.miembro.nombre}`}>
      <h2>
        <Nombre m={m.miembro} />
      </h2>
      <dl className="datos">
        <dt>Interés</dt>
        <dd>{m.interesado ? 'Me interesa' : 'Sin interés marcado'}</dd>
        <dt>Condiciones</dt>
        <dd>
          {claves.map((c) => `${c}: ${ETIQUETA_VALOR[m.condiciones.disponibilidad[c] ?? 'pendiente']}`).join(' · ')} (
          {m.condiciones.estado === 'completas' ? 'completas' : m.condiciones.estado === 'incompletas' ? 'incompletas' : 'sin cargar'})
        </dd>
        <dt>Versión vigente</dt>
        <dd>
          {m.retirado
            ? 'Se retiró de esta propuesta'
            : m.acepte_version
              ? `Confirmó la versión ${version}`
              : m.elegible_en_version === null
                ? 'Sin versión publicada'
                : m.elegible_en_version
                  ? 'Puede confirmar; aún no lo hizo'
                  : 'No forma parte de esta versión'}
        </dd>
      </dl>

      <div className="fila-botones">
        <Boton variante="secundario" onClick={() => void interes(true)} disabled={!m.puede.marcar_interes || m.interesado || soloLectura} ocupado={ocupado}>
          Me interesa (por {m.miembro.nombre})
        </Boton>
        <Boton variante="secundario" onClick={() => void interes(false)} disabled={!m.puede.marcar_interes || !m.interesado || soloLectura} ocupado={ocupado}>
          Hoy pasa
        </Boton>
      </div>

      <h3>Condiciones de {m.miembro.nombre}</h3>
      <EditorCondiciones
        franjas={p.franjas}
        valor={b.draft}
        onCambio={b.poner}
        deshabilitado={!m.puede.guardar_condiciones || soloLectura}
        prefijo={`sim-${id}`}
      />
      <div className="fila-botones">
        {caso ? (
          <Boton variante="secundario" onClick={() => b.reemplazar(caso)} disabled={!m.puede.guardar_condiciones || soloLectura}>
            Usar valores del caso
          </Boton>
        ) : null}
        <Boton onClick={() => void guardar()} ocupado={ocupado} disabled={!m.puede.guardar_condiciones || !b.sucio || soloLectura}>
          Guardar condiciones
        </Boton>
      </div>
      {!m.puede.guardar_condiciones ? (
        <p className="suave">Ahora no se pueden cambiar sus condiciones (por ejemplo, forma parte de la versión vigente).</p>
      ) : null}

      <div className="fila-botones">
        <Boton
          onClick={() => void aceptar()}
          ocupado={ocupado}
          ocupadoTexto="Enviando…"
          disabled={!m.puede.aceptar || soloLectura || version == null}
        >
          {version != null ? `Aceptar versión ${version} por ${m.miembro.nombre}` : 'Aceptar versión'}
        </Boton>
        {m.puede.retirarme && !confirmarBaja ? (
          <Boton variante="secundario" onClick={() => setConfirmarBaja(true)} disabled={soloLectura}>
            Se baja
          </Boton>
        ) : null}
      </div>
      {confirmarBaja ? (
        <Aviso tono="aviso" titulo={`¿Dar de baja a ${m.miembro.nombre}?`}>
          Es definitivo en esta propuesta. Si el grupo queda por debajo del mínimo, el plan pasa a En revisión.
          <div className="fila-botones">
            <Boton variante="peligro" onClick={() => void bajar()} ocupado={ocupado} ocupadoTexto="Registrando baja…">
              Sí, se baja
            </Boton>
            <Boton variante="secundario" onClick={() => setConfirmarBaja(false)} disabled={ocupado}>
              Volver
            </Boton>
          </div>
        </Aviso>
      ) : null}
      {error ? <ErrorCaja error={error} /> : null}
    </section>
  )
}
