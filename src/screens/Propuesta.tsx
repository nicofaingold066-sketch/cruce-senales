import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { api } from '../lib/api'
import type { Espacio } from '../lib/types'
import { usePropuestaViva } from '../lib/hooks'
import { dejarAviso, irA, rutas, tomarAviso, useIdentidad, useShell } from '../lib/shell'
import { Aviso, Boton, Cargando, Chip, ErrorCaja } from '../components/ui'
import { Cruce } from '../components/Cruce'
import { Icono } from '../components/Icono'
import { momentoCorto } from '../lib/format'
import { Resultado } from '../componentes-nuevos/plan/Resultado'
import '../estilo/seccion-s4.css'
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
  // Indicador que se desliza bajo la pestaña activa (control segmentado). Se mide del DOM; no decide nada.
  const carril = useRef<HTMLDivElement>(null)
  const [indicador, setIndicador] = useState<CSSProperties>({ opacity: 0 })
  const conDatos = viva.propuesta != null
  useLayoutEffect(() => {
    const medir = () => {
      const el = carril.current?.querySelector<HTMLElement>('[aria-selected="true"]')
      if (!el) return
      setIndicador({ width: el.offsetWidth, transform: `translateX(${el.offsetLeft}px)`, opacity: 1 })
    }
    medir()
    window.addEventListener('resize', medir)
    return () => window.removeEventListener('resize', medir)
  }, [pestana, conDatos, espacio?.demo])
  const [avisoVersion, setAvisoVersion] = useState<number | null>(null)
  // Aviso dejado por la pantalla anterior (por ejemplo, "se creó pero no se pudo abrir").
  const [avisoPrevio, setAvisoPrevio] = useState<string | null>(() => tomarAviso())
  const versionPrevia = useRef<number | null>(null)

  // El espacio (nombre, demo y el código de invitación de "Recordar a quien falta") llega con un get_space aparte. Si
  // falla, se vuelve a pedir con cada refresco de la propuesta (sondeo de 3 s) mientras siga sin llegar; con el
  // espacio cargado no se pide más. Un pedido en vuelo no se repite ni se descarta por el refresco siguiente.
  const montado = useRef(true)
  const pidiendoEspacio = useRef(false)
  useEffect(() => {
    montado.current = true
    return () => {
      montado.current = false
    }
  }, [])
  const refrescoPropuesta = viva.recibidoEn
  useEffect(() => {
    if (espacio || pidiendoEspacio.current) return
    pidiendoEspacio.current = true
    void api
      .getSpace(espacioId)
      .then((r) => {
        if (montado.current && r.ok) setEspacio(r.data.espacio)
      })
      .finally(() => {
        pidiendoEspacio.current = false
      })
  }, [espacioId, espacio, refrescoPropuesta])

  // Un botón dentro del panel ("Ir a Mi respuesta", "Ver historial completo") cambia de pestaña y se va con el panel:
  // el foco pasa a la pestaña nueva. Cuando cambia el propio tablist, la pestaña ya tiene el foco y no se toca.
  const enfocarPestana = useRef<Pestana | null>(null)
  useEffect(() => {
    const t = enfocarPestana.current
    if (t == null) return
    enfocarPestana.current = null
    document.getElementById(`tab-${t}`)?.focus()
  }, [pestana])

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
      <div className="vista">
        <section className="escena">
          <a className="escena-volver" href={rutas.espacio(espacioId)}>
            <Icono n="atras" tam={20} /> Volver al espacio
          </a>
          <Cruce nodos={[]} valor="…" etiqueta="cargando" fraccion={0} tono="neutro" />
        </section>
        <div className="hoja">
          {viva.errorInicial ? (
            <ErrorCaja error={viva.errorInicial} onReintentar={refrescar} />
          ) : (
            <Cargando texto="Cargando la propuesta…" esqueleto />
          )}
        </div>
      </div>
    )
  }

  const esOrganizadorEspacio = p.mi_situacion.es_organizador_espacio
  // Enmienda 7 (E7.3): la Simulación solo existe en espacios demo; mientras no se sabe, no se muestra.
  const conSimulacion = esOrganizadorEspacio && espacio?.demo === true
  const pestanas: { id: Pestana; texto: string }[] = [
    { id: 'plan', texto: 'Plan' },
    { id: 'respuesta', texto: 'Mi respuesta' },
    { id: 'historial', texto: 'Historial' },
    ...(conSimulacion ? [{ id: 'simulacion' as Pestana, texto: 'Simulación' }] : []),
  ]
  const activa = pestanas.some((t) => t.id === pestana) ? pestana : 'plan'
  // Misma condición con que «Cómo se armó» muestra la comparación "versión anterior → vigente".
  const muestraComparacion =
    (p.estado === 'esperando_compromisos' || p.estado === 'grupo_confirmado') &&
    p.ultima_evaluacion?.resultado === 'reparacion_publicada' &&
    p.ultima_evaluacion.version === p.opcion?.version
  function irAPestana(t: Pestana) {
    if (t !== activa) enfocarPestana.current = t
    setPestana(t)
  }
  const props = { p, viva, soloLectura, irAPestana, espacio }

  return (
    <div className="vista vista-plan">
      {/* Nivel Plan (mockup): «‹ grupo» y la versión arriba; después el bloque de resultado con la única acción. */}
      <section className="escena resultado-escena">
        <div className="resultado-arriba">
          <a className="escena-volver" href={rutas.espacio(espacioId)}>
            <Icono n="atras" tam={20} /> {espacio?.nombre ?? 'Volver al espacio'}
          </a>
          {p.opcion ? (
            <Chip tono={avisoVersion === p.opcion.version || p.opcion.version > 1 ? 'info' : 'neutro'} className="resultado-sello">
              v{p.opcion.version}
              {p.plazo_vencido ? ' · cerrado' : ` · cierra ${momentoCorto(p.plazo)}`}
            </Chip>
          ) : null}
        </div>
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

        <Resultado p={p} viva={viva} soloLectura={soloLectura} espacio={espacio} activa={activa} irAPestana={irAPestana} />
      </section>

      <div className="hoja">
      <div className="pestanas">
        <div className="pestanas-carril" role="tablist" aria-label="Secciones de la propuesta" ref={carril}>
        <span className="pestana-indicador" aria-hidden="true" style={indicador} />
        {pestanas.map((t) => (
          <button
            key={t.id}
            id={`tab-${t.id}`}
            data-tab={t.id}
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
      </div>

      <div id={`panel-${activa}`} className="panel-pestana" role="tabpanel" aria-labelledby={`tab-${activa}`} key={activa}>
        {/* PlanTab toma el código de invitación de `espacio` ("Recordar a quien falta" / "Avisar al grupo"). */}
        {activa === 'plan' ? <PlanTab {...props} /> : null}
        {activa === 'respuesta' ? <RespuestaTab {...props} /> : null}
        {activa === 'historial' ? <HistorialTab {...props} /> : null}
        {activa === 'simulacion' ? <SimulacionTab {...props} /> : null}
      </div>
      </div>
    </div>
  )
}
