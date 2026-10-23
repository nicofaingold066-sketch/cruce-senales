// Entrada estilo Tricount (pedido de Nico, 16:58): el organizador crea el espacio con los nombres de su grupo y,
// al abrir la invitación, cada persona elige quién es. Desde ahí la sesión anónima de ese teléfono queda ligada a
// ese miembro. Depende de una enmienda del contrato (vista por código, integrantes al crear y reclamo por
// miembro_id): hasta que el coordinador la apruebe, estas pantallas no están enganchadas y reciben la API como
// `fuente`, para adaptarlas a los nombres que se aprueben sin tocar la interfaz.
import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import type { CrearEspacioOk, UnirseOk } from '../lib/api'
import type { ApiError, ApiResult } from '../lib/types'
import { useAccion } from '../lib/hooks'
import { dejarAviso, irA, rutas, useIdentidad, useShell } from '../lib/shell'
import { Boton, Cargando, ErrorCaja } from '../components/ui'
import { marcarConEspacios } from './estado'
import './login.css'

export interface MiembroPorReclamar {
  miembro_id: string
  nombre: string
  /** false: ya hay una persona en ese lugar ("ya entró"). Lo decide el servidor. */
  libre: boolean
}

export interface VistaPorCodigo {
  espacio: { nombre: string; demo: boolean }
  miembros: MiembroPorReclamar[]
}

/** Las tres operaciones de la enmienda propuesta. */
export interface FuenteEntrada {
  verPorCodigo: (codigo: string) => Promise<ApiResult<VistaPorCodigo>>
  /** miembroId null: "No estoy en la lista" (se une con un nombre nuevo, como hoy). */
  unirse: (codigo: string, nombre: string, miembroId: string | null) => Promise<ApiResult<UnirseOk>>
  crear: (nombre: string, tuNombre: string, integrantes: string[]) => Promise<ApiResult<CrearEspacioOk>>
}

const MAX_INTEGRANTES = 12

function entrarAlEspacio(r: UnirseOk['resultado'], nombre: string) {
  marcarConEspacios()
  if (r.reclamo_asiento_simulado) {
    dejarAviso(`Entraste como ${nombre}. Este teléfono queda como ${nombre}: lo que marques después es privado.`)
  }
  irA(rutas.espacio(r.espacio_id))
}

/** "¿Quién eres en «X»?": la persona elige su nombre de la lista que armó quien organiza. */
export function QuienEres({ codigo, fuente }: { codigo: string; fuente: FuenteEntrada }) {
  useIdentidad(null, null, null)
  const { soloLectura } = useShell()
  const [vista, setVista] = useState<VistaPorCodigo | null>(null)
  const [errorVista, setErrorVista] = useState<ApiError | null>(null)
  const [elegido, setElegido] = useState<MiembroPorReclamar | null>(null)
  const [noEstoy, setNoEstoy] = useState(false)
  const { ocupado, error, ejecutar } = useAccion()
  const titulo = useRef<HTMLHeadingElement>(null)
  const secuencia = useRef(0)

  const cargar = useCallback(async () => {
    const mia = ++secuencia.current
    const r = await fuente.verPorCodigo(codigo)
    if (mia !== secuencia.current) return
    if (r.ok) {
      setVista(r.data)
      setErrorVista(null)
    } else {
      setErrorVista(r.error)
    }
  }, [codigo, fuente])

  useEffect(() => {
    void cargar()
  }, [cargar])

  useEffect(() => {
    // Alguien tomó ese lugar mientras tanto: se vuelve a la lista actualizada, con el foco en el título.
    if (error?.detalle === 'miembro_ya_reclamado') {
      setElegido(null)
      void cargar().then(() => titulo.current?.focus())
    }
  }, [error, cargar])

  async function reclamar() {
    if (!elegido) return
    const m = elegido
    const r = await ejecutar(`reclamar:${codigo}:${m.miembro_id}`, () => fuente.unirse(codigo, m.nombre, m.miembro_id))
    if (r?.ok) entrarAlEspacio(r.data.resultado, m.nombre)
  }

  if (!vista && !errorVista) return <Cargando texto="Buscando tu grupo…" />
  if (!vista && errorVista) {
    return (
      <div className="pantalla entrada">
        <h1 className="portada-lema">No encontramos ese grupo</h1>
        <ErrorCaja error={errorVista} onReintentar={() => void cargar()} />
        <a className="btn btn-secundario" href={rutas.entrar()}>
          Escribir el código a mano
        </a>
      </div>
    )
  }
  if (!vista) return null

  const libres = vista.miembros.filter((m) => m.libre)
  return (
    <div className="pantalla entrada">
      <h1 ref={titulo} tabIndex={-1} className="portada-lema">
        ¿Quién eres en «{vista.espacio.nombre}»?
      </h1>
      <p className="portada-sub">Elige tu nombre. Este teléfono quedará como esa persona; no pedimos correo ni contraseña.</p>

      {elegido ? (
        <section className="tarjeta entrada-opcion entrada-principal" aria-labelledby="quien-confirmar">
          <h2 id="quien-confirmar">¿Eres {elegido.nombre}?</h2>
          <p className="suave">Este teléfono queda como {elegido.nombre} en «{vista.espacio.nombre}». Lo que marques después es privado.</p>
          <div className="entrada-botones">
            <Boton autoFocus onClick={reclamar} ocupado={ocupado} ocupadoTexto="Entrando…" disabled={soloLectura}>
              Sí, soy {elegido.nombre}
            </Boton>
            <Boton variante="secundario" onClick={() => setElegido(null)} disabled={ocupado}>
              Elegir otro nombre
            </Boton>
          </div>
          {error && error.detalle !== 'miembro_ya_reclamado' ? <ErrorCaja error={error} enfocar /> : null}
        </section>
      ) : (
        <section aria-labelledby="quien-lista">
          <h2 id="quien-lista" className="entrada-subtitulo">
            Integrantes
          </h2>
          {error?.detalle === 'miembro_ya_reclamado' ? <ErrorCaja error={error} /> : null}
          {errorVista ? <ErrorCaja error={errorVista} onReintentar={() => void cargar()} titulo="No se pudo actualizar" /> : null}
          <ul className="quien-lista">
            {vista.miembros.map((m) => (
              <li key={m.miembro_id}>
                <button
                  type="button"
                  className="btn btn-secundario quien-nombre"
                  disabled={!m.libre || soloLectura}
                  onClick={() => setElegido(m)}
                  aria-describedby={m.libre ? undefined : `ya-${m.miembro_id}`}
                >
                  {m.nombre}
                </button>
                {m.libre ? null : (
                  <span id={`ya-${m.miembro_id}`} className="suave quien-tomado">
                    ya entró
                  </span>
                )}
              </li>
            ))}
          </ul>
          {libres.length === 0 ? <p className="suave">Ya entraron todas las personas de la lista.</p> : null}
        </section>
      )}

      {elegido ? null : noEstoy ? (
        <NoEstoyEnLaLista codigo={codigo} fuente={fuente} deshabilitado={soloLectura} />
      ) : (
        <button type="button" className="btn btn-secundario entrada-enlace" onClick={() => setNoEstoy(true)}>
          No estoy en la lista
        </button>
      )}
    </div>
  )
}

function NoEstoyEnLaLista({ codigo, fuente, deshabilitado }: { codigo: string; fuente: FuenteEntrada; deshabilitado: boolean }) {
  const [nombre, setNombre] = useState('')
  const { ocupado, error, ejecutar } = useAccion()
  const campo = useRef<HTMLInputElement>(null)
  const nombreMal = error?.detalle === 'nombre_en_uso'
  useEffect(() => {
    campo.current?.focus()
  }, [])
  useEffect(() => {
    if (nombreMal) campo.current?.focus()
  }, [error, nombreMal])

  async function hacer(e: FormEvent) {
    e.preventDefault()
    const n = nombre.trim()
    if (!n) return
    const r = await ejecutar(`join:${codigo}:${n}`, () => fuente.unirse(codigo, n, null))
    if (!r?.ok) return
    if (r.data.resultado.ya_era_miembro) {
      // Mismo cuidado que la portada: no se entra en silencio como quien ya estaba en este navegador.
      irA(rutas.unirse(codigo))
      return
    }
    entrarAlEspacio(r.data.resultado, n)
  }

  return (
    <form id="unirse" className="tarjeta entrada-opcion" onSubmit={hacer} noValidate aria-labelledby="quien-nuevo">
      <h2 id="quien-nuevo">No estoy en la lista</h2>
      <label className={`campo ${nombreMal ? 'campo-error' : ''}`}>
        <span>Tu nombre en el espacio</span>
        <input ref={campo} value={nombre} onChange={(e) => setNombre(e.target.value)} autoComplete="off" maxLength={30} aria-invalid={nombreMal || undefined} />
      </label>
      <Boton type="submit" ocupado={ocupado} ocupadoTexto="Uniéndome…" disabled={nombre.trim() === '' || deshabilitado}>
        Unirme
      </Boton>
      {error ? <ErrorCaja error={error} enfocar={!nombreMal} /> : null}
    </form>
  )
}

/** Crear el espacio con los nombres del grupo (cada uno se reclama después desde su teléfono). */
export function CrearConIntegrantes({ fuente }: { fuente: FuenteEntrada }) {
  const { soloLectura } = useShell()
  const [nombre, setNombre] = useState('')
  const [tuNombre, setTuNombre] = useState('')
  const [nuevo, setNuevo] = useState('')
  const [integrantes, setIntegrantes] = useState<string[]>([])
  const [aviso, setAviso] = useState<string | null>(null)
  const { ocupado, error, ejecutar } = useAccion()
  const campoNuevo = useRef<HTMLInputElement>(null)
  const faltan = nombre.trim() === '' || tuNombre.trim() === ''

  function agregar() {
    const n = nuevo.trim()
    if (!n) return
    const igual = (a: string) => a.trim().toLocaleLowerCase('es') === n.toLocaleLowerCase('es')
    if (igual(tuNombre) || integrantes.some(igual)) {
      setAviso(`${n} ya está en la lista.`)
    } else if (integrantes.length >= MAX_INTEGRANTES) {
      setAviso(`Hasta ${MAX_INTEGRANTES} personas por ahora.`)
    } else {
      setIntegrantes([...integrantes, n])
      setNuevo('')
      setAviso(`Agregaste a ${n}.`)
    }
    campoNuevo.current?.focus()
  }

  async function hacer(e: FormEvent) {
    e.preventDefault()
    if (faltan) return
    const r = await ejecutar(`crear:${nombre}:${tuNombre}:${integrantes.join('|')}`, () =>
      fuente.crear(nombre.trim(), tuNombre.trim(), integrantes),
    )
    if (r?.ok) {
      marcarConEspacios()
      irA(rutas.espacio(r.data.resultado.espacio_id))
    }
  }

  return (
    <form className="tarjeta entrada-opcion" onSubmit={hacer} noValidate aria-labelledby="crear-grupo">
      <h2 id="crear-grupo">Crear un espacio</h2>
      <label className="campo">
        <span>Nombre del espacio</span>
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={60} />
      </label>
      <label className="campo">
        <span>Tu nombre en el espacio</span>
        <input value={tuNombre} onChange={(e) => setTuNombre(e.target.value)} maxLength={30} autoComplete="off" />
      </label>
      <label className="campo">
        <span>Agregar a alguien del grupo</span>
        <input
          ref={campoNuevo}
          value={nuevo}
          onChange={(e) => setNuevo(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              agregar()
            }
          }}
          maxLength={30}
          autoComplete="off"
        />
        <small>Solo un nombre o apodo. Cada persona elige el suyo al abrir la invitación.</small>
      </label>
      <Boton variante="secundario" onClick={agregar} disabled={nuevo.trim() === ''}>
        Agregar
      </Boton>
      <p className="visualmente-oculto" aria-live="polite">
        {aviso}
      </p>
      {integrantes.length > 0 ? (
        <ul className="quien-integrantes" aria-label="Integrantes que agregaste">
          {integrantes.map((n) => (
            <li key={n}>
              <span>{n}</span>
              <button
                type="button"
                className="btn btn-secundario btn-chico"
                aria-label={`Quitar a ${n}`}
                onClick={() => {
                  setIntegrantes(integrantes.filter((x) => x !== n))
                  setAviso(`Quitaste a ${n}.`)
                  campoNuevo.current?.focus()
                }}
              >
                Quitar
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <Boton type="submit" ocupado={ocupado} ocupadoTexto="Creando…" disabled={faltan || soloLectura}>
        Crear espacio
      </Boton>
      {error ? <ErrorCaja error={error} enfocar /> : null}
    </form>
  )
}
