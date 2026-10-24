import { useContratoIncompatible, useOnline, useSesion } from './lib/hooks'
import type { FaseSesion } from './lib/hooks'
import { rutas, ShellProvider, useRuta, useShell } from './lib/shell'
import type { Ruta } from './lib/shell'
import { Avatar, Aviso, Boton, Cargando } from './components/ui'
import { Icono } from './components/Icono'
import type { NombreIcono } from './components/Icono'
import { usePerfil } from './lib/perfil'
import { Marca } from './components/Marca'
import { Entrada, useEntrada } from './components/Intro'
import { Guia, useGuia } from './components/Guia'
import { Component, lazy, Suspense, useEffect } from 'react'
import type { ReactNode } from 'react'
import Inicio from './screens/Inicio'
import { QuienEres } from './login/QuienEres'
import { fuenteReal } from './login/fuente'
import { Responder } from './friccion/Responder'
import { conReintento, esErrorDeCarga } from './friccion/importar'

// Mejora #14: la primera pantalla carga sola; las demás van en partes aparte (dividen el paquete de > 500 KB)
// y se precargan en segundo plano apenas hay sesión, para que en la demo navegar no espere a la red.
// #82: cada import reintenta una vez con otra URL si la red cambió; la precarga y React.lazy comparten la bajada.
const cargarEspacio = conReintento(() => import('./screens/Espacio'))
const cargarNuevaPropuesta = conReintento(() => import('./screens/NuevaPropuesta'))
const cargarPropuesta = conReintento(() => import('./screens/Propuesta'))
const Espacio = lazy(cargarEspacio)
const NuevaPropuesta = lazy(cargarNuevaPropuesta)
const Propuesta = lazy(cargarPropuesta)
const Planes = lazy(conReintento(() => import('./screens/Planes')))
const Perfil = lazy(conReintento(() => import('./screens/Perfil')))
const CrearGrupo = lazy(conReintento(() => import('./screens/CrearGrupo')))

function usePrecargaPantallas(activa: boolean) {
  useEffect(() => {
    if (!activa) return
    // Un fallo acá no se muestra: si la pantalla se abre después, su import reintenta y, si no puede, avisa.
    const t = setTimeout(() => {
      for (const c of [cargarEspacio, cargarPropuesta, cargarNuevaPropuesta]) c().catch(() => {})
    }, 800)
    return () => clearTimeout(t)
  }, [activa])
}

export default function App() {
  const entrada = useEntrada()
  const guia = useGuia()
  const { sesion, reintentar } = useSesion()
  const incompatible = useContratoIncompatible()
  return (
    <ShellProvider soloLectura={incompatible}>
      <Marco sesion={sesion} reintentar={reintentar} incompatible={incompatible} alAbrirAyuda={() => { entrada.abrir(); guia.abrir() }} />
      {entrada.visible ? <Entrada alTerminar={entrada.cerrar} /> : null}
      {!entrada.visible && guia.visible ? <Guia alCerrar={guia.cerrar} /> : null}
    </ShellProvider>
  )
}

function Marco({
  sesion,
  reintentar,
  incompatible,
  alAbrirAyuda,
}: {
  sesion: FaseSesion
  reintentar: () => void
  incompatible: boolean
  alAbrirAyuda: () => void
}) {
  const { identidad } = useShell()
  const online = useOnline()
  const ruta = useRuta()
  const perfil = usePerfil()
  // Navegación inferior solo en las pantallas principales; en un plan o un formulario se oculta, como durante un viaje.
  // En el ingreso (pantalla 9, portada sin nombre ni grupos) tampoco: la oculta seccion-s1.css, que sabe cuándo se ve.
  const conNav =
    sesion.fase === 'lista' && (ruta.nombre === 'inicio' || ruta.nombre === 'planes' || ruta.nombre === 'perfil')
  const quien = identidad.yo ?? perfil?.nombre ?? null

  return (
    <>
      <a className="saltar" href="#contenido" onClick={saltarAlContenido}>
        Saltar al contenido
      </a>
      <header className="barra">
        <a className="barra-marca" href={rutas.inicio()} aria-label="CRUXE, ir a tus espacios">
          <Marca />
        </a>
        <div className="barra-centro">
          {identidad.espacio ? <span className="barra-espacio">{identidad.espacio}</span> : null}
          <span className="chip-ficticio">Datos ficticios</span>
        </div>
        {conNav ? <PestanasBarra ruta={ruta} /> : null}
        <button type="button" className="cruxe-ayuda" onClick={alAbrirAyuda} aria-label="Ayuda: volver a ver el recorrido completo de CRUXE" aria-haspopup="dialog">
          <span aria-hidden="true">?</span><span className="cruxe-ayuda__texto">Ayuda</span>
        </button>
        <a className="barra-identidad" href={rutas.perfil()} aria-live="polite">
          {quien ? (
            <>
              <Avatar nombre={quien} tam={30} />
              <span className="barra-identidad-texto">
                <span className="visualmente-oculto">Sesión activa: </span>
                <strong>{quien}</strong>
                {identidad.yo && identidad.rol ? <span className="barra-rol">{identidad.rol}</span> : null}
                <span className="visualmente-oculto">. Ver tu perfil</span>
              </span>
            </>
          ) : (
            <>
              <Icono n="persona" tam={26} />
              <span className="visualmente-oculto">Sesión anónima{identidad.espacio ? '' : ': todavía sin nombre en ningún espacio'}. Ver tu perfil</span>
            </>
          )}
        </a>
      </header>

      <main id="contenido" className={`contenido ${conNav ? 'con-nav' : ''}`} tabIndex={-1}>
        <div className="avisos-globales">
          {!online ? (
            <Aviso tono="aviso" titulo="Sin conexión">
              Las acciones que hagas ahora no se registrarán. Lo que escribiste se conserva; reintenta cuando vuelva la
              conexión.
            </Aviso>
          ) : null}
          {incompatible ? (
            <Aviso
              tono="error"
              titulo="Hay una versión nueva de CRUXE"
              accion={
                <Boton variante="secundario" onClick={() => window.location.reload()}>
                  Recargar la aplicación
                </Boton>
              }
            >
              Recarga para seguir. Mientras tanto no se pueden registrar acciones; lo que ya guardaste está a salvo.
            </Aviso>
          ) : null}
        </div>

        {sesion.fase === 'cargando' ? (
          <div className="pantalla">
            <Cargando texto="Iniciando tu sesión…" esqueleto />
          </div>
        ) : null}
        {sesion.fase === 'error' ? (
          <div className="pantalla">
            <Aviso
              tono="error"
              titulo="No pudimos conectarte"
              accion={
                <Boton variante="secundario" onClick={reintentar}>
                  Reintentar
                </Boton>
              }
            >
              {/* rincones O-13: el texto de la sesión (hooks.ts) habla del proyecto; quien abrió un enlace solo necesita saber qué hacer. */}
              Revisa tu conexión y toca Reintentar. No necesitas cuenta ni contraseña.
            </Aviso>
          </div>
        ) : null}
        {sesion.fase === 'lista' ? <Pantalla ruta={ruta} /> : null}
      </main>
      {conNav ? <NavInferior ruta={ruta} /> : null}
    </>
  )
}

function Pantalla({ ruta }: { ruta: Ruta }) {
  usePrecargaPantallas(true)
  // La navegación por hash conserva el scroll de la pantalla anterior: cada pantalla nueva empieza arriba.
  const claveRuta = JSON.stringify(ruta)
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [claveRuta])
  return (
    <BarreraPantalla key={claveRuta}>
      <Suspense
        fallback={
          <div className="pantalla">
            <Cargando texto="Cargando…" esqueleto />
          </div>
        }
      >
        <PantallaRuta ruta={ruta} />
      </Suspense>
    </BarreraPantalla>
  )
}

/**
 * #82: barrera de errores de cada pantalla. Si una parte de la app no se pudo bajar (red que cambió, sin conexión)
 * o la pantalla falló al dibujarse, se ve un aviso con "Recargar" en vez de una página en blanco. Cambiar de ruta
 * la reinicia (key). Solo se registra el tipo de error, nunca datos del grupo.
 */
class BarreraPantalla extends Component<{ children: ReactNode }, { error: unknown }> {
  state: { error: unknown } = { error: null }
  static getDerivedStateFromError(error: unknown) {
    return { error }
  }
  componentDidCatch(e: unknown) {
    console.error('pantalla: no se pudo mostrar', e instanceof Error ? e.name : 'desconocido')
  }
  render() {
    if (this.state.error == null) return this.props.children
    const carga = esErrorDeCarga(this.state.error)
    return (
      <div className="pantalla">
        <Aviso
          tono="error"
          titulo={carga ? 'No se pudo abrir esta pantalla' : 'Algo falló al mostrar esta pantalla'}
          accion={
            <Boton variante="secundario" onClick={() => window.location.reload()}>
              Recargar
            </Boton>
          }
        >
          {carga
            ? 'Se cortó la conexión mientras se bajaba una parte de la aplicación. Recarga para intentarlo de nuevo; lo que ya guardaste no se pierde.'
            : 'Recarga la aplicación. Lo que ya guardaste no se pierde.'}
        </Aviso>
        <a className="btn btn-secundario" href={rutas.inicio()}>
          Ir a tus espacios
        </a>
      </div>
    )
  }
}

function PantallaRuta({ ruta }: { ruta: Ruta }) {
  switch (ruta.nombre) {
    case 'espacio':
      return <Espacio key={ruta.espacioId} espacioId={ruta.espacioId} />
    case 'responder':
      return <Responder key={`${ruta.espacioId}/${ruta.propuestaId ?? ''}`} espacioId={ruta.espacioId} propuestaId={ruta.propuestaId} />
    case 'nueva':
      return <NuevaPropuesta key={ruta.espacioId} espacioId={ruta.espacioId} />
    case 'propuesta':
      return <Propuesta espacioId={ruta.espacioId} propuestaId={ruta.propuestaId} />
    case 'planes':
      return <Planes />
    case 'perfil':
      return <Perfil />
    case 'crear':
      return <CrearGrupo />
    case 'unirse':
      return ruta.invalida ? <Inicio key="invitacion-invalida" invitacionInvalida /> : <QuienEres key={ruta.codigo} codigo={ruta.codigo} fuente={fuenteReal} />
    case 'invalida':
      return (
        <div className="pantalla">
          <Aviso tono="aviso" titulo="Este enlace no lleva a ningún grupo">
            Puede que se haya copiado incompleto. Pide el enlace de nuevo a quien organiza o vuelve a tus espacios.
          </Aviso>
          <a className="btn btn-primario" href={rutas.inicio()}>
            Ir a tus espacios
          </a>
        </div>
      )
    case 'entrar':
      // Una sola puerta: la portada del rediseño ya resuelve el ingreso (nombre, demo, código o grupo nuevo).
      return <Inicio />
    default:
      return <Inicio />
  }
}

/** U5 (revisión de Codex): la navegación usa el hash, así que el enlace no puede cambiarlo; solo mueve el foco. */
function saltarAlContenido(e: React.MouseEvent<HTMLAnchorElement>) {
  e.preventDefault()
  const main = document.getElementById('contenido')
  main?.focus()
  main?.scrollIntoView({ block: 'start' })
}

const SECCIONES: { nombre: 'inicio' | 'planes' | 'perfil'; texto: string; icono: NombreIcono; href: string }[] = [
  { nombre: 'inicio', texto: 'Grupos', icono: 'grupo', href: rutas.inicio() },
  { nombre: 'planes', texto: 'Planes', icono: 'calendario', href: rutas.planes() },
  { nombre: 'perfil', texto: 'Perfil', icono: 'persona', href: rutas.perfil() },
]

/** Computadora (C1–C9): las mismas pestañas arriba, en la barra, con la activa subrayada. Solo se ven desde 960 px. */
function PestanasBarra({ ruta }: { ruta: Ruta }) {
  return (
    <nav className="barra-pestanas" aria-label="Secciones">
      {SECCIONES.map((s) => {
        const activa = ruta.nombre === s.nombre
        return (
          <a key={s.nombre} href={s.href} className={activa ? 'barra-pestana-activa' : undefined} aria-current={activa ? 'page' : undefined}>
            {s.texto}
          </a>
        )
      })}
    </nav>
  )
}

/** Barra de secciones al alcance del pulgar (Inicio, Planes, Perfil). */
function NavInferior({ ruta }: { ruta: Ruta }) {
  return (
    <nav className="nav-inferior" aria-label="Secciones">
      {SECCIONES.map((s) => {
        const activa = ruta.nombre === s.nombre
        return (
          <a key={s.nombre} href={s.href} className={`nav-item ${activa ? 'nav-activa' : ''}`} aria-current={activa ? 'page' : undefined}>
            <Icono n={s.icono} tam={22} />
            <span>{s.texto}</span>
          </a>
        )
      })}
    </nav>
  )
}
