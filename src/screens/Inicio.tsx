import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { api } from '../lib/api'
import type { ApiError, EspacioResumen, TipoEspacio } from '../lib/types'
import { useAccion } from '../lib/hooks'
import { dejarAviso, irA, rutas, useIdentidad, useShell } from '../lib/shell'
import { Aviso, Boton, Cargando, ErrorCaja, Vacio } from '../components/ui'
import { Marca } from '../components/Marca'

const TIPO: Record<TipoEspacio, string> = { amigos: 'Amigos', empresa: 'Empresa' }

export default function Inicio({ codigoInvitacion }: { codigoInvitacion?: string } = {}) {
  useIdentidad(null, null, null)
  const { soloLectura } = useShell()
  const [espacios, setEspacios] = useState<EspacioResumen[] | null>(null)
  const [error, setError] = useState<ApiError | null>(null)

  const cargar = useCallback(async () => {
    const r = await api.listMySpaces()
    if (r.ok) {
      setEspacios(r.data.espacios)
      setError(null)
    } else {
      setError(r.error)
    }
  }, [])

  useEffect(() => {
    void cargar()
  }, [cargar])

  return (
    <div className="pantalla">
      {codigoInvitacion ? (
        <div className="invitacion">
          <Aviso tono="info" titulo="Te invitaron a un plan">
            El código ya está cargado. Escribe tu nombre y únete: lo que marques después es privado.
          </Aviso>
          <UnirsePorCodigo deshabilitado={soloLectura} codigoInicial={codigoInvitacion} />
        </div>
      ) : null}
      <section className="portada" aria-labelledby="portada-titulo">
        <Marca grande />
        <p id="portada-titulo" className="portada-lema">
          Del «nos juntamos» al encuentro que ocurre.
        </p>
        <ol className="portada-pasos">
          <li>
            <strong>Cada uno</strong> marca en privado cuándo puede.
          </li>
          <li>
            <strong>El servidor</strong> propone una sola opción compatible.
          </li>
          <li>
            <strong>Confirmas</strong> esa versión. Si alguien se baja, se repara y se vuelve a confirmar.
          </li>
        </ol>
      </section>
      <h1>Tus espacios</h1>
      <p className="suave">
        Un espacio es el grupo con el que coordinas. Todo lo que ves aquí es ficticio.
      </p>

      {espacios === null && !error ? <Cargando texto="Cargando tus espacios…" /> : null}
      {error && espacios === null ? <ErrorCaja error={error} onReintentar={cargar} /> : null}
      {error && espacios !== null ? <ErrorCaja error={error} onReintentar={cargar} titulo="No se pudo actualizar" /> : null}

      {espacios && espacios.length === 0 ? (
        <Vacio
          titulo="Aún no estás en ningún espacio"
          texto="Carga el espacio demo para empezar el recorrido, o únete con un código de invitación."
        />
      ) : null}

      {espacios && espacios.length > 0 ? (
        <ul className="lista-tarjetas">
          {espacios.map((e) => (
            <li key={e.id}>
              <a className="tarjeta tarjeta-enlace" href={rutas.espacio(e.id)}>
                <span className="tarjeta-titulo">{e.nombre}</span>
                <span className="tarjeta-meta">
                  {TIPO[e.tipo]} · {e.cantidad_miembros} personas · Tú: {e.mi_rol === 'organizador' ? 'organizador' : 'miembro'}
                  {e.demo ? ' · Demo' : ''}
                </span>
                <span className="tarjeta-accion">Abrir espacio</span>
              </a>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="grilla-acciones">
        <CargarDemo deshabilitado={soloLectura} />
        {codigoInvitacion ? null : <UnirsePorCodigo deshabilitado={soloLectura} />}
      </div>
      <CrearEspacio deshabilitado={soloLectura} />
    </div>
  )
}

function CargarDemo({ deshabilitado }: { deshabilitado: boolean }) {
  const { ocupado, error, ejecutar } = useAccion()
  async function hacer() {
    const r = await ejecutar('seed', () => api.seedDemoSpace())
    if (r?.ok) irA(rutas.espacio(r.data.resultado.espacio_id))
  }
  return (
    <section className="tarjeta">
      <h2>Espacio demo</h2>
      <p>
        Crea "Los del asado" con sus seis personas. Tú serás Tomi, el organizador; las demás quedan como{' '}
        <strong>Simulación</strong> hasta que alguien reclame su lugar con el código.
      </p>
      <p className="suave">Si ya lo cargaste, se abre el mismo espacio.</p>
      <Boton onClick={hacer} ocupado={ocupado} ocupadoTexto="Cargando demo…" disabled={deshabilitado}>
        Cargar espacio demo
      </Boton>
      {error ? <ErrorCaja error={error} /> : null}
    </section>
  )
}

function UnirsePorCodigo({ deshabilitado, codigoInicial }: { deshabilitado: boolean; codigoInicial?: string }) {
  const [codigo, setCodigo] = useState(codigoInicial ?? '')
  const [nombre, setNombre] = useState('')
  const { ocupado, error, ejecutar } = useAccion()
  const faltan = codigo.trim() === '' || nombre.trim() === ''
  async function hacer(e: FormEvent) {
    e.preventDefault()
    if (faltan) return
    const r = await ejecutar(`join:${codigo.trim()}:${nombre.trim()}`, () =>
      api.joinSpace(codigo.trim(), nombre.trim()),
    )
    if (r?.ok) {
      if (r.data.resultado.reclamo_asiento_simulado) {
        dejarAviso(`Reclamaste el lugar de ${nombre.trim()}. Desde ahora actúas con tu propia sesión y tus condiciones dejan de ser visibles para la simulación.`)
      }
      irA(rutas.espacio(r.data.resultado.espacio_id))
    }
  }
  return (
    <form className="tarjeta" onSubmit={hacer} noValidate>
      <h2>Unirme con un código</h2>
      <label className="campo">
        <span>Código de invitación</span>
        <input
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          maxLength={16}
          aria-invalid={error?.detalle === 'codigo_inexistente' ? true : undefined}
        />
      </label>
      <label className="campo">
        <span>Tu nombre en el espacio</span>
        <input
          autoFocus={codigoInicial != null}
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          autoComplete="off"
          maxLength={30}
          aria-invalid={error?.detalle === 'nombre_en_uso' ? true : undefined}
        />
        <small>Si usas el nombre de una persona simulada de la demo (por ejemplo "Luna"), reclamas su lugar.</small>
      </label>
      <Boton type="submit" ocupado={ocupado} ocupadoTexto="Uniéndome…" disabled={faltan || deshabilitado}>
        Unirme
      </Boton>
      {error ? <ErrorCaja error={error} /> : null}
    </form>
  )
}

function CrearEspacio({ deshabilitado }: { deshabilitado: boolean }) {
  const [nombre, setNombre] = useState('')
  // Solo lo social (decisión de Nico y Juan, 11:51): el tipo queda fijo en "amigos".
  const tipo: TipoEspacio = 'amigos'
  const [visible, setVisible] = useState('')
  const { ocupado, error, ejecutar } = useAccion()
  const faltan = nombre.trim() === '' || visible.trim() === ''
  async function hacer(e: FormEvent) {
    e.preventDefault()
    if (faltan) return
    const r = await ejecutar(`crear:${nombre}:${tipo}:${visible}`, () => api.createSpace(nombre.trim(), tipo, visible.trim()))
    if (r?.ok) irA(rutas.espacio(r.data.resultado.espacio_id))
  }
  return (
    <details className="tarjeta plegable">
      <summary>Crear un espacio de prueba</summary>
      <form onSubmit={hacer} noValidate>
        <Aviso tono="info">Sirve para probar con otro grupo. Un espacio propio no incluye personas simuladas hasta que las agregues.</Aviso>
        <label className="campo">
          <span>Nombre del espacio</span>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={60} />
        </label>
        <label className="campo">
          <span>Tu nombre en el espacio</span>
          <input value={visible} onChange={(e) => setVisible(e.target.value)} maxLength={30} />
        </label>
        <Boton type="submit" ocupado={ocupado} ocupadoTexto="Creando…" disabled={faltan || deshabilitado}>
          Crear espacio
        </Boton>
        {error ? <ErrorCaja error={error} /> : null}
      </form>
    </details>
  )
}
