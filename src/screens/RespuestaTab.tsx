import { useCallback, useEffect, useState } from 'react'
import { api } from '../lib/api'
import type { ApiError, Condiciones, EstadoPropuesta } from '../lib/types'
import { useBorradorCondiciones, useMutacion } from '../lib/hooks'
import { Aviso, Boton, Cargando, ErrorCaja } from '../components/ui'
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
      <Aviso tono="info" titulo="Tus condiciones no se muestran al grupo">
        Lo que marques aquí lo ve solo el servidor para armar la opción. El grupo solo ve cuántas personas cargaron
        condiciones, nunca cuáles son.
      </Aviso>
      {s.retirado ? (
        <Aviso tono="aviso" titulo="Te retiraste de esta propuesta">
          Ya no puedes participar en ella.
        </Aviso>
      ) : null}
      <Interes p={p} viva={viva} soloLectura={soloLectura} />
      <MisCondiciones p={p} viva={viva} soloLectura={soloLectura} />
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
    if (r?.ok) setNota(v ? 'Marcaste "Me interesa". Esto no es una confirmación.' : 'Quitamos tu interés. Puedes volver a marcarlo cuando quieras.')
  }
  return (
    <section className="tarjeta">
      <h2>Tu interés</h2>
      <p>
        Estado: <strong>{s.interesado ? 'Me interesa' : 'Sin interés marcado'}</strong>
      </p>
      <p className="suave">Interés no es confirmación: no suma confirmados. Tampoco el silencio.</p>
      <div className="fila-botones">
        <Boton
          onClick={() => void marcar(true)}
          ocupado={ocupado}
          disabled={!s.puede.marcar_interes || s.interesado || soloLectura}
          aria-pressed={s.interesado}
        >
          Me interesa
        </Boton>
        <Boton
          variante="secundario"
          onClick={() => void marcar(false)}
          ocupado={ocupado}
          disabled={!s.puede.marcar_interes || !s.interesado || soloLectura}
        >
          Hoy paso
        </Boton>
      </div>
      {!s.puede.marcar_interes ? <p className="suave">Ahora no puedes cambiar tu interés en esta propuesta.</p> : null}
      {nota ? <p role="status">{nota}</p> : null}
      {error ? <ErrorCaja error={error} /> : null}
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
  const s = p.mi_situacion

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
    const r = await correr(`cond:${p.id}:${JSON.stringify(b.draft)}`, () => api.saveMyConditions(p.id, b.draft))
    if (r?.ok) {
      setCond(r.data.condiciones)
      setGuardado(true)
    }
  }

  return (
    <section className="tarjeta">
      <h2>Tus condiciones</h2>
      <p>
        Estado de tus condiciones: <strong>{ESTADO_COND[s.condiciones]}</strong>
      </p>
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
          <p className="suave">"Pendiente" significa que aún no lo sabes. Con alguna franja pendiente tus condiciones quedan incompletas.</p>
          {!s.puede.guardar_condiciones ? <p className="aviso-linea">{razonSinGuardar(p)}</p> : null}
          <div className="fila-botones">
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
        </>
      ) : null}
      {error ? <ErrorCaja error={error} /> : null}
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
    <section className="tarjeta">
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
      {error ? <ErrorCaja error={error} /> : null}
    </section>
  )
}
