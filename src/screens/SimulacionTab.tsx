import { useCallback, useEffect, useRef, useState } from 'react'
import { api, nuevoIntento } from '../lib/api'
import { esDemoMakana } from '../lib/casoDemo'
import type { CargarCasoOk } from '../lib/api'
import type { ApiError, Disponibilidad, EstadoPropuesta, MiembroPanel } from '../lib/types'
import { useBorradorCondiciones, useMutacion, useSondeo } from '../lib/hooks'
import { Avatar, Aviso, Boton, Cargando, ErrorCaja, RotuloSimulacion, Vacio } from '../components/ui'
import { Confirmacion, useVolverFoco } from '../components/Confirmacion'
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

export default function SimulacionTab({ p, viva, soloLectura, espacio }: PestanaProps) {
  const makana = esDemoMakana(p) || esDemoMakana(espacio)
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

  // S7 (mockup validado): el primario dice qué hace en palabras de la demo; el nombre accesible sigue siendo el de
  // siempre, que es el que tocan los guiones (jurado-navegador, recorrido-dos-sesiones, plan-b, rincones).
  const delCaso = (miembros ?? []).filter((m) => CASO[m.miembro.nombre.trim().toLowerCase()]).length || (miembros ?? []).length

  return (
    <div className="panel-sim">
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
        <section className="tarjeta sim-hoja" aria-labelledby="sim-titulo">
          <RotuloSimulacion />
          <h2 id="sim-titulo" className="t-subtitulo">
            Personas simuladas
          </h2>
          <p className="t-nota sim-linea">Respondes y confirmas por ellas. Todo queda en el historial como simulación.</p>
          {makana ? <p className="t-nota">Cada respuesta se carga por separado para una propuesta concreta. Pía sigue pendiente hasta que responda; nunca cuenta como confirmada.</p> : null}

          <div className="sim-atajos" role="group" aria-label="Atajos de simulación">
            {!makana && p.mi_situacion.puede.simular ? (
              <Boton
                onClick={guardarTodos.ejecutar}
                ocupado={guardarTodos.ocupado}
                ocupadoTexto="Cargando las respuestas…"
                disabled={soloLectura}
                aria-label="Cargar condiciones del caso a las personas simuladas"
              >
                {delCaso === 1 ? 'Cargar la respuesta del caso' : `Cargar las respuestas de los ${delCaso} de una vez`}
              </Boton>
            ) : !makana ? (
              <p className="t-nota suave">{motivoSinAtajo(p)}</p>
            ) : null}
            {!makana && version != null && puedenAceptar.length > 1 ? (
              // Atajo chico (no está en el mockup; lo usan los guiones de la demo con /^Aceptar versión N por /).
              // Con una sola persona no aparece: su fila ya dice «Aceptar v1».
              <Boton
                variante="secundario"
                className="sim-atajo-chico"
                onClick={aceptarTodos.ejecutar}
                ocupado={aceptarTodos.ocupado}
                ocupadoTexto="Enviando confirmaciones…"
                disabled={soloLectura}
              >
                {`Aceptar versión ${version} por ${puedenAceptar.map((m) => m.miembro.nombre).join(', ')}`}
              </Boton>
            ) : null}
            {guardarTodos.resumen ? (
              <p role="status" className="t-nota">
                {guardarTodos.resumen}
              </p>
            ) : null}
            {aceptarTodos.resumen ? (
              <p role="status" className="t-nota">
                {aceptarTodos.resumen}
              </p>
            ) : null}
          </div>

          <div className="sim-filas sd-escalonado">
            {miembros.map((m) => (
              <FilaSimulado key={m.miembro.miembro_id} m={m} p={p} viva={viva} soloLectura={soloLectura} alCambiar={cargar} />
            ))}
          </div>
        </section>
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

/**
 * La línea de estado de una fila («A: Sí · B: Sí · aceptó la v1»). Solo reformula lo que dice el servidor sobre esta
 * persona; quien la ve es el organizador del demo, que es quien carga sus condiciones.
 */
function lineaEstado(m: MiembroPanel, claves: string[], version: number | null): string {
  const partes: string[] = []
  if (m.condiciones.estado === 'sin_cargar') partes.push(m.interesado ? 'Le interesa · sin responder' : 'Sin responder')
  else partes.push(...claves.map((c) => `${c}: ${ETIQUETA_VALOR[m.condiciones.disponibilidad[c] ?? 'pendiente']}`))
  if (m.retirado) partes.push('se bajó')
  else if (version != null) {
    if (m.acepte_version) partes.push(`aceptó la v${version}`)
    // Si puede aceptar, ya lo dice el botón de la fila («Aceptar v1»).
    else if (!m.puede.aceptar && m.elegible_en_version === false) partes.push(`fuera de la v${version}`)
  }
  return partes.join(' · ')
}

function FilaSimulado({
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
  const [aviso, setAviso] = useState<string | null>(null)
  const { zona, volver } = useVolverFoco<HTMLElement>()
  const version = p.opcion?.version ?? null
  const id = m.miembro.miembro_id
  const nombre = m.miembro.nombre

  async function tras<T>(promesa: Promise<T>) {
    const r = await promesa
    await alCambiar()
    return r
  }

  const interes = (v: boolean) =>
    tras(correr(`s-int:${id}:${v}:${p.state_rev}`, () => api.simulateMarkInterest(p.id, id, v)))
  const guardar = () =>
    tras(correr(`s-cond:${id}:${JSON.stringify(b.draft)}`, () => api.simulateSaveConditions(p.id, id, b.draft)))
  const aceptar = async () => {
    if (version == null) return
    setAviso(null)
    const r = await tras(correr(`s-acc:${p.id}:${id}:${version}`, (intento) => api.simulateAccept(p.id, id, version, intento)))
    // El mismo resumen que el atajo de todos: los guiones esperan «Confirmaron la versión N:».
    if (r?.ok) setAviso(`Confirmaron la versión ${version}: ${nombre}.`)
  }
  const bajar = async () => {
    const r = await tras(correr(`s-baja:${id}:${p.state_rev}`, () => api.simulateWithdraw(p.id, id)))
    if (r?.ok) {
      setConfirmarBaja(false)
      setAviso(null)
    }
  }

  // E7 (recorrido de Nico): "Se baja" solo con una versión publicada; antes no hay nada de qué bajarse a la vista.
  // S7 (mockup): y solo si aceptó esa versión. Si se puede, lo sigue diciendo el servidor (`puede.retirarme`).
  const puedeBaja = m.puede.retirarme && version != null && m.acepte_version
  const puedeAceptar = m.puede.aceptar && version != null
  // Un solo botón por fila, el que corresponde ahora: aceptar, bajarse o, si no hay ninguna de las dos, editar.
  const editable = !puedeAceptar && !puedeBaja && (m.puede.marcar_interes || m.puede.guardar_condiciones)
  const caso = CASO[nombre.trim().toLowerCase()]

  return (
    <section
      ref={zona}
      className={`sim-fila ${m.retirado ? 'sim-fila-baja' : ''} ${editable ? 'sim-fila-editable' : ''}`}
      aria-label={`Simulación de ${nombre}`}
    >
      <div className="sim-fila-cabeza">
        <Avatar nombre={nombre} simulado={m.miembro.simulado} />
        <div className="sim-fila-texto">
          <h3 className="t-cuerpo sim-fila-nombre">{nombre}</h3>
          <p className="t-nota sim-fila-estado">{lineaEstado(m, claves, version)}</p>
        </div>
        {puedeAceptar ? (
          <Boton
            variante="secundario"
            className="sim-fila-accion"
            onClick={() => void aceptar()}
            ocupado={ocupado}
            ocupadoTexto="Enviando…"
            disabled={soloLectura}
            aria-label={`Aceptar versión ${version} por ${nombre}`}
          >
            {`Aceptar v${version}`}
          </Boton>
        ) : puedeBaja && !confirmarBaja ? (
          <Boton
            variante="secundario"
            className="sim-fila-accion"
            onClick={() => setConfirmarBaja(true)}
            disabled={soloLectura}
            aria-label={`Se baja: ${nombre}`}
            data-abre-confirmacion
          >
            Se baja
          </Boton>
        ) : null}
      </div>

      {aviso ? (
        <p role="status" className="t-nota sim-fila-aviso">
          {aviso}
        </p>
      ) : null}

      {confirmarBaja ? (
        <Confirmacion titulo={`¿Dar de baja a ${nombre}?`}>
          Es definitivo en esta propuesta. Si el grupo queda por debajo del mínimo, el plan pasa a En revisión.
          <div className="fila-botones">
            <Boton variante="peligro" onClick={() => void bajar()} ocupado={ocupado} ocupadoTexto="Registrando baja…" aria-label={`Sí, ${nombre} se baja`}>
              {`Sí, ${nombre} se baja`}
            </Boton>
            <Boton variante="secundario" onClick={() => volver(() => setConfirmarBaja(false))} disabled={ocupado} aria-label={`Volver sin dar de baja a ${nombre}`}>
              Volver
            </Boton>
          </div>
        </Confirmacion>
      ) : null}

      {editable ? (
        <details className="sim-editar">
          <summary className="btn btn-secundario sim-fila-accion" aria-label={`Editar interés y condiciones de ${nombre}`}>
            Editar
          </summary>
          <div className="sim-editor">
            {m.puede.marcar_interes ? (
              <div className="fila-botones">
                <Boton variante="secundario" onClick={() => void interes(!m.interesado)} ocupado={ocupado} disabled={soloLectura}>
                  {m.interesado ? `Hoy pasa: ${nombre}` : `Me interesa: ${nombre}`}
                </Boton>
              </div>
            ) : null}
            {m.puede.guardar_condiciones ? (
              <>
                <EditorCondiciones franjas={p.franjas} valor={b.draft} onCambio={b.poner} deshabilitado={soloLectura} prefijo={`sim-${id}`} />
                <div className="fila-botones">
                  {caso ? (
                    <Boton variante="secundario" onClick={() => b.reemplazar(caso)} disabled={soloLectura}>
                      {`Usar valores del caso para ${nombre}`}
                    </Boton>
                  ) : null}
                  <Boton variante="secundario" onClick={() => void guardar()} ocupado={ocupado} disabled={!b.sucio || soloLectura}>
                    {`Guardar condiciones de ${nombre}`}
                  </Boton>
                </div>
              </>
            ) : (
              <p className="t-nota suave">Sus condiciones no se pueden cambiar ahora (forma parte de la versión vigente).</p>
            )}
          </div>
        </details>
      ) : null}
      {error ? <ErrorCaja error={error} enfocar /> : null}
    </section>
  )
}
