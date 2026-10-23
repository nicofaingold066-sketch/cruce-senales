// #88 "Respuesta en un paso" (feedback del jurado: quitar fricción). Después de "¿Quién eres?", el invitado llega acá
// (#/e/<id>/responder) y responde la propuesta abierta con UN toque: "Puedo los dos días", "Solo …" o "No puedo".
// Cada opción guarda las dos franjas juntas con save_my_conditions (privado: solo el servidor lo ve).
// Si no hay exactamente una propuesta que pueda responder ahora, no muestra nada: reemplaza la ruta por el espacio
// (o por el plan, si te toca confirmar) y deja un aviso con lo que dice el servidor sobre qué sigue.
// El servidor decide si puede guardar (`puede.guardar_condiciones`); esta pantalla nunca lo calcula.
import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'
import type { ApiError, Disponibilidad, EstadoPropuesta, Franja, PropuestaResumen } from '../lib/types'
import { useAccion } from '../lib/hooks'
import { dejarAviso, rutas, tomarAviso, useIdentidad, useShell } from '../lib/shell'
import { diaDe, hora } from '../lib/format'
import { vibrar } from '../lib/tacto'
import { Aviso, Boton, Cargando, DiaTile, ErrorCaja } from '../components/ui'
import { Icono } from '../components/Icono'
import { TomarDeCalendario } from './Calendario'
import './friccion.css'

interface Opcion {
  id: string
  texto: string
  detalle: string
  disponibilidad: Disponibilidad
  /** Para el día del calendario decorativo. */
  dia?: string
}

const mismoDia = (a: Franja, b: Franja) => a.inicio.local.slice(0, 10) === b.inicio.local.slice(0, 10)
const horario = (f: Franja) => `${hora(f.inicio.local)} a ${hora(f.fin.local)}`
const cuando = (f: Franja) => `${diaDe(f.inicio.local)}, ${horario(f)}`

/** Las respuestas de un toque. Con más de dos franjas no hay atajo: se responde en el plan. */
export function opcionesRapidas(franjas: Franja[]): Opcion[] | null {
  if (franjas.length === 1) {
    const [a] = franjas
    return [
      { id: 'si', texto: 'Puedo', detalle: cuando(a), disponibilidad: { [a.clave]: 'si' }, dia: a.inicio.local },
      { id: 'no', texto: 'No puedo', detalle: cuando(a), disponibilidad: { [a.clave]: 'no' } },
    ]
  }
  if (franjas.length !== 2) return null
  const [a, b] = franjas
  const dias = !mismoDia(a, b)
  const igualHorario = horario(a) === horario(b)
  const otra = (f: Franja) => (dias ? `el ${diaDe(f.inicio.local).split(' ')[0].toLocaleLowerCase('es')}` : `de ${horario(f)}`)
  const solo = (f: Franja) => (dias ? `Solo el ${diaDe(f.inicio.local).toLocaleLowerCase('es')}` : `Solo de ${horario(f)}`)
  return [
    {
      id: 'ambas',
      texto: dias ? 'Puedo los dos días' : 'Puedo en los dos horarios',
      detalle: dias
        ? `${diaDe(a.inicio.local)} y ${diaDe(b.inicio.local)}${igualHorario ? `, ${horario(a)}` : ''}`
        : `${diaDe(a.inicio.local)}: ${horario(a)} y ${horario(b)}`,
      disponibilidad: { [a.clave]: 'si', [b.clave]: 'si' },
    },
    { id: a.clave, texto: solo(a), detalle: `${dias ? horario(a) : diaDe(a.inicio.local)} · ${otra(b)} queda como No`, disponibilidad: { [a.clave]: 'si', [b.clave]: 'no' }, dia: a.inicio.local },
    { id: b.clave, texto: solo(b), detalle: `${dias ? horario(b) : diaDe(b.inicio.local)} · ${otra(a)} queda como No`, disponibilidad: { [a.clave]: 'no', [b.clave]: 'si' }, dia: b.inicio.local },
    { id: 'ninguna', texto: dias ? 'No puedo ninguno' : 'No puedo en ninguno', detalle: 'Puedes cambiarlo después', disponibilidad: { [a.clave]: 'no', [b.clave]: 'no' } },
  ]
}

type Carga =
  | { fase: 'cargando' }
  | { fase: 'error'; error: ApiError }
  | { fase: 'lista'; p: EstadoPropuesta; espacio: string; demo: boolean; yo: string | null; organizador: boolean }

/** Busca la única propuesta que esta persona puede responder ahora; si no hay una sola, sale (ver `salir`). */
function usePropuestaPorResponder(espacioId: string) {
  const [carga, setCarga] = useState<Carga>({ fase: 'cargando' })
  // Aviso que dejó "¿Quién eres?" ("Entraste como Ana…"). Si se vuelve al espacio, se le pasa a esa pantalla.
  const [aviso] = useState(() => tomarAviso())
  const avisoRef = useRef(aviso)

  /**
   * No hay nada que responder en un toque: se va al espacio (o al plan, si al servidor le toca pedirte que confirmes)
   * con el aviso de entrada y, si hay un plan vivo, el texto del servidor sobre qué sigue para ti.
   */
  const salir = useCallback(
    (x: PropuestaResumen | null) => {
      const partes = [avisoRef.current, x ? `«${x.titulo}»: ${x.siguiente_accion.texto}` : null].filter(Boolean)
      if (partes.length) dejarAviso(partes.join(' '))
      avisoRef.current = null
      window.location.replace(x?.siguiente_accion.codigo === 'te_toca_aceptar' ? rutas.propuesta(espacioId, x.id) : rutas.espacio(espacioId))
    },
    [espacioId],
  )

  const cargar = useCallback(async () => {
    setCarga({ fase: 'cargando' })
    const [lista, esp] = await Promise.all([api.listProposals(espacioId), api.getSpace(espacioId)])
    if (!lista.ok) return setCarga({ fase: 'error', error: lista.error })
    if (!esp.ok) return setCarga({ fase: 'error', error: esp.error })
    const vivas = lista.data.propuestas.filter(
      (x) => !x.plazo_vencido && !x.mi_situacion.retirado && x.estado !== 'cancelado' && x.estado !== 'expirado',
    )
    const abiertas = vivas.filter((x) => x.estado === 'reuniendo_interes')
    if (abiertas.length !== 1) return salir(vivas.length === 1 ? vivas[0] : null)
    const e = await api.getProposalState(abiertas[0].id)
    if (!e.ok) return setCarga({ fase: 'error', error: e.error })
    if (e.data.sin_cambios === true) return salir(abiertas[0])
    const p = e.data.propuesta
    const s = p.mi_situacion
    if (!s.puede.guardar_condiciones || s.condiciones === 'completas' || !opcionesRapidas(p.franjas)) return salir(abiertas[0])
    const espacio = esp.data.espacio
    const yo = espacio.miembros.find((m) => m.es_yo)?.nombre ?? s.nombre
    setCarga({ fase: 'lista', p, espacio: espacio.nombre, demo: espacio.demo, yo, organizador: espacio.mi_rol === 'organizador' })
  }, [espacioId, salir])

  useEffect(() => {
    void cargar()
  }, [cargar])

  return { carga, setCarga, cargar, aviso }
}

export function Responder({ espacioId }: { espacioId: string }) {
  const { soloLectura } = useShell()
  const { carga, setCarga, cargar, aviso } = usePropuestaPorResponder(espacioId)
  const lista = carga.fase === 'lista' ? carga : null
  useIdentidad(lista?.espacio ?? null, lista?.yo ?? null, lista ? (lista.organizador ? 'organizador' : 'miembro') : null)
  const guardar = useAccion()
  const interes = useAccion()
  const [elegida, setElegida] = useState<Opcion | null>(null)
  // #90: la agenda ficticia solo SUGIERE una opción (se resalta); responder sigue siendo tocarla.
  const [sugerida, setSugerida] = useState<string | null>(null)
  const [interesNota, setInteresNota] = useState<string | null>(null)
  const titulo = useRef<HTMLHeadingElement>(null)
  const hecho = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    if (lista && !elegida) titulo.current?.focus({ preventScroll: true })
  }, [lista, elegida])
  useEffect(() => {
    if (elegida) hecho.current?.focus()
  }, [elegida])

  if (!lista) {
    return (
      <div className="vista">
        <section className="escena">
          <a className="escena-volver" href={rutas.espacio(espacioId)}>
            <Icono n="atras" tam={20} /> Ver el grupo
          </a>
        </section>
        <div className="hoja">
          {carga.fase === 'error' ? (
            <>
              <ErrorCaja error={carga.error} onReintentar={() => void cargar()} titulo="No se pudo cargar el plan" />
              <a className="btn btn-secundario" href={rutas.espacio(espacioId)}>
                Ir al grupo
              </a>
            </>
          ) : (
            <Cargando texto="Buscando el plan para responder…" esqueleto />
          )}
        </div>
      </div>
    )
  }

  const { p } = lista
  const opciones = opcionesRapidas(p.franjas) ?? []
  const s = p.mi_situacion
  const verPlan = rutas.propuesta(espacioId, p.id)

  async function responder(o: Opcion) {
    const r = await guardar.ejecutar(`rapida:${p.id}:${o.id}`, () => api.saveMyConditions(p.id, o.disponibilidad))
    if (r?.ok) {
      vibrar(10)
      setCarga({ ...lista!, p: r.data.propuesta })
      setElegida(o)
    }
  }

  async function marcarInteres() {
    const r = await interes.ejecutar(`interes:${p.id}:true`, () => api.markInterest(p.id, true))
    if (r?.ok) {
      vibrar(10)
      setCarga({ ...lista!, p: r.data.propuesta })
      setInteresNota('Marcaste "Me interesa". El grupo ve tu nombre entre los interesados; no es una confirmación.')
    }
  }

  const algunSi = elegida ? Object.values(elegida.disponibilidad).includes('si') : false

  return (
    <div className="vista">
      <section className="escena" aria-labelledby="responder-titulo">
        <a className="escena-volver" href={rutas.espacio(espacioId)}>
          <Icono n="atras" tam={20} /> Ver el grupo
        </a>
        <span className="escena-eyebrow">{p.titulo}</span>
        <h1 id="responder-titulo" ref={titulo} tabIndex={-1}>
          {elegida ? 'Respuesta guardada' : '¿Cuándo puedes?'}
        </h1>
        <p className="escena-sub">
          {!elegida
            ? 'Toca una opción y listo. Solo el servidor ve lo que respondes; el grupo no sabe qué elegiste.'
            : Object.values(elegida.disponibilidad).includes('si')
              ? 'Cuando el grupo haya respondido, quien organiza busca una opción compatible. Si te sirve, la confirmas en el plan.'
              : 'Quedó guardado que no puedes en ninguno. Si algo cambia, puedes cambiarlo mientras se reúnen respuestas.'}
        </p>
      </section>
      <div className="hoja">
        {aviso && !elegida ? (
          <p className="suave rapida-aviso" role="status">
            <Icono n="check" tam={16} /> {aviso.split('.')[0]}.
          </p>
        ) : null}

        {!elegida ? (
          <section aria-labelledby="responder-titulo">
            <ul className="rapida-opciones">
              {opciones.map((o) => (
                <li key={o.id}>
                  <button
                    type="button"
                    id={`rapida-${o.id}`}
                    className={`btn ${o.id === 'ambas' || o.id === 'si' ? 'btn-primario' : 'btn-secundario'} rapida-opcion ${sugerida === o.id ? 'rapida-sugerida' : ''}`}
                    aria-describedby={sugerida === o.id ? 'rapida-sugerencia' : undefined}
                    onClick={() => void responder(o)}
                    disabled={soloLectura}
                    aria-busy={guardar.ocupado || undefined}
                  >
                    {o.dia ? <DiaTile local={o.dia} /> : null}
                    <span className="rapida-texto">
                      <strong>{o.texto}</strong>
                      <span className="rapida-detalle">{o.detalle}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            {guardar.ocupado ? <p role="status" className="suave">Guardando…</p> : null}
            {sugerida ? (
              <p id="rapida-sugerencia" className="suave" role="status">
                Tu agenda ficticia sugiere «{opciones.find((o) => o.id === sugerida)?.texto}». Tócala para responder.
              </p>
            ) : null}
            {lista.demo ? (
              <TomarDeCalendario
                franjas={p.franjas}
                semilla={s.miembro_id}
                deshabilitado={soloLectura || guardar.ocupado}
                textoUsar="Marcar lo que dice mi agenda"
                onTomar={(d) => {
                  const o = opciones.find((x) => p.franjas.every((f) => x.disponibilidad[f.clave] === d[f.clave]))
                  if (!o) return
                  setSugerida(o.id)
                  const b = document.getElementById(`rapida-${o.id}`)
                  b?.scrollIntoView({ block: 'center', behavior: 'smooth' })
                  b?.focus({ preventScroll: true })
                }}
              />
            ) : null}
            {guardar.error ? <ErrorCaja error={guardar.error} enfocar /> : null}
            <a className="btn btn-secundario entrada-enlace" href={verPlan}>
              Todavía no sé: ver el plan
            </a>
          </section>
        ) : (
          <section className="tarjeta entrada-principal" aria-labelledby="rapida-hecho">
            <h2 id="rapida-hecho" ref={hecho} tabIndex={-1}>
              <Icono n="check" tam={20} /> {elegida.texto}
            </h2>
            <p className="suave">
              Guardado. Solo tú ves estas condiciones. Puedes cambiarlas en el plan mientras se reúnen respuestas.
            </p>
            {algunSi && s.puede.marcar_interes && !s.interesado ? (
              <Aviso
                tono="info"
                titulo="¿Avisar al grupo que te interesa?"
                accion={
                  <Boton variante="secundario" onClick={() => void marcarInteres()} ocupado={interes.ocupado} disabled={soloLectura}>
                    Me interesa
                  </Boton>
                }
              >
                Es opcional: el grupo verá tu nombre entre los interesados. Interés no es confirmación.
              </Aviso>
            ) : null}
            {interesNota ? <p role="status">{interesNota}</p> : null}
            {interes.error ? <ErrorCaja error={interes.error} enfocar /> : null}
            <div className="entrada-botones">
              <a className="btn btn-primario" href={verPlan}>
                Ver el plan
              </a>
              <Boton variante="secundario" onClick={() => setElegida(null)}>
                Cambiar mi respuesta
              </Boton>
            </div>
            <a
              className="rapida-preferencias"
              href={rutas.espacio(espacioId)}
              onClick={() => {
                // El espacio abre "Mis preferencias" si encuentra esta marca (lo conecta front-juan en Espacio.tsx).
                try {
                  sessionStorage.setItem('cruxe:abrir-preferencias', '1')
                } catch {
                  // Sin almacenamiento: se llega al espacio igual.
                }
              }}
            >
              Contar mis gustos y presupuesto (opcional, privado)
            </a>
          </section>
        )}

        <div className="privado" role="note">
          <span className="privado-icono" aria-hidden="true">
            <Icono n="candado" tam={20} />
          </span>
          <div>
            <strong>Tu respuesta es privada</strong>
            <p>Nadie del grupo ve qué días puedes. Responder no es confirmar: eso viene después, con una sola opción.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
