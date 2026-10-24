// Portada "Mi espacio" (S1 Ingreso, mockup validado por Nico 02:40, pantallas 1 y 2; la edita friccion por excepción del
// encargo). Arriba, solo si el servidor dice que te toca algo, UNA línea que lleva al plan; después "Tus grupos" con filas
// grandes; y un "+" flotante "Nuevo grupo" que abre una hoja desde abajo con "Crear un grupo", "Unirme con un código"
// (desplegable) y la demo. Sin grupos o en la computadora (pantalla 8), esas opciones se ven sin abrir nada.
import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { api } from '../lib/api'
import { DEMO_MAKANA, esDemoMakana } from '../lib/casoDemo'
import type { ApiError, EspacioResumen, PropuestaResumen } from '../lib/types'
import { useAccion, useSondeo } from '../lib/hooks'
import { irA, rutas, useIdentidad, useShell } from '../lib/shell'
import { OtraSesion } from '../components/Sesiones'
import { guardarPerfil, usePerfil } from '../lib/perfil'
import { vibrar } from '../lib/tacto'
import { Aviso, Boton, Cargando, ErrorCaja, IconoGrupo } from '../components/ui'
import { Orbita } from '../components/Orbita'
import { Resaltado } from '../components/Resaltado'
import { esTurno } from '../components/PlanVivo'
import { Icono } from '../components/Icono'
import { UnirseConNombre, useUnirse } from '../login/QuienEres'
import { fuenteReal } from '../login/fuente'
import { momentoCorto } from '../lib/format'
import { etiquetaPlan } from '../componentes-nuevos/plan/accion'
import '../estilo/seccion-s1.css'

export default function Inicio({ invitacionInvalida }: { invitacionInvalida?: boolean } = {}) {
  useIdentidad(null, null, null)
  const { soloLectura } = useShell()
  const [espacios, setEspacios] = useState<EspacioResumen[] | null>(null)
  const [error, setError] = useState<ApiError | null>(null)
  const [activas, setActivas] = useState<PlanActivo[]>([])
  const [hoja, setHoja] = useState(false)
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
  // Mejora #30: con grupos, lo que me toca se mantiene al día (mismo ritmo que la lista del grupo).
  useSondeo(cargar, 10000, (espacios?.length ?? 0) > 0)

  const conGrupos = (espacios?.length ?? 0) > 0
  const turno = activas.find((x) => esTurno(x.p)) ?? null
  const planDe = (id: string) => activas.find((x) => x.espacio.id === id) ?? null
  const yaDemo = espacios?.some((e) => e.demo && esDemoMakana(e) && e.mi_rol === 'organizador') ?? false

  const perfil = usePerfil()
  // Pantalla 9 (mockup): primera vez en este teléfono, sin nombre y sin grupos.
  if (!perfil && espacios !== null && espacios.length === 0) {
    return <PortadaNueva soloLectura={soloLectura} invitacionInvalida={invitacionInvalida} />
  }

  return (
    <div className="vista s1 s1-portada">
      <div className="hoja s1-hoja">
        {invitacionInvalida ? (
          <Aviso tono="aviso" titulo="Ese enlace de invitación no es válido">
            Pide uno nuevo o escribe el código en «Unirme con un código».
          </Aviso>
        ) : null}
        <OtraSesion />
        {turno ? <TeToca plan={turno} /> : null}

        <div className={`s1-cuerpo ${conGrupos ? 's1-con-grupos' : 's1-sin-grupos'}`}>
          <section className="s1-columna-grupos" aria-labelledby="mis-espacios">
            <h1 id="mis-espacios" className="s1-titulo">
              Tus grupos
            </h1>
            {espacios === null && !error ? <Cargando texto="Buscando tus grupos…" /> : null}
            {error && espacios === null ? <ErrorCaja error={error} onReintentar={cargar} /> : null}
            {error && espacios !== null ? <ErrorCaja error={error} onReintentar={cargar} titulo="No se pudo actualizar" /> : null}
            {espacios && espacios.length > 0 ? (
              <ul className="filas s1-grupos">
                {espacios.map((e) => (
                  <FilaGrupo key={e.id} e={e} plan={planDe(e.id)} />
                ))}
              </ul>
            ) : null}
            {espacios && espacios.length === 0 ? (
              <p className="t-cuerpo s1-vacio">Todavía no estás en ningún grupo. Crea uno o únete con el código que te mandaron.</p>
            ) : null}
          </section>

          {/* Pantalla 8: en la computadora (y sin grupos todavía) las opciones de "Nuevo grupo" se ven sin abrir la hoja,
              con "Unirme con un código" desplegada. */}
          <aside className="s1-columna-nuevo" aria-labelledby="nuevo-columna-titulo">
            <h2 id="nuevo-columna-titulo" className="s1-columna-titulo">
              Nuevo grupo
            </h2>
            <OpcionesNuevo soloLectura={soloLectura} yaDemo={yaDemo} abierto />
          </aside>
        </div>
      </div>

      {conGrupos ? (
        <>
          <button type="button" className="btn btn-primario s1-mas" onClick={() => setHoja(true)} aria-haspopup="dialog">
            <Icono n="mas" tam={22} /> Nuevo grupo
          </button>
          {hoja ? (
            <HojaNuevo cerrar={() => setHoja(false)}>
              <OpcionesNuevo soloLectura={soloLectura} yaDemo={yaDemo} abierto={false} />
            </HojaNuevo>
          ) : null}
        </>
      ) : null}
    </div>
  )
}

/** La línea de "te toca": la única cosa arriba, y solo cuando el servidor lo dice. Lleva al plan (2 toques con confirmar). */
function TeToca({ plan }: { plan: PlanActivo }) {
  return (
    <a className="s1-te-toca" href={rutas.propuesta(plan.espacio.id, plan.p.id)}>
      <span>
        <strong>{plan.p.siguiente_accion.codigo === 'te_toca_aceptar' ? 'Te toca confirmar' : 'Te toca'}</strong> · {plan.espacio.nombre}
      </span>
      <Icono n="chevron" tam={18} />
    </a>
  )
}

/** Fila del grupo (pantalla 1): "6 personas · sáb 31 oct, 14:00" con la opción vigente; si no hay, el estado; si no, "sin plan todavía". */
function FilaGrupo({ e, plan }: { e: EspacioResumen; plan: PlanActivo | null }) {
  const personas = `${e.cantidad_miembros} ${e.cantidad_miembros === 1 ? 'persona' : 'personas'}`
  // 0056: el servidor trae la fecha del plan destacado; hasta que se aplique, la del estado de la propuesta.
  const fecha = e.fecha_local ? momentoCorto(e.fecha_local) : e.fecha_local === undefined ? (plan?.fecha ?? null) : null
  const estado = fecha ?? (plan ? etiquetaPlan(plan.p.estado, plan.p.estado_etiqueta).toLocaleLowerCase('es') : 'sin plan todavía')
  return (
    <li>
      <a className="fila s1-fila-grupo" href={rutas.espacio(e.id)}>
        <IconoGrupo nombre={e.nombre} />
        <span className="fila-texto">
          <span className="fila-titulo">{e.nombre}</span>
          <span className="fila-meta t-nota">
            {personas} · {estado}
          </span>
        </span>
        <span className="visualmente-oculto">Abrir grupo</span>
        <span className="fila-chevron" aria-hidden="true">
          <Icono n="chevron" />
        </span>
      </a>
    </li>
  )
}

/** Pantalla 2: "Crear un grupo", "Unirme con un código" (se despliega ahí mismo) y, chico, la demo. En la hoja o a la vista. */
function OpcionesNuevo({ soloLectura, yaDemo, abierto }: { soloLectura: boolean; yaDemo: boolean; abierto: boolean }) {
  // La demo vive en la pantalla 9; en la hoja del "+" (pantalla 2) no va, y en la computadora (pantalla 8) sí, a la vista.
  const conDemo = abierto
  return (
    <div className="s1-opciones">
      <a className="s1-opcion" href={rutas.crear()}>
        <span className="s1-opcion-icono" aria-hidden="true">
          <Icono n="mas" />
        </span>
        <span className="s1-opcion-texto">
          <span className="t-subtitulo">Crear un grupo</span>
          <span className="t-nota">Pones el nombre y a tus amigos. Después armas el plan.</span>
        </span>
        <span className="fila-chevron" aria-hidden="true">
          <Icono n="chevron" />
        </span>
      </a>
      <details className="s1-opcion s1-opcion-unirme" open={abierto || undefined}>
        <summary>
          <span className="s1-opcion-icono" aria-hidden="true">
            <Icono n="llave" />
          </span>
          <span className="s1-opcion-texto">
            <span className="t-subtitulo">Unirme con un código</span>
            <span className="t-nota">Te lo mandó quien organiza.</span>
          </span>
        </summary>
        <div className="s1-opcion-cuerpo">
          <UnirsePortada deshabilitado={soloLectura} />
        </div>
      </details>
      {conDemo ? (
        <div className="s1-demo">
          <CargarDemo deshabilitado={soloLectura} yaCargada={yaDemo} chico />
        </div>
      ) : null}
    </div>
  )
}

/** La hoja del "+": un <dialog> nativo (foco atrapado y Escape) que sube desde abajo (.sd-hoja-modal, del sistema). */
function HojaNuevo({ cerrar, children }: { cerrar: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (d && !d.open) d.showModal()
    return () => d?.close()
  }, [])
  return (
    <dialog
      ref={ref}
      className="s1-hoja-modal sd-hoja-modal"
      aria-labelledby="hoja-nuevo-titulo"
      onClose={cerrar}
      onClick={(e) => {
        // Tocar fuera de la hoja (el fondo) la cierra.
        if (e.target === e.currentTarget) cerrar()
      }}
    >
      <div className="s1-hoja-cabeza">
        <h2 id="hoja-nuevo-titulo">Nuevo grupo</h2>
        <button type="button" className="btn btn-secundario s1-cerrar" onClick={cerrar} aria-label="Cerrar">
          <span className="s1-x" aria-hidden="true">
            <Icono n="mas" tam={20} />
          </span>
        </button>
      </div>
      {children}
    </dialog>
  )
}

/**
 * Pantalla 9: primera vez, sin nombre y sin grupos. Título, la órbita chica, "Entrar a CRUXE" con el nombre (primario) y
 * dos filas: la demo y "Tengo un código de invitación", que se despliega ahí mismo. Al entrar con el nombre se ve "Tus
 * grupos" vacío con "Crear un grupo" a la vista.
 */
function PortadaNueva({ soloLectura, invitacionInvalida }: { soloLectura: boolean; invitacionInvalida?: boolean }) {
  const [nombre, setNombre] = useState('')
  const [aviso, setAviso] = useState<string | null>(null)
  function entrar(e: FormEvent) {
    e.preventDefault()
    if (!nombre.trim()) return
    vibrar(10)
    if (!guardarPerfil(nombre)) setAviso('Este navegador no deja guardar datos: escribirás tu nombre al crear o unirte.')
  }
  return (
    <div className="vista s1 s1-nueva">
      <section className="escena escena-portada" aria-labelledby="portada-titulo">
        <h1 id="portada-titulo" className="portada-lema">
          Del «nos juntamos» al{' '}
          <em className="sin-corte">
            <Resaltado>encuentro que ocurre</Resaltado>.
          </em>
        </h1>
        <p className="portada-sub">Cada uno dice en privado cuándo puede. Sale un solo plan y cada uno lo confirma.</p>
        <div className="s1-orbita-chica">
          <Orbita compacta />
        </div>
      </section>
      <div className="hoja">
        {invitacionInvalida ? (
          <Aviso tono="aviso" titulo="Ese enlace de invitación no es válido">
            Pide uno nuevo o escribe el código en «Tengo un código de invitación».
          </Aviso>
        ) : null}
        <OtraSesion />
        <form className="tarjeta s1-entrar" onSubmit={entrar} noValidate aria-labelledby="ingreso-titulo">
          <h2 id="ingreso-titulo">Entrar</h2>
          <p className="t-nota s1-nota">Sin contraseña ni correo. Tu sesión queda en este teléfono.</p>
          <label className="campo">
            <span>¿Cómo te llaman tus amigos?</span>
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={30} autoComplete="nickname" placeholder="Tu nombre" />
          </label>
          <Boton type="submit" className="s1-btn" disabled={!nombre.trim()}>
            Entrar
          </Boton>
          {aviso ? <p role="status">{aviso}</p> : null}
        </form>
        <div className="s1-opciones">
          <CargarDemo deshabilitado={soloLectura} yaCargada={false} fila />
          <details className="s1-opcion s1-opcion-unirme">
            <summary>
              <span className="s1-opcion-icono" aria-hidden="true">
                <Icono n="llave" />
              </span>
              <span className="s1-opcion-texto">
                <span className="t-subtitulo">Tengo un código de invitación</span>
                <span className="t-nota">Te lo mandó quien organiza.</span>
              </span>
            </summary>
            <div className="s1-opcion-cuerpo">
              <UnirsePortada deshabilitado={soloLectura} />
            </div>
          </details>
        </div>
      </div>
    </div>
  )
}

interface PlanActivo {
  espacio: EspacioResumen
  p: PropuestaResumen
  /** "sáb 31 oct, 14:00": inicio de la opción vigente, si la hay (del estado de la propuesta). */
  fecha: string | null
}

// La fecha de la opción vigente no viene en el resumen: se lee el estado de la propuesta una vez por versión del
// estado (state_rev), no en cada sondeo.
const fechas = new Map<string, { rev: number; fecha: string | null }>()
const CON_OPCION = new Set(['esperando_compromisos', 'grupo_confirmado'])
async function fechaDe(p: PropuestaResumen): Promise<string | null> {
  if (p.fecha_local !== undefined) return p.fecha_local ? momentoCorto(p.fecha_local) : null
  if (!CON_OPCION.has(p.estado)) return null
  const guardada = fechas.get(p.id)
  if (guardada && guardada.rev === p.state_rev) return guardada.fecha
  const r = await api.getProposalState(p.id)
  if (!r.ok || !('propuesta' in r.data) || !r.data.propuesta) return guardada?.fecha ?? null
  const op = r.data.propuesta.opcion
  const fecha = op ? momentoCorto(op.franja.inicio) : null
  fechas.set(p.id, { rev: p.state_rev, fecha })
  return fecha
}

const ESTADOS_ACTIVOS = new Set(['borrador', 'reuniendo_interes', 'esperando_compromisos', 'grupo_confirmado', 'en_revision'])

/** Propuestas vigentes de mis grupos (hasta 4 grupos). El orden y "Te toca" salen del servidor. */
async function planesActivos(espacios: EspacioResumen[]): Promise<PlanActivo[]> {
  const listas = await Promise.all(
    espacios.slice(0, 4).map(async (e) => {
      const r = await api.listProposals(e.id)
      if (!r.ok) return []
      const vigentes = r.data.propuestas.filter((p) => ESTADOS_ACTIVOS.has(p.estado))
      return Promise.all(vigentes.map(async (p) => ({ espacio: e, p, fecha: await fechaDe(p) })))
    }),
  )
  const turno = (x: PlanActivo) => esTurno(x.p)
  return listas.flat().sort((a, b) => Number(turno(b)) - Number(turno(a)))
}

/** La demo social de siete compañeros. No modifica los grupos de demostración anteriores. */
function CargarDemo({ deshabilitado, yaCargada, chico, fila }: { deshabilitado: boolean; yaCargada: boolean; chico?: boolean; fila?: boolean }) {
  const { ocupado, error, ejecutar } = useAccion()
  async function hacer() {
    const r = await ejecutar('seed-makana', () => api.seedDemoMakana())
    if (r?.ok) irA(rutas.espacio(r.data.resultado.espacio_id))
  }
  const texto = `${yaCargada ? 'Abrir' : 'Probar'} la demo «${DEMO_MAKANA.nombre}»`
  if (fila) {
    // Pantalla 9: una FILA igual a la de "Tengo un código de invitación".
    return (
      <>
        <button type="button" className="s1-opcion s1-opcion-fila" onClick={hacer} disabled={deshabilitado} aria-busy={ocupado || undefined} aria-labelledby="demo-fila-titulo" aria-describedby="demo-fila-nota">
          <span className="s1-opcion-icono" aria-hidden="true">
            <Icono n="rayo" />
          </span>
          <span className="s1-opcion-texto">
            <span className="t-subtitulo" id="demo-fila-titulo">{ocupado ? 'Preparando la demo…' : texto}</span>
            <span className="t-nota" id="demo-fila-nota">{DEMO_MAKANA.detalle}</span>
          </span>
        </button>
        {error ? <ErrorCaja error={error} enfocar /> : null}
      </>
    )
  }
  if (chico) {
    return (
      <>
        <p className="t-nota s1-demo-linea">
          o prueba sin crear nada ·{' '}
          <button type="button" className="enlace s1-demo-enlace" onClick={hacer} disabled={deshabilitado} aria-busy={ocupado || undefined} aria-describedby="demo-detalle">
            {ocupado ? 'Preparando la demo…' : texto}
          </button>
        </p>
        <p className="visualmente-oculto" id="demo-detalle">
          {DEMO_MAKANA.detalle}
        </p>
        {error ? <ErrorCaja error={error} enfocar /> : null}
      </>
    )
  }
  return (
    <>
      <Boton variante="secundario" className="s1-btn" onClick={hacer} ocupado={ocupado} ocupadoTexto="Preparando la demo…" disabled={deshabilitado} aria-describedby="demo-detalle">
        {texto}
      </Boton>
      <p className="t-nota s1-nota" id="demo-detalle">
        {DEMO_MAKANA.detalle}
      </p>
      {error ? <ErrorCaja error={error} enfocar /> : null}
    </>
  )
}

/** Un solo formulario de unión (el de "¿Quién eres?"): "Código de invitación", "Tu nombre en el grupo" y "Unirme"; reclama al integrante anotado o lleva a la lista del grupo según el código, y el aviso de navegador compartido. */
function UnirsePortada({ deshabilitado }: { deshabilitado: boolean }) {
  const u = useUnirse(fuenteReal)
  const campoNombre = useRef<HTMLInputElement>(null)
  return <UnirseConNombre codigoInicial="" u={u} campoNombre={campoNombre} deshabilitado={deshabilitado} vista={null} compacto />
}
