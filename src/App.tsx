import { useContratoIncompatible, useOnline, useSesion } from './lib/hooks'
import type { FaseSesion } from './lib/hooks'
import { rutas, ShellProvider, useRuta, useShell } from './lib/shell'
import type { Ruta } from './lib/shell'
import { Aviso, Boton, Cargando } from './components/ui'
import { Marca } from './components/Marca'
import { lazy, Suspense, useEffect } from 'react'
import Inicio from './screens/Inicio'
import { Entrar, PrimeraVisita } from './login/Entrar'

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
      <header className="encabezado">
        <div className="encabezado-linea">
          <a className="marca" href={rutas.inicio()} aria-label="CRUXE, ir a tus espacios">
            <Marca />
          </a>
          <span className="sep" aria-hidden="true">
            /
          </span>
          <span className="encabezado-espacio">{identidad.espacio ?? 'Sin espacio'}</span>
          <span className="sep" aria-hidden="true">
            /
          </span>
          <span className="datos-ficticios">Datos ficticios</span>
        </div>
        <div className="encabezado-identidad" aria-live="polite">
          {identidad.yo ? (
            <>
              Sesión activa: <strong>{identidad.yo}</strong>
              {identidad.rol ? <span className="etiqueta"> {identidad.rol}</span> : null}
            </>
          ) : (
            <>Sesión anónima{identidad.espacio ? '' : ': aún sin nombre en un espacio'}</>
          )}
        </div>
      </header>

      <main id="contenido" className="contenido" tabIndex={-1}>
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

        {sesion.fase === 'cargando' ? <Cargando texto="Iniciando tu sesión…" /> : null}
        {sesion.fase === 'error' ? (
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
    <Suspense fallback={<Cargando texto="Cargando…" />}>
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
    case 'entrar':
      return <Entrar />
    default:
      // Primera visita (sesión sin espacios): la entrada de src/login. Con espacios, la portada de siempre.
      return (
        <PrimeraVisita>
          <Inicio />
        </PrimeraVisita>
      )
  }
}

/** U5 (revisión de Codex): la navegación usa el hash, así que el enlace no puede cambiarlo; solo mueve el foco. */
function saltarAlContenido(e: React.MouseEvent<HTMLAnchorElement>) {
  e.preventDefault()
  const main = document.getElementById('contenido')
  main?.focus()
  main?.scrollIntoView({ block: 'start' })
}
