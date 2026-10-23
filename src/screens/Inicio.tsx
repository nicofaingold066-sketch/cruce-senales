import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { api } from '../lib/api'
import type { ApiError, EspacioResumen, PropuestaResumen, TipoEspacio } from '../lib/types'
import { useAccion, useSondeo } from '../lib/hooks'
import { dejarAviso, irA, rutas, useIdentidad, useShell } from '../lib/shell'
import { leerGuardada, sesionNueva } from '../lib/sesiones'
import { OtraSesion } from '../components/Sesiones'
import { guardarPerfil, leerPerfil, recordarNombreSiFalta, usePerfil } from '../lib/perfil'
import { vibrar } from '../lib/tacto'
import { Aviso, Boton, Cargando, ErrorCaja, colorAvatar, iniciales } from '../components/ui'
import { PlanVivo, esTurno } from '../components/PlanVivo'
import { Marca } from '../components/Marca'
import { Icono } from '../components/Icono'
import { Orbita } from '../components/Orbita'
import { Resaltado } from '../components/Resaltado'
import { Tablero } from '../components/Tablero'

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
  const perfil = usePerfil()
  // Primera vez en este navegador: sin nombre guardado y sin grupos. Se muestra el ingreso.
  const nuevo = !perfil && espacios !== null && espacios.length === 0

  if (codigoInvitacion) {
    return (
      <div className="vista">
        <section className="escena escena-invitacion" aria-labelledby="invitacion-titulo">
          <span className="escena-eyebrow">Invitación a CRUXE</span>
          <h1 id="invitacion-titulo">
            Te invitaron a <Resaltado tipo="circulo">un plan</Resaltado>
          </h1>
          <p className="escena-sub">
            Súmate al grupo con tu nombre. Después marcas en privado cuándo puedes y confirmas el plan que salga.
          </p>
          <div className="invitar">
            <div className="invitar-codigo">
              <span>Código de la invitación</span>
              <Tablero codigo={codigoInvitacion} como="span" />
            </div>
          </div>
          <div className="solo-ancho">
            <Orbita compacta />
          </div>
        </section>
        <div className="hoja">
          <UnirsePorCodigo deshabilitado={soloLectura} codigoInicial={codigoInvitacion} />
          <div className="privado" role="note">
            <span className="privado-icono" aria-hidden="true">
              <Icono n="candado" tam={20} />
            </span>
            <div>
              <strong>Sin contraseña ni correo</strong>
              <p>Tu sesión queda guardada en este teléfono. Lo que marques sobre cuándo puedes lo ve solo el servidor.</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="vista">
      {nuevo || (espacios === null && !perfil) ? (
        <section className="escena escena-portada" aria-labelledby="portada-titulo">
          <Marca grande />
          <h1 id="portada-titulo" className="portada-lema">
            Del «nos juntamos» al{' '}
            <em className="sin-corte">
              <Resaltado>encuentro que ocurre</Resaltado>.
            </em>
          </h1>
          <p className="portada-sub">
            Cada uno dice en privado cuándo puede. CRUXE propone <strong>un solo plan</strong> y cada uno lo confirma.
          </p>
          <Orbita compacta={nuevo} />
        </section>
      ) : (
        <section className="escena escena-portada" aria-labelledby="portada-titulo">
          <span className="escena-eyebrow">CRUXE</span>
          <h1 id="portada-titulo" className="portada-lema">
            {perfil ? `Hola, ${perfil.nombre}.` : 'Hola.'} <em>¿Qué plan armamos?</em>
          </h1>
          <p className="portada-sub">Del «nos juntamos» al encuentro que ocurre.</p>
          <Orbita compacta />
        </section>
      )}

      <div className="hoja">
        {invitacionInvalida ? (
          <Aviso tono="aviso" titulo="Ese enlace de invitación no es válido">
            Puede haberse copiado mal. Pide uno nuevo o escribe el código a mano en "Unirme con un código", más abajo.
          </Aviso>
        ) : null}
        <OtraSesion />
        {nuevo ? <Ingreso /> : null}
        {conPlan ? <TuPlan activas={activas} /> : null}

        {nuevo ? <div className="separador">o prueba sin crear nada</div> : null}
        <div className="accesos">
          {/* Con un plan activo, lo principal es el plan: sin acceso grande que cree otra demo por error. */}
          {conPlan ? null : (
            <CargarDemo deshabilitado={soloLectura} yaCargada={espacios?.some((e) => e.demo && e.mi_rol === 'organizador') ?? false} />
          )}
          {nuevo ? null : (
            <a className="acceso" href={rutas.crear()}>
              <span className="acceso-icono" aria-hidden="true">
                <Icono n="grupo" />
              </span>
              <span className="acceso-texto">
                <span className="acceso-titulo">Crear un grupo</span>
                <span className="acceso-sub" aria-hidden="true">
                  Para tus amigos de verdad: invitas con un enlace
                </span>
              </span>
            </a>
          )}
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

        {espacios === null && !error ? <Cargando texto="Buscando tus espacios…" /> : null}
        {error && espacios === null ? <ErrorCaja error={error} onReintentar={cargar} /> : null}
        {error && espacios !== null ? <ErrorCaja error={error} onReintentar={cargar} titulo="No se pudo actualizar" /> : null}

        {espacios && espacios.length > 0 ? (
          <section aria-labelledby="mis-espacios">
            <div className="seccion-titulo">
              <h2 id="mis-espacios">Tus grupos</h2>
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

        <UnirsePorCodigo deshabilitado={soloLectura} />

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
      </div>
    </div>
  )
}

/** Ingreso: no hay cuenta ni contraseña (sesión anónima, contrato 0.1). Solo el nombre, guardado en este teléfono. */
function Ingreso() {
  const [nombre, setNombre] = useState('')
  const [aviso, setAviso] = useState<string | null>(null)
  function entrar(e: FormEvent) {
    e.preventDefault()
    if (!nombre.trim()) return
    vibrar(10)
    if (!guardarPerfil(nombre)) setAviso('Este navegador no deja guardar datos: vas a escribir tu nombre al unirte a cada grupo.')
  }
  return (
    <form className="tarjeta ingreso" onSubmit={entrar} noValidate aria-labelledby="ingreso-titulo">
      <h2 id="ingreso-titulo">Entrar a CRUXE</h2>
      <p className="suave">Sin contraseña ni correo: tu sesión queda guardada en este teléfono.</p>
      <label className="campo">
        <span>¿Cómo te llaman tus amigos?</span>
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={30} autoComplete="nickname" placeholder="Tu nombre" />
      </label>
      <Boton type="submit" className="btn-bloque" disabled={!nombre.trim()}>
        Entrar
      </Boton>
      {aviso ? <p role="status">{aviso}</p> : null}
    </form>
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
  const turno = (x: PlanActivo) => esTurno(x.p)
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
        <a className="enlace" href={rutas.planes()}>
          Ver todos
        </a>
      </div>
      <ul className="lista-planes">
        {activas.map(({ espacio, p }) => (
          <li key={p.id}>
            <PlanVivo p={p} espacioId={espacio.id} espacioNombre={espacio.nombre} />
          </li>
        ))}
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

function UnirsePorCodigo({ deshabilitado, codigoInicial }: { deshabilitado: boolean; codigoInicial?: string }) {
  const [codigo, setCodigo] = useState(codigoInicial ?? '')
  // Por un enlace de invitación puede llegar otra persona al teléfono de alguien: ahí el nombre NO se precarga
  // (revisión del rediseño, P2); se ofrece "Soy X" o "No soy X" (sesión nueva, la de X queda guardada).
  const porInvitacion = codigoInicial != null
  const [nombre, setNombre] = useState(() => (porInvitacion ? '' : (leerPerfil()?.nombre ?? '')))
  const perfil = usePerfil()
  // Si la persona escribe su nombre en el ingreso con este formulario ya en pantalla, se completa solo.
  useEffect(() => {
    if (perfil && !porInvitacion) setNombre((n) => n || perfil.nombre)
  }, [perfil, porInvitacion])
  const [separando, setSeparando] = useState(false)
  async function noSoy(quien: string) {
    if (separando) return
    setSeparando(true)
    const s = await sesionNueva(quien)
    setSeparando(false)
    if (!s.ok) setErrorCambio(s.mensaje)
  }
  const { ocupado, error, ejecutar } = useAccion()
  // Navegador compartido: la sesión guardada ya es miembro de este espacio con otro nombre.
  const [yaMiembro, setYaMiembro] = useState<{ espacioId: string; espacio: string; nombreActual: string } | null>(null)
  const [confirmar, setConfirmar] = useState(false)
  const [cambiando, setCambiando] = useState(false)
  const [errorCambio, setErrorCambio] = useState<string | null>(null)
  const faltan = codigo.trim() === '' || nombre.trim() === ''

  function entrar(r: { espacio_id: string; reclamo_asiento_simulado: boolean }, espacio: string, sesionGuardada?: string) {
    recordarNombreSiFalta(nombre)
    if (r.reclamo_asiento_simulado) {
      dejarAviso(`Reclamaste el lugar de ${nombre.trim()}. Desde ahora actúas con tu propia sesión y tus condiciones dejan de ser visibles para la simulación.${sesionGuardada ? ` ${sesionGuardada}` : ''}`)
    } else if (sesionGuardada) {
      dejarAviso(`Entraste como ${nombre.trim()}. ${sesionGuardada}`)
    } else {
      dejarAviso(`Te uniste a «${espacio}» como ${nombre.trim()}. Cuando haya un plan, marca si te interesa y carga en privado cuándo puedes.`)
    }
    irA(rutas.espacio(r.espacio_id))
  }

  async function hacer(e: FormEvent) {
    e.preventDefault()
    if (faltan) return
    setYaMiembro(null)
    setConfirmar(false)
    setErrorCambio(null)
    const r = await ejecutar(`join:${codigo.trim()}:${nombre.trim()}`, () =>
      api.joinSpace(codigo.trim(), nombre.trim()),
    )
    if (!r?.ok) return
    if (r.data.resultado.ya_era_miembro) {
      // El servidor no cambia el nombre ni crea a otra persona: no se entra en silencio como quien estaba antes.
      const yo = r.data.espacio.miembros.find((m) => m.es_yo)
      setYaMiembro({ espacioId: r.data.resultado.espacio_id, espacio: r.data.espacio.nombre, nombreActual: yo?.nombre ?? 'otra persona' })
      return
    }
    entrar(r.data.resultado, r.data.espacio.nombre)
  }

  async function entrarComoOtra() {
    if (!yaMiembro || cambiando) return
    const previa = yaMiembro
    setCambiando(true)
    setErrorCambio(null)
    try {
      const s = await sesionNueva(previa.nombreActual)
      if (!s.ok) {
        setErrorCambio(s.mensaje)
        return
      }
      setYaMiembro(null)
      setConfirmar(false)
      const r = await ejecutar(`join-nueva:${codigo.trim()}:${nombre.trim()}`, () => api.joinSpace(codigo.trim(), nombre.trim()))
      if (r?.ok) {
        entrar(
          r.data.resultado,
          r.data.espacio.nombre,
          s.guardada ? `La sesión de ${previa.nombreActual} quedó guardada en este navegador: para volver a ella, ve a tus espacios.` : undefined,
        )
      }
    } finally {
      setCambiando(false)
    }
  }
  const otraGuardada = yaMiembro && confirmar ? leerGuardada() : null
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
      {porInvitacion && perfil ? (
        <div className="quien-soy" role="group" aria-label="Quién usa este teléfono">
          <p>
            Este teléfono está como <strong>{perfil.nombre}</strong>. ¿Eres tú?
          </p>
          <div className="fila-botones">
            <button type="button" className="btn btn-secundario btn-chico" onClick={() => setNombre(perfil.nombre)}>
              Soy {perfil.nombre}
            </button>
            <Boton variante="secundario" className="btn-chico" onClick={() => void noSoy(perfil.nombre)} ocupado={separando} ocupadoTexto="Separando…">
              No soy {perfil.nombre}
            </Boton>
          </div>
        </div>
      ) : null}
      <label className="campo">
        <span>Tu nombre en el espacio</span>
        <input
          autoFocus={codigoInicial != null}
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          autoComplete="nickname"
          maxLength={30}
          aria-invalid={error?.detalle === 'nombre_en_uso' ? true : undefined}
        />
        <small>Si usas el nombre de una persona simulada de la demo (por ejemplo "Luna"), reclamas su lugar.</small>
      </label>
      <Boton type="submit" className="btn-bloque" ocupado={ocupado} ocupadoTexto="Uniéndome…" disabled={faltan || deshabilitado || cambiando}>
        Unirme
      </Boton>
      {error ? <ErrorCaja error={error} enfocar /> : null}
      {yaMiembro ? (
        <Aviso tono="aviso" titulo={`Este navegador ya está en este espacio como ${yaMiembro.nombreActual}`}>
          {confirmar ? (
            <>
              <p>
                {otraGuardada
                  ? `Este navegador ya guarda la sesión de ${otraGuardada.etiqueta}; la de ${yaMiembro.nombreActual} no se guardará y no se podrá volver a ella desde acá.`
                  : `Se abre una sesión nueva para ti. La de ${yaMiembro.nombreActual} queda guardada en este navegador: se puede retomar desde tus espacios con "Volver a esa sesión".`}
              </p>
              <div className="fila-botones">
                <Boton variante={otraGuardada ? 'peligro' : 'primario'} onClick={() => void entrarComoOtra()} ocupado={cambiando} ocupadoTexto="Cambiando de persona…">
                  Sí, entrar como {nombre.trim() || 'otra persona'}
                </Boton>
                <Boton variante="secundario" onClick={() => setConfirmar(false)} disabled={cambiando}>
                  Cancelar
                </Boton>
              </div>
            </>
          ) : (
            <>
              <p>
                Si eres {yaMiembro.nombreActual}, sigue. Si eres otra persona, entra con una sesión nueva: así no ves ni cambias lo que
                cargó {yaMiembro.nombreActual}.
              </p>
              <div className="fila-botones">
                <Boton onClick={() => irA(rutas.espacio(yaMiembro.espacioId))}>Seguir como {yaMiembro.nombreActual}</Boton>
                <Boton variante="secundario" onClick={() => setConfirmar(true)}>
                  Entrar como otra persona
                </Boton>
              </div>
            </>
          )}
          {errorCambio ? <p role="alert">{errorCambio}</p> : null}
        </Aviso>
      ) : null}
    </form>
  )
}
