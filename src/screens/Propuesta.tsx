import { useCallback, useEffect, useRef, useState } from 'react'
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
  // Sin barra de pestañas (mockup validado, obligatorio): el plan es una sola pantalla. La Simulación (solo quien
  // organiza una demo) se abre desde su fila y vuelve con «‹ Volver al plan».
  const [verSimulacion, setVerSimulacion] = useState(false)
  const [avisoVersion, setAvisoVersion] = useState<number | null>(null)
  // Aviso dejado por la pantalla anterior (por ejemplo, "se creó pero no se pudo abrir").
  const [avisoPrevio, setAvisoPrevio] = useState<string | null>(() => tomarAviso())
  const versionPrevia = useRef<number | null>(null)

  // Los integrantes y la actividad del grupo se refrescan junto al plan: los ingresos y salidas deben verse
  // también si la persona permanece en esta pantalla. Se conserva una sola petición de espacio en vuelo.
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
    if (pidiendoEspacio.current) return
    pidiendoEspacio.current = true
    void api
      .getSpace(espacioId)
      .then((r) => {
        if (montado.current && r.ok) setEspacio(r.data.espacio)
      })
      .finally(() => {
        pidiendoEspacio.current = false
      })
  }, [espacioId, refrescoPropuesta])

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

  // Enmienda 7 (E7.3): la Simulación solo existe en espacios demo; mientras no se sabe, no se muestra.
  const conSimulacion = p.mi_situacion.es_organizador_espacio && espacio?.demo === true
  const simulacion = conSimulacion && verSimulacion
  // Lo que antes eran pestañas: "Mi respuesta" es ¿Cuándo puedes? (S5); "Simulación" se abre en esta pantalla;
  // "Plan" e "Historial" son esta misma pantalla (el historial está plegado en las filas).
  function irAPestana(t: Pestana) {
    if (t === 'respuesta') irA(rutas.responder(espacioId, p!.id))
    else if (t === 'simulacion') setVerSimulacion(true)
    else setVerSimulacion(false)
    window.scrollTo({ top: 0 })
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

        {avisoVersion != null ? (
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

        <Resultado p={p} viva={viva} soloLectura={soloLectura} espacio={espacio} activa={simulacion ? 'simulacion' : 'plan'} irAPestana={irAPestana} />
      </section>

      <div className="hoja">
        {simulacion ? (
          <>
            <button type="button" className="enlace fila-chica volver-plan" onClick={() => irAPestana('plan')}>
              ‹ Volver al plan
            </button>
            <SimulacionTab {...props} />
          </>
        ) : (
          <PlanTab {...props} conSimulacion={conSimulacion} />
        )}
      </div>
    </div>
  )
}
