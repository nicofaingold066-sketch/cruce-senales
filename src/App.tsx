import { useContratoIncompatible, useOnline, useSesion } from './lib/hooks'
import type { FaseSesion } from './lib/hooks'
import { rutas, ShellProvider, useRuta, useShell } from './lib/shell'
import type { Ruta } from './lib/shell'
import { Avatar, Aviso, Boton, Cargando } from './components/ui'
import { Marca } from './components/Marca'
import { lazy, Suspense, useEffect } from 'react'
import Inicio from './screens/Inicio'

// Mejora #14: la primera pantalla carga sola; las demás van en partes aparte (dividen el paquete de > 500 KB)
// y se precargan en segundo plano apenas hay sesión, para que en la demo navegar no espere a la red.
const cargarEspacio = () => import('./screens/Espacio')
const cargarNuevaPropuesta = () => import('./screens/NuevaPropuesta')
const cargarPropuesta = () => import('./screens/Propuesta')
const Espacio = lazy(cargarEspacio)
const NuevaPropuesta = lazy(cargarNuevaPropuesta)
const Propuesta = lazy(cargarPropuesta)

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
        <div className="barra-identidad" aria-live="polite">
          {identidad.yo ? (
            <>
              <Avatar nombre={identidad.yo} tam={30} />
              <span className="barra-identidad-texto">
                <span className="visualmente-oculto">Sesión activa: </span>
                <strong>{identidad.yo}</strong>
                {identidad.rol ? <span className="barra-rol">{identidad.rol}</span> : null}
              </span>
            </>
          ) : (
            <span className="visualmente-oculto">Sesión anónima{identidad.espacio ? '' : ': aún sin nombre en un espacio'}</span>
          )}
        </div>
      </header>

      <main id="contenido" className="contenido" tabIndex={-1}>
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
    case 'unirse':
      return ruta.invalida ? <Inicio key="invitacion-invalida" invitacionInvalida /> : <Inicio key={ruta.codigo} codigoInvitacion={ruta.codigo} />
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
