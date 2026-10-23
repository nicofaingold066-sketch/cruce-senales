import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'
import type { Espacio } from '../lib/types'
import { CODIGOS_SIGUIENTE } from '../lib/types'
import { usePropuestaViva } from '../lib/hooks'
import { dejarAviso, irA, rutas, tomarAviso, useIdentidad, useShell } from '../lib/shell'
import { Aviso, Boton, Cargando, ErrorCaja } from '../components/ui'
import type { Pestana } from './tabs'
import PlanTab from './PlanTab'
import RespuestaTab from './RespuestaTab'
import HistorialTab from './HistorialTab'
import SimulacionTab from './SimulacionTab'

export default function Propuesta({ espacioId, propuestaId }: { espacioId: string; propuestaId: string }) {
  // key: al cambiar de propuesta se descarta todo el estado (incluido el state_rev guardado).
  return <PropuestaInterna key={propuestaId} espacioId={espacioId} propuestaId={propuestaId} />
}

function PropuestaInterna({ espacioId, propuestaId }: { espacioId: string; propuestaId: string }) {
  const { soloLectura } = useShell()
  const viva = usePropuestaViva(propuestaId)
  const p = viva.propuesta
  const [espacio, setEspacio] = useState<Espacio | null>(null)
  const [pestana, setPestana] = useState<Pestana>('plan')
  const [avisoVersion, setAvisoVersion] = useState<number | null>(null)
  // Aviso dejado por la pantalla anterior (por ejemplo, "se creó pero no se pudo abrir").
  const [avisoPrevio, setAvisoPrevio] = useState<string | null>(() => tomarAviso())
  const versionPrevia = useRef<number | null>(null)

  useEffect(() => {
    let vivo = true
    void api.getSpace(espacioId).then((r) => {
      if (vivo && r.ok) setEspacio(r.data.espacio)
    })
    return () => {
      vivo = false
    }
  }, [espacioId])

  const nombreYo = p?.mi_situacion.nombre ?? espacio?.miembros.find((m) => m.es_yo)?.nombre ?? null
  const rol = p ? (p.mi_situacion.es_organizador_espacio ? 'organizador' : 'miembro') : null
  useIdentidad(espacio?.nombre ?? null, nombreYo, rol)

  // Si la propuesta desaparece (por ejemplo, reinicio de demo), se vuelve a la lista con un aviso.
  useEffect(() => {
    if (viva.fuera) {
      dejarAviso('La propuesta ya no está disponible (por ejemplo, porque se reinició la demo).')
      irA(rutas.espacio(espacioId))
    }
  }, [viva.fuera, espacioId])

  // Contrato 4: si cambia la versión mostrada, se descartan confirmaciones locales y se avisa.
  const version = p?.opcion?.version ?? null
  useEffect(() => {
    if (version != null && versionPrevia.current != null && version !== versionPrevia.current) {
      setAvisoVersion(version)
    }
    if (version != null) versionPrevia.current = version
  }, [version])

  const refrescar = useCallback(() => void viva.refrescar(), [viva])

  if (!p) {
    return (
      <div className="pantalla">
        <p>
          <a href={rutas.espacio(espacioId)}>← Volver al espacio</a>
        </p>
        {viva.errorInicial ? (
          <ErrorCaja error={viva.errorInicial} onReintentar={refrescar} />
        ) : (
          <Cargando texto="Cargando la propuesta…" />
        )}
      </div>
    )
  }

  const esOrganizadorEspacio = p.mi_situacion.es_organizador_espacio
  const pestanas: { id: Pestana; texto: string }[] = [
    { id: 'plan', texto: 'Plan' },
    { id: 'respuesta', texto: 'Mi respuesta' },
    { id: 'historial', texto: 'Historial' },
    ...(esOrganizadorEspacio ? [{ id: 'simulacion' as Pestana, texto: 'Simulación' }] : []),
  ]
  const activa = pestanas.some((t) => t.id === pestana) ? pestana : 'plan'
  // Misma condición con que PlanTab muestra la comparación "versión anterior → vigente".
  const muestraComparacion =
    (p.estado === 'esperando_compromisos' || p.estado === 'grupo_confirmado') &&
    p.ultima_evaluacion?.resultado === 'reparacion_publicada' &&
    p.ultima_evaluacion.version === p.opcion?.version
  // Enmienda 3: el código decide el acento. Solo si llega un código desconocido se usan los booleanos del servidor.
  const cod = p.siguiente_accion.codigo
  const conocido = (CODIGOS_SIGUIENTE as readonly string[]).includes(cod)
  const turno = cod === 'te_toca_aceptar' || (!conocido && p.mi_situacion.puede.aceptar)
  const yaAcepte = cod === 'ya_aceptaste' || (!conocido && !turno && p.mi_situacion.acepte_version && p.estado === 'esperando_compromisos')
  const props = { p, viva, soloLectura, irAPestana: setPestana }

  return (
    <div className="pantalla">
      <p>
        <a href={rutas.espacio(espacioId)}>← {espacio?.nombre ?? 'Volver al espacio'}</a>
      </p>

      {viva.sinActualizar ? (
        <Aviso
          tono="aviso"
          titulo={viva.sinActualizar.sinConexion ? 'Sin conexión' : 'No se pudo actualizar'}
          accion={
            <Boton variante="secundario" onClick={refrescar}>
              Actualizar ahora
            </Boton>
          }
        >
          Se muestra la última información recibida. Las acciones que hagas ahora pueden no registrarse. Seguimos
          intentando cada 3 segundos.
        </Aviso>
      ) : null}

      {avisoPrevio ? (
        <Aviso
          tono="aviso"
          accion={
            <button type="button" className="btn btn-secundario" onClick={() => setAvisoPrevio(null)}>
              Entendido
            </button>
          }
        >
          {avisoPrevio}
        </Aviso>
      ) : null}

      {avisoVersion != null && !(activa === 'plan' && muestraComparacion) ? (
        <Aviso
          tono="aviso"
          titulo={`Hay una versión nueva (versión ${avisoVersion})`}
          accion={
            <button type="button" className="btn btn-secundario" onClick={() => setAvisoVersion(null)}>
              Entendido
            </button>
          }
        >
          Las aceptaciones anteriores no cuentan para la versión nueva: hay que reunir de nuevo las confirmaciones necesarias.
        </Aviso>
      ) : null}

      <header className="propuesta-cabecera">
        <h1>{p.titulo}</h1>
        <div
          className={`estado-hero estado-hero-${p.estado} ${turno ? 'estado-hero-turno' : ''}`}
          data-codigo={cod}
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          <div className="estado-hero-fila">
            <span className="estado-hero-punto" aria-hidden="true" />
            <strong className="estado-hero-etiqueta">{p.estado_etiqueta}</strong>
            {p.opcion ? <span className="estado-hero-version">Versión {p.opcion.version}</span> : null}
          </div>
          {turno && cod !== 'te_toca_aceptar' ? <span className="pastilla pastilla-turno">Tu turno: confirma la versión {p.opcion?.version}</span> : null}
          {yaAcepte && cod !== 'ya_aceptaste' ? <span className="pastilla pastilla-ok">Ya confirmaste la versión {p.opcion?.version}</span> : null}
          <p className="estado-hero-siguiente">
            <span className="visualmente-oculto">Próxima acción: </span>
            {p.siguiente_accion.texto}
          </p>
        </div>
      </header>

      <div className="pestanas" role="tablist" aria-label="Secciones de la propuesta">
        {pestanas.map((t) => (
          <button
            key={t.id}
            id={`tab-${t.id}`}
            role="tab"
            type="button"
            aria-selected={activa === t.id}
            aria-controls={`panel-${t.id}`}
            className={`pestana ${activa === t.id ? 'pestana-activa' : ''} ${t.id === 'simulacion' ? 'pestana-sim' : ''}`}
            onClick={() => setPestana(t.id)}
          >
            {t.texto}
          </button>
        ))}
      </div>

      <div id={`panel-${activa}`} role="tabpanel" aria-labelledby={`tab-${activa}`}>
        {activa === 'plan' ? <PlanTab {...props} /> : null}
        {activa === 'respuesta' ? <RespuestaTab {...props} /> : null}
        {activa === 'historial' ? <HistorialTab {...props} /> : null}
        {activa === 'simulacion' ? <SimulacionTab {...props} /> : null}
      </div>
    </div>
  )
}
