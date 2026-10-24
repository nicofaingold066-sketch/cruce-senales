import { useCallback, useEffect, useState } from 'react'
import { api } from '../lib/api'
import type { ApiError, Condiciones, EstadoPropuesta } from '../lib/types'
import { useBorradorCondiciones, useMutacion } from '../lib/hooks'
import { Aviso, Boton, Cargando, ErrorCaja } from '../components/ui'
import { Icono } from '../components/Icono'
import { vibrar } from '../lib/tacto'
import { EditorCondiciones } from '../components/Condiciones'
import type { PestanaProps } from './tabs'

const ESTADO_COND: Record<string, string> = {
  sin_cargar: 'Sin cargar',
  incompletas: 'Incompletas',
  completas: 'Completas',
}

export default function RespuestaTab({ p, viva, soloLectura }: PestanaProps) {
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
      <MisCondiciones p={p} viva={viva} soloLectura={soloLectura} />
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
        <h2>Avisar al grupo</h2>
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
        Para entrar en la opción alcanza con tus condiciones. Si quieres, avisa que te interesa: el grupo verá tu nombre.
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

function MisCondiciones({ p, viva, soloLectura }: VivaProps) {
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
  const s = p.mi_situacion
  const ofrecerInteres =
    s.puede.marcar_interes && !s.interesado && !soloLectura && Object.values(b.draft).includes('si')

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
    const r = await correr(`cond:${p.id}:${JSON.stringify(b.draft)}`, () => api.saveMyConditions(p.id, b.draft))
    if (r?.ok) {
      vibrar(10)
      setCond(r.data.condiciones)
      setGuardado(true)
      if (avisarInteres && ofrecerInteres) {
        const i = await correr(`interes:${p.id}:true`, () => api.markInterest(p.id, true))
        if (i?.ok) {
          setAvisarInteres(false)
          setNotaInteres('Marcaste "Me interesa": el grupo ve tu nombre entre los interesados. No es una confirmación.')
        }
      }
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
          <p className="suave nota-seccion">"Pendiente" = aún no lo sabes (tus condiciones quedan incompletas).</p>
          {/* El motor solo cuenta condiciones completas: con un "Pendiente" no se entra en ninguna franja, tampoco en
              la que se marcó "Sí". Se dice antes de guardar, no solo con la etiqueta. */}
          {s.puede.guardar_condiciones && Object.values(b.draft).includes('pendiente') && (b.sucio || s.condiciones === 'incompletas') ? (
            <p className="aviso-linea">
              Con alguna franja en "Pendiente" no entras en ninguna opción, tampoco en la que marcaste "Sí puedo". Cuando
              sepas, marca Sí o No en cada una.
            </p>
          ) : null}
          {!s.puede.guardar_condiciones ? <p className="aviso-linea">{razonSinGuardar(p)}</p> : null}
          {ofrecerInteres && s.puede.guardar_condiciones && b.sucio ? (
            <label htmlFor={`mi-${p.id}-interes`} className="casilla">
              <input
                id={`mi-${p.id}-interes`}
                type="checkbox"
                checked={avisarInteres}
                disabled={ocupado}
                aria-describedby={`mi-${p.id}-interes-ayuda`}
                onChange={(e) => setAvisarInteres(e.target.checked)}
              />
              <span>
                Avisar también al grupo que me interesa
                <small id={`mi-${p.id}-interes-ayuda`}>
                  Opcional. El grupo verá tu nombre entre los interesados, no tus condiciones. No es confirmar.
                </small>
              </span>
            </label>
          ) : null}
          <div className={`fila-botones ${b.sucio ? 'barra-accion' : ''}`}>
            <Boton
              onClick={guardar}
              ocupado={ocupado}
              ocupadoTexto="Guardando…"
              disabled={!s.puede.guardar_condiciones || !b.sucio || soloLectura}
            >
              Guardar condiciones
            </Boton>
            {b.sucio ? (
              <Boton variante="secundario" onClick={b.descartar} disabled={ocupado}>
                Descartar cambios
              </Boton>
            ) : null}
          </div>
          {b.sucio ? <p className="suave">Tienes cambios sin guardar.</p> : null}
          {guardado && !b.sucio ? <p role="status">Guardado. Solo tú ves estas condiciones.</p> : null}
          {notaInteres ? <p role="status">{notaInteres}</p> : null}
        </>
      ) : null}
      {error ? <ErrorCaja error={error} enfocar /> : null}
    </section>
  )
}

function razonSinGuardar(p: EstadoPropuesta): string {
  const s = p.mi_situacion
  if (s.retirado) return 'Te retiraste de esta propuesta y ya no puedes participar en ella.'
  if (p.plazo_vencido) return 'El plazo de aceptación ya cerró.'
  if ((p.estado === 'esperando_compromisos' || p.estado === 'grupo_confirmado') && s.elegible_en_version) {
    return 'Formas parte de la versión vigente; tu disponibilidad no puede cambiar mientras esté vigente.'
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
