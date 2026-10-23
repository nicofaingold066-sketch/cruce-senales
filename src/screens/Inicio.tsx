import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { api } from '../lib/api'
import type { UnirseOk } from '../lib/api'
import type { ApiError, EspacioResumen, PropuestaResumen, TipoEspacio } from '../lib/types'
import { useAccion, useSondeo } from '../lib/hooks'
import { dejarAviso, irA, rutas, useIdentidad, useShell } from '../lib/shell'
import { entrarComoOtraPersona, leerGuardada, olvidarGuardada, volverAGuardada } from '../lib/sesiones'
import { Aviso, Boton, Cargando, ErrorCaja, InsigniaEstado, colorAvatar, iniciales } from '../components/ui'
import { Marca } from '../components/Marca'
import { Icono } from '../components/Icono'
import { ArteCruce } from '../components/Cruce'

const TIPO: Record<TipoEspacio, string> = { amigos: 'Amigos', empresa: 'Empresa' }

export default function Inicio({
  codigoInvitacion,
  invitacionInvalida,
}: { codigoInvitacion?: string; invitacionInvalida?: boolean } = {}) {
  useIdentidad(null, null, null)
  const { soloLectura } = useShell()
  const [espacios, setEspacios] = useState<EspacioResumen[] | null>(null)
  const [error, setError] = useState<ApiError | null>(null)

  const [activas, setActivas] = useState<PlanActivo[]>([])
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
  // Mejora #30: con espacios, el plan activo se mantiene al día (mismo ritmo que la lista del espacio).
  useSondeo(cargar, 10000, (espacios?.length ?? 0) > 0)
  const conPlan = activas.length > 0

  return (
    <div className="vista">
      <section className="escena escena-portada" aria-labelledby="portada-titulo">
        <Marca grande />
        <h1 id="portada-titulo" className="portada-lema">
          Del «nos juntamos» al <em>encuentro que ocurre</em>.
        </h1>
        <p className="portada-sub">
          Cada uno dice en privado cuándo puede. CRUXE propone <strong>un solo plan</strong> y cada uno lo confirma.
        </p>
        <ArteCruce />
      </section>

      <div className="hoja">
        {invitacionInvalida ? (
          <Aviso tono="aviso" titulo="Ese enlace de invitación no es válido">
            Puede haberse copiado mal. Pide uno nuevo o escribe el código a mano en "Unirme con un código", más abajo.
          </Aviso>
        ) : null}
        {codigoInvitacion ? (
          <div className="invitacion">
            <Aviso tono="info" titulo="Te invitaron a un plan">
              El código ya está cargado. Escribe tu nombre y únete: lo que marques después es privado.
            </Aviso>
            <UnirsePorCodigo deshabilitado={soloLectura} codigoInicial={codigoInvitacion} />
          </div>
        ) : null}
        {codigoInvitacion ? null : <OtraSesion />}
        {conPlan && !codigoInvitacion ? <TuPlan activas={activas} /> : null}

        {/* Con un plan activo, lo principal es el plan: sin accesos grandes que creen otra demo por error. */}
        {codigoInvitacion || conPlan ? null : (
          <div className="accesos">
            <CargarDemo deshabilitado={soloLectura} yaCargada={espacios?.some((e) => e.demo && e.mi_rol === 'organizador') ?? false} />
            <button type="button" className="acceso" onClick={irAUnirse}>
              <span className="acceso-icono" aria-hidden="true">
                <Icono n="llave" />
              </span>
              <span className="acceso-texto">
                <span className="acceso-titulo">Tengo un código de invitación</span>
                <span className="acceso-sub" aria-hidden="true">
                  Súmate al plan de tu grupo
                </span>
              </span>
            </button>
          </div>
        )}

        {conPlan ? null : (
          <section aria-labelledby="como-titulo">
            <div className="seccion-titulo">
              <h2 id="como-titulo">Cómo funciona</h2>
            </div>
            <ol className="como tarjeta">
              <li>
                <span className="como-num" aria-hidden="true">1</span>
                <p>
                  <strong>Cada uno</strong> marca en privado cuándo puede.
                </p>
              </li>
              <li>
                <span className="como-num" aria-hidden="true">2</span>
                <p>
                  <strong>El servidor</strong> propone una sola opción compatible.
                </p>
              </li>
              <li>
                <span className="como-num" aria-hidden="true">3</span>
                <p>
                  <strong>Confirmas</strong> esa versión. Si alguien se baja, se repara y se vuelve a confirmar.
                </p>
              </li>
            </ol>
          </section>
        )}

        {espacios === null && !error ? <Cargando texto="Buscando tus espacios…" /> : null}
        {error && espacios === null ? <ErrorCaja error={error} onReintentar={cargar} /> : null}
        {error && espacios !== null ? <ErrorCaja error={error} onReintentar={cargar} titulo="No se pudo actualizar" /> : null}

        {espacios && espacios.length > 0 ? (
          <section aria-labelledby="mis-espacios">
            <div className="seccion-titulo">
              <h2 id="mis-espacios">Tus espacios</h2>
            </div>
            <ul className="filas">
              {espacios.map((e) => (
                <li key={e.id}>
                  <a className="fila" href={rutas.espacio(e.id)}>
                    <span className="fila-icono" style={{ background: colorAvatar(e.nombre), color: '#fff', fontWeight: 800 }} aria-hidden="true">
                      {iniciales(e.nombre)}
                    </span>
                    <span className="fila-texto">
                      <span className="fila-titulo">{e.nombre}</span>
                      <span className="fila-meta">
                        {TIPO[e.tipo]} · {e.cantidad_miembros} personas · Tú: {e.mi_rol === 'organizador' ? 'organizador' : 'miembro'}
                        {e.demo ? ' · Demo' : ''}
                      </span>
                    </span>
                    <span className="visualmente-oculto">Abrir espacio</span>
                    <span className="fila-chevron" aria-hidden="true">
                      <Icono n="chevron" />
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {codigoInvitacion ? null : <UnirsePorCodigo deshabilitado={soloLectura} />}
        <CrearEspacio deshabilitado={soloLectura} />
      </div>
    </div>
  )
}

interface PlanActivo {
  espacio: EspacioResumen
  p: PropuestaResumen
}

const ESTADOS_ACTIVOS = new Set(['borrador', 'reuniendo_interes', 'esperando_compromisos', 'grupo_confirmado', 'en_revision'])

/** Propuestas vigentes de mis espacios (hasta 4 espacios). El orden y "Te toca" salen del servidor. */
async function planesActivos(espacios: EspacioResumen[]): Promise<PlanActivo[]> {
  const listas = await Promise.all(
    espacios.slice(0, 4).map(async (e) => {
      const r = await api.listProposals(e.id)
      return r.ok ? r.data.propuestas.filter((p) => ESTADOS_ACTIVOS.has(p.estado)).map((p) => ({ espacio: e, p })) : []
    }),
  )
  const turno = (x: PlanActivo) => x.p.siguiente_accion.codigo === 'te_toca_aceptar' || x.p.mi_situacion.puede_aceptar
  return listas
    .flat()
    .sort((a, b) => Number(turno(b)) - Number(turno(a)))
    .slice(0, 3)
}

/** Mejora #30: el plan activo arriba de todo, para llegar en un toque (por ejemplo, desde el segundo teléfono). */
function TuPlan({ activas }: { activas: PlanActivo[] }) {
  return (
    <section className="tu-plan" aria-labelledby="tu-plan-titulo">
      <div className="seccion-titulo" style={{ marginTop: 4 }}>
        <h2 id="tu-plan-titulo">{activas.length === 1 ? 'Tu plan' : 'Tus planes'}</h2>
        <span className="etiqueta etiqueta-destacada">En curso</span>
      </div>
      <ul className="lista-planes">
        {activas.map(({ espacio, p }) => {
          const turno = p.siguiente_accion.codigo === 'te_toca_aceptar' || p.mi_situacion.puede_aceptar
          return (
            <li key={p.id}>
              <a className={`plan-vivo plan-vivo-${p.estado} ${turno ? 'plan-vivo-turno' : ''}`} href={rutas.propuesta(espacio.id, p.id)}>
                <span className="pv-arriba">
                  <span className="pv-espacio">{espacio.nombre}</span>
                  {p.version != null ? <span className="etiqueta num">Versión {p.version}</span> : null}
                </span>
                <span className="pv-titulo">{p.titulo}</span>
                <span className="pv-estado">
                  <InsigniaEstado estado={p.estado} etiqueta={p.estado_etiqueta} />
                  {turno && p.siguiente_accion.codigo !== 'te_toca_aceptar' ? <span className="pastilla pastilla-turno">Te toca confirmar</span> : null}
                </span>
                <span className={`pv-siguiente ${turno ? 'pv-siguiente-turno' : ''}`}>{p.siguiente_accion.texto}</span>
                <span className="pv-meta">
                  <span />
                  <span className="pv-abrir">
                    Abrir el plan <Icono n="chevron" tam={14} />
                  </span>
                </span>
              </a>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function CargarDemo({ deshabilitado, yaCargada }: { deshabilitado: boolean; yaCargada: boolean }) {
  const { ocupado, error, ejecutar } = useAccion()
  async function hacer() {
    const r = await ejecutar('seed', () => api.seedDemoSpace())
    if (r?.ok) irA(rutas.espacio(r.data.resultado.espacio_id))
  }
  return (
    <div className="portada-demo">
      <Boton
        className="acceso acceso-principal"
        onClick={hacer}
        ocupado={ocupado}
        ocupadoTexto="Preparando la demo…"
        disabled={deshabilitado}
        aria-describedby="demo-detalle"
      >
        <span className="acceso-icono" aria-hidden="true">
          <Icono n="play" />
        </span>
        <span className="acceso-texto">
          <span className="acceso-titulo">{yaCargada ? 'Abrir la demo «Los del asado»' : 'Probar la demo «Los del asado»'}</span>
          <span className="acceso-sub" id="demo-detalle" aria-hidden="true">
            Serás Tomi, quien organiza. Las otras cinco personas son simuladas (datos ficticios).
          </span>
        </span>
      </Boton>
      {error ? <ErrorCaja error={error} enfocar /> : null}
    </div>
  )
}

/** Lleva al formulario de unirse sin tocar la ruta (la navegación usa el hash). */
function irAUnirse() {
  const form = document.getElementById('unirse')
  form?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  form?.querySelector<HTMLInputElement>('input')?.focus({ preventScroll: true })
}

/** Mejora #47: si alguien entró como otra persona en este navegador, la sesión anterior se puede retomar. */
function OtraSesion() {
  const [guardada, setGuardada] = useState(() => leerGuardada())
  const [confirmarOlvido, setConfirmarOlvido] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const enVuelo = useRef(false)

  async function volver() {
    if (enVuelo.current || !guardada) return
    enVuelo.current = true
    setOcupado(true)
    setError(null)
    const r = await volverAGuardada(guardada)
    if (r.ok) {
      // Todo lo que está en pantalla es de la sesión de ahora: se empieza de cero con la recuperada.
      window.location.reload()
      return
    }
    enVuelo.current = false
    setOcupado(false)
    setError(r.mensaje)
    setGuardada(leerGuardada())
  }

  if (!guardada) return error ? <Aviso tono="error" titulo="No se pudo volver a la otra sesión">{error}</Aviso> : null
  return (
    <Aviso
      tono="info"
      titulo={`Este navegador guarda otra sesión: ${guardada.etiqueta}`}
      accion={
        confirmarOlvido ? (
          <div className="fila-botones">
            <Boton
              variante="peligro"
              onClick={() => {
                olvidarGuardada()
                setGuardada(null)
              }}
            >
              Sí, olvidarla
            </Boton>
            <Boton variante="secundario" onClick={() => setConfirmarOlvido(false)}>
              Cancelar
            </Boton>
          </div>
        ) : (
          <div className="fila-botones">
            <Boton onClick={volver} ocupado={ocupado} ocupadoTexto="Volviendo…">
              Volver a esa sesión
            </Boton>
            <Boton variante="secundario" onClick={() => setConfirmarOlvido(true)} disabled={ocupado}>
              Olvidarla
            </Boton>
          </div>
        )
      }
    >
      {confirmarOlvido
        ? `Si la olvidas, este navegador ya no podrá volver a ser ${guardada.etiqueta}.`
        : 'Alguien entró como otra persona en este navegador. Al volver, la sesión abierta ahora deja de estar en este navegador.'}
      {error ? <p className="suave">{error}</p> : null}
    </Aviso>
  )
}

function errorLocal(mensaje: string): ApiError {
  return { codigo: 'fallo_temporal', detalle: 'sesion_nueva', mensaje, reintentable: false, state_rev: null }
}

const mismoNombre = (a: string, b: string) => a.trim().toLocaleLowerCase('es') === b.trim().toLocaleLowerCase('es')

function UnirsePorCodigo({ deshabilitado, codigoInicial }: { deshabilitado: boolean; codigoInicial?: string }) {
  const [codigo, setCodigo] = useState(codigoInicial ?? '')
  const [nombre, setNombre] = useState('')
  const { ocupado, error, ejecutar } = useAccion()
  const cambio = useAccion()
  // Mejora #47: el servidor dice que esta sesión ya era miembro (e ignora el nombre). No se entra en silencio
  // con la identidad de otra persona: se pregunta si seguir como ella o entrar con una sesión nueva.
  const [yaEra, setYaEra] = useState<{ espacio: string; espacioId: string; nombre: string } | null>(null)
  const avisoYaEra = useRef<HTMLDivElement>(null)
  const faltan = codigo.trim() === '' || nombre.trim() === ''

  useEffect(() => {
    if (yaEra) avisoYaEra.current?.querySelector<HTMLElement>('button')?.focus()
  }, [yaEra])

  function entrar(r: UnirseOk, nom: string, sesionNueva?: string) {
    if (r.resultado.reclamo_asiento_simulado) {
      dejarAviso(`Reclamaste el lugar de ${nom}. Desde ahora actúas con tu propia sesión y tus condiciones dejan de ser visibles para la simulación.${sesionNueva ? ` ${sesionNueva}` : ''}`)
    } else if (sesionNueva) {
      dejarAviso(`Entraste como ${nom}. ${sesionNueva}`)
    }
    irA(rutas.espacio(r.resultado.espacio_id))
  }

  async function hacer(e: FormEvent) {
    e.preventDefault()
    if (faltan) return
    cambio.limpiarError()
    const r = await ejecutar(`join:${codigo.trim()}:${nombre.trim()}`, () =>
      api.joinSpace(codigo.trim(), nombre.trim()),
    )
    if (!r?.ok) return
    if (r.data.resultado.ya_era_miembro) {
      const esp = r.data.espacio
      const yo = esp.miembros.find((m) => m.miembro_id === esp.mi_miembro_id)
      setYaEra({ espacio: esp.nombre, espacioId: r.data.resultado.espacio_id, nombre: yo?.nombre ?? 'otra persona' })
      return
    }
    entrar(r.data, nombre.trim())
  }

  async function comoOtraPersona() {
    const cod = codigo.trim()
    const nom = nombre.trim()
    if (!yaEra || !cod || !nom) return
    const previa = yaEra
    let guardada = false
    const r = await cambio.ejecutar(`otra:${cod}:${nom}`, async () => {
      const s = await entrarComoOtraPersona(`${previa.nombre} en «${previa.espacio}»`)
      if (!s.ok) return { ok: false as const, error: errorLocal(s.mensaje) }
      guardada = s.guardada
      // Desde acá la sesión es otra: si el ingreso falla, se corrige el formulario y se usa "Unirme".
      setYaEra(null)
      return api.joinSpace(cod, nom)
    })
    if (r?.ok) {
      entrar(
        r.data,
        nom,
        guardada
          ? `La sesión de ${previa.nombre} quedó guardada en este navegador: para volver a ella, ve a tus espacios.`
          : 'Entraste con una sesión nueva.',
      )
    }
  }

  const otraGuardada = yaEra ? leerGuardada() : null
  const otraPrimero = yaEra != null && !mismoNombre(nombre, yaEra.nombre)
  const botonOtra = (
    <Boton
      key="otra"
      variante={otraPrimero ? 'primario' : 'secundario'}
      onClick={comoOtraPersona}
      ocupado={cambio.ocupado}
      ocupadoTexto="Creando una sesión nueva…"
      disabled={faltan || deshabilitado}
    >
      Entrar como otra persona
    </Boton>
  )
  const botonSeguir = yaEra ? (
    <Boton key="seguir" variante={otraPrimero ? 'secundario' : 'primario'} onClick={() => irA(rutas.espacio(yaEra.espacioId))} disabled={cambio.ocupado}>
      Seguir como {yaEra.nombre}
    </Boton>
  ) : null
  const errorVisible = cambio.error ?? error

  return (
    <form id="unirse" className="tarjeta unirse" onSubmit={hacer} noValidate>
      <h2>Unirme con un código</h2>
      <label className="campo campo-codigo">
        <span>Código de invitación</span>
        <input
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          maxLength={16}
          aria-invalid={error?.detalle === 'codigo_inexistente' ? true : undefined}
        />
      </label>
      <label className="campo">
        <span>Tu nombre en el espacio</span>
        <input
          autoFocus={codigoInicial != null}
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          autoComplete="off"
          maxLength={30}
          aria-invalid={error?.detalle === 'nombre_en_uso' ? true : undefined}
        />
        <small>Si usas el nombre de una persona simulada de la demo (por ejemplo "Luna"), reclamas su lugar.</small>
      </label>
      <Boton type="submit" className="btn-bloque" ocupado={ocupado} ocupadoTexto="Uniéndome…" disabled={faltan || deshabilitado || cambio.ocupado}>
        Unirme
      </Boton>
      {yaEra ? (
        <Aviso
          ref={avisoYaEra}
          tono="aviso"
          titulo={`Este navegador ya está en este espacio como ${yaEra.nombre}`}
          accion={<div className="fila-botones">{otraPrimero ? [botonOtra, botonSeguir] : [botonSeguir, botonOtra]}</div>}
        >
          {otraGuardada
            ? `Si eres otra persona, entra con una sesión nueva. Este navegador ya guarda la sesión de ${otraGuardada.etiqueta}; la de ${yaEra.nombre} no se guardará.`
            : `Si eres otra persona, entra con una sesión nueva: la de ${yaEra.nombre} queda guardada en este navegador y se puede retomar desde tus espacios.`}
        </Aviso>
      ) : null}
      {errorVisible ? <ErrorCaja error={errorVisible} enfocar /> : null}
    </form>
  )
}

function CrearEspacio({ deshabilitado }: { deshabilitado: boolean }) {
  const [nombre, setNombre] = useState('')
  // Solo lo social (decisión de Nico y Juan, 11:51): el tipo queda fijo en "amigos".
  const tipo: TipoEspacio = 'amigos'
  const [visible, setVisible] = useState('')
  const { ocupado, error, ejecutar } = useAccion()
  const faltan = nombre.trim() === '' || visible.trim() === ''
  async function hacer(e: FormEvent) {
    e.preventDefault()
    if (faltan) return
    const r = await ejecutar(`crear:${nombre}:${tipo}:${visible}`, () => api.createSpace(nombre.trim(), tipo, visible.trim()))
    if (r?.ok) irA(rutas.espacio(r.data.resultado.espacio_id))
  }
  return (
    <details className="tarjeta plegable">
      <summary>Crear un espacio de prueba</summary>
      <form onSubmit={hacer} noValidate>
        <Aviso tono="info">Sirve para un grupo de verdad: invitas con el código y cada persona responde desde su teléfono. La Simulación (personas ficticias) es solo para la demo.</Aviso>
        <label className="campo">
          <span>Nombre del espacio</span>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={60} />
        </label>
        <label className="campo">
          <span>Tu nombre en el espacio</span>
          <input value={visible} onChange={(e) => setVisible(e.target.value)} maxLength={30} />
        </label>
        <Boton type="submit" ocupado={ocupado} ocupadoTexto="Creando…" disabled={faltan || deshabilitado}>
          Crear espacio
        </Boton>
        {error ? <ErrorCaja error={error} enfocar /> : null}
      </form>
    </details>
  )
}
