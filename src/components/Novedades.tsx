// Novedades del grupo (pedido de Juan: "que a los que se metieron les llegue una notificación"). Avisos DENTRO de
// CRUXE armados solo con lo que el servidor ya le muestra a cada persona: quién está en el grupo (get_space), el
// estado de cada plan (list_proposals) y su historial público (get_proposal_state). Nunca condiciones ni conteos que
// el servidor reserva al organizador; la baja va sin nombre (enmienda 13 c). No decide nada ni escribe en la base.
// Cómo: un único sondeo compartido por todas las pantallas que lo muestran, que compara con la última foto guardada
// en este navegador (localStorage, una por cada sesión) y convierte las diferencias en avisos. La primera vez solo
// toma la foto. Con el teléfono bloqueado no llega nada: eso necesita push (service worker, claves y un emisor).
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { api } from '../lib/api'
import { supabase } from '../lib/supabase'
import type { EspacioResumen, EstadoPropuesta, Evento, PropuestaResumen } from '../lib/types'
import { franjaTexto } from '../lib/format'
import { rutas } from '../lib/shell'
import { vibrar } from '../lib/tacto'
import { Icono } from './Icono'

export interface Novedad {
  id: string
  espacio: string
  href: string
  propuestaId: string | null
  /** Tipo de evento del historial ('aceptacion', 'baja'…), 'entro' o 'turno'. */
  tipo: string
  /** state_rev del evento: con él se vuelve a mirar si el servidor todavía lo muestra. */
  rev: number | null
  texto: string
  /** Hora local de este teléfono en que se detectó (solo para ordenar y mostrar "hace un momento"). */
  en: number
  visto: boolean
}

interface FotoEspacio {
  miembroId: string
  cantidad: number
  /** Ids de quienes ya entraron (sin los anotados que todavía no abrieron el enlace). */
  dentro: string[]
  pendientes: number
}
interface FotoPropuesta {
  rev: number
  turno: boolean
}
interface Guardado {
  espacios: Record<string, FotoEspacio>
  propuestas: Record<string, FotoPropuesta>
  items: Novedad[]
}

const PREFIJO = 'cruxe:novedades:v2:'
const PREFIJO_SISTEMA = 'cruxe:novedades:sistema:'
const CADA_MS = 30000
// La primera revisión espera: no compite con la carga de la pantalla que se abre (ni suma pedidos a la base justo
// ahí). Lo ya guardado se ve al instante. Volver a la pestaña revisa, pero no más de una vez cada 15 s.
const PRIMERA_MS = 10000
const VOLVER_MS = 15000
const GRUPOS_POR_RONDA = 8
const MAX_ITEMS = 40

const vacio = (): Guardado => ({ espacios: {}, propuestas: {}, items: [] })

function leer(usuario: string | null): Guardado {
  if (!usuario) return vacio()
  try {
    const g = JSON.parse(localStorage.getItem(PREFIJO + usuario) ?? 'null') as Guardado | null
    if (g && typeof g === 'object' && g.espacios && g.propuestas && Array.isArray(g.items)) return g
  } catch {
    // Sin almacenamiento o dato roto: se empieza de cero (solo se pierde la foto anterior).
  }
  return vacio()
}

function escribir(usuario: string | null, g: Guardado) {
  if (!usuario) return
  try {
    localStorage.setItem(PREFIJO + usuario, JSON.stringify(g))
  } catch {
    // Sin almacenamiento: las novedades duran mientras la página esté abierta.
  }
}

// ---------------------------------------------------------------- almacén compartido

/** Usuario de la sesión de este navegador. Mientras no se sabe, no se muestra nada (navegador compartido). */
let usuario: string | null = null
let datos: Guardado = vacio()
/** Novedades que llegaron con la página abierta (para el aviso flotante; no las de visitas anteriores). */
let recientes: Novedad[] = []
/** Avisos flotantes ya mostrados en esta página: no se repiten al cambiar de pantalla. */
const mostradas = new Set<string>()
let version = 0
const oyentes = new Set<() => void>()
let timer: ReturnType<typeof setTimeout> | undefined
let enCurso = false
/** Hora de la última revisión terminada (0: todavía ninguna en esta página). */
let ultima = 0
let ronda = 0
let authSuscrita = false

function avisar() {
  version++
  for (const o of oyentes) o()
}

function cambiarUsuario(id: string | null) {
  if (id === usuario) return
  usuario = id
  datos = leer(id)
  recientes = []
  mostradas.clear()
  ultima = 0
  avisar()
}

function seguirSesion() {
  if (authSuscrita) return
  authSuscrita = true
  void supabase.auth.getSession().then(({ data }) => cambiarUsuario(data.session?.user.id ?? null))
  // "Entrar como otra persona" cambia la sesión sin recargar: la foto y los avisos son de cada persona.
  supabase.auth.onAuthStateChange((_evento, sesion) => {
    const id = sesion?.user.id ?? null
    if (id !== usuario) {
      cambiarUsuario(id)
      if (oyentes.size > 0) programar(PRIMERA_MS)
    }
  })
}

function suscribir(o: () => void) {
  oyentes.add(o)
  if (oyentes.size === 1) arrancar()
  return () => {
    oyentes.delete(o)
    if (oyentes.size === 0) parar()
  }
}

function visibilidad() {
  if (document.visibilityState === 'visible' && ultima > 0 && Date.now() - ultima > VOLVER_MS) void revisar()
}

/** Revisión ya (la usa el banco de prueba offline para no esperar los tiempos reales). */
function forzar() {
  void revisar()
}

function arrancar() {
  seguirSesion()
  programar(ultima > 0 && Date.now() - ultima > CADA_MS ? 0 : PRIMERA_MS)
  document.addEventListener('visibilitychange', visibilidad)
  window.addEventListener('cruxe:revisar-novedades', forzar)
}

function parar() {
  if (timer) clearTimeout(timer)
  timer = undefined
  document.removeEventListener('visibilitychange', visibilidad)
  window.removeEventListener('cruxe:revisar-novedades', forzar)
}

function programar(ms = CADA_MS) {
  if (timer) clearTimeout(timer)
  timer = oyentes.size > 0 ? setTimeout(() => void revisar(), ms) : undefined
}

// ---------------------------------------------------------------- de lo que cambió a un aviso

const conTitulo = (p: { titulo: string }) => `«${p.titulo}»`

/** Texto de un evento del historial para quien no lo hizo. Solo eventos que el grupo ya ve en "Historial". */
function textoEvento(e: Evento, p: EstadoPropuesta): string | null {
  const franja =
    p.opcion && (e.version_nueva == null || e.version_nueva === p.opcion.version)
      ? franjaTexto(p.opcion.franja.inicio, p.opcion.franja.fin)
      : null
  const quien = e.actor?.miembro_id ? e.actor.nombre : null
  switch (e.tipo) {
    case 'propuesta_abierta':
      return `${quien ?? 'Alguien'} propuso ${conTitulo(p)}. Marca cuándo puedes (es privado).`
    case 'opcion_publicada':
      return `${conTitulo(p)}: hay una opción${franja ? `: ${franja}` : ''}.`
    case 'aceptacion': {
      const v = e.version_nueva ?? e.version_previa
      const confirmo = `${quien ?? 'Una persona'} confirmó${v != null ? ` la versión ${v} de` : ''} ${conTitulo(p)}`
      // Solo en la transición: las aceptaciones de después no vuelven a anunciar el grupo confirmado.
      if (e.estado_nuevo === 'grupo_confirmado' && e.estado_previo !== 'grupo_confirmado') {
        return `${confirmo} y el grupo quedó confirmado: ¡se juntan!${franja ? ` ${franja}.` : ''}`
      }
      return `${confirmo}.`
    }
    case 'baja':
      // Enmienda 13 (c): sin nombre ni motivo. A los demás el servidor ya la manda como "Una persona".
      return p.estado === 'en_revision'
        ? `${conTitulo(p)}: una persona se retiró y el plan quedó en revisión.`
        : `${conTitulo(p)}: una persona se retiró.`
    case 'reparacion_publicada':
      return `${conTitulo(p)}: hay una versión nueva${franja ? `: ${franja}` : ''}. Las confirmaciones anteriores no cuentan.`
    case 'propuesta_cancelada':
      return `${conTitulo(p)} se canceló.`
    case 'propuesta_expirada':
      return `${conTitulo(p)}: venció el plazo para confirmar.`
    default:
      return null
  }
}

const esTurno = (p: PropuestaResumen) => p.siguiente_accion.codigo === 'te_toca_aceptar'

let secuencia = 0
function nuevoId() {
  secuencia++
  return `${Date.now().toString(36)}-${secuencia}`
}

interface Ronda {
  previo: Guardado
  siguiente: Guardado
  nuevas: Novedad[]
  /** Avisos guardados que el servidor ya no muestra (aceptaciones de quien se retiró): se borran. */
  borrar: Set<string>
}

async function revisarEspacio(e: EspacioResumen, r: Ronda) {
  const yo = e.mi_miembro_id
  const fotoE = r.previo.espacios[e.id]
  // Grupo recién visto o con otra persona: solo se toma la foto, sin avisos.
  const conocido = fotoE != null && fotoE.miembroId === yo
  // En un demo, el organizador simula a los demás: lo que "hacen" lo hizo él (y el servidor no siempre lo dice).
  const callado = e.demo && e.mi_rol === 'organizador'
  const agregar = (texto: string, tipo: string, propuestaId: string | null, rev: number | null, href: string) => {
    if (!callado) r.nuevas.push({ id: nuevoId(), espacio: e.nombre, href, propuestaId, tipo, rev, texto, en: Date.now(), visto: false })
  }

  // Quién entró: get_space solo si puede haber cambiado (gente por entrar o cantidad distinta).
  const verMiembros = !conocido || fotoE.pendientes > 0 || fotoE.cantidad !== e.cantidad_miembros
  const [esp, lista] = await Promise.all([verMiembros ? api.getSpace(e.id) : Promise.resolve(null), api.listProposals(e.id)])
  if (esp && esp.ok) {
    const dentro = esp.data.espacio.miembros.filter((m) => !m.pendiente)
    if (conocido) {
      for (const m of dentro) {
        if (!m.es_yo && !fotoE.dentro.includes(m.miembro_id)) agregar(`${m.nombre} entró a «${e.nombre}».`, 'entro', null, null, rutas.espacio(e.id))
      }
    }
    r.siguiente.espacios[e.id] = {
      miembroId: yo,
      cantidad: e.cantidad_miembros,
      dentro: dentro.map((m) => m.miembro_id),
      pendientes: esp.data.espacio.miembros.length - dentro.length,
    }
  } else if (fotoE) {
    r.siguiente.espacios[e.id] = fotoE
  }

  if (!lista.ok) {
    for (const [id, f] of Object.entries(r.previo.propuestas)) if (id.startsWith(`${e.id}:`)) r.siguiente.propuestas[id] = f
    return
  }
  const cambiadas = lista.data.propuestas.filter((p) => {
    const f = r.previo.propuestas[`${e.id}:${p.id}`]
    return conocido && (!f || f.rev !== p.state_rev)
  })
  const estados = await Promise.all(cambiadas.map((p) => api.getProposalState(p.id)))
  for (const p of lista.data.propuestas) {
    const clave = `${e.id}:${p.id}`
    const fotoP = r.previo.propuestas[clave]
    const destino = rutas.propuesta(e.id, p.id)
    const i = cambiadas.indexOf(p)
    if (i < 0) {
      r.siguiente.propuestas[clave] = { rev: p.state_rev, turno: esTurno(p) }
      continue
    }
    const st = estados[i]
    if (!st.ok || st.data.sin_cambios === true) {
      // Sin historial no se avanza la foto: la próxima ronda vuelve a intentarlo (no se pierde el aviso).
      if (fotoP) r.siguiente.propuestas[clave] = fotoP
      continue
    }
    const estado = st.data.propuesta
    const desde = fotoP?.rev ?? -1
    const aceptacionesVisibles = new Set(estado.historial.filter((ev) => ev.tipo === 'aceptacion').map((ev) => ev.state_rev))
    // Misma censura que el servidor (0047): si una aceptación ya no está en el historial (quien confirmó se retiró),
    // el aviso guardado "X confirmó" se borra; si no, junto a "una persona se retiró" diría quién se fue.
    for (const n of r.previo.items) {
      if (n.propuestaId === p.id && n.tipo === 'aceptacion' && n.rev != null && !aceptacionesVisibles.has(n.rev)) r.borrar.add(n.id)
    }
    for (const ev of estado.historial) {
      if (ev.state_rev <= desde) continue
      // Lo que hizo uno mismo no se avisa (sí lo que el sistema hizo, como un plazo que vence).
      if (ev.actor?.miembro_id === yo || ev.ejecutado_por?.miembro_id === yo) continue
      const texto = textoEvento(ev, estado)
      if (texto) agregar(texto, ev.tipo, p.id, ev.state_rev, destino)
    }
    // Lo que le toca a esta persona, aunque el evento lo haya disparado otra (el servidor lo dice en siguiente_accion).
    if (esTurno(p) && !fotoP?.turno) agregar(`${conTitulo(p)}: ${p.siguiente_accion.texto}`, 'turno', p.id, null, destino)
    r.siguiente.propuestas[clave] = { rev: Math.max(p.state_rev, estado.state_rev), turno: esTurno(p) }
  }
}

async function revisar() {
  if (enCurso) return
  const quien = usuario
  if (!quien) return programar()
  enCurso = true
  try {
    const l = await api.listMySpaces()
    if (!l.ok || quien !== usuario) return
    const previo = leer(quien)
    const r: Ronda = { previo, siguiente: { espacios: {}, propuestas: {}, items: [] }, nuevas: [], borrar: new Set() }
    // Con más grupos que el tope por ronda, se rota cuáles se revisan; las fotos de los demás se conservan.
    const todos = l.data.espacios
    const desde = todos.length > GRUPOS_POR_RONDA ? (ronda * GRUPOS_POR_RONDA) % todos.length : 0
    const revisados = [...todos, ...todos].slice(desde, desde + Math.min(GRUPOS_POR_RONDA, todos.length))
    ronda++
    for (const e of revisados) await revisarEspacio(e, r)
    const ids = new Set(revisados.map((e) => e.id))
    for (const e of todos) {
      if (ids.has(e.id)) continue
      if (previo.espacios[e.id]) r.siguiente.espacios[e.id] = previo.espacios[e.id]
      for (const [k, f] of Object.entries(previo.propuestas)) if (k.startsWith(`${e.id}:`)) r.siguiente.propuestas[k] = f
    }
    if (quien !== usuario) return
    // Se relee lo guardado al final: "Marcar como vistas" en esta u otra pestaña mientras corría la ronda no se pierde.
    const actual = leer(quien)
    const nuevas = r.nuevas.reverse()
    r.siguiente.items = [...nuevas, ...actual.items.filter((n) => !r.borrar.has(n.id))].slice(0, MAX_ITEMS)
    datos = r.siguiente
    escribir(quien, datos)
    recientes = [...nuevas, ...recientes.filter((n) => !r.borrar.has(n.id))].slice(0, 5)
    if (nuevas.length > 0) {
      vibrar([12, 60, 12])
      avisarSistema(nuevas)
    }
    avisar()
  } finally {
    enCurso = false
    ultima = Date.now()
    programar()
  }
}

function marcar(ids: Set<string> | null) {
  if (!usuario) return
  const actual = leer(usuario)
  datos = { ...actual, items: actual.items.map((n) => (ids === null || ids.has(n.id) ? { ...n, visto: true } : n)) }
  escribir(usuario, datos)
  recientes = recientes.map((n) => (ids === null || ids.has(n.id) ? { ...n, visto: true } : n))
  avisar()
}

// ---------------------------------------------------------------- notificación del sistema (solo computadora)

/** En Android, `new Notification` no existe sin service worker; en iOS, solo con la app instalada. */
export function sistemaDisponible(): boolean {
  if (typeof window === 'undefined' || !('Notification' in window)) return false
  return !window.matchMedia?.('(pointer: coarse)').matches
}

function sistemaActivado(): boolean {
  try {
    return sistemaDisponible() && !!usuario && Notification.permission === 'granted' && localStorage.getItem(PREFIJO_SISTEMA + usuario) === '1'
  } catch {
    return false
  }
}

function avisarSistema(nuevas: Novedad[]) {
  if (!sistemaActivado() || document.visibilityState === 'visible') return
  for (const n of nuevas.slice(0, 3)) {
    try {
      const aviso = new Notification(`CRUXE · ${n.espacio}`, { body: n.texto, tag: n.id })
      aviso.onclick = () => {
        window.focus()
        window.location.hash = n.href
        aviso.close()
      }
    } catch {
      // El navegador no deja crearla (por ejemplo, sin service worker): quedan los avisos dentro de CRUXE.
    }
  }
}

// ---------------------------------------------------------------- hooks y vistas

function useAlmacen() {
  return useSyncExternalStore(suscribir, () => version, () => version)
}

/** Las novedades de la persona de esta sesión, de la más nueva a la más vieja. */
export function useNovedades() {
  useAlmacen()
  const items = usuario ? datos.items : []
  return {
    items,
    sinVer: items.filter((n) => !n.visto).length,
    marcarVistas: () => marcar(null),
    marcarVista: (id: string) => marcar(new Set([id])),
  }
}

function haceUnRato(en: number): string {
  const min = Math.round((Date.now() - en) / 60000)
  if (min < 1) return 'hace un momento'
  if (min < 60) return `hace ${min} min`
  const h = Math.round(min / 60)
  return h < 24 ? `hace ${h} h` : `hace ${Math.round(h / 24)} d`
}

/** Tarjeta "Novedades" (Inicio y Mis planes). Con `siempre`, se muestra también vacía, con la explicación. */
export function NovedadesTarjeta({ siempre = false }: { siempre?: boolean }) {
  const { items, sinVer, marcarVistas, marcarVista } = useNovedades()
  const [sistema, setSistema] = useState(sistemaActivado)
  const [notaSistema, setNotaSistema] = useState<string | null>(null)
  if (items.length === 0 && !siempre) return null

  async function activarSistema() {
    setNotaSistema(null)
    try {
      const permiso = await Notification.requestPermission()
      if (permiso !== 'granted') {
        setNotaSistema('El navegador no dio permiso. Los avisos siguen apareciendo dentro de CRUXE.')
        return
      }
      new Notification('CRUXE', { body: 'Listo: te avisamos aquí mientras CRUXE esté abierto en esta computadora.' })
      if (usuario) localStorage.setItem(PREFIJO_SISTEMA + usuario, '1')
      setSistema(true)
    } catch {
      setNotaSistema('Este navegador no permite estos avisos. Los avisos siguen apareciendo dentro de CRUXE.')
    }
  }

  const visibles = items.slice(0, 6)
  return (
    <section className="tarjeta novedades" aria-labelledby="novedades-titulo">
      <div className="tarjeta-cabeza">
        <h2 id="novedades-titulo">
          <Icono n="campana" tam={18} /> Novedades
        </h2>
        {sinVer > 0 ? (
          <span className="etiqueta etiqueta-destacada num">
            {sinVer} <span className="visualmente-oculto">{sinVer === 1 ? 'novedad sin ver' : 'novedades sin ver'}</span>
          </span>
        ) : null}
      </div>
      {visibles.length > 0 ? (
        <ul className="novedades-lista">
          {visibles.map((n) => (
            <li key={n.id} className={n.visto ? '' : 'novedad-nueva'}>
              <a href={n.href} onClick={() => marcarVista(n.id)}>
                <span className="novedad-texto">{n.texto}</span>
                <span className="novedad-meta">
                  {n.espacio} · {haceUnRato(n.en)}
                </span>
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="suave">Cuando alguien entre a tu grupo, haya una opción o alguien confirme, te avisamos aquí.</p>
      )}
      {sinVer > 0 ? (
        <button type="button" className="enlace" onClick={marcarVistas}>
          Marcar como vistas
        </button>
      ) : null}
      <p className="suave novedades-nota">
        Solo lo que el grupo ya puede ver: nunca cuándo puede cada uno. Llegan mientras CRUXE está abierto; con el
        teléfono bloqueado todavía no.
      </p>
      {sistemaDisponible() && !sistema ? (
        <button type="button" className="btn btn-secundario btn-chico" onClick={() => void activarSistema()}>
          <Icono n="campana" tam={16} /> Avisarme también con una notificación en esta computadora
        </button>
      ) : null}
      {notaSistema ? <p role="status">{notaSistema}</p> : null}
    </section>
  )
}

/**
 * Aviso flotante arriba de la pantalla cuando llega una novedad con la página abierta. Se va solo a los 8 s (se
 * pausa mientras tiene el foco o el puntero) y cada novedad sale una sola vez, aunque se cambie de pantalla.
 * `excluirPropuesta`: en la pantalla de ese plan no se avisa lo que ya se ve ahí mismo.
 */
export function AvisoNovedades({ excluirPropuesta }: { excluirPropuesta?: string }) {
  useAlmacen()
  const [actual, setActual] = useState<Novedad | null>(null)
  const [pausa, setPausa] = useState(false)
  const caja = useRef<HTMLDivElement>(null)
  const siguiente = usuario ? (recientes.find((n) => !n.visto && !mostradas.has(n.id) && n.propuestaId !== excluirPropuesta) ?? null) : null

  useEffect(() => {
    // Lo del plan que se está mirando ya se ve en pantalla: cuenta como mostrado (no aparece después en otra).
    if (excluirPropuesta) for (const n of recientes) if (n.propuestaId === excluirPropuesta) mostradas.add(n.id)
    if (!actual && siguiente) {
      mostradas.add(siguiente.id)
      setActual(siguiente)
    }
  }, [actual, siguiente, excluirPropuesta])
  useEffect(() => {
    if (!actual || pausa) return
    const t = setTimeout(() => setActual(null), 8000)
    return () => clearTimeout(t)
  }, [actual, pausa])

  // El contenedor vivo queda siempre montado y vacío: los lectores de pantalla anuncian cuando cambia su contenido.
  return (
    <div
      ref={caja}
      className={actual ? 'aviso-novedad' : 'visualmente-oculto'}
      role="status"
      aria-live="polite"
      onFocus={() => setPausa(true)}
      onBlur={(e) => {
        if (!caja.current?.contains(e.relatedTarget as Node | null)) setPausa(false)
      }}
      onMouseEnter={() => setPausa(true)}
      onMouseLeave={() => setPausa(false)}
    >
      {actual ? (
        <>
          <Icono n="campana" tam={18} />
          <a href={actual.href} onClick={() => setActual(null)}>
            <span className="novedad-meta">{actual.espacio}</span>
            <span className="novedad-texto">{actual.texto}</span>
          </a>
          <button type="button" className="aviso-novedad-cerrar" aria-label="Cerrar aviso" onClick={() => setActual(null)}>
            <Icono n="cerrar" tam={16} />
          </button>
        </>
      ) : null}
    </div>
  )
}
