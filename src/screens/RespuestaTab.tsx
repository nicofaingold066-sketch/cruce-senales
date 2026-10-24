import { useCallback, useEffect, useState } from 'react'
import { api } from '../lib/api'
import type { ApiError, Condiciones, EstadoPropuesta, Preferencia } from '../lib/types'
import { useBorradorCondiciones, useMutacion } from '../lib/hooks'
import { Aviso, Boton, Cargando, ErrorCaja } from '../components/ui'
import { Icono } from '../components/Icono'
import { vibrar } from '../lib/tacto'
import { EditorCondiciones } from '../components/Condiciones'
import type { PestanaProps } from './tabs'
import { AyudaRetiro } from '../componentes-nuevos/AyudaRetiro'
import { TomarDeCalendario } from '../friccion/Calendario'

// Enmienda 15 (E-d): "¿cuál prefieres?" queda APAGADO hasta el aviso de la 0053 (antes el servidor responde
// `disponibilidad_invalida` si llega `prefiero`).
const E15_PREFIERO = false

const ESTADO_COND: Record<string, string> = {
  sin_cargar: 'Sin cargar',
  incompletas: 'Incompletas',
  completas: 'Completas',
}

export default function RespuestaTab({ p, viva, soloLectura, espacio, irAPestana }: PestanaProps) {
  const s = p.mi_situacion
  return (
    <div>
      <div className="privado privado-linea" role="note">
        <span className="privado-icono" aria-hidden="true">
          <Icono n="candado" tam={16} />
        </span>
        <div>
          <strong>Tus condiciones no se muestran al grupo</strong>
          <p>Solo el servidor las ve para armar la opción. Nadie ve cuáles son; solo quien organiza ve cuántas personas respondieron.</p>
        </div>
      </div>
      {s.retirado ? (
        <Aviso tono="aviso" titulo="Te retiraste de esta propuesta">
          Ya no puedes participar en ella.
        </Aviso>
      ) : null}
      {/* Primero lo que usa el motor (las condiciones); "Me interesa" es opcional y va después. */}
      <MisCondiciones p={p} viva={viva} soloLectura={soloLectura} demo={espacio?.demo === true} irAPestana={irAPestana} />
      <Interes p={p} viva={viva} soloLectura={soloLectura} />
      <Retiro p={p} viva={viva} soloLectura={soloLectura} />
    </div>
  )
}

type VivaProps = Pick<PestanaProps, 'p' | 'viva' | 'soloLectura'>

function Interes({ p, viva, soloLectura }: VivaProps) {
  const s = p.mi_situacion
  const { ocupado, error, correr } = useMutacion(viva)
  const [nota, setNota] = useState<string | null>(null)
  async function marcar(v: boolean) {
    setNota(null)
    const r = await correr(`interes:${p.id}:${v}`, () => api.markInterest(p.id, v))
    if (r?.ok) {
      vibrar(10)
      setNota(v ? 'Marcaste "Me interesa". Esto no es una confirmación.' : 'Quitamos tu interés. Puedes volver a marcarlo cuando quieras.')
    }
  }
  return (
    <section className="tarjeta">
      <div className="tarjeta-cabeza">
        <h2>¿Avisar que te interesa?</h2>
        {/* Etiqueta neutra: el verde es de "confirmó" y el interés no lo es. */}
        <span className="etiqueta">
          {s.interesado ? (
            <>
              <span className="visualmente-oculto">Estado: </span>Me interesa
            </>
          ) : (
            'Opcional'
          )}
        </span>
      </div>
      <p className="suave">
        La opción se arma con tus condiciones, no con esto. Si quieres, avisa que te interesa: el grupo verá tu nombre.
        Interés no es confirmación: no suma confirmados. Tampoco el silencio.
      </p>
      <div className="interes-botones">
        <Boton
          variante="secundario"
          onClick={() => void marcar(true)}
          ocupado={ocupado}
          disabled={!s.puede.marcar_interes || s.interesado || soloLectura}
          aria-pressed={s.interesado}
        >
          {s.interesado ? <Icono n="check" tam={18} /> : null}
          Me interesa
        </Boton>
        {/* Solo quita el nombre de la lista de interesados: no es una baja ni cambia tus condiciones. */}
        {s.interesado ? (
          <Boton
            variante="secundario"
            onClick={() => void marcar(false)}
            ocupado={ocupado}
            disabled={!s.puede.marcar_interes || soloLectura}
          >
            Quitar mi interés
          </Boton>
        ) : null}
      </div>
      {!s.puede.marcar_interes ? <p className="suave">Ahora no puedes cambiar tu interés en esta propuesta.</p> : null}
      {nota ? <p role="status">{nota}</p> : null}
      {error ? <ErrorCaja error={error} enfocar /> : null}
    </section>
  )
}

function MisCondiciones({
  p,
  viva,
  soloLectura,
  demo,
  irAPestana,
}: VivaProps & { demo: boolean; irAPestana: PestanaProps['irAPestana'] }) {
  const [cond, setCond] = useState<Condiciones | null>(null)
  const [errorCarga, setErrorCarga] = useState<ApiError | null>(null)
  const claves = p.franjas.map((f) => f.clave)
  const b = useBorradorCondiciones(cond?.disponibilidad ?? null, claves)
  const { ocupado, error, correr } = useMutacion(viva)
  const [guardado, setGuardado] = useState(false)
  // "Me interesa" en el mismo toque, solo si la persona lo marca: el interés lo ve el grupo y nunca se deduce
  // de las condiciones (que son privadas). Desmarcada por defecto.
  const [avisarInteres, setAvisarInteres] = useState(false)
  const [notaInteres, setNotaInteres] = useState<string | null>(null)
  const interes = useMutacion(viva)
  const s = p.mi_situacion
  const ofrecerInteres =
    s.puede.marcar_interes && !s.interesado && !soloLectura && Object.values(b.draft).includes('si')
  // Enmienda 15 (E-d): con "gana la que pueden más" y las dos en Sí, cuál prefiere (privado; solo desempata).
  const [prefiero, setPrefiero] = useState<Preferencia | null>(null)
  useEffect(() => {
    setPrefiero(cond?.prefiero ?? null)
  }, [cond])
  const ofrecerPrefiero = E15_PREFIERO && p.regla === 'mas_si' && claves.length === 2 && claves.every((c) => b.draft[c] === 'si')
  const prefieroEnviar = ofrecerPrefiero ? prefiero : null
  const sucio = b.sucio || (ofrecerPrefiero && prefiero !== (cond?.prefiero ?? null))

  const cargar = useCallback(async () => {
    const r = await api.getMyConditions(p.id)
    if (r.ok) {
      setCond(r.data.condiciones)
      setErrorCarga(null)
    } else setErrorCarga(r.error)
  }, [p.id])

  // Al abrir la pestaña (o recargar la página) se leen las condiciones propias guardadas.
  useEffect(() => {
    void cargar()
  }, [cargar])

  async function guardar() {
    setGuardado(false)
    setNotaInteres(null)
    const r = await correr(`cond:${p.id}:${JSON.stringify(b.draft)}:${prefieroEnviar ?? ''}`, () =>
      api.saveMyConditions(p.id, b.draft, prefieroEnviar),
    )
    if (r?.ok) {
      vibrar(10)
      setCond(r.data.condiciones)
      setGuardado(true)
      const conInteres = avisarInteres && ofrecerInteres
      // La casilla vale para este guardado; si el aviso falla, el reintento queda en su propia caja de error.
      setAvisarInteres(false)
      if (conInteres) await avisar()
    }
  }

  // El aviso de interés tiene su propio error: si falla, las condiciones ya quedaron guardadas y no debe parecer
  // que fallaron ellas (E-11 de la revisión).
  async function avisar() {
    const i = await interes.correr(`interes:${p.id}:true`, () => api.markInterest(p.id, true))
    if (i?.ok) {
      setAvisarInteres(false)
      setNotaInteres('Marcaste "Me interesa": el grupo ve tu nombre entre los interesados. No es una confirmación.')
    }
  }

  return (
    <section className="tarjeta">
      <div className="tarjeta-cabeza">
        <h2>Tus condiciones</h2>
        <span className={`etiqueta ${s.condiciones === 'completas' ? 'etiqueta-ok' : s.condiciones === 'incompletas' ? 'etiqueta-pendiente' : ''}`}>
          <span className="visualmente-oculto">Estado de tus condiciones: </span>
          {ESTADO_COND[s.condiciones]}
        </span>
      </div>
      {cond === null && !errorCarga ? <Cargando texto="Cargando tus condiciones…" /> : null}
      {errorCarga && cond === null ? <ErrorCaja error={errorCarga} onReintentar={cargar} /> : null}
      {cond !== null ? (
        <>
          {/* #90 de friccion: agenda ficticia, solo en el espacio demo (en un grupo real confunde). */}
          {demo ? (
            <TomarDeCalendario
              franjas={p.franjas}
              semilla={p.mi_situacion.miembro_id}
              onTomar={(d) => b.reemplazar(d)}
              deshabilitado={!s.puede.guardar_condiciones || soloLectura}
            />
          ) : null}
          <EditorCondiciones
            franjas={p.franjas}
            valor={b.draft}
            onCambio={(c, v) => {
              setGuardado(false)
              b.poner(c, v)
            }}
            deshabilitado={!s.puede.guardar_condiciones || soloLectura}
            prefijo={`mi-${p.id}`}
          />
          {ofrecerPrefiero ? (
            <fieldset className="prefiero">
              <legend>Si te sirven los dos, ¿cuál prefieres?</legend>
              <div className="opciones opciones-compactas">
                {p.franjas.map((f) => (
                  <label key={f.clave} className={`opcion-radio ${prefiero === f.clave ? 'opcion-activa' : ''}`}>
                    <input
                      type="radio"
                      name={`mi-${p.id}-prefiero`}
                      checked={prefiero === f.clave}
                      disabled={!s.puede.guardar_condiciones || soloLectura}
                      onChange={() => {
                        setGuardado(false)
                        setPrefiero(f.clave as Preferencia)
                      }}
                    />
                    {f.etiqueta ?? `Opción ${f.clave}`}
                  </label>
                ))}
              </div>
              <p className="suave nota-seccion">Opcional y privado: solo desempata si los dos planes los pueden los mismos.</p>
            </fieldset>
          ) : null}
          {/* El motor solo cuenta condiciones completas: con un "Pendiente" no se entra en ninguna franja, tampoco en
              la que se marcó "Sí". Se dice antes de guardar, no solo con la etiqueta, y en una sola nota. */}
          {s.puede.guardar_condiciones && Object.values(b.draft).includes('pendiente') && (b.sucio || s.condiciones === 'incompletas') ? (
            <p className="aviso-linea">
              "Pendiente" = aún no lo sabes. Con alguna franja en "Pendiente" no entras en ninguna opción
              {Object.values(b.draft).includes('si') ? ', tampoco en la que marcaste "Sí puedo"' : ''}. Cuando sepas, marca
              Sí o No en cada una.
            </p>
          ) : (
            <p className="suave nota-seccion">"Pendiente" = aún no lo sabes (tus condiciones quedan incompletas).</p>
          )}
          {!s.puede.guardar_condiciones ? <p className="aviso-linea">{razonSinGuardar(p)}</p> : null}
          {/* H16 (sinteticos): la frase manda a un botón que está en el Plan; se ofrece el camino en un toque. */}
          {!s.puede.guardar_condiciones && !s.retirado && !p.plazo_vencido && s.elegible_en_version === true ? (
            <button type="button" className="btn btn-secundario" onClick={() => irAPestana('plan')}>
              Ir al plan
            </button>
          ) : null}
          <div className={`fila-botones ${sucio ? 'barra-accion' : ''}`}>
            {/* Dentro de la barra fija, encima del botón: se ve justo cuando se decide (a 375 px la barra tapa lo de arriba).
                En una sola línea para que la barra no crezca; la explicación va para lectores de pantalla y en la tarjeta
                "¿Avisar que te interesa?". */}
            {ofrecerInteres && s.puede.guardar_condiciones && sucio ? (
              <label htmlFor={`mi-${p.id}-interes`} className="casilla casilla-corta">
                <input
                  id={`mi-${p.id}-interes`}
                  type="checkbox"
                  checked={avisarInteres}
                  disabled={ocupado}
                  aria-describedby={`mi-${p.id}-interes-ayuda`}
                  onChange={(e) => setAvisarInteres(e.target.checked)}
                />
                <span>
                  Avisar también que me interesa (opcional)
                  <span id={`mi-${p.id}-interes-ayuda`} className="visualmente-oculto">
                    El grupo verá tu nombre entre los interesados, no tus condiciones. No es confirmar.
                  </span>
                </span>
              </label>
            ) : null}
            <Boton
              onClick={guardar}
              ocupado={ocupado}
              ocupadoTexto="Guardando…"
              disabled={!s.puede.guardar_condiciones || !sucio || soloLectura}
            >
              Guardar condiciones
            </Boton>
            {sucio ? (
              <Boton
                variante="secundario"
                onClick={() => {
                  b.descartar()
                  setPrefiero(cond?.prefiero ?? null)
                  setAvisarInteres(false)
                }}
                disabled={ocupado}
              >
                Descartar cambios
              </Boton>
            ) : null}
          </div>
          {sucio ? <p className="suave">Tienes cambios sin guardar.</p> : null}
          {guardado && !sucio ? <p role="status">Guardado. Solo tú ves estas condiciones.</p> : null}
          {notaInteres ? <p role="status">{notaInteres}</p> : null}
        </>
      ) : null}
      {error ? <ErrorCaja error={error} enfocar /> : null}
      {interes.error && !s.interesado ? (
        <ErrorCaja
          error={interes.error}
          titulo="Tus condiciones se guardaron; no pudimos avisar que te interesa"
          onReintentar={() => void avisar()}
          enfocar
        />
      ) : null}
    </section>
  )
}

function razonSinGuardar(p: EstadoPropuesta): string {
  const s = p.mi_situacion
  if (s.retirado) return 'Te retiraste de esta propuesta y ya no puedes participar en ella.'
  if (p.plazo_vencido) return 'El plazo de aceptación ya cerró.'
  if ((p.estado === 'esperando_compromisos' || p.estado === 'grupo_confirmado') && s.elegible_en_version) {
    // Enmienda 13 (0046): con la versión vigente, la salida es "Así no puedo, pero sigo" (no retirarse).
    return 'Estás en la versión vigente. Si esta fecha no te sirve, marca «Así no puedo, pero sigo» y podrás cambiar cuándo puedes.'
  }
  return 'Ahora no puedes cambiar tus condiciones en esta propuesta.'
}

function Retiro({ p, viva, soloLectura }: VivaProps) {
  const s = p.mi_situacion
  const [confirmar, setConfirmar] = useState(false)
  const { ocupado, error, correr } = useMutacion(viva)
  if (s.retirado || !s.puede.retirarme) return null
  async function hacer() {
    const r = await correr(`baja:${p.id}`, () => api.withdrawCommitment(p.id))
    if (r?.ok) setConfirmar(false)
  }
  return (
    <section className="tarjeta zona-peligro">
      <h2>No voy</h2>
      <p className="suave">
        Si ya no puedes, retirarte avisa al grupo. Es definitivo en esta propuesta: no podrás volver a participar en ella.
      </p>
      <AyudaRetiro p={p} />
      {!confirmar ? (
        <Boton variante="secundario" onClick={() => setConfirmar(true)} disabled={soloLectura}>
          Retirarme de esta propuesta
        </Boton>
      ) : (
        <Aviso tono="aviso" titulo="¿Retirarte definitivamente?">
          Perderás tu interés y tu confirmación, y la baja queda registrada. Si el grupo queda por debajo del mínimo, el
          plan pasa a revisión.
          <div className="fila-botones">
            <Boton variante="peligro" onClick={hacer} ocupado={ocupado} ocupadoTexto="Registrando baja…">
              Sí, no voy
            </Boton>
            <Boton variante="secundario" onClick={() => setConfirmar(false)} disabled={ocupado}>
              Volver
            </Boton>
          </div>
        </Aviso>
      )}
      {error ? <ErrorCaja error={error} enfocar /> : null}
    </section>
  )
}
