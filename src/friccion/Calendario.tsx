// #90 "Tomar de mi calendario (Simulación)". Una agenda FICTICIA, generada en el teléfono a partir de la fecha de cada
// franja y una semilla, marca qué franjas quedan libres. No se conecta a ningún calendario real, no pide permisos y
// nada sale del teléfono: solo propone una disponibilidad que la persona decide usar (guardar sigue siendo su acción).
// Se usa en la respuesta de un toque (Responder.tsx) y front-juan puede conectarlo en "Mi respuesta":
//   <TomarDeCalendario franjas={p.franjas} semilla={p.mi_situacion.miembro_id} onTomar={(d) => b.reemplazar(d)} />
import { useId, useState } from 'react'
import type { Disponibilidad, Franja, Valor } from '../lib/types'
import { diaDe, hora } from '../lib/format'
import { Boton, DiaTile, RotuloSimulacion } from '../components/ui'
import { Icono } from '../components/Icono'
import './friccion.css'

export interface EventoFicticio {
  titulo: string
  desde: string
  hasta: string
}

export interface DiaAgenda {
  clave: string
  franja: Franja
  eventos: EventoFicticio[]
  /** Evento que choca con la franja (null: libre). */
  choque: EventoFicticio | null
  valor: Valor
}

// Todo inventado; ningún dato de personas reales.
const ACTIVIDADES = ['Turno en el trabajo', 'Clase de guitarra', 'Almuerzo familiar', 'Partido de básquet', 'Hora al dentista', 'Taller de cerámica', 'Ayudar en una mudanza', 'Estudiar para la prueba']

/** FNV-1a de 32 bits: misma semilla y mismo día → misma agenda. */
function hash(s: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

const hhmm = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`
const minutos = (local: string) => {
  const [h, m] = hora(local).split(':').map(Number)
  return h * 60 + m
}

/** La agenda ficticia de cada franja. Pura (sin red ni almacenamiento), para poder probarla sola. */
export function agendaFicticia(franjas: Franja[], semilla: string): DiaAgenda[] {
  return franjas.map((f) => {
    const h = hash(`${semilla}|${f.inicio.local.slice(0, 10)}`)
    const ini = minutos(f.inicio.local)
    const fin = Math.max(ini + 30, minutos(f.fin.local))
    const actividad = (k: number) => ACTIVIDADES[(h >>> k) % ACTIVIDADES.length]
    const eventos: EventoFicticio[] = []
    // Más o menos uno de cada tres días choca con la franja.
    const choca = h % 3 === 0
    let choque: EventoFicticio | null = null
    if (choca) {
      const desde = Math.max(0, ini - 60 + ((h >>> 4) % 3) * 30)
      choque = { titulo: actividad(7), desde: hhmm(desde), hasta: hhmm(Math.min(desde + 120, 23 * 60 + 30)) }
      eventos.push(choque)
    }
    // Otro compromiso que NO choca, para que la agenda parezca una agenda.
    if ((h >>> 11) % 2 === 0) {
      const antes = ini >= 11 * 60
      const desde = antes ? Math.max(8 * 60, ini - 180) : Math.min(fin + 60, 22 * 60)
      const evento = { titulo: actividad(13), desde: hhmm(desde), hasta: hhmm(Math.min(desde + 90, 23 * 60 + 30)) }
      if (antes ? desde + 90 <= ini : true) eventos.push(evento)
    }
    eventos.sort((a, b) => a.desde.localeCompare(b.desde))
    return { clave: f.clave, franja: f, eventos, choque, valor: choque ? 'no' : 'si' }
  })
}

export function disponibilidadDe(agenda: DiaAgenda[]): Disponibilidad {
  return Object.fromEntries(agenda.map((d) => [d.clave, d.valor]))
}

/** Botón "Tomar de mi calendario (Simulación)" que despliega la agenda ficticia y propone las respuestas. */
export function TomarDeCalendario({
  franjas,
  semilla,
  onTomar,
  deshabilitado,
  textoUsar = 'Usar esta agenda',
}: {
  franjas: Franja[]
  semilla: string
  onTomar: (d: Disponibilidad) => void
  deshabilitado?: boolean
  textoUsar?: string
}) {
  const [abierto, setAbierto] = useState(false)
  const id = useId()
  const agenda = abierto ? agendaFicticia(franjas, semilla) : []
  return (
    <section className="tarjeta calendario-sim" aria-labelledby={`${id}-t`}>
      <button
        type="button"
        className="btn btn-secundario calendario-sim-abrir"
        aria-expanded={abierto}
        aria-controls={`${id}-agenda`}
        onClick={() => setAbierto((a) => !a)}
        disabled={deshabilitado}
      >
        <Icono n="calendario" tam={20} />
        <span id={`${id}-t`}>Tomar de mi calendario</span>
        <RotuloSimulacion />
      </button>
      {abierto ? (
        <div id={`${id}-agenda`} className="calendario-sim-cuerpo">
          <p className="suave">
            Agenda ficticia para la demo: no se conecta a ningún calendario real y nada sale de este teléfono. Revisa antes de usarla.
          </p>
          <ul className="calendario-sim-dias">
            {agenda.map((d) => (
              <li key={d.clave}>
                <DiaTile local={d.franja.inicio.local} />
                <div className="calendario-sim-dia">
                  <strong>
                    {diaDe(d.franja.inicio.local)}, {hora(d.franja.inicio.local)} a {hora(d.franja.fin.local)}:{' '}
                    <span className={`etiqueta ${d.choque ? 'etiqueta-pendiente' : 'etiqueta-ok'}`}>{d.choque ? 'Ocupado' : 'Libre'}</span>
                  </strong>
                  {d.eventos.length === 0 ? <span className="suave">Sin nada anotado ese día</span> : null}
                  {d.eventos.map((e, i) => (
                    <span key={i} className={`suave ${e === d.choque ? 'calendario-sim-choque' : ''}`}>
                      {e.desde}–{e.hasta} · {e.titulo}
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
          <Boton onClick={() => onTomar(disponibilidadDe(agenda))} disabled={deshabilitado}>
            {textoUsar}
          </Boton>
        </div>
      ) : null}
    </section>
  )
}
