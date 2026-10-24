// Portada "Mi espacio" (S1 Ingreso, mockup validado por Nico 02:40, pantallas 1 y 2; la edita friccion por excepción del
// encargo). Arriba, solo si el servidor dice que te toca algo, UNA línea que lleva al plan; después "Tus grupos" con filas
// grandes; y un "+" flotante "Nuevo grupo" que abre una hoja desde abajo con "Crear un grupo", "Unirme con un código"
// (desplegable) y la demo. Sin grupos (primera vez) o en la computadora, esas opciones se ven sin abrir nada.
import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { api } from '../lib/api'
import type { ApiError, EspacioResumen, PropuestaResumen } from '../lib/types'
import { useAccion, useSondeo } from '../lib/hooks'
import { irA, rutas, useIdentidad, useShell } from '../lib/shell'
import { OtraSesion } from '../components/Sesiones'
import { guardarPerfil, usePerfil } from '../lib/perfil'
import { vibrar } from '../lib/tacto'
import { Aviso, Boton, Cargando, Chip, ErrorCaja, colorAvatar, iniciales } from '../components/ui'
import { Orbita } from '../components/Orbita'
import { Resaltado } from '../components/Resaltado'
import { esTurno } from '../components/PlanVivo'
import { Icono } from '../components/Icono'
import { UnirseConNombre, useUnirse } from '../login/QuienEres'
import { fuenteReal } from '../login/fuente'
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
  const planDe = (id: string) => activas.find((x) => x.espacio.id === id)?.p ?? null
  const yaDemo = espacios?.some((e) => e.demo && e.mi_rol === 'organizador') ?? false

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

          {/* En la computadora, o sin grupos todavía, las opciones de "Nuevo grupo" se ven sin abrir la hoja. */}
          <aside className="s1-columna-nuevo" aria-label="Nuevo grupo">
            <OpcionesNuevo soloLectura={soloLectura} yaDemo={yaDemo} conNombre={!conGrupos} />
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
              <OpcionesNuevo soloLectura={soloLectura} yaDemo={yaDemo} conNombre={false} />
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
      <Icono n="rayo" tam={18} />
      <span>
        <strong>{plan.p.siguiente_accion.codigo === 'te_toca_aceptar' ? 'Te toca confirmar' : 'Te toca'}</strong> · {plan.espacio.nombre}
      </span>
      <Icono n="chevron" tam={18} />
    </a>
  )
}

function FilaGrupo({ e, plan }: { e: EspacioResumen; plan: PropuestaResumen | null }) {
  const personas = `${e.cantidad_miembros} ${e.cantidad_miembros === 1 ? 'persona' : 'personas'}`
  return (
    <li>
      <a className="fila s1-fila-grupo" href={rutas.espacio(e.id)}>
        <span className="fila-icono s1-grupo-icono" style={{ background: colorAvatar(e.nombre), color: '#fff' }} aria-hidden="true">
          {iniciales(e.nombre)}
        </span>
        <span className="fila-texto">
          <span className="fila-titulo">{e.nombre}</span>
          <span className="fila-meta t-nota">
            {personas} · {plan ? `${plan.titulo}, ${plan.estado_etiqueta.toLocaleLowerCase('es')}` : 'sin plan todavía'}
          </span>
        </span>
        {e.demo ? <Chip tono="sim">Demo</Chip> : null}
        <span className="visualmente-oculto">Abrir grupo</span>
        <span className="fila-chevron" aria-hidden="true">
          <Icono n="chevron" />
        </span>
      </a>
    </li>
  )
}

/** "Crear un grupo", "Unirme con un código" (desplegable) y la demo: en la hoja del "+" o a la vista. */
function OpcionesNuevo({ soloLectura, yaDemo, conNombre }: { soloLectura: boolean; yaDemo: boolean; conNombre: boolean }) {
  return (
    <div className="s1-opciones">
      <a className="s1-opcion" href={rutas.crear()}>
        <span className="s1-opcion-icono" aria-hidden="true">
          <Icono n="grupo" />
        </span>
        <span className="s1-opcion-texto">
          <span className="t-subtitulo">Crear un grupo</span>
          <span className="t-nota">Pones el nombre y a tus amigos. Después armas el plan.</span>
        </span>
        <span className="fila-chevron" aria-hidden="true">
          <Icono n="chevron" />
        </span>
      </a>
      {/* Primera vez: el nombre (opcional) va antes del código; los guiones llenan el primer cuadro de texto de la portada. */}
      {conNombre ? <TuNombre /> : null}
      {/* Primera vez (sin grupos), abierto: es lo que vino a hacer quien llega con un código. En la hoja, plegado. */}
      <details className="s1-opcion s1-opcion-unirme" open={conNombre || undefined}>
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
      <div className="s1-demo">
        <p className="t-nota s1-nota">o prueba sin crear nada</p>
        <CargarDemo deshabilitado={soloLectura} yaCargada={yaDemo} sinDetalle />
      </div>
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
          <h2 id="ingreso-titulo">Entrar a CRUXE</h2>
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
          <div className="s1-opcion s1-opcion-demo">
            <CargarDemo deshabilitado={soloLectura} yaCargada={false} />
          </div>
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

/** Tu nombre, opcional: queda en este teléfono y se completa solo al crear un grupo o al unirte. */
function TuNombre() {
  const perfil = usePerfil()
  const [nombre, setNombre] = useState('')
  const [editando, setEditando] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)
  function entrar(e: FormEvent) {
    e.preventDefault()
    if (!nombre.trim()) return
    vibrar(10)
    if (guardarPerfil(nombre)) {
      setEditando(false)
      setNombre('')
      setAviso(null)
    } else setAviso('Este navegador no deja guardar datos: escribirás tu nombre al crear o unirte.')
  }
  if (perfil && !editando) {
    return (
      <p className="t-nota s1-nombre-listo">
        En este teléfono: <strong>{perfil.nombre}</strong>.{' '}
        <button type="button" className="enlace" onClick={() => setEditando(true)}>
          Cambiar
        </button>
      </p>
    )
  }
  return (
    <form className="s1-nombre" onSubmit={entrar} noValidate aria-labelledby="ingreso-titulo">
      <h2 id="ingreso-titulo" className="t-cuerpo">
        Entrar a CRUXE
      </h2>
      <div className="s1-nombre-fila">
        <label className="campo">
          <span>¿Cómo te llaman tus amigos?</span>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={30} autoComplete="nickname" placeholder="Tu nombre" />
        </label>
        <Boton type="submit" variante="secundario" disabled={!nombre.trim()}>
          Entrar
        </Boton>
      </div>
      <p className="t-nota s1-nota">Opcional: queda en este teléfono y se completa solo al crear o unirte.</p>
      {aviso ? <p role="status">{aviso}</p> : null}
    </form>
  )
}

interface PlanActivo {
  espacio: EspacioResumen
  p: PropuestaResumen
}

const ESTADOS_ACTIVOS = new Set(['borrador', 'reuniendo_interes', 'esperando_compromisos', 'grupo_confirmado', 'en_revision'])

/** Propuestas vigentes de mis grupos (hasta 4 grupos). El orden y "Te toca" salen del servidor. */
async function planesActivos(espacios: EspacioResumen[]): Promise<PlanActivo[]> {
  const listas = await Promise.all(
    espacios.slice(0, 4).map(async (e) => {
      const r = await api.listProposals(e.id)
      return r.ok ? r.data.propuestas.filter((p) => ESTADOS_ACTIVOS.has(p.estado)).map((p) => ({ espacio: e, p })) : []
    }),
  )
  const turno = (x: PlanActivo) => esTurno(x.p)
  return listas.flat().sort((a, b) => Number(turno(b)) - Number(turno(a)))
}

function CargarDemo({ deshabilitado, yaCargada, sinDetalle }: { deshabilitado: boolean; yaCargada: boolean; sinDetalle?: boolean }) {
  const { ocupado, error, ejecutar } = useAccion()
  async function hacer() {
    const r = await ejecutar('seed', () => api.seedDemoSpace())
    if (r?.ok) irA(rutas.espacio(r.data.resultado.espacio_id))
  }
  return (
    <>
      <Boton variante="secundario" className="s1-btn" onClick={hacer} ocupado={ocupado} ocupadoTexto="Preparando la demo…" disabled={deshabilitado} aria-describedby="demo-detalle">
        {yaCargada ? 'Abrir la demo «Los del finde»' : 'Probar la demo «Los del finde»'}
      </Boton>
      <p className={`t-nota s1-nota ${sinDetalle ? 'visualmente-oculto' : ''}`} id="demo-detalle">
        Serás Tomi, quien organiza; las otras cinco personas son simuladas. Datos ficticios.
      </p>
      {error ? <ErrorCaja error={error} enfocar /> : null}
    </>
  )
}

/** Un solo formulario de unión (el de "¿Quién eres?"): mismos rótulos ("Código de invitación", "Tu nombre en el espacio",
 * "Unirme"), reclama al integrante anotado o lleva a la lista del grupo según el código, y el aviso de navegador compartido. */
function UnirsePortada({ deshabilitado }: { deshabilitado: boolean }) {
  const u = useUnirse(fuenteReal)
  const campoNombre = useRef<HTMLInputElement>(null)
  return <UnirseConNombre codigoInicial="" u={u} campoNombre={campoNombre} deshabilitado={deshabilitado} vista={null} compacto />
}
