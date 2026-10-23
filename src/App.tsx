import { useContratoIncompatible, useOnline, useSesion } from './lib/hooks'
import type { FaseSesion } from './lib/hooks'
import { rutas, ShellProvider, useRuta, useShell } from './lib/shell'
import type { Ruta } from './lib/shell'
import { Aviso, Boton, Cargando } from './components/ui'
import { Marca } from './components/Marca'
import Inicio from './screens/Inicio'
import Espacio from './screens/Espacio'
import NuevaPropuesta from './screens/NuevaPropuesta'
import Propuesta from './screens/Propuesta'

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
      <a className="saltar" href="#contenido">
        Saltar al contenido
      </a>
      <header className="encabezado">
        <div className="encabezado-linea">
          <a className="marca" href={rutas.inicio()} aria-label="CRUCE, ir a tus espacios">
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
  switch (ruta.nombre) {
    case 'espacio':
      return <Espacio key={ruta.espacioId} espacioId={ruta.espacioId} />
    case 'nueva':
      return <NuevaPropuesta key={ruta.espacioId} espacioId={ruta.espacioId} />
    case 'propuesta':
      return <Propuesta espacioId={ruta.espacioId} propuestaId={ruta.propuestaId} />
    default:
      return <Inicio />
  }
}
