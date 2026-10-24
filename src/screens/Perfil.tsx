import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { api } from '../lib/api'
import type { ApiError, EspacioResumen } from '../lib/types'
import { irA, rutas, useIdentidad } from '../lib/shell'
import { guardarPerfil, olvidarPerfil, usePerfil } from '../lib/perfil'
import { leerGuardada, sesionNueva } from '../lib/sesiones'
import { Avatar, Aviso, Boton, Cargando, ErrorCaja, colorAvatar, iniciales } from '../components/ui'
import { Icono } from '../components/Icono'
import { OtraSesion } from '../components/Sesiones'
import { QueGuarda } from '../friccion/QueGuarda'

// Perfil: cómo entraste a CRUXE en este navegador. No hay cuenta ni contraseña: la sesión es anónima
// (contrato 0.1). Acá se cambia el nombre local, se ven tus grupos y se entra como otra persona sin perder la sesión.
export default function Perfil() {
  useIdentidad(null, null, null)
  const perfil = usePerfil()
  const [espacios, setEspacios] = useState<EspacioResumen[] | null>(null)
  const [error, setError] = useState<ApiError | null>(null)

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

  return (
    <div className="vista">
      <section className="escena escena-perfil" aria-labelledby="perfil-titulo">
        <span className="escena-eyebrow">Tu perfil en este teléfono</span>
        <div className="perfil-cabeza">
          <Avatar nombre={perfil?.nombre ?? '?'} tam={64} />
          <div>
            <h1 id="perfil-titulo">{nombre}</h1>
            <p className="escena-sub">Sesión anónima · sin contraseña ni correo</p>
          </div>
        </div>
      </section>

      <div className="hoja">
        <OtraSesion />
        <NombreLocal nombreActual={perfil?.nombre ?? ''} />

        <section aria-labelledby="perfil-grupos">
          <div className="seccion-titulo">
            <h2 id="perfil-grupos">Tus grupos</h2>
            {espacios ? <span className="etiqueta num">{espacios.length}</span> : null}
          </div>
          {espacios === null && !error ? <Cargando texto="Buscando tus grupos…" /> : null}
          {error ? <ErrorCaja error={error} onReintentar={cargar} /> : null}
          {espacios && espacios.length === 0 ? (
            <div className="vacio">
              <strong>Todavía no estás en ningún grupo</strong>
              <p>Crea uno e invita a tus amigos, o únete con un código.</p>
              <a className="btn btn-primario" href={rutas.crear()}>
                <Icono n="grupo" tam={20} /> Crear un grupo
              </a>
            </div>
          ) : null}
          {espacios && espacios.length > 0 ? (
            <ul className="filas">
              {espacios.map((e) => (
                <li key={e.id}>
                  <a className="fila" href={rutas.espacio(e.id)}>
                    <span className="fila-icono" style={{ background: colorAvatar(e.nombre), color: '#fff', fontWeight: 800 }} aria-hidden="true">
                      {iniciales(e.nombre)}
                    </span>
                    <span className="fila-texto">
                      <span className="fila-titulo">{e.nombre}</span>
                      <span className="fila-meta">
                        {e.cantidad_miembros} personas · Tú: {e.mi_rol === 'organizador' ? 'organizador' : 'miembro'}
                        {e.demo ? ' · Demo' : ''}
                      </span>
                    </span>
                    <span className="fila-chevron" aria-hidden="true">
                      <Icono n="chevron" />
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        <section className="tarjeta privado-tarjeta" aria-labelledby="perfil-privacidad">
          <div className="tarjeta-cabeza">
            <h2 id="perfil-privacidad">Tu privacidad</h2>
            <Icono n="privado" />
          </div>
          <ul className="lista-check">
            <li>Tus condiciones (cuándo puedes) las ve solo el servidor. Solo quien organiza ve cuántas personas respondieron, nunca qué respondió cada una.</li>
            <li>Marcar "Me interesa" no es confirmar. Confirmas una versión concreta del plan.</li>
            <li>Si el plan cambia, tu confirmación anterior no pasa a la versión nueva.</li>
            <li>Todo lo que ves en la demo son datos ficticios.</li>
          </ul>
        </section>

        <CambiarPersona nombre={perfil?.nombre ?? null} />
        <QueGuarda />
      </div>
    </div>
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
    <form className="tarjeta" onSubmit={guardar} noValidate>
      <h2>Tu nombre</h2>
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

/** "Salir" sin perder nada: la sesión actual queda guardada y se crea otra anónima (mejora #47, sin signOut). */
function CambiarPersona({ nombre }: { nombre: string | null }) {
  const [confirmar, setConfirmar] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const yaGuardada = leerGuardada()

  async function cambiar() {
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
    <section className="tarjeta" aria-labelledby="perfil-cambiar">
      <div className="tarjeta-cabeza">
        <h2 id="perfil-cambiar">Entrar como otra persona</h2>
        <Icono n="cambiar" />
      </div>
      <p className="suave">
        Útil si comparten este teléfono. Tu sesión queda guardada en este navegador y puedes volver a ella desde la portada.
      </p>
      {yaGuardada ? (
        <Aviso tono="aviso">
          Este navegador ya guarda la sesión de {yaGuardada.etiqueta}. Si entras como otra persona, la sesión de ahora no se guardará.
        </Aviso>
      ) : null}
      {!confirmar ? (
        <Boton variante="secundario" onClick={() => setConfirmar(true)}>
          Entrar como otra persona
        </Boton>
      ) : (
        <Aviso tono="aviso" titulo="¿Entrar como otra persona?">
          Se abre una sesión nueva, sin grupos.
          <div className="fila-botones">
            <Boton onClick={() => void cambiar()} ocupado={ocupado} ocupadoTexto="Creando la sesión…">
              Sí, entrar como otra persona
            </Boton>
            <Boton variante="secundario" onClick={() => setConfirmar(false)} disabled={ocupado}>
              Volver
            </Boton>
          </div>
        </Aviso>
      )}
      {error ? <Aviso tono="error">{error}</Aviso> : null}
    </section>
  )
}
