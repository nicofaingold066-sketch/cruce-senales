// Entrada estilo Tricount (enmienda 9): el organizador crea el espacio con los nombres de su grupo y, al abrir la
// invitación (#/unirse/<código>), cada persona elige quién es. Desde ahí la sesión anónima de ese teléfono queda
// ligada a ese miembro. Debajo de la lista sigue el formulario de siempre ("No estoy en la lista"), con los mismos
// nombres accesibles que usan los guiones e2e, y el aviso de navegador compartido (#47).
// Las pantallas reciben la API como `fuente` (src/login/fuente.ts), así el banco de prueba corre sin base.
import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import type { CrearEspacioOk, UnirseOk } from '../lib/api'
import type { ApiError, ApiResult } from '../lib/types'
import { useAccion } from '../lib/hooks'
import { dejarAviso, irA, rutas, useIdentidad, useShell } from '../lib/shell'
import { entrarComoOtraPersona, leerGuardada } from '../lib/sesiones'
import { Aviso, Boton, Cargando, ErrorCaja } from '../components/ui'
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

/** Las operaciones de la enmienda 9. */
export interface FuenteEntrada {
  verPorCodigo: (codigo: string) => Promise<ApiResult<VistaPorCodigo>>
  /** miembroId null: "No estoy en la lista" (se une con el nombre escrito, como siempre). */
  unirse: (codigo: string, nombre: string, miembroId: string | null) => Promise<ApiResult<UnirseOk>>
  crear: (nombre: string, tuNombre: string, integrantes: string[]) => Promise<ApiResult<CrearEspacioOk>>
}

const MAX_INTEGRANTES = 12

function entrarAlEspacio(r: UnirseOk['resultado'], nombre: string, porLista: boolean, sesionGuardada?: string) {
  marcarConEspacios()
  const extra = sesionGuardada ? ` ${sesionGuardada}` : ''
  if (r.reclamo_asiento_simulado) {
    // Mismo texto que la portada (los guiones lo buscan).
    dejarAviso(`Reclamaste el lugar de ${nombre}. Desde ahora actúas con tu propia sesión y tus condiciones dejan de ser visibles para la simulación.${extra}`)
  } else if (porLista) {
    dejarAviso(`Entraste como ${nombre}. Este teléfono queda como ${nombre}: lo que marques después es privado.${extra}`)
  } else if (sesionGuardada) {
    dejarAviso(`Entraste como ${nombre}.${extra}`)
  }
  irA(rutas.espacio(r.espacio_id))
}

/**
 * Sesión anónima nueva SIN revocar la anterior (#47: signOut revoca la de Tomi para siempre); la anterior queda
 * guardada para volver desde la portada. Borra lo que la app guardó en sessionStorage (como hace la portada).
 */
async function sesionNueva(etiqueta: string) {
  const r = await entrarComoOtraPersona(etiqueta)
  if (r.ok) {
    try {
      for (const k of Object.keys(sessionStorage)) if (k.startsWith('cruxe:')) sessionStorage.removeItem(k)
    } catch {
      // Sin almacenamiento: no hay nada que borrar.
    }
  }
  return r
}

type Origen = 'lista' | 'formulario'
interface Intento {
  codigo: string
  nombre: string
  miembroId: string | null
  origen: Origen
}
interface YaMiembro {
  intento: Intento
  espacioId: string
  espacio: string
  nombreActual: string
}

/** Unirse (por la lista o por el formulario), con el cuidado de navegador compartido de la portada (#47). */
function useUnirse(fuente: FuenteEntrada) {
  const { ocupado, error, ejecutar } = useAccion()
  const [origen, setOrigen] = useState<Origen | null>(null)
  const [yaMiembro, setYaMiembro] = useState<YaMiembro | null>(null)

  async function unirse(i: Intento, sesionGuardada?: string) {
    setOrigen(i.origen)
    setYaMiembro(null)
    const r = await ejecutar(`join:${i.codigo}:${i.miembroId ?? i.nombre}`, () => fuente.unirse(i.codigo, i.nombre, i.miembroId))
    if (!r?.ok) return
    if (r.data.resultado.ya_era_miembro) {
      // El servidor no cambia el nombre ni crea a otra persona: no se entra en silencio como quien estaba antes.
      const yo = r.data.espacio.miembros.find((m) => m.es_yo)
      setYaMiembro({ intento: i, espacioId: r.data.resultado.espacio_id, espacio: r.data.espacio.nombre, nombreActual: yo?.nombre ?? 'otra persona' })
      return
    }
    entrarAlEspacio(r.data.resultado, i.nombre, i.miembroId != null, sesionGuardada)
  }
  return { ocupado, error, origen, yaMiembro, setYaMiembro, unirse }
}

function AvisoYaMiembro({ ya, unirse, cerrar }: { ya: YaMiembro; unirse: (i: Intento, guardada?: string) => Promise<void>; cerrar: () => void }) {
  const [confirmar, setConfirmar] = useState(false)
  const [cambiando, setCambiando] = useState(false)
  const [errorCambio, setErrorCambio] = useState<string | null>(null)
  const nombre = ya.intento.nombre
  const otraGuardada = confirmar ? leerGuardada() : null

  async function entrarComoOtra() {
    if (cambiando) return
    setCambiando(true)
    setErrorCambio(null)
    try {
      const s = await sesionNueva(`${ya.nombreActual} en «${ya.espacio}»`)
      if (!s.ok) {
        setErrorCambio(s.mensaje)
        return
      }
      cerrar()
      await unirse(
        ya.intento,
        s.guardada ? `La sesión de ${ya.nombreActual} quedó guardada en este navegador: para volver a ella, ve a tus espacios.` : undefined,
      )
    } finally {
      setCambiando(false)
    }
  }

  return (
    <Aviso tono="aviso" titulo={`Este navegador ya está en este espacio como ${ya.nombreActual}`}>
      {confirmar ? (
        <>
          <p>
            {otraGuardada
              ? `Este navegador ya guarda la sesión de ${otraGuardada.etiqueta}; la de ${ya.nombreActual} no se guardará y no se podrá volver a ella desde acá.`
              : `Se abre una sesión nueva para ti. La de ${ya.nombreActual} queda guardada en este navegador: se puede retomar desde tus espacios con "Volver a esa sesión".`}
          </p>
          <div className="fila-botones">
            <Boton variante={otraGuardada ? 'peligro' : 'primario'} onClick={() => void entrarComoOtra()} ocupado={cambiando} ocupadoTexto="Cambiando de persona…">
              Sí, entrar como {nombre || 'otra persona'}
            </Boton>
            <Boton variante="secundario" onClick={() => setConfirmar(false)} disabled={cambiando}>
              Cancelar
            </Boton>
          </div>
        </>
      ) : (
        <>
          <p>
            Si eres {ya.nombreActual}, sigue. Si eres otra persona, entra con una sesión nueva: así no ves ni cambias lo que cargó{' '}
            {ya.nombreActual}.
          </p>
          <div className="fila-botones">
            <Boton autoFocus onClick={() => irA(rutas.espacio(ya.espacioId))}>
              Seguir como {ya.nombreActual}
            </Boton>
            <Boton variante="secundario" onClick={() => setConfirmar(true)}>
              Entrar como otra persona
            </Boton>
          </div>
        </>
      )}
      {errorCambio ? <p role="alert">{errorCambio}</p> : null}
    </Aviso>
  )
}

/** #/unirse/<código>: "¿Quién eres en «X»?" con la lista del grupo y, debajo, el formulario de siempre. */
export function QuienEres({ codigo, fuente }: { codigo: string; fuente: FuenteEntrada }) {
  useIdentidad(null, null, null)
  const { soloLectura } = useShell()
  const [vista, setVista] = useState<VistaPorCodigo | null>(null)
  const [errorVista, setErrorVista] = useState<ApiError | null>(null)
  const [elegido, setElegido] = useState<MiembroPorReclamar | null>(null)
  const u = useUnirse(fuente)
  const titulo = useRef<HTMLHeadingElement>(null)
  const campoNombre = useRef<HTMLInputElement>(null)
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
    if (u.origen === 'lista' && u.error?.detalle === 'miembro_ya_reclamado') {
      setElegido(null)
      void cargar().then(() => titulo.current?.focus())
    }
  }, [u.error, u.origen, cargar])

  const errorLista = u.origen === 'lista' ? u.error : null
  const yaLista = u.origen === 'lista' ? u.yaMiembro : null
  return (
    <div className="pantalla entrada">
      <h1 ref={titulo} tabIndex={-1} className="portada-lema">
        {vista ? '¿Quién eres?' : 'Te invitaron a un plan'}
      </h1>
      {/* El nombre del espacio va fuera de los títulos: los guiones esperan el título del espacio para saber que ya se entró. */}
      {vista ? <p className="quien-espacio">en «{vista.espacio.nombre}»</p> : null}
      <p className="portada-sub">Elige tu nombre. Este teléfono quedará como esa persona; no pedimos correo ni contraseña.</p>

      {!vista && !errorVista ? <Cargando texto="Buscando tu grupo…" /> : null}
      {errorVista ? (
        <ErrorCaja error={errorVista} onReintentar={() => void cargar()} titulo={vista ? 'No se pudo actualizar la lista' : 'No se pudo cargar la lista del grupo'} />
      ) : null}

      {vista && elegido ? (
        <section className="tarjeta entrada-opcion entrada-principal" aria-labelledby="quien-confirmar">
          <h2 id="quien-confirmar">¿Eres {elegido.nombre}?</h2>
          <p className="suave">
            Este teléfono queda como {elegido.nombre} en «{vista.espacio.nombre}». Lo que marques después es privado.
          </p>
          <div className="entrada-botones">
            <Boton
              autoFocus
              onClick={() => void u.unirse({ codigo, nombre: elegido.nombre, miembroId: elegido.miembro_id, origen: 'lista' })}
              ocupado={u.ocupado && u.origen === 'lista'}
              ocupadoTexto="Entrando…"
              disabled={soloLectura}
            >
              Sí, soy {elegido.nombre}
            </Boton>
            <Boton variante="secundario" onClick={() => setElegido(null)} disabled={u.ocupado}>
              Elegir otro nombre
            </Boton>
          </div>
          {errorLista ? <ErrorCaja error={errorLista} enfocar /> : null}
          {yaLista ? <AvisoYaMiembro ya={yaLista} unirse={u.unirse} cerrar={() => u.setYaMiembro(null)} /> : null}
        </section>
      ) : null}

      {vista && !elegido ? (
        <section aria-labelledby="quien-lista">
          <h2 id="quien-lista" className="entrada-subtitulo">
            Integrantes
          </h2>
          {errorLista?.detalle === 'miembro_ya_reclamado' ? <ErrorCaja error={errorLista} /> : null}
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
          {vista.miembros.every((m) => !m.libre) ? <p className="suave">Ya entraron todas las personas de la lista.</p> : null}
          <button
            type="button"
            className="btn btn-secundario entrada-enlace"
            onClick={() => {
              const f = document.getElementById('unirse')
              f?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              campoNombre.current?.focus({ preventScroll: true })
            }}
          >
            No estoy en la lista
          </button>
        </section>
      ) : null}

      <UnirseConNombre codigoInicial={codigo} u={u} campoNombre={campoNombre} deshabilitado={soloLectura} />
    </div>
  )
}

/** "No estoy en la lista": el formulario de siempre (mismos nombres accesibles que la portada). */
function UnirseConNombre({
  codigoInicial,
  u,
  campoNombre,
  deshabilitado,
}: {
  codigoInicial: string
  u: ReturnType<typeof useUnirse>
  campoNombre: React.RefObject<HTMLInputElement | null>
  deshabilitado: boolean
}) {
  const [codigo, setCodigo] = useState(codigoInicial)
  const [nombre, setNombre] = useState('')
  const error = u.origen === 'formulario' ? u.error : null
  const ya = u.origen === 'formulario' ? u.yaMiembro : null
  const codigoMal = error?.detalle === 'codigo_inexistente'
  const nombreMal = error?.detalle === 'nombre_en_uso'
  const faltan = codigo.trim() === '' || nombre.trim() === ''

  useEffect(() => {
    if (nombreMal) campoNombre.current?.focus()
  }, [error, nombreMal, campoNombre])

  function hacer(e: FormEvent) {
    e.preventDefault()
    if (faltan) return
    void u.unirse({ codigo: codigo.trim(), nombre: nombre.trim(), miembroId: null, origen: 'formulario' })
  }

  return (
    <form id="unirse" className="tarjeta entrada-opcion" onSubmit={hacer} noValidate aria-labelledby="unirse-titulo">
      <h2 id="unirse-titulo">Unirme con un código</h2>
      <p className="suave">¿No estás en la lista? Escribe tu nombre y entras como una persona nueva.</p>
      <label className={`campo ${codigoMal ? 'campo-error' : ''}`}>
        <span>Código de invitación</span>
        <input
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          maxLength={16}
          aria-invalid={codigoMal || undefined}
        />
      </label>
      <label className={`campo ${nombreMal ? 'campo-error' : ''}`}>
        <span>Tu nombre en el espacio</span>
        <input
          ref={campoNombre}
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          autoComplete="off"
          maxLength={30}
          aria-invalid={nombreMal || undefined}
        />
        <small>Si usas el nombre de una persona simulada de la demo (por ejemplo "Luna"), reclamas su lugar.</small>
      </label>
      <Boton type="submit" variante="secundario" ocupado={u.ocupado && u.origen === 'formulario'} ocupadoTexto="Uniéndome…" disabled={faltan || deshabilitado}>
        Unirme
      </Boton>
      {error ? <ErrorCaja error={error} enfocar={!nombreMal} /> : null}
      {ya ? <AvisoYaMiembro ya={ya} unirse={u.unirse} cerrar={() => u.setYaMiembro(null)} /> : null}
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
