import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { api } from '../lib/api'
import type { ApiError, EspacioResumen, PropuestaResumen, TipoEspacio } from '../lib/types'
import { useAccion, useSondeo } from '../lib/hooks'
import { dejarAviso, irA, rutas, useIdentidad, useShell } from '../lib/shell'
import { Aviso, Boton, Cargando, ErrorCaja, InsigniaEstado } from '../components/ui'
import { Marca } from '../components/Marca'

const TIPO: Record<TipoEspacio, string> = { amigos: 'Amigos', empresa: 'Empresa' }

export default function Inicio({
  codigoInvitacion,
  invitacionInvalida,
}: { codigoInvitacion?: string; invitacionInvalida?: boolean } = {}) {
  useIdentidad(null, null, null)
  const { soloLectura } = useShell()
  const [espacios, setEspacios] = useState<EspacioResumen[] | null>(null)
  const [error, setError] = useState<ApiError | null>(null)

  const [activas, setActivas] = useState<PlanActivo[]>([])
  const secuencia = useRef(0)

  const cargar = useCallback(async () => {
    const mia = ++secuencia.current
    const r = await api.listMySpaces()
    if (mia !== secuencia.current) return
    if (r.ok) {
      setEspacios(r.data.espacios)
      setError(null)
      const planes = await planesActivos(r.data.espacios)
      if (mia === secuencia.current) setActivas(planes)
    } else {
      setError(r.error)
    }
  }, [])

  useEffect(() => {
    void cargar()
  }, [cargar])
  // Mejora #30: con espacios, el plan activo se mantiene al día (mismo ritmo que la lista del espacio).
  useSondeo(cargar, 10000, (espacios?.length ?? 0) > 0)
  const conPlan = activas.length > 0

  return (
    <div className="pantalla">
      {invitacionInvalida ? (
        <Aviso tono="aviso" titulo="Ese enlace de invitación no es válido">
          Puede haberse copiado mal. Pide uno nuevo o escribe el código a mano en "Unirme con un código", más abajo.
        </Aviso>
      ) : null}
      {codigoInvitacion ? (
        <div className="invitacion">
          <Aviso tono="info" titulo="Te invitaron a un plan">
            El código ya está cargado. Escribe tu nombre y únete: lo que marques después es privado.
          </Aviso>
          <UnirsePorCodigo deshabilitado={soloLectura} codigoInicial={codigoInvitacion} />
        </div>
      ) : null}
      {conPlan && !codigoInvitacion ? <TuPlan activas={activas} /> : null}
      <section className={`portada ${conPlan ? 'portada-compacta' : ''}`} aria-labelledby="portada-titulo">
        <Marca grande />
        <h1 id="portada-titulo" className="portada-lema">
          Del «nos juntamos» al encuentro que ocurre.
        </h1>
        <p className="portada-sub">
          Cada uno dice en privado cuándo puede. CRUXE propone <strong>un solo plan</strong> y cada uno lo confirma.
        </p>
        {/* Con un plan activo, lo principal es el plan: sin botones grandes que creen otra demo por error. */}
        {codigoInvitacion || conPlan ? null : (
          <div className="portada-acciones">
            <CargarDemo deshabilitado={soloLectura} yaCargada={espacios?.some((e) => e.demo && e.mi_rol === 'organizador') ?? false} />
            <button type="button" className="btn btn-secundario" onClick={irAUnirse}>
              Tengo un código de invitación
            </button>
          </div>
        )}
        {conPlan ? null : (
          <ol className="portada-pasos" aria-label="Cómo funciona">
            <li>
              <span className="paso-num" aria-hidden="true">1</span>
              <span>
                <strong>Cada uno</strong> marca en privado cuándo puede.
              </span>
            </li>
            <li>
              <span className="paso-num" aria-hidden="true">2</span>
              <span>
                <strong>El servidor</strong> propone una sola opción compatible.
              </span>
            </li>
            <li>
              <span className="paso-num" aria-hidden="true">3</span>
              <span>
                <strong>Confirmas</strong> esa versión. Si alguien se baja, se repara y se vuelve a confirmar.
              </span>
            </li>
          </ol>
        )}
      </section>

      {espacios === null && !error ? <Cargando texto="Buscando tus espacios…" /> : null}
      {error && espacios === null ? <ErrorCaja error={error} onReintentar={cargar} /> : null}
      {error && espacios !== null ? <ErrorCaja error={error} onReintentar={cargar} titulo="No se pudo actualizar" /> : null}

      {espacios && espacios.length > 0 ? (
        <section aria-labelledby="mis-espacios">
          <h2 id="mis-espacios">Tus espacios</h2>
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
        </section>
      ) : null}

      {codigoInvitacion ? null : <UnirsePorCodigo deshabilitado={soloLectura} />}
      <CrearEspacio deshabilitado={soloLectura} />
    </div>
  )
}

interface PlanActivo {
  espacio: EspacioResumen
  p: PropuestaResumen
}

const ESTADOS_ACTIVOS = new Set(['borrador', 'reuniendo_interes', 'esperando_compromisos', 'grupo_confirmado', 'en_revision'])

/** Propuestas vigentes de mis espacios (hasta 4 espacios). El orden y "Te toca" salen del servidor. */
async function planesActivos(espacios: EspacioResumen[]): Promise<PlanActivo[]> {
  const listas = await Promise.all(
    espacios.slice(0, 4).map(async (e) => {
      const r = await api.listProposals(e.id)
      return r.ok ? r.data.propuestas.filter((p) => ESTADOS_ACTIVOS.has(p.estado)).map((p) => ({ espacio: e, p })) : []
    }),
  )
  const turno = (x: PlanActivo) => x.p.siguiente_accion.codigo === 'te_toca_aceptar' || x.p.mi_situacion.puede_aceptar
  return listas
    .flat()
    .sort((a, b) => Number(turno(b)) - Number(turno(a)))
    .slice(0, 3)
}

/** Mejora #30: el plan activo arriba de todo, para llegar en un toque (por ejemplo, desde el segundo teléfono). */
function TuPlan({ activas }: { activas: PlanActivo[] }) {
  return (
    <section className="tu-plan" aria-labelledby="tu-plan-titulo">
      <h2 id="tu-plan-titulo">{activas.length === 1 ? 'Tu plan' : 'Tus planes'}</h2>
      <ul className="lista-tarjetas">
        {activas.map(({ espacio, p }) => {
          const turno = p.siguiente_accion.codigo === 'te_toca_aceptar' || p.mi_situacion.puede_aceptar
          return (
            <li key={p.id}>
              <a className={`tarjeta tarjeta-enlace plan-activo ${turno ? 'plan-activo-turno' : ''}`} href={rutas.propuesta(espacio.id, p.id)}>
                <span className="suave">{espacio.nombre}</span>
                <span className="tarjeta-titulo">{p.titulo}</span>
                <span className="tarjeta-fila">
                  <InsigniaEstado estado={p.estado} etiqueta={p.estado_etiqueta} />
                  {p.version != null ? <span className="etiqueta">Versión {p.version}</span> : null}
                </span>
                {turno && p.siguiente_accion.codigo !== 'te_toca_aceptar' ? <span className="pastilla pastilla-turno">Te toca confirmar</span> : null}
                <span className="tarjeta-meta">{p.siguiente_accion.texto}</span>
                <span className="tarjeta-accion">Abrir el plan</span>
              </a>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function CargarDemo({ deshabilitado, yaCargada }: { deshabilitado: boolean; yaCargada: boolean }) {
  const { ocupado, error, ejecutar } = useAccion()
  async function hacer() {
    const r = await ejecutar('seed', () => api.seedDemoSpace())
    if (r?.ok) irA(rutas.espacio(r.data.resultado.espacio_id))
  }
  return (
    <div className="portada-demo">
      <Boton onClick={hacer} ocupado={ocupado} ocupadoTexto="Preparando la demo…" disabled={deshabilitado}>
        {yaCargada ? 'Abrir la demo «Los del asado»' : 'Probar la demo «Los del asado»'}
      </Boton>
      <p className="suave">Serás Tomi, quien organiza. Las otras cinco personas son simuladas (datos ficticios).</p>
      {error ? <ErrorCaja error={error} enfocar /> : null}
    </div>
  )
}

/** Lleva al formulario de unirse sin tocar la ruta (la navegación usa el hash). */
function irAUnirse() {
  const form = document.getElementById('unirse')
  form?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  form?.querySelector<HTMLInputElement>('input')?.focus({ preventScroll: true })
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
      } else if (r.data.resultado.ya_era_miembro) {
        // Esta sesión ya estaba en el espacio: el servidor no cambia el nombre. Se avisa en vez de entrar en silencio.
        dejarAviso('Este teléfono ya estaba en este espacio: sigues con tu nombre de antes (lo ves arriba). Para entrar como otra persona, usa otro teléfono o una ventana privada.')
      }
      irA(rutas.espacio(r.data.resultado.espacio_id))
    }
  }
  return (
    <form id="unirse" className="tarjeta" onSubmit={hacer} noValidate>
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
      {error ? <ErrorCaja error={error} enfocar /> : null}
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
        <Aviso tono="info">Sirve para un grupo de verdad: invitas con el código y cada persona responde desde su teléfono. La Simulación (personas ficticias) es solo para la demo.</Aviso>
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
        {error ? <ErrorCaja error={error} enfocar /> : null}
      </form>
    </details>
  )
}
