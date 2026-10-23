import { useContratoIncompatible, useOnline, useSesion } from './lib/hooks'
import type { FaseSesion } from './lib/hooks'
import { rutas, ShellProvider, useRuta, useShell } from './lib/shell'
import type { Ruta } from './lib/shell'
import { Avatar, Aviso, Boton, Cargando } from './components/ui'
import { Icono } from './components/Icono'
import type { NombreIcono } from './components/Icono'
import { usePerfil } from './lib/perfil'
import { Entrada, useEntrada } from './components/Intro'
import { Marca } from './components/Marca'
import { lazy, Suspense, useEffect } from 'react'
import Inicio from './screens/Inicio'
import { QuienEres } from './login/QuienEres'
import { fuenteReal } from './login/fuente'

// Mejora #14: la primera pantalla carga sola; las demás van en partes aparte (dividen el paquete de > 500 KB)
// y se precargan en segundo plano apenas hay sesión, para que en la demo navegar no espere a la red.
const cargarEspacio = () => import('./screens/Espacio')
const cargarNuevaPropuesta = () => import('./screens/NuevaPropuesta')
const cargarPropuesta = () => import('./screens/Propuesta')
const Espacio = lazy(cargarEspacio)
const NuevaPropuesta = lazy(cargarNuevaPropuesta)
const Propuesta = lazy(cargarPropuesta)
const Planes = lazy(() => import('./screens/Planes'))
const Perfil = lazy(() => import('./screens/Perfil'))
const CrearGrupo = lazy(() => import('./screens/CrearGrupo'))

function usePrecargaPantallas(activa: boolean) {
  useEffect(() => {
    if (!activa) return
    const t = setTimeout(() => {
      void cargarEspacio()
      void cargarPropuesta()
      void cargarNuevaPropuesta()
    }, 800)
    return () => clearTimeout(t)
  }, [activa])
}

export default function App() {
  const { sesion, reintentar } = useSesion()
  const incompatible = useContratoIncompatible()
  return (
    <ShellProvider soloLectura={incompatible}>
      <Marco sesion={sesion} reintentar={reintentar} incompatible={incompatible} />
    </ShellProvider>
  )
}

function Marco({
  sesion,
  reintentar,
  incompatible,
}: {
  sesion: FaseSesion
  reintentar: () => void
  incompatible: boolean
}) {
  const { identidad } = useShell()
  const online = useOnline()
  const ruta = useRuta()
  const perfil = usePerfil()
  // Navegación inferior solo en las pantallas principales; en un plan o un formulario se oculta, como durante un viaje.
  // En el ingreso (portada sin nombre) tampoco: la pantalla tiene una sola tarea.
  const conNav =
    sesion.fase === 'lista' && ((ruta.nombre === 'inicio' && perfil != null) || ruta.nombre === 'planes' || ruta.nombre === 'perfil')
  const quien = identidad.yo ?? perfil?.nombre ?? null
  // Entrada animada al abrir la portada o una invitación (una vez por sesión del navegador).
  const entrada = useEntrada(ruta.nombre === 'inicio' || ruta.nombre === 'unirse')

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
              <span className="visualmente-oculto">Sesión anónima{identidad.espacio ? '' : ': aún sin nombre en un espacio'}. Ver tu perfil</span>
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
              titulo="Versión incompatible"
              accion={
                <Boton variante="secundario" onClick={() => window.location.reload()}>
                  Recargar la aplicación
                </Boton>
              }
            >
              Versión incompatible: recarga la aplicación. Mientras tanto no se pueden registrar acciones.
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
              titulo="No se pudo iniciar la sesión"
              accion={
                <Boton variante="secundario" onClick={reintentar}>
                  Reintentar
                </Boton>
              }
            >
              {sesion.mensaje}
            </Aviso>
          </div>
        ) : null}
        {sesion.fase === 'lista' ? <Pantalla ruta={ruta} /> : null}
      </main>
      {conNav ? <NavInferior ruta={ruta} /> : null}
      {entrada.visible ? <Entrada alTerminar={entrada.cerrar} /> : null}
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
    <Suspense
      fallback={
        <div className="pantalla">
          <Cargando texto="Cargando…" esqueleto />
        </div>
      }
    >
      <PantallaRuta ruta={ruta} />
    </Suspense>
  )
}

function PantallaRuta({ ruta }: { ruta: Ruta }) {
  switch (ruta.nombre) {
    case 'espacio':
      return <Espacio key={ruta.espacioId} espacioId={ruta.espacioId} />
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
  { nombre: 'inicio', texto: 'Inicio', icono: 'casa', href: rutas.inicio() },
  { nombre: 'planes', texto: 'Planes', icono: 'calendario', href: rutas.planes() },
  { nombre: 'perfil', texto: 'Perfil', icono: 'persona', href: rutas.perfil() },
]

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
