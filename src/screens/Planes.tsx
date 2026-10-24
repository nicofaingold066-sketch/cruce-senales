import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'
import type { ApiError, EspacioResumen, PropuestaResumen } from '../lib/types'
import { useSondeo } from '../lib/hooks'
import { rutas, useIdentidad } from '../lib/shell'
import { momentoCorto } from '../lib/format'
import { Cargando, ErrorCaja } from '../components/ui'
import { Icono } from '../components/Icono'
import { esTurno } from '../components/PlanVivo'
import '../estilo/seccion-s2b.css'

// Pantalla 12 del mockup (nivel "Mi espacio"): «Tus planes», todas las propuestas de tus grupos en una lista.
// Primero lo que te toca, después lo que espera a otros, al final lo pasado. Solo ordena y pinta lo que devuelve el
// servidor (estado, estado_etiqueta y siguiente_accion); no decide nada.

interface Fila {
  espacio: EspacioResumen
  p: PropuestaResumen
}

const MAX_GRUPOS = 8
const EN_CURSO = ['borrador', 'reuniendo_interes', 'esperando_compromisos', 'en_revision']

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

  const todas = filas ?? []
  const turno = todas.filter((f) => esTurno(f.p))
  const resto = todas.filter((f) => !esTurno(f.p))
  // Orden del mockup: te toca → espera a otros (en curso, después los confirmados) → lo pasado.
  const ordenadas = [
    ...turno,
    ...resto.filter((f) => EN_CURSO.includes(f.p.estado)),
    ...resto.filter((f) => f.p.estado === 'grupo_confirmado'),
    ...resto.filter((f) => f.p.estado === 'cancelado' || f.p.estado === 'expirado'),
    ...resto.filter((f) => !EN_CURSO.includes(f.p.estado) && !['grupo_confirmado', 'cancelado', 'expirado'].includes(f.p.estado)),
  ]

  return (
    <div className="vista vista-s2b s2b-vista-planes">
      <header className="s2b-cabeza">
        <h1 id="planes-titulo">Tus planes</h1>
        <p className="s2b-bajada">Primero lo que te toca. Después, lo que espera a otros. Al final, lo pasado.</p>
      </header>

      <div className="s2b-cuerpo">
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
        {ordenadas.length > 0 ? (
          <ul className="lista-planes s2b-planes" aria-labelledby="planes-titulo">
            {ordenadas.map(({ espacio, p }) => (
              <li key={p.id}>
                <TarjetaPlan p={p} espacio={espacio} />
              </li>
            ))}
          </ul>
        ) : null}
        {grupos != null && grupos > MAX_GRUPOS ? (
          <p className="suave">Se muestran los planes de tus primeros {MAX_GRUPOS} grupos.</p>
        ) : null}
      </div>
    </div>
  )
}

/**
 * Una card por plan, como en el mockup: el estado en mayúsculas chicas y el grupo a la derecha, el título grande y una
 * línea de avance. «Te toca confirmar» sale de siguiente_accion.codigo (esTurno); el resto, del estado del servidor.
 */
function TarjetaPlan({ p, espacio }: { p: PropuestaResumen; espacio: EspacioResumen }) {
  const turno = esTurno(p)
  const pasado = p.estado === 'cancelado' || p.estado === 'expirado'
  const conVersion = p.version != null
  // Mejora #56: con más confirmaciones que el mínimo, "5 de 4 confirmaron" se lee raro.
  const cuenta =
    p.confirmados > p.minimo ? `${p.confirmados} confirmaron (mínimo ${p.minimo})` : `${p.confirmados} de ${p.minimo} confirmaron`
  const avance = [
    p.mi_situacion?.retirado ? 'Te retiraste' : null,
    turno ? null : p.siguiente_accion.texto.replace(/\.\s*$/, ''),
    conVersion ? cuenta : null,
    pasado || p.estado === 'grupo_confirmado'
      ? null
      : p.plazo_vencido
        ? 'plazo cerrado'
        : `cierra ${momentoCorto(p.plazo)}`,
  ].filter(Boolean)
  const clase = turno ? 's2b-plan-turno' : pasado ? 's2b-plan-pasado' : p.estado === 'grupo_confirmado' ? 's2b-plan-ok' : ''
  return (
    <a className={`tarjeta-prop s2b-plan ${clase}`} href={rutas.propuesta(espacio.id, p.id)}>
      <span className="s2b-plan-arriba">
        <span className="s2b-plan-estado">{turno ? 'Te toca confirmar' : p.estado_etiqueta}</span>
        <span className="s2b-plan-grupo">{espacio.nombre}</span>
      </span>
      {/* Mismo nombre de transición que el título de la pantalla del plan: el título "viaja" al abrirlo. */}
      <span className="s2b-plan-titulo" style={{ viewTransitionName: `plan-${p.id}` }}>
        {p.titulo}
      </span>
      {avance.length > 0 ? <span className="s2b-plan-avance">{avance.join(' · ')}</span> : null}
    </a>
  )
}
