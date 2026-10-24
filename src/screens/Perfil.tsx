import { useCallback, useEffect, useId, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { api } from '../lib/api'
import type { ApiError, EspacioResumen } from '../lib/types'
import { irA, rutas, useIdentidad } from '../lib/shell'
import { guardarPerfil, olvidarPerfil, usePerfil } from '../lib/perfil'
import { leerGuardada, sesionNueva } from '../lib/sesiones'
import { Avatar, Aviso, Boton, Cargando, ErrorCaja, IconoGrupo } from '../components/ui'
import { Icono } from '../components/Icono'
import { OtraSesion } from '../components/Sesiones'
import { Confirmacion, useVolverFoco } from '../components/Confirmacion'
import '../estilo/seccion-s2b.css'

// Pantalla 13 del mockup (nivel "Mi espacio"): Perfil. No hay cuenta ni contraseña: la sesión es anónima (contrato 0.1).
// Las tres filas de lo tuyo (gustos, cómo llego, permisos del agente) abren lo que ya existe: hoy esas preferencias se
// guardan POR GRUPO, en el agente de cada grupo, así que la fila lleva a ese panel (o deja elegir el grupo). Sin datos
// inventados: el resumen de cada fila llega cuando el servidor tenga una fuente única fuera del grupo.

type Fila = 'gustos' | 'llego' | 'permisos'

const FILAS: { clave: Fila; titulo: string; meta: string }[] = [
  { clave: 'gustos', titulo: 'Mis gustos y presupuesto', meta: 'Gustos, presupuesto y ambiente · privado' },
  { clave: 'llego', titulo: 'Cómo llego', meta: 'Zona, movilidad y viaje · privado' },
  { clave: 'permisos', titulo: 'Permisos del agente', meta: 'Usa mis gustos · invitaciones' },
]

/** La misma marca que deja "Contar mis gustos y presupuesto" (friccion/Responder): el grupo abre "Mis preferencias". */
function abrirPreferencias() {
  try {
    sessionStorage.setItem('cruxe:abrir-preferencias', '1')
  } catch {
    // Sin almacenamiento el grupo abre igual, con el agente plegado.
  }
}

export default function Perfil() {
  useIdentidad(null, null, null)
  const perfil = usePerfil()
  const [espacios, setEspacios] = useState<EspacioResumen[] | null>(null)
  const [error, setError] = useState<ApiError | null>(null)
  const [editando, setEditando] = useState(false)
  const [elegir, setElegir] = useState<Fila | null>(null)
  const [sesionAbierta, setSesionAbierta] = useState(() => leerGuardada() != null)
  const [privacidadAbierta, setPrivacidadAbierta] = useState(false)
  const idElegir = useId()

  const cargar = useCallback(async () => {
    const r = await api.listMySpaces()
    if (r.ok) {
      setEspacios(r.data.espacios)
      setError(null)
    } else setError(r.error)
  }, [])

  useEffect(() => {
    void cargar()
  }, [cargar])

  const nombre = perfil?.nombre ?? 'Sin nombre todavía'
  const unSoloGrupo = espacios && espacios.length === 1 ? espacios[0] : null
  const filaElegida = FILAS.find((f) => f.clave === elegir) ?? null

  return (
    <div className="vista vista-s2b s2b-vista-perfil">
      <header className="s2b-cabeza s2b-perfil-cabeza">
        <Avatar nombre={perfil?.nombre ?? '?'} tam={64} />
        <div className="s2b-perfil-nombre">
          <h1 id="perfil-titulo">{nombre}</h1>
          <p className="s2b-bajada">
            Así te ven tus amigos ·{' '}
            <button
              type="button"
              className="s2b-enlace"
              aria-label="Cambiar tu nombre"
              aria-expanded={editando}
              aria-controls="perfil-nombre"
              onClick={() => setEditando((v) => !v)}
            >
              Cambiar
            </button>
          </p>
        </div>
      </header>

      <div className="s2b-cuerpo">
        {editando ? <NombreLocal nombreActual={perfil?.nombre ?? ''} /> : null}

        <section aria-labelledby="perfil-lo-tuyo">
          <h2 id="perfil-lo-tuyo" className="s2b-oculto">
            Lo tuyo
          </h2>
          <ul className="s2b-bloque">
            {FILAS.map((f) => (
              <li key={f.clave}>
                {unSoloGrupo ? (
                  <a className="s2b-fila" href={rutas.espacio(unSoloGrupo.id)} onClick={abrirPreferencias}>
                    <FilaTexto titulo={f.titulo} meta={f.meta} />
                  </a>
                ) : (
                  <button
                    type="button"
                    className="s2b-fila"
                    aria-expanded={elegir === f.clave}
                    aria-controls={idElegir}
                    onClick={() => setElegir((v) => (v === f.clave ? null : f.clave))}
                  >
                    <FilaTexto titulo={f.titulo} meta={f.meta} abierta={elegir === f.clave} />
                  </button>
                )}
              </li>
            ))}
          </ul>
          {filaElegida && !unSoloGrupo ? (
            <div id={idElegir} className="s2b-panel sd-aparecer">
              {espacios === null && !error ? <Cargando texto="Buscando tus grupos…" /> : null}
              {error ? <ErrorCaja error={error} onReintentar={cargar} /> : null}
              {espacios && espacios.length === 0 ? (
                <>
                  <p className="s2b-nota">Se cargan dentro de un grupo, y todavía no estás en ninguno.</p>
                  <a className="btn btn-secundario" href={rutas.crear()}>
                    <Icono n="grupo" tam={20} /> Crear un grupo
                  </a>
                </>
              ) : null}
              {espacios && espacios.length > 1 ? (
                <>
                  <p className="s2b-nota">{filaElegida.titulo}: ¿de qué grupo?</p>
                  <ul className="filas">
                    {espacios.map((e) => (
                      <li key={e.id}>
                        <a className="fila" href={rutas.espacio(e.id)} onClick={abrirPreferencias}>
                          <IconoGrupo nombre={e.nombre} chico />
                          <span className="fila-texto">
                            <span className="fila-titulo">{e.nombre}</span>
                          </span>
                          <span className="fila-chevron" aria-hidden="true">
                            <Icono n="chevron" />
                          </span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
            </div>
          ) : null}
          <p className="s2b-nota">Hoy se guarda en cada grupo, en su agente. Dentro del grupo solo se ve como resumen.</p>
        </section>

        <section aria-labelledby="perfil-sesion-privacidad">
          <h2 id="perfil-sesion-privacidad" className="s2b-oculto">
            Tu sesión y tu privacidad
          </h2>
          <ul className="s2b-bloque">
            <li>
              <button
                type="button"
                className="s2b-fila"
                aria-expanded={sesionAbierta}
                aria-controls="perfil-sesion"
                onClick={() => setSesionAbierta((v) => !v)}
              >
                <FilaTexto titulo="Tu sesión" meta="Guardada en este teléfono" abierta={sesionAbierta} />
              </button>
              {sesionAbierta ? (
                <div id="perfil-sesion" className="s2b-fila-detalle">
                  <p>Sesión anónima, sin correo, teléfono ni contraseña. Si borras los datos del navegador, se pierde: no hay cuenta para recuperarla.</p>
                  <OtraSesion />
                </div>
              ) : null}
            </li>
            <li>
              <button
                type="button"
                className="s2b-fila"
                aria-expanded={privacidadAbierta}
                aria-controls="perfil-privacidad"
                onClick={() => setPrivacidadAbierta((v) => !v)}
              >
                <FilaTexto titulo="Privacidad" meta="Qué ve el grupo y qué no, en tres líneas" abierta={privacidadAbierta} />
              </button>
              {privacidadAbierta ? (
                <ul id="perfil-privacidad" className="s2b-fila-detalle s2b-tres">
                  <li>
                    <strong>Cuándo puedes:</strong> nadie del grupo lo ve. Quien organiza ve cuántas personas respondieron; no quién ni qué.
                  </li>
                  <li>
                    <strong>Lo que sí ve el grupo:</strong> tu nombre, si marcaste "Me interesa" y si confirmaste una versión. Si te retiras, sin tu nombre.
                  </li>
                  <li>
                    <strong>Tus gustos y presupuesto:</strong> privados. A quien organiza le llegan solo totales del grupo, nunca el presupuesto.
                  </li>
                </ul>
              ) : null}
            </li>
          </ul>
        </section>

        <SalirDeEsteTelefono nombre={perfil?.nombre ?? null} />
      </div>
    </div>
  )
}

function FilaTexto({ titulo, meta, abierta }: { titulo: string; meta: string; abierta?: boolean }): ReactNode {
  return (
    <>
      <span className="s2b-fila-texto">
        <span className="s2b-fila-titulo">{titulo}</span>
        <span className="s2b-fila-meta">{meta}</span>
      </span>
      <span className={`s2b-fila-chevron ${abierta ? 's2b-fila-chevron-abierta' : ''}`} aria-hidden="true">
        <Icono n="chevron" />
      </span>
    </>
  )
}

function NombreLocal({ nombreActual }: { nombreActual: string }) {
  const [nombre, setNombre] = useState(nombreActual)
  const [guardado, setGuardado] = useState<string | null>(null)
  useEffect(() => setNombre(nombreActual), [nombreActual])
  function guardar(e: FormEvent) {
    e.preventDefault()
    if (!nombre.trim()) return
    setGuardado(guardarPerfil(nombre) ? 'Listo. Lo usaremos para completar tu nombre la próxima vez que te unas o crees un grupo.' : 'Este navegador no deja guardar datos; escribe tu nombre cada vez.')
  }
  return (
    <form id="perfil-nombre" className="tarjeta s2b-nombre sd-aparecer" onSubmit={guardar} noValidate aria-label="Tu nombre">
      <label className="campo">
        <span>Cómo te llaman tus amigos</span>
        <input value={nombre} onChange={(e) => { setNombre(e.target.value); setGuardado(null) }} maxLength={30} autoComplete="nickname" />
        <small>Solo se guarda en este teléfono. En cada grupo se muestra el nombre con que te uniste.</small>
      </label>
      <Boton type="submit" variante="secundario" disabled={!nombre.trim() || nombre.trim() === nombreActual}>
        Guardar nombre
      </Boton>
      {guardado ? <p role="status">{guardado}</p> : null}
    </form>
  )
}

/**
 * «Salir de este teléfono»: la acción de siempre de «Entrar como otra persona» (mejora #47, sin signOut). La sesión actual
 * queda guardada en este navegador y se crea otra anónima. Pregunta antes, con foco (#67).
 */
function SalirDeEsteTelefono({ nombre }: { nombre: string | null }) {
  const [confirmar, setConfirmar] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { zona, volver } = useVolverFoco<HTMLDivElement>()
  const yaGuardada = leerGuardada()

  async function salir() {
    if (ocupado) return
    setOcupado(true)
    setError(null)
    const r = await sesionNueva(`${nombre ?? 'Tu sesión anterior'} en este navegador`)
    if (!r.ok) {
      setOcupado(false)
      setError(r.mensaje)
      return
    }
    // La sesión nueva es otra persona: se pide su nombre de nuevo y se empieza de cero.
    olvidarPerfil()
    irA(rutas.inicio())
    window.location.reload()
  }

  return (
    <div className="s2b-salir" ref={zona}>
      {!confirmar ? (
        <button type="button" className="s2b-enlace s2b-salir-boton" onClick={() => setConfirmar(true)} data-abre-confirmacion>
          Salir de este teléfono
        </button>
      ) : (
        <Confirmacion titulo="¿Salir de este teléfono?">
          <p>Tu sesión queda guardada en este navegador y puedes volver a ella desde la portada. Se abre una sesión nueva, sin grupos.</p>
          {yaGuardada ? <p>Este navegador ya guarda la sesión de {yaGuardada.etiqueta}: la de ahora no se guardará.</p> : null}
          <div className="fila-botones">
            <Boton onClick={() => void salir()} ocupado={ocupado} ocupadoTexto="Creando la sesión…">
              Sí, salir de este teléfono
            </Boton>
            <Boton variante="secundario" onClick={() => volver(() => setConfirmar(false))} disabled={ocupado}>
              Volver
            </Boton>
          </div>
        </Confirmacion>
      )}
      {error ? <Aviso tono="error">{error}</Aviso> : null}
    </div>
  )
}
