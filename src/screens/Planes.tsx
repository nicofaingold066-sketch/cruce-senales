import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'
import type { ApiError, EspacioResumen, PropuestaResumen } from '../lib/types'
import { useSondeo } from '../lib/hooks'
import { rutas, useIdentidad } from '../lib/shell'
import { Cargando, ErrorCaja } from '../components/ui'
import { Icono } from '../components/Icono'
import '../estilo/seccion-s2.css'
import { PlanVivo, esTurno } from '../components/PlanVivo'

// Mis planes: todas las propuestas de tus grupos en un solo lugar, como la "Actividad" de una app de viajes.
// Solo agrupa lo que devuelve el servidor (estado y siguiente_accion); no decide nada.

interface Fila {
  espacio: EspacioResumen
  p: PropuestaResumen
}

const MAX_GRUPOS = 8

export default function Planes() {
  useIdentidad(null, null, null)
  const [filas, setFilas] = useState<Fila[] | null>(null)
  const [grupos, setGrupos] = useState<number | null>(null)
  const [error, setError] = useState<ApiError | null>(null)
  const secuencia = useRef(0)

  const cargar = useCallback(async () => {
    const mia = ++secuencia.current
    const r = await api.listMySpaces()
    if (mia !== secuencia.current) return
    if (!r.ok) {
      setError(r.error)
      return
    }
    const espacios = r.data.espacios.slice(0, MAX_GRUPOS)
    const listas = await Promise.all(
      espacios.map(async (e) => {
        const l = await api.listProposals(e.id)
        return l.ok ? l.data.propuestas.map((p) => ({ espacio: e, p })) : []
      }),
    )
    if (mia !== secuencia.current) return
    setGrupos(r.data.espacios.length)
    setFilas(listas.flat())
    setError(null)
  }, [])

  useEffect(() => {
    void cargar()
  }, [cargar])
  useSondeo(cargar, 10000)

  const turno = (filas ?? []).filter((f) => esTurno(f.p))
  const resto = (filas ?? []).filter((f) => !esTurno(f.p))
  const enCurso = resto.filter((f) => ['borrador', 'reuniendo_interes', 'esperando_compromisos', 'en_revision'].includes(f.p.estado))
  const confirmados = resto.filter((f) => f.p.estado === 'grupo_confirmado')
  const cerrados = resto.filter((f) => f.p.estado === 'cancelado' || f.p.estado === 'expirado')

  return (
    <div className="vista vista-s2">
      <section className="escena" aria-labelledby="planes-titulo">
        <span className="escena-eyebrow">Actividad</span>
        <h1 id="planes-titulo">Mis planes</h1>
        <p className="escena-sub">
          {filas === null
            ? 'Buscando tus planes…'
            : turno.length > 0
              ? `Te ${turno.length === 1 ? 'toca confirmar 1 plan' : `tocan ${turno.length} planes`}.`
              : 'Ningún plan espera tu confirmación por ahora.'}
        </p>
        {filas ? (
          <div className="resumen-planes" aria-hidden="true">
            <span>
              <strong className="num">{turno.length}</strong> {turno.length === 1 ? 'te toca' : 'te tocan'}
            </span>
            <span>
              <strong className="num">{enCurso.length}</strong> en curso
            </span>
            <span>
              <strong className="num">{confirmados.length}</strong> {confirmados.length === 1 ? 'confirmado' : 'confirmados'}
            </span>
          </div>
        ) : null}
      </section>

      <div className="hoja">
        {error && filas === null ? <ErrorCaja error={error} onReintentar={cargar} /> : null}
        {filas === null && !error ? <Cargando texto="Cargando tus planes…" esqueleto /> : null}
        {filas && filas.length === 0 ? (
          <div className="vacio">
            <span className="vacio-icono" aria-hidden="true">
              <Icono n="calendario" />
            </span>
            <strong>Todavía no hay planes</strong>
            <p>{grupos ? 'Abre uno de tus grupos y crea la primera propuesta.' : 'Crea un grupo o únete con un código para empezar.'}</p>
            <a className="btn btn-primario" href={grupos ? rutas.inicio() : rutas.crear()}>
              {grupos ? 'Ir a tus grupos' : 'Crear un grupo'}
            </a>
          </div>
        ) : null}
        <Seccion titulo="Te toca" filas={turno} destacada />
        <Seccion titulo="En curso" filas={enCurso} />
        <Seccion titulo="Confirmados" filas={confirmados} />
        <Seccion titulo="Cerrados" filas={cerrados} />
        {grupos != null && grupos > MAX_GRUPOS ? (
          <p className="suave">Se muestran los planes de tus primeros {MAX_GRUPOS} grupos.</p>
        ) : null}
      </div>
    </div>
  )
}

function Seccion({ titulo, filas, destacada }: { titulo: string; filas: Fila[]; destacada?: boolean }) {
  if (filas.length === 0) return null
  return (
    <section aria-label={titulo}>
      <div className="seccion-titulo">
        <h2>{titulo}</h2>
        <span className={`etiqueta num ${destacada ? 'etiqueta-destacada' : ''}`}>{filas.length}</span>
      </div>
      <ul className="lista-planes">
        {filas.map(({ espacio, p }) => (
          <li key={p.id}>
            <PlanVivo p={p} espacioId={espacio.id} espacioNombre={espacio.nombre} />
          </li>
        ))}
      </ul>
    </section>
  )
}
