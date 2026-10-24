import { useCallback, useEffect, useRef, useState } from 'react'
import { api, nuevoIntento } from '../lib/api'
import type { CargarCasoOk } from '../lib/api'
import type { ApiError, Disponibilidad, EstadoPropuesta, MiembroPanel } from '../lib/types'
import { useBorradorCondiciones, useMutacion, useSondeo } from '../lib/hooks'
import { Avatar, Aviso, Boton, Cargando, ErrorCaja, Nombre, Vacio } from '../components/ui'
import { EditorCondiciones, ETIQUETA_VALOR } from '../components/Condiciones'
import '../estilo/seccion-s7.css'
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
  const revPanel = useRef(-1)
  const revPadre = useRef(p.state_rev)
  revPadre.current = p.state_rev

  // U4 (revisión de Codex): manda el state_rev del servidor; el orden de emisión solo desempata.
  // Nunca se aplica una foto del panel más vieja que la ya aplicada ni que la propuesta que se muestra arriba.
  // Las mutaciones de cada tarjeta recargan al terminar (barrera para cambios con igual revisión).
  const cargar = useCallback(async () => {
    const mia = ++secuencia.current
    const r = await api.getSimulationPanel(p.id)
    if (!r.ok) {
      if (mia >= aplicada.current) setError(r.error)
      return
    }
    const rev = r.data.state_rev
    if (rev < revPanel.current || rev < revPadre.current) return
    if (rev === revPanel.current && mia < aplicada.current) return
    revPanel.current = rev
    aplicada.current = mia
    setMiembros(r.data.simulacion.miembros)
    setError(null)
  }, [p.id])

  useEffect(() => {
    void cargar()
  }, [cargar, p.state_rev])
  useSondeo(cargar, 3000)

  const guardarTodos = useGuardarTodos(p, cargar, viva)

  const version = p.opcion?.version ?? null
  const puedenAceptar = (miembros ?? []).filter((m) => m.puede.aceptar)
  const aceptarTodos = useAceptarTodos(p, puedenAceptar, cargar, viva)

  return (
    <div className="panel-sim">
      <div className="banda-sim" role="note">
        <span className="rotulo-sim rotulo-sim-grande">Simulación</span>
        <span>Actúas por personas ficticias. Queda en el historial como Simulación.</span>
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
          <section className="tarjeta tarjeta-sim sim-atajos" aria-label="Atajos de simulación">
            <h2>Atajos</h2>
            <div className="sim-atajos-botones">
              {p.mi_situacion.puede.simular ? (
                <Boton
                  variante="secundario"
                  onClick={guardarTodos.ejecutar}
                  ocupado={guardarTodos.ocupado}
                  ocupadoTexto="Cargando condiciones…"
                  disabled={soloLectura}
                >
                  Cargar condiciones del caso a las personas simuladas
                </Boton>
              ) : (
                <p className="suave">{motivoSinAtajo(p)}</p>
              )}
              {version != null && puedenAceptar.length > 0 ? (
                <Boton
                  onClick={aceptarTodos.ejecutar}
                  ocupado={aceptarTodos.ocupado}
                  ocupadoTexto="Enviando confirmaciones…"
                  disabled={soloLectura}
                >
                  {/* Con una sola persona, "Aceptar versión 1 por Sofi" se llamaba igual que el botón de su tarjeta (dos
                      botones idénticos; el guion del jurado fallaba según cuándo se refrescaba el panel). */}
                  {puedenAceptar.length === 1
                    ? `Aceptar versión ${version} por quien falta: ${puedenAceptar[0].miembro.nombre}`
                    : `Aceptar versión ${version} por ${puedenAceptar.map((m) => m.miembro.nombre).join(', ')}`}
                </Boton>
              ) : null}
            </div>
            {guardarTodos.resumen ? <p role="status">{guardarTodos.resumen}</p> : null}
            {aceptarTodos.resumen ? <p role="status">{aceptarTodos.resumen}</p> : null}
          </section>
          <div className="sim-lista">
            {miembros.map((m) => (
              <TarjetaSimulado key={m.miembro.miembro_id} m={m} p={p} viva={viva} soloLectura={soloLectura} alCambiar={cargar} />
            ))}
          </div>
        </>
      ) : null}
    </div>
  )
}

const MOTIVO_OMITIDO: Record<string, string> = {
  fuera_del_caso: 'no está en el caso',
  retirado: 'se retiró',
  condiciones_congeladas: 'forma parte de la versión vigente',
}

/** Resumen de simulate_load_case con los nombres que devuelve el servidor. */
function resumenCarga(r: CargarCasoOk['resultado']): string {
  const cargados = r.cargados.map((m) => m.nombre).join(', ')
  const omitidos = r.omitidos.map((o) => `${o.miembro.nombre} (${MOTIVO_OMITIDO[o.motivo] ?? o.motivo})`).join(', ')
  return [
    `En una sola operación: ${cargados ? `cargadas las condiciones de ${cargados}` : 'nadie para cargar'}.`,
    omitidos ? `Sin cambios: ${omitidos}.` : '',
    r.repetido ? 'Era un reintento: no se repitió nada.' : '',
  ]
    .filter(Boolean)
    .join(' ')
}

// Estados en los que el servidor deja simular (cruce.situacion, migración 0028). Solo sirve para explicar el
// motivo: quien decide es siempre `mi_situacion.puede.simular`.
const ESTADOS_ACTIVOS = ['reuniendo_interes', 'esperando_compromisos', 'grupo_confirmado', 'en_revision']

/**
 * Por qué el atajo no está disponible (mejora #51). Esta fila solo la ve el organizador del espacio y solo
 * cuando hay personas simuladas, así que queda que la propuesta no esté activa o que el espacio no sea demo.
 */
function motivoSinAtajo(p: EstadoPropuesta): string {
  if (p.estado === 'borrador') return 'Abre la propuesta para poder cargar el caso a las personas simuladas.'
  if (!ESTADOS_ACTIVOS.includes(p.estado)) {
    return `La propuesta está en estado «${p.estado_etiqueta}»: el caso solo se carga mientras la propuesta está activa.`
  }
  if (!p.mi_situacion.es_organizador_espacio) return 'Solo el organizador del espacio puede cargar el caso a las personas simuladas.'
  return 'La simulación es solo para el espacio de demostración: en este espacio no se puede cargar el caso.'
}

function useGuardarTodos(p: EstadoPropuesta, recargar: () => Promise<void>, viva: PestanaProps['viva']) {
  const [ocupado, setOcupado] = useState(false)
  const [resumen, setResumen] = useState<string | null>(null)
  const intento = useRef<string | null>(null)
  async function ejecutar() {
    if (ocupado) return
    setOcupado(true)
    setResumen(null)
    // Enmienda 3: una sola operación atómica (un solo state_rev). El intento se reutiliza al reintentar el mismo clic.
    intento.current ??= nuevoIntento()
    const r = await api.simulateLoadCase(p.id, intento.current)
    if (r.ok || !r.error.reintentable) intento.current = null
    viva.aplicarResultado(r)
    setResumen(r.ok ? resumenCarga(r.data.resultado) : r.error.mensaje)
    setOcupado(false)
    await recargar()
  }
  return { ocupado, resumen, ejecutar }
}

function useAceptarTodos(
  p: EstadoPropuesta,
  puedenAceptar: MiembroPanel[],
  recargar: () => Promise<void>,
  viva: PestanaProps['viva'],
) {
  const [ocupado, setOcupado] = useState(false)
  const [resumen, setResumen] = useState<string | null>(null)
  async function ejecutar() {
    const version = p.opcion?.version
    if (ocupado || version == null) return
    setOcupado(true)
    setResumen(null)
    const aceptaron: string[] = []
    const no: string[] = []
    for (const m of puedenAceptar) {
      // Una llamada por persona, con su propio intento: el servidor decide cupo, versión y plazo en cada una.
      const r = await api.simulateAccept(p.id, m.miembro.miembro_id, version, nuevoIntento())
      viva.aplicarResultado(r)
      if (r.ok) aceptaron.push(m.miembro.nombre)
      else no.push(`${m.miembro.nombre} (${r.error.mensaje})`)
    }
    setResumen(
      [aceptaron.length ? `Confirmaron la versión ${version}: ${aceptaron.join(', ')}.` : '', no.length ? `No pudieron: ${no.join('; ')}` : '']
        .filter(Boolean)
        .join(' '),
    )
    setOcupado(false)
    await recargar()
  }
  return { ocupado, resumen, ejecutar }
}

type EstadoSim = { clase: string; texto: string }

/** Solo reformula lo que dice el servidor sobre esta persona. */
function estadoSim(m: MiembroPanel, version: number | null): EstadoSim {
  if (m.retirado) return { clase: 'sim-chip-baja', texto: 'Se bajó' }
  if (m.acepte_version) return { clase: 'sim-chip-ok', texto: `Confirmó v${version}` }
  if (m.elegible_en_version === null) return { clase: 'sim-chip-neutro', texto: 'Sin versión publicada' }
  if (m.puede.aceptar) return { clase: 'sim-chip-turno', texto: 'Puede confirmar' }
  if (m.elegible_en_version) return { clase: 'sim-chip-neutro', texto: 'En la versión' }
  return { clase: 'sim-chip-neutro', texto: 'No forma parte' }
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

  // E7 (recorrido de Nico): "Se baja" solo con una versión publicada; antes no hay nada de qué bajarse a la vista.
  // Si se puede, lo sigue diciendo el servidor (`puede.retirarme`).
  const puedeBaja = m.puede.retirarme && version != null
  const caso = CASO[m.miembro.nombre.trim().toLowerCase()]
  const est = estadoSim(m, version)
  const condTexto =
    m.condiciones.estado === 'sin_cargar'
      ? 'Condiciones sin cargar'
      : claves.map((c) => `${c}: ${ETIQUETA_VALOR[m.condiciones.disponibilidad[c] ?? 'pendiente']}`).join(' · ')

  return (
    <section className={`tarjeta tarjeta-sim sim-persona ${m.retirado ? 'sim-persona-baja' : ''}`} aria-label={`Simulación de ${m.miembro.nombre}`}>
      <div className="sim-cabeza">
        <Avatar nombre={m.miembro.nombre} simulado={m.miembro.simulado} />
        <h2>
          <Nombre m={m.miembro} />
        </h2>
        <span className={`sim-chip ${est.clase}`}>{est.texto}</span>
      </div>
      <p className="sim-datos">
        <span>{m.interesado ? 'Le interesa' : 'Sin interés marcado'}</span>
        <span aria-hidden="true"> · </span>
        <span>{condTexto}</span>
      </p>

      {m.puede.aceptar || (puedeBaja && !confirmarBaja) ? (
        <div className="sim-acciones">
          {m.puede.aceptar && version != null ? (
            <Boton variante="secundario" onClick={() => void aceptar()} ocupado={ocupado} ocupadoTexto="Enviando…" disabled={soloLectura} aria-label={`Aceptar versión ${version} por ${m.miembro.nombre}`}>
              {`Aceptar versión ${version} por ${m.miembro.nombre}`}
            </Boton>
          ) : null}
          {puedeBaja && !confirmarBaja ? (
            <Boton variante="secundario" onClick={() => setConfirmarBaja(true)} disabled={soloLectura} aria-label={`Se baja: ${m.miembro.nombre}`}>
              {`Se baja: ${m.miembro.nombre}`}
            </Boton>
          ) : null}
        </div>
      ) : null}
      {confirmarBaja ? (
        <Aviso tono="aviso" titulo={`¿Dar de baja a ${m.miembro.nombre}?`}>
          Es definitivo en esta propuesta. Si el grupo queda por debajo del mínimo, el plan pasa a En revisión.
          <div className="fila-botones">
            <Boton variante="peligro" onClick={() => void bajar()} ocupado={ocupado} ocupadoTexto="Registrando baja…" aria-label={`Sí, ${m.miembro.nombre} se baja`}>
              {`Sí, ${m.miembro.nombre} se baja`}
            </Boton>
            <Boton variante="secundario" onClick={() => setConfirmarBaja(false)} disabled={ocupado} aria-label={`Volver sin dar de baja a ${m.miembro.nombre}`}>
              Volver
            </Boton>
          </div>
        </Aviso>
      ) : null}

      {m.puede.marcar_interes || m.puede.guardar_condiciones ? (
        <details className="sim-editar">
          <summary>{`Editar interés y condiciones de ${m.miembro.nombre}`}</summary>
          {m.puede.marcar_interes ? (
            <div className="fila-botones">
              <Boton variante="secundario" onClick={() => void interes(!m.interesado)} ocupado={ocupado} disabled={soloLectura}>
                {m.interesado ? `Hoy pasa: ${m.miembro.nombre}` : `Me interesa: ${m.miembro.nombre}`}
              </Boton>
            </div>
          ) : null}
          {m.puede.guardar_condiciones ? (
            <>
              <EditorCondiciones franjas={p.franjas} valor={b.draft} onCambio={b.poner} deshabilitado={soloLectura} prefijo={`sim-${id}`} />
              <div className="fila-botones">
                {caso ? (
                  <Boton variante="secundario" onClick={() => b.reemplazar(caso)} disabled={soloLectura}>
                    {`Usar valores del caso para ${m.miembro.nombre}`}
                  </Boton>
                ) : null}
                <Boton onClick={() => void guardar()} ocupado={ocupado} disabled={!b.sucio || soloLectura}>
                  {`Guardar condiciones de ${m.miembro.nombre}`}
                </Boton>
              </div>
            </>
          ) : (
            <p className="suave">Sus condiciones no se pueden cambiar ahora (forma parte de la versión vigente).</p>
          )}
        </details>
      ) : null}
      {error ? <ErrorCaja error={error} enfocar /> : null}
    </section>
  )
}
