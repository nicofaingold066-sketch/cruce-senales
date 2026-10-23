import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { api } from '../lib/api'
import type { Espacio, EstadoPropuesta } from '../lib/types'
import { CODIGOS_SIGUIENTE } from '../lib/types'
import { diaDe, fechaCorta, hora } from '../lib/format'
import { usePropuestaViva } from '../lib/hooks'
import { dejarAviso, irA, rutas, tomarAviso, useIdentidad, useShell } from '../lib/shell'
import { Aviso, Boton, Cargando, ErrorCaja } from '../components/ui'
import { Icono } from '../components/Icono'
import { Cruce } from '../components/Cruce'
import type { NodoCruce, TonoCruce } from '../components/Cruce'
import type { NombreIcono } from '../components/Icono'

/** Ícono por estado: el estado nunca se distingue solo por color. */
const ICONO_ESTADO: Record<string, NombreIcono> = {
  borrador: 'borrador',
  reuniendo_interes: 'grupo',
  esperando_compromisos: 'esperando',
  grupo_confirmado: 'confirmado',
  en_revision: 'alerta',
  expirado: 'cerrado',
  cancelado: 'cerrado',
}
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

  const escena = escenaDe(p, espacio)

  return (
    <div className="vista">
      <section className="escena" data-tono={escena.tono} aria-labelledby="propuesta-titulo">
        <a className="escena-volver" href={rutas.espacio(espacioId)}>
          <Icono n="atras" tam={20} /> {espacio?.nombre ?? 'Volver al espacio'}
        </a>
        <h1 id="propuesta-titulo" style={{ viewTransitionName: `plan-${p.id}` }}>
          {p.titulo}
        </h1>
        <Cuando p={p} />
        <Cruce nodos={escena.nodos} valor={escena.valor} etiqueta={escena.etiqueta} fraccion={escena.fraccion} tono={escena.tono} confirmado={p.estado === 'grupo_confirmado'} />
      </section>

      <div className="hoja">

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
        <div
          key={`${p.estado}-${cod}`}
          className={`estado-hero estado-hero-${p.estado} ${turno ? 'estado-hero-turno' : ''}`}
          data-codigo={cod}
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          <div className="estado-hero-fila">
            <span className="estado-hero-icono" aria-hidden="true">
              <Icono n={ICONO_ESTADO[p.estado] ?? 'esperando'} tam={20} />
            </span>
            <strong className="estado-hero-etiqueta">{p.estado_etiqueta}</strong>
            {p.opcion ? (
              <span className="estado-hero-version">
                <span aria-hidden="true">v{p.opcion.version}</span>
                <span className="visualmente-oculto">Versión {p.opcion.version}</span>
              </span>
            ) : null}
          </div>
          {turno && cod !== 'te_toca_aceptar' ? <span className="pastilla pastilla-turno">Tu turno: confirma la versión {p.opcion?.version}</span> : null}
          {yaAcepte && cod !== 'ya_aceptaste' ? <span className="pastilla pastilla-ok">Ya confirmaste la versión {p.opcion?.version}</span> : null}
          <p className="estado-hero-siguiente">
            <span className="visualmente-oculto">Próxima acción: </span>
            {p.siguiente_accion.texto}
          </p>
          <Pasos p={p} />
          {turno && activa !== 'plan' ? (
            <button type="button" className="btn btn-turno btn-chico ir-confirmar" onClick={() => setPestana('plan')}>
              Ir a confirmar
            </button>
          ) : null}
        </div>
      </header>

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
        {activa === 'plan' ? <PlanTab {...props} /> : null}
        {activa === 'respuesta' ? <RespuestaTab {...props} /> : null}
        {activa === 'historial' ? <HistorialTab {...props} /> : null}
        {activa === 'simulacion' ? <SimulacionTab {...props} /> : null}
      </div>
      </div>
    </div>
  )
}

// ------------------------------------------------------------------ escena

/** Cuándo: la franja de la versión vigente o, sin versión, las dos candidatas. Solo datos del servidor. */
function Cuando({ p }: { p: EstadoPropuesta }) {
  const o = p.opcion
  if (o) {
    return (
      <p className="escena-cuando">
        <span className="escena-cuando-dia">{diaDe(o.franja.inicio.local)}</span>
        <span className="escena-cuando-hora">
          {hora(o.franja.inicio.local)} a {hora(o.franja.fin.local)} · franja {o.franja.clave}
        </span>
      </p>
    )
  }
  return (
    <p className="escena-cuando">
      <span className="escena-cuando-hora">
        {p.franjas.map((f) => `${fechaCorta(f.inicio.local)} ${hora(f.inicio.local)}`).join('  o  ')}
      </span>
    </p>
  )
}

/**
 * Lo que dibuja el cruce. Personas del espacio con lo que el servidor dice de cada una en esta propuesta:
 * se bajó (bajas), confirmó la versión vigente (opcion.aceptaron), marcó interés (interesados) o nada visible.
 * Los números del centro son los del servidor; el anillo solo es confirmados / mínimo.
 */
function escenaDe(
  p: EstadoPropuesta,
  espacio: Espacio | null,
): { nodos: NodoCruce[]; valor: string; etiqueta: string; fraccion: number; tono: TonoCruce } {
  const vigente = p.estado === 'esperando_compromisos' || p.estado === 'grupo_confirmado'
  const bajas = new Set(p.bajas.map((b) => b.miembro.miembro_id))
  const aceptaron = new Set(vigente ? (p.opcion?.aceptaron ?? []).map((a) => a.miembro.miembro_id) : [])
  const interes = new Set(p.interesados.miembros.map((m) => m.miembro_id))
  if (!vigente) for (const a of p.opcion?.aceptaron ?? []) interes.add(a.miembro.miembro_id)
  const nodos: NodoCruce[] = (espacio?.miembros ?? []).map((m) => ({
    id: m.miembro_id,
    nombre: m.nombre,
    simulado: m.simulado,
    yo: m.es_yo,
    estado: bajas.has(m.miembro_id)
      ? 'baja'
      : aceptaron.has(m.miembro_id)
        ? 'confirmo'
        : interes.has(m.miembro_id)
          ? 'interesado'
          : 'pendiente',
  }))
  const c = p.opcion?.cupos
  const confirmados = c?.confirmados ?? 0
  const minimo = c?.minimo ?? p.minimo
  // Mejora #56 también en el cruce: con más confirmaciones que el mínimo, "5/4" se lee raro; va "5" y "mín. 4".
  const sobre = confirmados > minimo
  const cuenta = sobre ? String(confirmados) : `${confirmados}/${minimo}`
  switch (p.estado) {
    case 'esperando_compromisos':
      return { nodos, valor: cuenta, etiqueta: sobre ? `mín. ${minimo}` : 'confirmaron', fraccion: c ? c.confirmados / c.minimo : 0, tono: 'vivo' }
    case 'grupo_confirmado':
      return { nodos, valor: cuenta, etiqueta: 'se juntan', fraccion: 1, tono: 'ok' }
    case 'en_revision':
      return { nodos, valor: `v${p.opcion?.version ?? ''}`, etiqueta: 'en revisión', fraccion: c ? c.confirmados / c.minimo : 0, tono: 'revision' }
    case 'reuniendo_interes':
      return {
        nodos,
        valor: String(p.interesados.cantidad),
        etiqueta: p.ultima_evaluacion?.resultado === 'sin_opcion' ? 'sin opción' : 'con interés',
        fraccion: 0,
        tono: p.ultima_evaluacion?.resultado === 'sin_opcion' ? 'neutro' : 'info',
      }
    case 'borrador':
      return { nodos, valor: '—', etiqueta: 'borrador', fraccion: 0, tono: 'neutro' }
    default:
      return { nodos, valor: '—', etiqueta: p.estado_etiqueta.toLocaleLowerCase('es'), fraccion: 0, tono: 'neutro' }
  }
}

const PASOS = ['Interés', 'Opción', 'Confirmar', 'Encuentro'] as const

/** Seguimiento tipo pedido en curso. Es solo una lectura del estado que devuelve el servidor. */
function Pasos({ p }: { p: EstadoPropuesta }) {
  const actual: Record<string, number> = {
    borrador: 0,
    reuniendo_interes: 0,
    en_revision: 1,
    esperando_compromisos: 2,
    // El grupo confirmado espera el encuentro: no se marca como hecho algo que todavía no pasó (caso canónico).
    grupo_confirmado: 3,
  }
  const i = actual[p.estado]
  if (i === undefined) return null
  return (
    <ol className="pasos" aria-label="Etapas del plan">
      {PASOS.map((t, n) => (
        <li key={t} className={`paso ${n < i ? 'paso-hecho' : ''} ${n === i ? 'paso-actual' : ''}`} aria-current={n === i ? 'step' : undefined}>
          <span className="paso-barra" aria-hidden="true" />
          <span className="paso-texto">{t}</span>
        </li>
      ))}
    </ol>
  )
}
