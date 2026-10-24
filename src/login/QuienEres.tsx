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
import { Avatar, Aviso, Boton, Cargando, ErrorCaja } from '../components/ui'
import { Icono } from '../components/Icono'
import { marcarConEspacios } from './estado'
import { QueGuarda } from '../friccion/QueGuarda'
import { FRASE_QUIEN_VIENE, quienVieneDe, sinQuienViene } from '../lib/compartir'
import { fraseProposito } from '../friccion/propositos'
import type { Proposito } from '../friccion/propositos'
import { destinoDesdeVista, destinoPorCodigo } from '../friccion/porCodigo'
import './login.css'
import '../estilo/seccion-s1.css'

export interface MiembroPorReclamar {
  miembro_id: string
  nombre: string
  /** false: ese lugar no se puede reclamar (ya tiene persona o actividad simulada). Lo decide el servidor. */
  libre: boolean
}

export interface VistaPorCodigo {
  /** `proposito` (enmienda 14): la clave que eligió quien creó el grupo; falta en respuestas anteriores a la enmienda. */
  espacio: { nombre: string; demo: boolean; proposito?: Proposito }
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
    dejarAviso(`Reclamaste el lugar de ${nombre}. Desde ahora respondes tú desde este teléfono; cuándo puedes y tus condiciones no las ve nadie del grupo.${extra}`)
  } else if (porLista) {
    dejarAviso(`Entraste como ${nombre}. Este teléfono queda como ${nombre}: cuándo puedes y tus condiciones no las ve nadie del grupo.${extra}`)
  } else if (sesionGuardada) {
    dejarAviso(`Entraste como ${nombre}.${extra}`)
  } else {
    dejarAviso(`Te uniste a «${sinQuienViene(espacio)}» como ${nombre}. Cuando haya un plan, marca si te interesa y carga en privado cuándo puedes.`)
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

/** Unirse (por la lista o por el formulario), con el cuidado de navegador compartido de la portada (#47). Exportado para la portada. */
export function useUnirse(fuente: FuenteEntrada) {
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
    // Por la lista se va directo a responder; por el formulario, al espacio (aunque reclame un lugar anotado por el nombre).
    entrarAlEspacio(r.data.resultado, r.data.espacio.nombre, i.nombre, i.origen === 'lista', sesionGuardada)
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
  // D3: la regla de quién viene va como marca al final del nombre; acá se muestra limpio y la regla aparte.
  const nombreEspacio = vista ? sinQuienViene(vista.espacio.nombre) : ''
  const reglaEspacio = vista ? quienVieneDe(vista.espacio.nombre) : null
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

  // rincones O-08: con un código que no existe, el título no invita a elegir un nombre.
  const codigoMalo = !vista && errorVista?.detalle === 'codigo_inexistente'
  // front-juan P1: si ningún nombre está libre, la lista no tiene salida; se ve directo el campo de nombre.
  const sinLibres = vista != null && vista.miembros.every((m) => !m.libre)
  const errorLista = u.origen === 'lista' ? u.error : null
  const yaLista = u.origen === 'lista' ? u.yaMiembro : null
  return (
    <div className="vista s1 s1-quien">
      <section className="escena escena-invitacion" aria-labelledby="quien-titulo">
        <span className="escena-eyebrow">{vista ? 'Te invitaron a' : 'Invitación a CRUXE'}</span>
        {/* El nombre del grupo va grande pero fuera de los títulos: los guiones esperan el título del grupo para saber que ya se entró. */}
        {vista ? <p className="s1-grupo-grande">{nombreEspacio}</p> : null}
        {reglaEspacio ? <p className="quien-espacio quien-regla">{FRASE_QUIEN_VIENE[reglaEspacio]}</p> : null}
        {vista && fraseProposito(vista.espacio.proposito) ? <p className="quien-espacio quien-regla">Este grupo es {fraseProposito(vista.espacio.proposito)}.</p> : null}
        <h1 id="quien-titulo" ref={titulo} tabIndex={-1}>
          {vista ? (sinLibres ? 'Escribe tu nombre para entrar' : '¿Quién eres?') : codigoMalo ? 'Esta invitación no existe' : 'Te invitaron a un plan'}
        </h1>
        <p className="escena-sub">
          {codigoMalo
            ? 'Revisa que el enlace esté completo o pide uno nuevo a quien organiza. También puedes escribir el código abajo.'
            : sinLibres
              ? 'Los nombres de la lista ya entraron. Escribe el tuyo para sumarte al grupo; no pedimos correo ni contraseña.'
              : 'Toca tu nombre y entras. Sin contraseña.'}
        </p>
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

        {vista && !sinLibres ? (
          <section aria-labelledby="quien-lista" className="s1-lista">
            <h2 id="quien-lista" className="entrada-subtitulo">
              Integrantes
            </h2>
            {errorLista?.detalle === 'miembro_ya_reclamado' ? <ErrorCaja error={errorLista} /> : null}
            <ul className="quien-lista">
              {vista.miembros.map((m) => {
                const esta = elegido?.miembro_id === m.miembro_id
                return (
                  <li key={m.miembro_id} className={esta ? 's1-elegido' : elegido ? 's1-otro' : ''}>
                    {esta ? (
                      // Rediseño S1: la confirmación en la misma pantalla (la fila del nombre se abre). Reclamar un lugar
                      // no se deshace, por eso sigue habiendo un "Sí, soy X" (4 toques, el piso del brief).
                      <div className="s1-confirmar-nombre" role="group" aria-labelledby="quien-confirmar">
                        <h3 id="quien-confirmar">¿Eres {m.nombre}?</h3>
                        <p>
                          Este teléfono queda como {m.nombre} en «{nombreEspacio}». Cuándo puedes y tus condiciones no las ve nadie del
                          grupo.
                        </p>
                        <div className="entrada-botones">
                          <Boton
                            autoFocus
                            onClick={() => void u.unirse({ codigo, nombre: m.nombre, miembroId: m.miembro_id, origen: 'lista' })}
                            ocupado={u.ocupado && u.origen === 'lista'}
                            ocupadoTexto="Entrando…"
                            disabled={soloLectura}
                          >
                            Sí, soy {m.nombre}
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
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="btn btn-secundario quien-nombre"
                          disabled={!m.libre || soloLectura}
                          onClick={() => setElegido(m)}
                          aria-describedby={m.libre ? undefined : `ya-${m.miembro_id}`}
                        >
                          <Avatar nombre={m.nombre} tam={32} />
                          {m.nombre}
                        </button>
                        {m.libre ? null : (
                          <span id={`ya-${m.miembro_id}`} className="suave quien-tomado">
                            {vista.espacio.demo ? 'no disponible' : 'ya entró'}
                          </span>
                        )}
                      </>
                    )}
                  </li>
                )
              })}
            </ul>
            <button
              type="button"
              className="btn btn-secundario entrada-enlace s1-no-estoy"
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

        <UnirseConNombre codigoInicial={codigo} u={u} campoNombre={campoNombre} deshabilitado={soloLectura} vista={vista} />
        <div className="privado" role="note">
          <span className="privado-icono" aria-hidden="true">
            <Icono n="candado" tam={20} />
          </span>
          <div>
            <strong>Sin contraseña ni correo</strong>
            <p>Tu sesión queda guardada en este teléfono. Cuándo puedes es privado: nadie del grupo lo ve.</p>
          </div>
        </div>
        <QueGuarda />
      </div>
    </div>
  )
}

/**
 * "No estoy en la lista": el formulario de siempre (mismos nombres accesibles que la portada). Coherente con el enlace:
 * si el nombre escrito es el de un integrante anotado y libre de este grupo, reclama ese lugar (antes daba "nombre en
 * uso"); con otro código, mira ese grupo y, si tiene nombres libres que no coinciden, lleva a su "¿Quién eres?".
 * Exportado para que la portada (front-juan) use este mismo formulario con `vista={null}`.
 */
export function UnirseConNombre({
  codigoInicial,
  u,
  campoNombre,
  deshabilitado,
  vista,
  compacto,
}: {
  codigoInicial: string
  u: ReturnType<typeof useUnirse>
  campoNombre: React.RefObject<HTMLInputElement | null>
  deshabilitado: boolean
  /** La lista ya cargada de este grupo (null en la portada o mientras carga). */
  vista: VistaPorCodigo | null
  /** En la portada, dentro de la tarjeta "Tengo un código": el título queda solo para lectores y sin la frase de la lista. */
  compacto?: boolean
}) {
  const demo = vista?.espacio.demo === true
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

  const [mirando, setMirando] = useState(false)
  async function hacer(e: FormEvent) {
    e.preventDefault()
    if (faltan || mirando) return
    const cod = codigo.trim()
    const nom = nombre.trim()
    let miembroId: string | null = null
    let nombreFinal = nom
    if (vista && cod.toUpperCase() === codigoInicial.toUpperCase()) {
      // Mismo grupo. En la demo el servidor ya resuelve el nombre de una persona simulada; no se cambia esa llamada.
      if (!demo) {
        const d = destinoDesdeVista(vista, nom)
        miembroId = d.miembroId
        nombreFinal = d.nombre
      }
    } else {
      setMirando(true)
      const d = await destinoPorCodigo(cod, nom)
      setMirando(false)
      if (d.elegir) {
        irA(rutas.unirse(cod))
        return
      }
      miembroId = d.miembroId
      nombreFinal = d.nombre
    }
    void u.unirse({ codigo: cod, nombre: nombreFinal, miembroId, origen: 'formulario' })
  }

  return (
    <form id="unirse" className="tarjeta unirse" onSubmit={hacer} noValidate aria-labelledby="unirse-titulo">
      <h2 id="unirse-titulo" className={compacto ? 'visualmente-oculto' : undefined}>
        Unirme con un código
      </h2>
      {compacto ? null : <p className="suave">¿No estás en la lista? Escribe tu nombre y entras como una persona nueva.</p>}
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
      <Boton type="submit" variante="secundario" ocupado={(u.ocupado && u.origen === 'formulario') || mirando} ocupadoTexto="Uniéndome…" disabled={faltan || deshabilitado}>
        Unirme
      </Boton>
      {error ? <ErrorCaja error={error} enfocar={!nombreMal} /> : null}
      {ya ? <AvisoYaMiembro ya={ya} unirse={u.unirse} cerrar={() => u.setYaMiembro(null)} /> : null}
    </form>
  )
}
