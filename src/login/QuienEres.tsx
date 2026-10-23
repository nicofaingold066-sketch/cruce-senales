// Entrada estilo Tricount (enmienda 9): el organizador crea el espacio con los nombres de su grupo y, al abrir la
// invitación (#/unirse/<código>), cada persona elige quién es. Desde ahí la sesión anónima de ese teléfono queda
// ligada a ese miembro. Debajo de la lista sigue el formulario de siempre ("No estoy en la lista"), con los mismos
// nombres accesibles que usan los guiones e2e, y el aviso de navegador compartido (#47).
// La pantalla recibe la API como `fuente` (src/login/fuente.ts), así el banco de prueba corre sin base.
// Crear un grupo con integrantes (fase 2) está en src/screens/CrearGrupo.tsx con CampoIntegrantes (src/login).
import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import type { UnirseOk } from '../lib/api'
import type { ApiError, ApiResult } from '../lib/types'
import { useAccion } from '../lib/hooks'
import { dejarAviso, irA, rutas, useIdentidad, useShell } from '../lib/shell'
import { entrarComoOtraPersona, leerGuardada } from '../lib/sesiones'
import { leerPerfil, recordarNombreSiFalta, usePerfil } from '../lib/perfil'
import { Aviso, Boton, Cargando, ErrorCaja } from '../components/ui'
import { Icono } from '../components/Icono'
import { marcarConEspacios } from './estado'
import './login.css'

export interface MiembroPorReclamar {
  miembro_id: string
  nombre: string
  /** false: ese lugar no se puede reclamar (ya tiene persona o actividad simulada). Lo decide el servidor. */
  libre: boolean
}

export interface VistaPorCodigo {
  espacio: { nombre: string; demo: boolean }
  miembros: MiembroPorReclamar[]
}

/** Las operaciones de la enmienda 9. */
export interface FuenteEntrada {
  verPorCodigo: (codigo: string) => Promise<ApiResult<VistaPorCodigo>>
  /** miembroId null: "No estoy en la lista" (se une con el nombre escrito, como siempre). */
  unirse: (codigo: string, nombre: string, miembroId: string | null) => Promise<ApiResult<UnirseOk>>
  /** Si la sesión de este teléfono ya es miembro del espacio de ese código (list_my_spaces), cuál. Opcional. */
  yaEstoy?: (codigo: string) => Promise<{ espacioId: string; miembroId: string } | null>
}

function entrarAlEspacio(r: UnirseOk['resultado'], espacio: string, nombre: string, porLista: boolean, sesionGuardada?: string) {
  marcarConEspacios()
  recordarNombreSiFalta(nombre)
  const extra = sesionGuardada ? ` ${sesionGuardada}` : ''
  if (r.reclamo_asiento_simulado) {
    // Mismo texto que la portada (los guiones lo buscan).
    dejarAviso(`Reclamaste el lugar de ${nombre}. Desde ahora actúas con tu propia sesión y tus condiciones dejan de ser visibles para la simulación.${extra}`)
  } else if (porLista) {
    dejarAviso(`Entraste como ${nombre}. Este teléfono queda como ${nombre}: lo que marques después es privado.${extra}`)
  } else if (sesionGuardada) {
    dejarAviso(`Entraste como ${nombre}.${extra}`)
  } else {
    dejarAviso(`Te uniste a «${espacio}» como ${nombre}. Cuando haya un plan, marca si te interesa y carga en privado cuándo puedes.`)
  }
  // #88: quien eligió su nombre de la lista va directo a responder la propuesta abierta (un toque). Si no hay una sola
  // propuesta por responder, esa pantalla lo deja en el espacio. Por el formulario se sigue entrando al espacio.
  irA(porLista ? rutas.responder(r.espacio_id) : rutas.espacio(r.espacio_id))
}

/**
 * Sesión anónima nueva SIN revocar la anterior (#47: signOut revoca la de Tomi para siempre); la anterior queda
 * guardada para volver desde la portada. Borra lo que la app guardó en sessionStorage (como hace la portada).
 */
async function sesionNueva(etiqueta: string) {
  const r = await entrarComoOtraPersona(etiqueta)
  if (r.ok) {
    try {
      for (const k of Object.keys(sessionStorage)) if (k.startsWith('cruxe:')) sessionStorage.removeItem(k)
    } catch {
      // Sin almacenamiento: no hay nada que borrar.
    }
  }
  return r
}

type Origen = 'lista' | 'formulario'
interface Intento {
  codigo: string
  nombre: string
  miembroId: string | null
  origen: Origen
}
interface YaMiembro {
  intento: Intento
  espacioId: string
  espacio: string
  nombreActual: string
}

/** Unirse (por la lista o por el formulario), con el cuidado de navegador compartido de la portada (#47). */
function useUnirse(fuente: FuenteEntrada) {
  const { ocupado, error, ejecutar } = useAccion()
  const [origen, setOrigen] = useState<Origen | null>(null)
  const [yaMiembro, setYaMiembro] = useState<YaMiembro | null>(null)

  async function unirse(i: Intento, sesionGuardada?: string) {
    setOrigen(i.origen)
    setYaMiembro(null)
    const r = await ejecutar(`join:${i.codigo}:${i.miembroId ?? i.nombre}`, () => fuente.unirse(i.codigo, i.nombre, i.miembroId))
    if (!r?.ok) return
    if (r.data.resultado.ya_era_miembro) {
      // El servidor no cambia el nombre ni crea a otra persona: no se entra en silencio como quien estaba antes.
      const yo = r.data.espacio.miembros.find((m) => m.es_yo)
      setYaMiembro({ intento: i, espacioId: r.data.resultado.espacio_id, espacio: r.data.espacio.nombre, nombreActual: yo?.nombre ?? 'otra persona' })
      return
    }
    entrarAlEspacio(r.data.resultado, r.data.espacio.nombre, i.nombre, i.miembroId != null, sesionGuardada)
  }
  return { ocupado, error, origen, yaMiembro, setYaMiembro, unirse }
}

function AvisoYaMiembro({ ya, unirse, cerrar }: { ya: YaMiembro; unirse: (i: Intento, guardada?: string) => Promise<void>; cerrar: () => void }) {
  const [confirmar, setConfirmar] = useState(false)
  const [cambiando, setCambiando] = useState(false)
  const [errorCambio, setErrorCambio] = useState<string | null>(null)
  const nombre = ya.intento.nombre
  const otraGuardada = confirmar ? leerGuardada() : null

  async function entrarComoOtra() {
    if (cambiando) return
    setCambiando(true)
    setErrorCambio(null)
    try {
      const s = await sesionNueva(`${ya.nombreActual} en «${ya.espacio}»`)
      if (!s.ok) {
        setErrorCambio(s.mensaje)
        return
      }
      cerrar()
      await unirse(
        ya.intento,
        s.guardada ? `La sesión de ${ya.nombreActual} quedó guardada en este navegador: para volver a ella, ve a tus espacios.` : undefined,
      )
    } finally {
      setCambiando(false)
    }
  }

  return (
    <Aviso tono="aviso" titulo={`Este navegador ya está en este espacio como ${ya.nombreActual}`}>
      {confirmar ? (
        <>
          <p>
            {otraGuardada
              ? `Este navegador ya guarda la sesión de ${otraGuardada.etiqueta}; la de ${ya.nombreActual} no se guardará y no se podrá volver a ella desde acá.`
              : `Se abre una sesión nueva para ti. La de ${ya.nombreActual} queda guardada en este navegador: se puede retomar desde tus espacios con "Volver a esa sesión".`}
          </p>
          <div className="fila-botones">
            <Boton variante={otraGuardada ? 'peligro' : 'primario'} onClick={() => void entrarComoOtra()} ocupado={cambiando} ocupadoTexto="Cambiando de persona…">
              Sí, entrar como {nombre || 'otra persona'}
            </Boton>
            <Boton variante="secundario" onClick={() => setConfirmar(false)} disabled={cambiando}>
              Cancelar
            </Boton>
          </div>
        </>
      ) : (
        <>
          <p>
            Si eres {ya.nombreActual}, sigue. Si eres otra persona, entra con una sesión nueva: así no ves ni cambias lo que cargó{' '}
            {ya.nombreActual}.
          </p>
          <div className="fila-botones">
            <Boton autoFocus onClick={() => irA(ya.intento.origen === 'lista' ? rutas.responder(ya.espacioId) : rutas.espacio(ya.espacioId))}>
              Seguir como {ya.nombreActual}
            </Boton>
            <Boton variante="secundario" onClick={() => setConfirmar(true)}>
              Entrar como otra persona
            </Boton>
          </div>
        </>
      )}
      {errorCambio ? <p role="alert">{errorCambio}</p> : null}
    </Aviso>
  )
}

/** #/unirse/<código>: "¿Quién eres en «X»?" con la lista del grupo y, debajo, el formulario de siempre. */
export function QuienEres({ codigo, fuente }: { codigo: string; fuente: FuenteEntrada }) {
  useIdentidad(null, null, null)
  const { soloLectura } = useShell()
  const [vista, setVista] = useState<VistaPorCodigo | null>(null)
  const [errorVista, setErrorVista] = useState<ApiError | null>(null)
  const [elegido, setElegido] = useState<MiembroPorReclamar | null>(null)
  const [yaEstoy, setYaEstoy] = useState<{ espacioId: string; miembroId: string } | null>(null)
  const u = useUnirse(fuente)
  const titulo = useRef<HTMLHeadingElement>(null)
  const campoNombre = useRef<HTMLInputElement>(null)
  const secuencia = useRef(0)

  const cargar = useCallback(async () => {
    const mia = ++secuencia.current
    const r = await fuente.verPorCodigo(codigo)
    if (mia !== secuencia.current) return
    if (r.ok) {
      setVista(r.data)
      setErrorVista(null)
    } else {
      setErrorVista(r.error)
    }
  }, [codigo, fuente])

  useEffect(() => {
    void cargar()
  }, [cargar])

  // Quien ya entró desde este teléfono y vuelve a abrir el enlace (por ejemplo, un recordatorio) sigue con un toque.
  useEffect(() => {
    let vivo = true
    void fuente.yaEstoy?.(codigo).then((y) => {
      if (vivo) setYaEstoy(y)
    })
    return () => {
      vivo = false
    }
  }, [codigo, fuente])
  const yo = yaEstoy && vista ? (vista.miembros.find((m) => m.miembro_id === yaEstoy.miembroId) ?? null) : null

  // #80: al llegar la lista, el foco va al título "¿Quién eres?" (el lector lo anuncia), salvo que algo ya lo tenga.
  const conVista = vista != null
  useEffect(() => {
    if (conVista && (!document.activeElement || document.activeElement === document.body)) titulo.current?.focus({ preventScroll: true })
  }, [conVista])

  useEffect(() => {
    // Alguien tomó ese lugar mientras tanto: se vuelve a la lista actualizada, con el foco en el título.
    if (u.origen === 'lista' && u.error?.detalle === 'miembro_ya_reclamado') {
      setElegido(null)
      void cargar().then(() => titulo.current?.focus())
    }
  }, [u.error, u.origen, cargar])

  const errorLista = u.origen === 'lista' ? u.error : null
  const yaLista = u.origen === 'lista' ? u.yaMiembro : null
  return (
    <div className="vista">
      <section className="escena escena-invitacion" aria-labelledby="quien-titulo">
        <span className="escena-eyebrow">Invitación a CRUXE</span>
        <h1 id="quien-titulo" ref={titulo} tabIndex={-1}>
          {vista ? '¿Quién eres?' : 'Te invitaron a un plan'}
        </h1>
        {/* El nombre del espacio va fuera de los títulos: los guiones esperan el título del espacio para saber que ya se entró. */}
        {vista ? <p className="quien-espacio">en «{vista.espacio.nombre}»</p> : null}
        <p className="escena-sub">Elige tu nombre. Este teléfono quedará como esa persona; no pedimos correo ni contraseña.</p>
      </section>
      <div className="hoja">
        {!vista && !errorVista ? <Cargando texto="Buscando tu grupo…" /> : null}
        {errorVista ? (
          <ErrorCaja error={errorVista} onReintentar={() => void cargar()} titulo={vista ? 'No se pudo actualizar la lista' : 'No se pudo cargar la lista del grupo'} />
        ) : null}

        {yo && yaEstoy && !elegido ? (
          <section className="tarjeta entrada-opcion entrada-principal" aria-labelledby="quien-ya">
            <h2 id="quien-ya">Ya estás en este grupo como {yo.nombre}</h2>
            <p className="suave">Este teléfono ya entró como {yo.nombre}. Sigue para responder o ver el plan.</p>
            <div className="entrada-botones">
              <Boton autoFocus onClick={() => irA(rutas.responder(yaEstoy.espacioId))}>
                Seguir como {yo.nombre}
              </Boton>
            </div>
            <p className="suave">¿No eres {yo.nombre}? Elige tu nombre abajo y entra con una sesión nueva.</p>
          </section>
        ) : null}

        {vista && elegido ? (
          <section className="tarjeta entrada-opcion entrada-principal" aria-labelledby="quien-confirmar">
            <h2 id="quien-confirmar">¿Eres {elegido.nombre}?</h2>
            <p className="suave">
              Este teléfono queda como {elegido.nombre} en «{vista.espacio.nombre}». Lo que marques después es privado.
            </p>
            <div className="entrada-botones">
              <Boton
                autoFocus
                onClick={() => void u.unirse({ codigo, nombre: elegido.nombre, miembroId: elegido.miembro_id, origen: 'lista' })}
                ocupado={u.ocupado && u.origen === 'lista'}
                ocupadoTexto="Entrando…"
                disabled={soloLectura}
              >
                Sí, soy {elegido.nombre}
              </Boton>
              <Boton
                variante="secundario"
                onClick={() => {
                  setElegido(null)
                  requestAnimationFrame(() => titulo.current?.focus())
                }}
                disabled={u.ocupado}
              >
                Elegir otro nombre
              </Boton>
            </div>
            {errorLista ? <ErrorCaja error={errorLista} enfocar /> : null}
            {yaLista ? <AvisoYaMiembro ya={yaLista} unirse={u.unirse} cerrar={() => u.setYaMiembro(null)} /> : null}
          </section>
        ) : null}

        {vista && !elegido ? (
          <section aria-labelledby="quien-lista">
            <h2 id="quien-lista" className="entrada-subtitulo">
              Integrantes
            </h2>
            {errorLista?.detalle === 'miembro_ya_reclamado' ? <ErrorCaja error={errorLista} /> : null}
            <ul className="quien-lista">
              {vista.miembros.map((m) => (
                <li key={m.miembro_id}>
                  <button
                    type="button"
                    className="btn btn-secundario quien-nombre"
                    disabled={!m.libre || soloLectura}
                    onClick={() => setElegido(m)}
                    aria-describedby={m.libre ? undefined : `ya-${m.miembro_id}`}
                  >
                    {m.nombre}
                  </button>
                  {m.libre ? null : (
                    <span id={`ya-${m.miembro_id}`} className="suave quien-tomado">
                      no disponible
                    </span>
                  )}
                </li>
              ))}
            </ul>
            {vista.miembros.every((m) => !m.libre) ? <p className="suave">Ya no queda ningún nombre libre en la lista.</p> : null}
            <button
              type="button"
              className="btn btn-secundario entrada-enlace"
              onClick={() => {
                const f = document.getElementById('unirse')
                f?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                campoNombre.current?.focus({ preventScroll: true })
              }}
            >
              No estoy en la lista
            </button>
          </section>
        ) : null}

        <UnirseConNombre codigoInicial={codigo} u={u} campoNombre={campoNombre} deshabilitado={soloLectura} demo={vista?.espacio.demo === true} />
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

/** "No estoy en la lista": el formulario de siempre (mismos nombres accesibles que la portada). */
function UnirseConNombre({
  codigoInicial,
  u,
  campoNombre,
  deshabilitado,
  demo,
}: {
  codigoInicial: string
  u: ReturnType<typeof useUnirse>
  campoNombre: React.RefObject<HTMLInputElement | null>
  deshabilitado: boolean
  /** La ayuda de "reclamar a una persona simulada" solo tiene sentido en la demo (en un grupo real confunde). */
  demo: boolean
}) {
  const [codigo, setCodigo] = useState(codigoInicial)
  const [nombre, setNombre] = useState(() => leerPerfil()?.nombre ?? '')
  const perfil = usePerfil()
  useEffect(() => {
    if (perfil) setNombre((n) => n || perfil.nombre)
  }, [perfil])
  const error = u.origen === 'formulario' ? u.error : null
  const ya = u.origen === 'formulario' ? u.yaMiembro : null
  const codigoMal = error?.detalle === 'codigo_inexistente'
  const nombreMal = error?.detalle === 'nombre_en_uso'
  const faltan = codigo.trim() === '' || nombre.trim() === ''

  useEffect(() => {
    if (nombreMal) campoNombre.current?.focus()
  }, [error, nombreMal, campoNombre])

  function hacer(e: FormEvent) {
    e.preventDefault()
    if (faltan) return
    void u.unirse({ codigo: codigo.trim(), nombre: nombre.trim(), miembroId: null, origen: 'formulario' })
  }

  return (
    <form id="unirse" className="tarjeta unirse" onSubmit={hacer} noValidate aria-labelledby="unirse-titulo">
      <h2 id="unirse-titulo">Unirme con un código</h2>
      <p className="suave">¿No estás en la lista? Escribe tu nombre y entras como una persona nueva.</p>
      <label className={`campo ${codigoMal ? 'campo-error' : ''}`}>
        <span>Código de invitación</span>
        <input
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          maxLength={16}
          aria-invalid={codigoMal || undefined}
        />
      </label>
      <label className={`campo ${nombreMal ? 'campo-error' : ''}`}>
        <span>Tu nombre en el espacio</span>
        <input
          ref={campoNombre}
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          autoComplete="off"
          maxLength={30}
          aria-invalid={nombreMal || undefined}
        />
        {demo ? <small>Si usas el nombre de una persona simulada de la demo (por ejemplo "Luna"), reclamas su lugar.</small> : null}
      </label>
      <Boton type="submit" variante="secundario" ocupado={u.ocupado && u.origen === 'formulario'} ocupadoTexto="Uniéndome…" disabled={faltan || deshabilitado}>
        Unirme
      </Boton>
      {error ? <ErrorCaja error={error} enfocar={!nombreMal} /> : null}
      {ya ? <AvisoYaMiembro ya={ya} unirse={u.unirse} cerrar={() => u.setYaMiembro(null)} /> : null}
    </form>
  )
}
