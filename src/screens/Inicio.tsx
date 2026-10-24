// Portada (S1 Ingreso, rediseño de la noche; la edita friccion por excepción del encargo). UNA sola portada para todos:
// arriba lo que me toca (el plan, con "Confirmar versión N" a la vista si es mi turno), después los grupos y, abajo,
// las entradas: crear un grupo, tengo un código, ver la demo. Sin entrada animada y sin nombre previo como puerta:
// el nombre es opcional (queda en este teléfono y se completa solo al crear o unirse). Un solo botón primario.
import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { api } from '../lib/api'
import type { ApiError, EspacioResumen, PropuestaResumen } from '../lib/types'
import { useAccion, useSondeo } from '../lib/hooks'
import { dejarAviso, irA, rutas, useIdentidad, useShell } from '../lib/shell'
import { OtraSesion } from '../components/Sesiones'
import { guardarPerfil, usePerfil } from '../lib/perfil'
import { vibrar } from '../lib/tacto'
import { Aviso, Boton, Card, Cargando, Chip, EncabezadoSeccion, ErrorCaja, colorAvatar, iniciales } from '../components/ui'
import { PlanVivo, esTurno } from '../components/PlanVivo'
import { Marca } from '../components/Marca'
import { Icono } from '../components/Icono'
import { Orbita } from '../components/Orbita'
import { Resaltado } from '../components/Resaltado'
import { UnirseConNombre, useUnirse } from '../login/QuienEres'
import { fuenteReal } from '../login/fuente'
import '../estilo/seccion-s1.css'

export default function Inicio({ invitacionInvalida }: { invitacionInvalida?: boolean } = {}) {
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
  // Mejora #30: con grupos, el plan activo se mantiene al día (mismo ritmo que la lista del grupo).
  useSondeo(cargar, 10000, (espacios?.length ?? 0) > 0)

  const perfil = usePerfil()
  const conGrupos = (espacios?.length ?? 0) > 0
  const turnos = activas.filter((x) => esTurno(x.p))
  // Con un plan que me toca, el primario de la pantalla es "Confirmar versión N" (brasa); si no, "Crear un grupo".
  const primarioEsCrear = turnos.length === 0

  return (
    <div className="vista s1 s1-portada">
      <section className="escena escena-portada" aria-labelledby="portada-titulo">
        {conGrupos ? <span className="escena-eyebrow">CRUXE</span> : <Marca grande />}
        <h1 id="portada-titulo" className="portada-lema">
          {conGrupos ? (
            perfil ? `Hola, ${perfil.nombre}.` : 'Hola.'
          ) : (
            <>
              Del «nos juntamos» al{' '}
              <em className="sin-corte">
                <Resaltado>encuentro que ocurre</Resaltado>.
              </em>
            </>
          )}
        </h1>
        <p className="portada-sub">
          {!conGrupos
            ? 'Cada uno dice en privado cuándo puede. Sale un solo plan y cada uno lo confirma.'
            : turnos.length > 0
              ? turnos.length === 1
                ? 'Te toca confirmar un plan.'
                : `Te toca confirmar ${turnos.length} planes.`
              : activas.length > 0
                ? activas.length === 1
                  ? 'Hay un plan en marcha.'
                  : `Hay ${activas.length} planes en marcha.`
                : 'Sin planes por ahora. Crea uno o espera el enlace de tu grupo.'}
        </p>
        {!conGrupos ? <Orbita compacta /> : null}
      </section>

      <div className="hoja">
        {invitacionInvalida ? (
          <Aviso tono="aviso" titulo="Ese enlace de invitación no es válido">
            Pide uno nuevo o escribe el código abajo.
          </Aviso>
        ) : null}
        <OtraSesion />

        {activas.length > 0 ? <TuPlan activas={activas} soloLectura={soloLectura} /> : null}

        {espacios === null && !error ? <Cargando texto="Buscando tus grupos…" /> : null}
        {error && espacios === null ? <ErrorCaja error={error} onReintentar={cargar} /> : null}
        {error && espacios !== null ? <ErrorCaja error={error} onReintentar={cargar} titulo="No se pudo actualizar" /> : null}

        {conGrupos ? <TusGrupos espacios={espacios ?? []} /> : null}

        {/* Las entradas. En un teléfono nuevo, todas a la vista; con grupos, en una fila corta y el código plegado. */}
        {!conGrupos ? (
          <>
            <Card titulo="Crear un grupo" id="crear" className="s1-entrada s1-entrada-principal">
              <p className="t-nota s1-nota">Anotas a tus amigos y les mandas un enlace. Sin cuenta ni contraseña.</p>
              <a className="btn btn-primario s1-btn" href={rutas.crear()}>
                Crear un grupo
              </a>
            </Card>
            <TuNombre />
            <Card titulo="Tengo un código" id="codigo" className="s1-entrada">
              <UnirsePortada deshabilitado={soloLectura} />
            </Card>
            <CargarDemo deshabilitado={soloLectura} yaCargada={false} />
          </>
        ) : (
          <>
            <EncabezadoSeccion titulo="Más" />
            <div className="s1-acciones">
              <a className={`btn ${primarioEsCrear ? 'btn-primario' : 'btn-secundario'} s1-btn`} href={rutas.crear()}>
                Crear un grupo
              </a>
              <details className="s1-plegable">
                <summary className="btn btn-secundario s1-btn">Tengo un código</summary>
                <div className="s1-plegable-cuerpo">
                  <UnirsePortada deshabilitado={soloLectura} />
                </div>
              </details>
              <CargarDemo deshabilitado={soloLectura} yaCargada={espacios?.some((e) => e.demo && e.mi_rol === 'organizador') ?? false} />
            </div>
            <TuNombre />
          </>
        )}
      </div>
    </div>
  )
}

/** Tu nombre, opcional: queda en este teléfono y se completa solo al crear un grupo o al unirte. Ya no es una puerta. */
function TuNombre() {
  const perfil = usePerfil()
  const [nombre, setNombre] = useState('')
  const [editando, setEditando] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)
  function entrar(e: FormEvent) {
    e.preventDefault()
    if (!nombre.trim()) return
    vibrar(10)
    if (guardarPerfil(nombre)) {
      setEditando(false)
      setNombre('')
      setAviso(null)
    } else setAviso('Este navegador no deja guardar datos: escribirás tu nombre al crear o unirte.')
  }
  if (perfil && !editando) {
    return (
      <p className="t-nota s1-nombre-listo">
        En este teléfono: <strong>{perfil.nombre}</strong>.{' '}
        <button type="button" className="enlace" onClick={() => setEditando(true)}>
          Cambiar
        </button>
      </p>
    )
  }
  return (
    <form className="tarjeta s1-nombre" onSubmit={entrar} noValidate aria-labelledby="ingreso-titulo">
      <h2 id="ingreso-titulo">Entrar a CRUXE</h2>
      <p className="t-nota s1-nota">Opcional: tu nombre queda en este teléfono y se completa solo al crear o unirte.</p>
      <div className="s1-nombre-fila">
        <label className="campo">
          <span>¿Cómo te llaman tus amigos?</span>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={30} autoComplete="nickname" placeholder="Tu nombre" />
        </label>
        <Boton type="submit" variante="secundario" disabled={!nombre.trim()}>
          Entrar
        </Boton>
      </div>
      {aviso ? <p role="status">{aviso}</p> : null}
    </form>
  )
}

interface PlanActivo {
  espacio: EspacioResumen
  p: PropuestaResumen
}

const ESTADOS_ACTIVOS = new Set(['borrador', 'reuniendo_interes', 'esperando_compromisos', 'grupo_confirmado', 'en_revision'])

/** Propuestas vigentes de mis grupos (hasta 4 grupos). El orden y "Te toca" salen del servidor. */
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

/** Lo que me toca, arriba de todo: el plan y, si es mi turno, "Confirmar versión N" sin abrir nada (2 toques al volver). */
function TuPlan({ activas, soloLectura }: { activas: PlanActivo[]; soloLectura: boolean }) {
  return (
    <section className="tu-plan s1-tu-plan" aria-labelledby="tu-plan-titulo">
      <EncabezadoSeccion
        id="tu-plan-titulo"
        titulo={activas.length === 1 ? 'Tu plan' : 'Tus planes'}
        accion={
          <a className="enlace" href={rutas.planes()}>
            Ver todos
          </a>
        }
      />
      <ul className="lista-planes">
        {activas.map(({ espacio, p }) => (
          <li key={p.id}>
            <PlanVivo p={p} espacioId={espacio.id} espacioNombre={espacio.nombre} />
            <ConfirmarDesdePortada espacioId={espacio.id} p={p} soloLectura={soloLectura} />
          </li>
        ))}
      </ul>
    </section>
  )
}

/** El único botón primario de la portada cuando el servidor dice que me toca: confirma y abre el plan. */
function ConfirmarDesdePortada({ espacioId, p, soloLectura }: { espacioId: string; p: PropuestaResumen; soloLectura: boolean }) {
  const { ocupado, error, ejecutar } = useAccion()
  if (!esTurno(p) || !p.mi_situacion.puede_aceptar || p.version == null) return null
  const version = p.version
  async function confirmar() {
    const r = await ejecutar(`aceptar:${p.id}:${version}`, (intento) => api.acceptVersion(p.id, version, intento))
    if (!r) return
    if (r.ok) {
      vibrar(10)
      dejarAviso(`Ya confirmaste la versión ${version}.`)
    }
    // Con éxito, o con un error que cambió el estado, el plan muestra lo que pasó.
    if (r.ok || r.error.codigo === 'opcion_desactualizada' || r.error.codigo === 'cupo_completo' || r.error.codigo === 'plazo_vencido') {
      irA(rutas.propuesta(espacioId, p.id))
    }
  }
  return (
    <div className="s1-confirmar">
      <Boton variante="turno" onClick={() => void confirmar()} ocupado={ocupado} ocupadoTexto="Confirmando…" disabled={soloLectura}>
        Confirmar versión {version}
      </Boton>
      {error ? <ErrorCaja error={error} enfocar /> : null}
    </div>
  )
}

function TusGrupos({ espacios }: { espacios: EspacioResumen[] }) {
  return (
    <section aria-labelledby="mis-espacios">
      <EncabezadoSeccion id="mis-espacios" titulo="Tus grupos" />
      <ul className="filas s1-grupos">
        {espacios.map((e) => (
          <li key={e.id}>
            <a className="fila" href={rutas.espacio(e.id)}>
              <span className="fila-icono s1-grupo-icono" style={{ background: colorAvatar(e.nombre), color: '#fff' }} aria-hidden="true">
                {iniciales(e.nombre)}
              </span>
              <span className="fila-texto">
                <span className="fila-titulo">{e.nombre}</span>
                <span className="fila-meta t-nota">
                  {e.cantidad_miembros} {e.cantidad_miembros === 1 ? 'persona' : 'personas'}
                  {e.mi_rol === 'organizador' ? ' · organizas' : ''}
                </span>
              </span>
              {e.demo ? <Chip tono="sim">Demo</Chip> : null}
              <span className="visualmente-oculto">Abrir grupo</span>
              <span className="fila-chevron" aria-hidden="true">
                <Icono n="chevron" />
              </span>
            </a>
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
    <div className="s1-demo">
      <Boton variante="secundario" className="s1-btn" onClick={hacer} ocupado={ocupado} ocupadoTexto="Preparando la demo…" disabled={deshabilitado} aria-describedby="demo-detalle">
        {yaCargada ? 'Abrir la demo «Los del finde»' : 'Probar la demo «Los del finde»'}
      </Boton>
      <p className="t-nota s1-nota" id="demo-detalle">
        Serás Tomi, quien organiza; las otras cinco personas son simuladas. Datos ficticios.
      </p>
      {error ? <ErrorCaja error={error} enfocar /> : null}
    </div>
  )
}

/** Un solo formulario de unión (el de "¿Quién eres?"): mismos rótulos ("Código de invitación", "Tu nombre en el espacio",
 * "Unirme"), reclama al integrante anotado o lleva a la lista del grupo según el código, y el aviso de navegador compartido. */
function UnirsePortada({ deshabilitado }: { deshabilitado: boolean }) {
  const u = useUnirse(fuenteReal)
  const campoNombre = useRef<HTMLInputElement>(null)
  return <UnirseConNombre codigoInicial="" u={u} campoNombre={campoNombre} deshabilitado={deshabilitado} vista={null} compacto />
}
