import { useEffect, useId, useRef, useState } from 'react'
import { Icono } from '../components/Icono'
import { iniciales, RotuloSimulacion } from '../components/ui'
import { rutas } from '../lib/shell'
import type { Momento } from '../lib/types'
import { agruparActividad, horaActividad, ordenarActividad } from './formato'
import type { EventoActividadGrupo } from './tipos'
import './actividad-grupo.css'

export type { EventoActividadGrupo } from './tipos'

export function ActividadGrupo({ actividad, espacioId, ahora }: {
  actividad?: EventoActividadGrupo[]
  espacioId: string
  ahora?: Momento
}) {
  const id = useId()
  const [verTodo, setVerTodo] = useState(false)
  const [nuevas, setNuevas] = useState<string[]>([])
  const anterior = useRef<{ espacioId: string; ids: Set<string> } | null>(null)
  const ordenada = ordenarActividad(actividad ?? [])
  const dias = agruparActividad(verTodo ? ordenada : ordenada.slice(0, 3), ahora)

  useEffect(() => {
    if (actividad === undefined) return
    const ids = new Set(ordenarActividad(actividad).map((e) => e.id))
    if (anterior.current?.espacioId === espacioId) {
      const agregadas = [...ids].filter((eventoId) => !anterior.current!.ids.has(eventoId))
      if (agregadas.length > 0) setNuevas(agregadas)
    } else {
      setVerTodo(false)
      setNuevas([])
    }
    anterior.current = { espacioId, ids }
  }, [actividad, espacioId])

  const cantidadNuevas = nuevas.filter((eventoId) => ordenada.some((e) => e.id === eventoId)).length

  return (
    <section className="tarjeta actividad-grupo" aria-labelledby={`${id}-titulo`}>
      <div className="actividad-grupo-cabeza">
        <div>
          <h2 id={`${id}-titulo`}>Actividad del grupo</h2>
          <p className="actividad-grupo-subtitulo"><Icono n="personas" tam={15} /> Visible para todo el grupo</p>
        </div>
        {cantidadNuevas > 0 ? <span className="chip chip-ok actividad-grupo-nuevas">{cantidadNuevas} {cantidadNuevas === 1 ? 'nueva' : 'nuevas'}</span> : null}
      </div>

      {actividad === undefined ? (
        <p className="actividad-grupo-vacio">La actividad del grupo todavía no está disponible.</p>
      ) : ordenada.length === 0 ? (
        <div className="actividad-grupo-vacio">
          <p>Todavía no hay movimientos para mostrar.</p>
          <p>Aquí verás quién se une, quién sale y quién se baja de un plan.</p>
        </div>
      ) : (
        <>
          <div id={`${id}-eventos`} className="actividad-grupo-dias">
            {dias.map((dia) => (
              <div key={dia.clave} className="actividad-grupo-dia">
                <h3>{dia.etiqueta}</h3>
                <ol className="actividad-grupo-lista" aria-label={dia.etiqueta}>
                  {dia.eventos.map((evento) => <FilaActividad key={evento.id} evento={evento} espacioId={espacioId} nueva={nuevas.includes(evento.id)} />)}
                </ol>
              </div>
            ))}
          </div>
          {ordenada.length > 3 ? (
            <button
              className="actividad-grupo-toggle"
              type="button"
              aria-expanded={verTodo}
              aria-controls={`${id}-eventos`}
              onClick={() => {
                setVerTodo(!verTodo)
                setNuevas([])
              }}
            >
              {verTodo ? 'Ver menos actividad' : 'Ver toda la actividad'}
              <Icono n={verTodo ? 'menos' : 'mas'} tam={16} />
            </button>
          ) : null}
        </>
      )}
      <span className="visualmente-oculto" role="status" aria-live="polite" aria-atomic="true">
        {cantidadNuevas > 0 ? `${cantidadNuevas === 1 ? 'Hay un nuevo movimiento' : `Hay ${cantidadNuevas} nuevos movimientos`} en la actividad del grupo.` : ''}
      </span>
    </section>
  )
}

function FilaActividad({ evento, espacioId, nueva }: { evento: EventoActividadGrupo; espacioId: string; nueva: boolean }) {
  const esBajaPlan = evento.tipo === 'baja_plan'
  const nombre = evento.miembro.nombre.trim() || 'Una persona'
  return (
    <li className={`actividad-grupo-evento actividad-grupo-${evento.tipo}${nueva ? ' sd-aparecer' : ''}`}>
      <span className={`actividad-grupo-avatar${evento.miembro.simulado ? ' actividad-grupo-avatar-sim' : ''}`} aria-hidden="true">
        {iniciales(nombre)}
        <span className="actividad-grupo-marca"><Icono n={evento.tipo === 'miembro_unido' ? 'mas' : esBajaPlan ? 'calendario' : 'menos'} tam={13} /></span>
      </span>
      <div className="actividad-grupo-contenido">
        <p className="actividad-grupo-accion">
          <strong>{nombre}</strong>{evento.miembro.simulado ? <> <RotuloSimulacion /></> : null}
          {evento.tipo === 'miembro_unido' ? ' se unió al grupo' : evento.tipo === 'miembro_salio' ? ' salió del grupo' : <> se bajó de {evento.plan ? <strong>{evento.plan.titulo}</strong> : 'un plan'}</>}
        </p>
        <div className="actividad-grupo-meta">
          <time dateTime={evento.en.utc} title={`${evento.en.local.slice(0, 10)} · ${horaActividad(evento.en)} · America/Santiago`}>
            {horaActividad(evento.en)}
          </time>
          {esBajaPlan && evento.plan ? (
            <a href={rutas.propuesta(espacioId, evento.plan.id)} aria-label={`Ver plan: ${evento.plan.titulo}`}>
              Ver plan <Icono n="chevron" tam={14} />
            </a>
          ) : null}
        </div>
      </div>
    </li>
  )
}
